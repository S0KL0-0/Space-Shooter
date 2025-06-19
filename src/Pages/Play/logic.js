const gridSize = 9;
let shipData = {};
let currentTool = 'mouse';
let selectedElement = null; // Track selected element

let components;

let inventory = {};

// Initialize inventory from components
function initInventory() {
    components.forEach(comp => {
        if (comp.maxValue > 0) {
            inventory[comp.name] = comp.maxValue;
        }
    });
}

function getComponent(name) {
    return components.find(comp => comp.name === name);
}

// Create sidebar components dynamically
function createSidebarComponents() {
    const container = document.getElementById('components-container');
    container.innerHTML = '';

    components.forEach(comp => {

        if (comp.maxValue === 0) return;

        const containerDiv = document.createElement('div');
        containerDiv.className = 'sidebar-element-container';

        const element = document.createElement('div');
        element.className = `element sidebar-element ${comp.name}`;
        element.dataset.type = comp.name;

        const img = document.createElement('img');
        img.src = comp.image;
        img.alt = comp.displayName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        // Add error handling for images in Electron
        img.onerror = function() {
            console.warn(`Failed to load image: ${comp.image}`);
            // Fallback to text display
            element.innerHTML = `<div class="error-fallback">${comp.displayName}</div>`;
        };

        element.appendChild(img);
        element.addEventListener('click', handleSidebarElementClick);

        const countElement = document.createElement('div');
        countElement.className = 'element-count';
        countElement.dataset.type = comp.name;

        containerDiv.appendChild(element);
        containerDiv.appendChild(countElement);
        container.appendChild(containerDiv);
    });
}

// Create grid
function createGrid() {
    const grid = document.getElementById('ship-grid');
    grid.innerHTML = '';

    // Set grid size
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, 40px)`;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener('click', handleCellClick);

            grid.appendChild(cell);
        }
    }
}

// Tool handlers
function handleToolClick(e) {
    document.querySelectorAll('.tool-icon').forEach(icon => icon.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentTool = e.currentTarget.id === 'mouse-tool' ? 'mouse' : 'research';
    clearSelection();
}

function handlePlayClick() {
    window.location.href = './Game/game.html';
}

function handleSidebarElementClick(e) {
    const elementType = e.currentTarget.dataset.type;

    if (!elementType || inventory[elementType] <= 0) {
        return;
    }

    // Clear previous selection
    clearSelection();

    // Select this element from sidebar
    selectedElement = {
        type: elementType,
        source: 'sidebar'
    };

    // Visual feedback
    e.currentTarget.classList.add('selected');
}

function handleGridElementClick(e, elementType, x, y) {
    e.stopPropagation();

    const key = `${x},${y}`;

    // If we have a selected element, replace the clicked element
    if (selectedElement) {
        if (selectedElement.source === 'sidebar') {
            // Placing from sidebar - replace existing element
            if (inventory[selectedElement.type] <= 0) {
                return;
            }

            const existingElement = shipData[key];
            if (existingElement && existingElement !== selectedElement.type) {
                // Return replaced element to inventory
                inventory[existingElement]++;
            }

            // Only consume from inventory if it's a different element
            if (existingElement !== selectedElement.type) {
                inventory[selectedElement.type]--;
            }

            shipData[key] = selectedElement.type;

            updateGrid();
            updateInventory();
            saveShipData();
            return;

        } else if (selectedElement.source === 'grid') {
            // Moving from grid - swap or move
            const sourceKey = `${selectedElement.x},${selectedElement.y}`;
            const sourceElement = selectedElement.type;
            const targetElement = shipData[key];

            if (sourceElement === targetElement) {
                // Same element - just clear selection, no actual change needed
                clearSelection();
                return;
            }

            // Different elements - swap them
            shipData[sourceKey] = targetElement;
            shipData[key] = sourceElement;

            clearSelection();
            updateGrid();
            updateInventory();
            saveShipData();
            return;
        }
    }

    // No selected element - select this one
    clearSelection();

    selectedElement = {
        type: elementType,
        source: 'grid',
        x: x,
        y: y
    };

    // Visual feedback
    e.currentTarget.classList.add('selected');
}

function handleCellClick(e) {
    const x = parseInt(e.currentTarget.dataset.x);
    const y = parseInt(e.currentTarget.dataset.y);
    const key = `${x},${y}`;

    if (selectedElement) {
        // Place selected element
        if (selectedElement.source === 'sidebar') {
            // Handle placing from sidebar
            if (inventory[selectedElement.type] <= 0) {
                return;
            }

            if (shipData[key]) {
                // Swap with existing element
                const existingElement = shipData[key];
                inventory[existingElement]++;
                inventory[selectedElement.type]--;
                shipData[key] = selectedElement.type;
            } else {
                // Place in empty cell
                inventory[selectedElement.type]--;
                shipData[key] = selectedElement.type;
            }

            // Check if inventory is empty and auto-unselect
            if (inventory[selectedElement.type] <= 0) {
                clearSelection();
            }

            updateGrid();
            updateInventory();
            saveShipData();

        } else if (selectedElement.source === 'grid') {
            // Handle moving from grid
            const sourceKey = `${selectedElement.x},${selectedElement.y}`;

            if (shipData[key]) {
                // Swap elements
                const targetElement = shipData[key];
                shipData[sourceKey] = targetElement;
                shipData[key] = selectedElement.type;
            } else {
                // Move to empty cell
                delete shipData[sourceKey];
                shipData[key] = selectedElement.type;
            }

            // Clear selection after moving from grid
            clearSelection();
            updateGrid();
            updateInventory();
            saveShipData();
        }
    }
}

function clearSelection() {
    // Remove visual selection feedback
    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });

    selectedElement = null;
}

function createElement(type) {
    const element = document.createElement('div');
    element.className = `element ${type}`;
    element.dataset.type = type;

    const comp = getComponent(type);
    if (comp) {
        const img = document.createElement('img');
        img.src = comp.image;
        img.alt = comp.displayName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        // Add error handling for grid images too
        img.onerror = function() {
            console.warn(`Failed to load grid image: ${comp.image}`);
            element.innerHTML = `<div class="error-fallback">${comp.displayName}</div>`;
        };

        element.appendChild(img);
    }

    // Add click handler for grid elements
    element.addEventListener('click', (e) => {
        const cell = element.parentElement;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        handleGridElementClick(e, type, x, y);
    });

    return element;
}

function updateInventory() {
    components.forEach(comp => {
        const countElement = document.querySelector(`[data-type="${comp.name}"].element-count`);
        const sidebarElement = document.querySelector(`[data-type="${comp.name}"].sidebar-element`);

        if (!countElement || !sidebarElement) return;

        if (inventory[comp.name] > 1) {
            countElement.textContent = inventory[comp.name];
            countElement.style.display = 'flex';
        } else if (inventory[comp.name] === 1) {
            countElement.style.display = 'none';
        } else {
            countElement.style.display = 'none';
            sidebarElement.style.opacity = '0.5';
        }

        if (inventory[comp.name] > 0) {
            sidebarElement.style.opacity = '1';
        }
    });
}

function updateGrid() {
    const cells = document.querySelectorAll('.grid-cell');

    cells.forEach(cell => {
        const x = cell.dataset.x;
        const y = cell.dataset.y;
        const key = `${x},${y}`;

        // Clear cell
        cell.innerHTML = '';
        cell.classList.remove('occupied');

        // Add element if exists
        if (shipData[key]) {
            const element = createElement(shipData[key]);
            cell.appendChild(element);
            cell.classList.add('occupied');
        }
    });
}

function saveShipData() {
    //console.log('Ship data:', shipData);
}

async function loadShipData() {
    // Load all data using the new load function
    const allData = await load();
    console.log("All Data: ", allData);

    // Convert modules Map to components array for compatibility
    if (allData && allData.modules && allData.modules instanceof Map) {
        components = [];
        allData.modules.forEach((moduleData, moduleId) => {
            const component = {
                name: moduleId,
                displayName: moduleData.name,
                maxValue: moduleData.placement_rules?.amount || 0,
                image: moduleData.image
            };
            components.push(component);
        });
    } else {
        console.error('Failed to load modules data or data is not a Map');
        components = [];
    }

    // Store the module map for other parts of the application
    window.moduleMap = allData.modules;
    window.upgradeMap = allData.upgrades

    // Store all data globally for other components
    window.allGameData = allData;
}

// Setup event listeners
document.getElementById('mouse-tool').addEventListener('click', handleToolClick);
document.getElementById('research-button').addEventListener('click', handleToolClick);
document.getElementById('play-button').addEventListener('click', handlePlayClick);

// Clear selection when clicking outside (only for grid selections)
document.addEventListener('click', (e) => {
    if (selectedElement && selectedElement.source === 'grid' &&
        !e.target.closest('.sidebar-element') &&
        !e.target.closest('.grid-cell') &&
        !e.target.closest('.element')) {

        // Remove selected grid element
        const sourceKey = `${selectedElement.x},${selectedElement.y}`;
        if (shipData[sourceKey]) {
            const elementType = shipData[sourceKey];
            inventory[elementType]++;
            delete shipData[sourceKey];
        }

        clearSelection();
        updateGrid();
        updateInventory();
        saveShipData();
    }
});

// Initialize everything
async function init() {
    await loadShipData(); // Load all data using new load function
    initInventory();
    createSidebarComponents();
    createGrid();
    updateGrid();
    updateInventory();

    window.Points = await loadResearchPoints();
    //console.log("Points: ", window.Points);

    window.researchTree = new Research()

    await initializeResearchOverlay();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}