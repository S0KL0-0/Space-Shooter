async function loadResearch(
    defaultAssetPath = 'Assets/Research',
    imgPath = '../../Assets/Modules/Modules',
    playerDataPath = 'Data'
) {
    try {
        // Load the research configuration
        const researchConfig = await window.electronAPI.loadJSON(`${defaultAssetPath}/research.json`);

        const playerData = await window.electronAPI.loadJSON(`${playerDataPath}/researched.json`);

        // console.log('researched: ', playerData);

        if (!Array.isArray(researchConfig)) {
            console.error('Research config is not an array');
            return [];
        }

        // Create a map for player data if playerData exists
        const playerResearchMap = new Map();
        if (playerData && Array.isArray(playerData)) {
            playerData.forEach(item => {
                playerResearchMap.set(item.id, item);
            });
        }

        // Load all research data
        const researchPromises = researchConfig.map(async (research) => {
            try {
                const data = await window.electronAPI.loadJSON(`${defaultAssetPath}/${research.path}`);

                // Transform image paths if they exist and add research status
                const transformedData = Array.isArray(data) ? data.map(item => {
                    const transformedItem = {
                        ...item
                    };

                    if (item.image) {
                        transformedItem.image = `${imgPath}/${item.image}`;
                    }

                    // Add player research status if available
                    const playerResearch = playerResearchMap.get(item.id);
                    if (playerResearch) {
                        transformedItem.researched = playerResearch.researched ?? false;
                    } else {
                        transformedItem.researched = false;
                    }

                    return transformedItem;
                }) : [];

                return {
                    name: research.name,
                    data: transformedData
                };
            } catch (error) {
                console.error(`Failed to load research ${research.name}:`, error);
                return {
                    name: research.name,
                    data: []
                };
            }
        });

        const research = await Promise.all(researchPromises);
        // console.log('Loaded research:', research);
        return research;

    } catch (error) {
        console.error('Failed to load research config:', error);
        return [];
    }
}