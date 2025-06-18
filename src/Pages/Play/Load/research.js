function isObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val)
}

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
                    if (playerData && isObject(playerData)) {
                        transformedItem.researched = playerData[item.id] === 'researched';
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

async function loadResearchPoints(
    playerDataPath = 'Data'
) {
    try {

        const playerData = await window.electronAPI.loadJSON(`${playerDataPath}/other.json`);

        // console.log('researched: ', playerData);

        let ResearchPoints = 0;

        if (playerData.Points) ResearchPoints = playerData.Points;

        return ResearchPoints;

    } catch (error) {
        console.error('Failed to load research points:', error);
        return [];
    }
}