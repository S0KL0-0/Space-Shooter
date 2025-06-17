async function loadModules(
    defaultAssetPath = 'Assets/Modules',
    imgPath = '../../Assets/Modules/Modules',
    playerDataPath = 'Data'
) {
    try {
        // Load the modules and default amounts configuration
        const modulesConfig = await window.electronAPI.loadJSON(`${defaultAssetPath}/modules.json`);
        const defaultModuleAmounts = await window.electronAPI.loadJSON(`${defaultAssetPath}/default_available_modules.json`);

        const playerData = await window.electronAPI.loadJSON(`${playerDataPath}/available_modules.json`);

        // console.log('available modules: ', playerData);

        if (!Array.isArray(modulesConfig)) {
            console.error('Modules config is not an array');
            return [];
        }

        if (!Array.isArray(defaultModuleAmounts)) {
            console.error('Default module amounts is not an array');
            return [];
        }

        // Create a map for quick lookup of default amounts
        const amountMap = new Map();
        defaultModuleAmounts.forEach(item => {
            amountMap.set(item.id, item.amount);
        });

        // Create a map for player data amounts if playerData exists
        const playerAmountMap = new Map();
        if (playerData && Array.isArray(playerData)) {
            playerData.forEach(item => {
                playerAmountMap.set(item.id, item.amount);
            });
        }

        // Load all module data
        const modulePromises = modulesConfig.map(async (module) => {
            try {
                const data = await window.electronAPI.loadJSON(`${defaultAssetPath}/${module.path}`);

                // Transform image paths if they exist and add maxValue to placement_rules
                const transformedData = Array.isArray(data) ? data.map(item => {
                    const transformedItem = {
                        ...item
                    };

                    if (item.image) {
                        transformedItem.image = `${imgPath}/${item.image}`;
                    }

                    if (item.placement_rules) {
                        const amount = playerAmountMap.get(item.id) ?? amountMap.get(item.id) ?? 0;
                        transformedItem.placement_rules = {
                            ...item.placement_rules,
                            maxValue: amount
                        };
                    }

                    return transformedItem;
                }) : [];

                return {
                    name: module.name,
                    data: transformedData
                };
            } catch (error) {
                console.error(`Failed to load module ${module.name}:`, error);
                return {
                    name: module.name,
                    data: []
                };
            }
        });

        const modules = await Promise.all(modulePromises);
        // console.log('Loaded modules:', modules);
        return modules;

    } catch (error) {
        console.error('Failed to load modules config:', error);
        return [];
    }
}