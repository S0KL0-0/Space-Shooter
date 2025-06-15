async function loadModules(rootPath = 'Assets/Modules', imgPath = '../../Assets/Modules/Modules') {
    try {
        // Load the modules configuration
        const modulesConfig = await window.electronAPI.loadJSON(`${rootPath}/modules.json`);

        if (!Array.isArray(modulesConfig)) {
            console.error('Modules config is not an array');
            return [];
        }

        // Load all module data
        const modulePromises = modulesConfig.map(async (module) => {
            try {
                const data = await window.electronAPI.loadJSON(`${rootPath}/${module.path}`);

                // Transform image paths if they exist
                const transformedData = Array.isArray(data) ? data.map(item => {
                    if (item.image) {
                        return {
                            ...item,
                            image: `${imgPath}/${item.image}`
                        };
                    }
                    return item;
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
        console.log('Loaded modules:', modules);
        return modules;

    } catch (error) {
        console.error('Failed to load modules config:', error);
        return [];
    }
}