function isObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val)
}

async function loadDependencies(basePath, fileName) {
    try {
        // Load the dependencies configuration
        const configPath = `${basePath}/${fileName}`;
        const dependenciesConfig = await window.electronAPI.loadJSON(configPath);

        if (!Array.isArray(dependenciesConfig)) {
            console.error('Dependencies config is not an array');
            return [];
        }

        // Load all dependency data
        const dependencyPromises = dependenciesConfig.map(async (dependency) => {
            try {
                const fullPath = `${basePath}/${dependency.path}`;
                const data = await window.electronAPI.loadJSON(fullPath);

                return {
                    name: dependency.name,
                    data: Array.isArray(data) ? data : []
                };
            } catch (error) {
                console.error(`Failed to load dependency ${dependency.name}:`, error);
                return {
                    name: dependency.name,
                    data: []
                };
            }
        });

        const dependencies = await Promise.all(dependencyPromises);
        return dependencies;

    } catch (error) {
        console.error('Failed to load dependencies config:', error);
        return [];
    }
}

async function loadFile(filePath) {
    try {
        const data = await window.electronAPI.loadJSON(filePath);
        return data;
    } catch (error) {
        console.error(`Failed to load file ${filePath}:`, error);
        return null;
    }
}

function transformImagePaths(obj, basePath) {
    if (obj && typeof obj === 'object') {
        if (obj.image && typeof obj.image === 'string') {
            obj.image = `${basePath}/${obj.image}`;
        }

        // Recursively transform nested objects
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                transformImagePaths(obj[key], basePath);
            }
        });
    }
}

function flattenModules(modules, imgPath) {
    const moduleMap = new Map();

    modules.forEach(category => {
        if (category.data && Array.isArray(category.data)) {
            category.data.forEach(module => {
                if (module.id) {
                    const moduleClone = { ...module };
                    // Transform image paths for modules
                    transformImagePaths(moduleClone, imgPath.modules);
                    moduleMap.set(module.id, moduleClone);
                }
            });
        }
    });

    return moduleMap;
}

function flattenUpgrades(upgrades, imgPath) {
    const upgradeMap = new Map();

    upgrades.forEach(category => {
        if (category.data && Array.isArray(category.data)) {
            category.data.forEach(upgrade => {
                if (upgrade.id) {
                    const upgradeClone = { ...upgrade };
                    // Transform image paths for upgrades
                    transformImagePaths(upgradeClone, imgPath.upgrades);
                    upgradeMap.set(upgrade.id, upgradeClone);
                }
            });
        }
    });

    return upgradeMap;
}

function addResearchStatus(research, upgradeMap, playerData, imgPath) {
    const playerResearched = playerData || {};

    // Process research categories (keep structure) and transform image paths
    research.forEach(category => {
        if (category.data && Array.isArray(category.data)) {
            category.data.forEach(item => {
                // Transform image paths for research items
                transformImagePaths(item, imgPath.research);

                // Items with no requirements (price 0 and empty requires array) are always researched
                const isInitial = item.price === 0 && (!item.requires || item.requires.length === 0);

                // Check if player has researched this item or if it's an initial item
                item.researched = isInitial || playerResearched[item.id] === "researched";
            });
        }
    });

    // Process upgrades map (image paths already transformed in flattenUpgrades)
    upgradeMap.forEach((item, id) => {
        const isInitial = item.price === 0 && (!item.requires || item.requires.length === 0);
        item.researched = isInitial || playerResearched[id] === "researched";
    });

    return { research, upgrades: upgradeMap };
}

function addDefaultAmounts(moduleMap, defaultAmounts) {
    const defaults = defaultAmounts || [];

    // Create a map of default amounts for quick lookup
    const defaultMap = new Map();
    defaults.forEach(item => {
        if (item.id && typeof item.amount === 'number') {
            defaultMap.set(item.id, item.amount);
        }
    });

    // Add amount property to each module's placement_rules
    moduleMap.forEach((module, id) => {
        if (!module.placement_rules) {
            module.placement_rules = {};
        }
        module.placement_rules.amount = defaultMap.get(id) || 0;
    });

    return moduleMap;
}

function applyUpgradeEffect(module, effect) {
    if (effect.placement_rules && module.placement_rules) {
        // Apply placement rule modifications
        Object.keys(effect.placement_rules).forEach(key => {
            if (key === 'amount' && typeof effect.placement_rules[key] === 'number') {
                // Add to existing amount or create new amount property
                module.placement_rules.amount = (module.placement_rules.amount || 0) + effect.placement_rules[key];
            } else {
                // Apply other placement rule changes
                module.placement_rules[key] = effect.placement_rules[key];
            }
        });
    } else if (effect.placement_rules) {
        // Create placement_rules if it doesn't exist
        module.placement_rules = { ...effect.placement_rules };
    }

    // Apply other effects if needed
    Object.keys(effect).forEach(key => {
        if (key !== 'placement_rules') {
            // Apply direct property modifications
            if (typeof effect[key] === 'number' && typeof module[key] === 'number') {
                module[key] += effect[key];
            } else if (key === 'stats' && isObject(effect[key]) && isObject(module[key])) {
                // Handle stats object modifications
                Object.keys(effect[key]).forEach(statKey => {
                    if (typeof effect[key][statKey] === 'number' && typeof module[key][statKey] === 'number') {
                        module[key][statKey] += effect[key][statKey];
                    } else {
                        module[key][statKey] = effect[key][statKey];
                    }
                });
            } else {
                module[key] = effect[key];
            }
        }
    });
}

function applyResearchedUpgrades(moduleMap, upgradeMap) {
    // Find all researched upgrades and apply their effects
    upgradeMap.forEach((item, id) => {
        if (item.researched && item.for && item.effect) {
            const targetModule = moduleMap.get(item.for);
            if (targetModule) {
                console.log(`Applying upgrade ${id} to module ${item.for}`);
                applyUpgradeEffect(targetModule, item.effect);
            } else {
                console.warn(`Upgrade ${id} targets non-existent module ${item.for}`);
            }
        }
    });

    return moduleMap;
}

async function load(
    defaultAssetPath = {
        modules: 'Assets/Modules',
        research: 'Assets/Research',
        upgrades: 'Assets/Upgrades'
    },
    imgPath = {
        modules: '../../Assets/Modules/Modules',
        research: '../../Assets/Modules/Modules',
        upgrades: '../../Assets/Upgrades/Upgrades'
    },
    playerDataPath = 'Data'
) {
    try {
        // Load all data
        let modules = await loadDependencies(defaultAssetPath.modules, 'modules.json');
        let research = await loadDependencies(defaultAssetPath.research, 'research.json');
        let upgrades = await loadDependencies(defaultAssetPath.upgrades, 'upgrades.json');
        let playerData = await loadFile(`${playerDataPath}/researched.json`);
        let defaultAmounts = await loadFile(`${defaultAssetPath.modules}/default_available_modules.json`);

        //console.log("---------------");
        //console.log("Raw module data", modules);
        //console.log("Raw research data", research);
        //console.log("Raw upgrade data", upgrades);
        //console.log("Player data", playerData);
        //console.log("Default amounts", defaultAmounts);

        // 1. Flatten modules into a map and transform image paths
        const moduleMap = flattenModules(modules, imgPath);
        //console.log("Flattened modules:", moduleMap);

        // 2. Flatten upgrades into a map and transform image paths, keep research with categories, then add research status
        const upgradeMap = flattenUpgrades(upgrades, imgPath);
        const researchData = addResearchStatus(research, upgradeMap, playerData, imgPath);
        //console.log("Research with categories:", researchData.research);
        //console.log("Upgrades map with status:", researchData.upgrades);

        // 3. Add default amounts to modules (in placement_rules)
        const modulesWithAmounts = addDefaultAmounts(moduleMap, defaultAmounts);
        //console.log("Modules with amounts:", modulesWithAmounts);

        // 4. Apply researched upgrades to modules
        const finalModules = applyResearchedUpgrades(modulesWithAmounts, researchData.upgrades);
        //console.log("Final modules with upgrades:", finalModules);

        //console.log("---------------");

        return {
            modules: finalModules, // Now a Map instead of array
            research: researchData.research, // Keep original category structure with research status
            upgrades: researchData.upgrades // Now a Map with research status
        };

    } catch (error) {
        console.error('Failed to load game data:', error);
        return {
            modules: new Map(),
            research: [],
            upgrades: new Map()
        };
    }
}