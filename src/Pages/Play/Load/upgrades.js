async function loadUpgrades(
    defaultAssetPath = 'Assets/Upgrades',
    imgPath = '../../Assets/Upgrades/Upgrades'
) {
    try {
        // Load the upgrades and default amounts configuration
        const upgradesConfig = await window.electronAPI.loadJSON(`${defaultAssetPath}/upgrades.json`);
        const defaultUpgradeAmounts = await window.electronAPI.loadJSON(`${defaultAssetPath}/default_available_upgrades.json`);

        if (!Array.isArray(upgradesConfig)) {
            console.error('Upgrades config is not an array');
            return [];
        }

        if (!Array.isArray(defaultUpgradeAmounts)) {
            console.error('Default upgrade amounts is not an array');
            return [];
        }

        // Create a map for quick lookup of default amounts
        const amountMap = new Map();
        defaultUpgradeAmounts.forEach(item => {
            amountMap.set(item.id, item.amount);
        });

        // Load all upgrade data
        const upgradePromises = upgradesConfig.map(async (upgrade) => {
            try {
                const data = await window.electronAPI.loadJSON(`${defaultAssetPath}/${upgrade.path}`);

                // Transform image paths if they exist and add maxValue to placement_rules
                const transformedData = Array.isArray(data) ? data.map(item => {
                    const transformedItem = {
                        ...item
                    };

                    if (item.image) {
                        transformedItem.image = `${imgPath}/${item.image}`;
                    }

                    if (item.placement_rules) {
                        const amount = amountMap.get(item.id) ?? 0;
                        transformedItem.placement_rules = {
                            ...item.placement_rules,
                            maxValue: amount
                        };
                    }

                    return transformedItem;
                }) : [];

                return {
                    name: upgrade.name,
                    data: transformedData
                };
            } catch (error) {
                console.error(`Failed to load upgrade ${upgrade.name}:`, error);
                return {
                    name: upgrade.name,
                    data: []
                };
            }
        });

        const upgrades = await Promise.all(upgradePromises);
        return upgrades;

    } catch (error) {
        console.error('Failed to load upgrades config:', error);
        return [];
    }
}
