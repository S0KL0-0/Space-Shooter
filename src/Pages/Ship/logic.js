const gridSize = 8;
let shipData = {};
let currentTool = 'mouse';

let components;

// https://www.pixilart.com/

let inventory = {};

// Initialize inventory from components
function initInventory() {
    components.forEach(comp => {
        inventory[comp.name] = comp.maxValue;
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
        const containerDiv = document.createElement('div');
        containerDiv.className = 'sidebar-element-container';

        const element = document.createElement('div');
        element.className = `element sidebar-element ${comp.name}`;
        element.draggable = true;
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
        element.addEventListener('dragstart', handleDragStart);

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

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('click', handleCellClick);

            grid.appendChild(cell);
        }
    }
}

// Tool handlers
function handleToolClick(e) {
    document.querySelectorAll('.tool-icon').forEach(icon => icon.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentTool = e.currentTarget.id === 'mouse-tool' ? 'mouse' : 'trash';
}

function handleCellClick(e) {
    if (currentTool !== 'trash') return;

    const x = parseInt(e.currentTarget.dataset.x);
    const y = parseInt(e.currentTarget.dataset.y);
    const key = `${x},${y}`;

    if (shipData[key]) {
        const elementType = shipData[key];
        inventory[elementType]++;
        delete shipData[key];
        updateGrid();
        updateInventory();
        saveShipData();
    }
}

// Drag handlers
function handleDragStart(e) {
    if (currentTool !== 'mouse') {
        e.preventDefault();
        return;
    }

    // Find the actual draggable element (might be parent if dragging from image)
    let draggableElement = e.target;
    if (!draggableElement.hasAttribute('data-type')) {
        draggableElement = draggableElement.closest('[data-type]');
    }

    if (!draggableElement || !draggableElement.hasAttribute('data-type')) {
        console.error('No valid draggable element found!');
        e.preventDefault();
        return;
    }

    const elementType = draggableElement.dataset.type;

    if (draggableElement.classList.contains('sidebar-element')) {

        if (!elementType || inventory[elementType] <= 0) {
            e.preventDefault();
            return;
        }
    }

    // Make sure we have a valid element type
    if (!elementType) {
        console.error('No element type found!');
        e.preventDefault();
        return;
    }

    e.dataTransfer.setData('text/plain', elementType);
    e.dataTransfer.setData('source', draggableElement.classList.contains('sidebar-element') ? 'sidebar' : 'grid');

    if (!draggableElement.classList.contains('sidebar-element')) {
        // For grid elements, we need to find the grid cell parent
        const gridCell = draggableElement.parentElement;
        e.dataTransfer.setData('sourceX', gridCell.dataset.x);
        e.dataTransfer.setData('sourceY', gridCell.dataset.y);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const elementType = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source');
    const targetX = parseInt(e.currentTarget.dataset.x);
    const targetY = parseInt(e.currentTarget.dataset.y);
    const targetKey = `${targetX},${targetY}`;

    // Handle swapping if target cell is occupied and source is from sidebar
    if (shipData[targetKey] && source === 'sidebar') {
        const existingElement = shipData[targetKey];
        inventory[existingElement]++;
        inventory[elementType]--;
        shipData[targetKey] = elementType;

        updateGrid();
        updateInventory();
        saveShipData();
        return;
    }

    // Check if cell is already occupied (for grid-to-grid moves)
    if (shipData[targetKey] && source === 'grid') {
        return;
    }

    // Remove from source if moving from grid
    if (source === 'grid') {
        const sourceX = parseInt(e.dataTransfer.getData('sourceX'));
        const sourceY = parseInt(e.dataTransfer.getData('sourceY'));
        delete shipData[`${sourceX},${sourceY}`];
    } else {
        // Decrease inventory count
        inventory[elementType]--;
    }

    // Add to target
    shipData[targetKey] = elementType;

    updateGrid();
    updateInventory();
    saveShipData();
}

function createElement(type) {
    const element = document.createElement('div');
    element.className = `element ${type}`;
    element.draggable = true;
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

    element.addEventListener('dragstart', handleDragStart);
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
            sidebarElement.draggable = false;
        }

        if (inventory[comp.name] > 0) {
            sidebarElement.style.opacity = '1';
            sidebarElement.draggable = true;
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
    const jsonData = await window.electronAPI.loadJSON('Data/player_ship.json');
    console.log('Loaded JSON data:', jsonData);

    // TODO: Add some data verifying

    if (jsonData && Array.isArray(jsonData)) {
        components = jsonData;
    } else {
        console.error('Failed to load components data or data is not an array');
        components = [];
    }
}

// Setup event listeners
document.getElementById('mouse-tool').addEventListener('click', handleToolClick);
document.getElementById('trash-tool').addEventListener('click', handleToolClick);

// Initialize everything
async function init() {
    await loadShipData(); // Load player data if there is any
    initInventory();
    createSidebarComponents();
    createGrid();
    updateGrid();
    updateInventory();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}