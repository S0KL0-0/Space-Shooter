// Create PixiJS application
const app = new PIXI.Application({
    width: 800,
    height: 600,
    backgroundColor: 0x000000
});

// Add canvas to container
document.getElementById('game-container').appendChild(app.view);

// Game settings
const FPS = 60;
const frameTime = 1000 / FPS;
let mouseX = 0;
let mouseY = 0;
let keys = {};
let floatX = 0;
let floatY = 0;
let inputQueue = { x: [], y: [] };
const maxSpeed = 200;
const acceleration = 200;
const deceleration = 0.5;
const dash = 0;
let shipGrid = null;
let bullets = [];
let enemies = [];
let playerHealth = 100;
let maxHealth = 100;
let healthBar = null;
let healthText = null;
let isInvulnerable = false;
let invulnerabilityTimer = 0;
const invulnerabilityDuration = 2000; // 2 seconds in milliseconds

let shipSize = 0.25;

let playerWorldX = 0;
let playerWorldY = 0;
// Game states
let gameState = 'waiting'; // waiting, countdown, playing
let countdownValue = 1;
let lastTime = 0;

// Create text style
const textStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 48,
    fill: '#ffffff',
    align: 'center'
});

// Create UI text
const clickText = new PIXI.Text('CLICK TO BEGIN', textStyle);
clickText.anchor.set(0.5);
clickText.x = app.screen.width / 2;
clickText.y = app.screen.height / 2;
app.stage.addChild(clickText);

const countdownText = new PIXI.Text('', textStyle);
countdownText.anchor.set(0.5);
countdownText.x = app.screen.width / 2;
countdownText.y = app.screen.height / 2;
countdownText.visible = false;
app.stage.addChild(countdownText);

// Click to start
document.addEventListener('DOMContentLoaded', async () => {


    try {
        const response = await fetch('../../../Data/Ship/ship.json');
        const shipData = await response.json();
        shipGrid = shipData.grid || shipData; // Adjust based on your JSON structure
    } catch (error) {
        console.error('Failed to load ship data:', error);
        // Fallback to empty grid
        shipGrid = [];
    }

    // Wait for data to load
    const allData = await window.electronAPI.getGlobal('AllData');
    console.log(allData);


    // Now allow click to start
    app.view.addEventListener('click', startCountdown);
});


async function loadData() {
    const allData = await window.electronAPI.getGlobal('AllData')
    console.log(allData)
}

function startCountdown() {
    if (gameState !== 'waiting') return;

    gameState = 'countdown';
    clickText.visible = false;
    countdownText.visible = true;
    app.view.removeEventListener('click', startCountdown);

    const countdownInterval = setInterval(() => {
        countdownText.text = countdownValue.toString();
        countdownValue--;

        if (countdownValue < 0) {
            clearInterval(countdownInterval);
            startGame();
        }
    }, 1000);
}




// Background system
let backgroundContainer;
const TILE_SIZE = 100;
const BUFFER_TILES = 4; // Extra tiles around the visible area

function seedRandom(x, y) {
    let seed = x * 374761393 + y * 668265263; // Large primes
    seed = (seed ^ (seed >>> 13)) * 1274126177;
    return (seed ^ (seed >>> 16)) / 4294967296 + 0.5; // Return 0-1
}

// Add these variables
let existingTiles = new Map();
let lastTileCheckX = 0;
let lastTileCheckY = 0;

// Modified backgroundFill - now tracks tiles
function backgroundFill() {
    backgroundContainer = new PIXI.Container();
    app.stage.addChildAt(backgroundContainer, 0);

    const tilesX = Math.ceil(app.screen.width / TILE_SIZE) + (BUFFER_TILES * 2);
    const tilesY = Math.ceil(app.screen.height / TILE_SIZE) + (BUFFER_TILES * 2);
    const startX = -(BUFFER_TILES * TILE_SIZE);
    const startY = -(BUFFER_TILES * TILE_SIZE);

    for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
            createTileAt(startX + x * TILE_SIZE, startY + y * TILE_SIZE, x, y);
        }
    }
}

//function to create a single tile
function createTileAt(worldX, worldY, seedX, seedY) {
    const tileKey = `${Math.floor(worldX / TILE_SIZE)},${Math.floor(worldY / TILE_SIZE)}`;

    if (existingTiles.has(tileKey)) return; // Don't create if already exists

    const tile = PIXI.Sprite.from('../../../Assets/background.png');

    tile.x = worldX + TILE_SIZE / 2;
    tile.y = worldY + TILE_SIZE / 2;
    tile.anchor.set(0.5);

    const randomRotation = (Math.floor(seedRandom(seedX, seedY) * 4) * Math.PI) / 2;
    tile.rotation = randomRotation + Math.PI / 2;

    const brightness = 0.9 + (seedRandom(seedX + 100, seedY + 100) * 0.2);
    tile.tint = PIXI.utils.rgb2hex([brightness, brightness, brightness]);

    backgroundContainer.addChild(tile);
    existingTiles.set(tileKey, tile);
}

// Updated moveBackground function
function moveBackground(deltaX, deltaY) {
    if (backgroundContainer) {
        backgroundContainer.x -= deltaX;
        backgroundContainer.y -= deltaY;

        // Check if we need new tiles every TILE_SIZE movement
        const currentTileX = Math.floor(-backgroundContainer.x / TILE_SIZE);
        const currentTileY = Math.floor(-backgroundContainer.y / TILE_SIZE);

        if (currentTileX !== lastTileCheckX || currentTileY !== lastTileCheckY) {
            spawnNewTiles(currentTileX, currentTileY);
            lastTileCheckX = currentTileX;
            lastTileCheckY = currentTileY;
        }
    }
}

// Function to spawn new tiles around current position
function spawnNewTiles(centerX, centerY) {
    const range = BUFFER_TILES + Math.ceil(Math.max(app.screen.width, app.screen.height) / TILE_SIZE / 2);

    for (let x = centerX - range; x <= centerX + range; x++) {
        for (let y = centerY - range; y <= centerY + range; y++) {
            createTileAt(x * TILE_SIZE, y * TILE_SIZE, x, y);
        }
    }
}


function updateMovementInput(){
    floatX = 0;
    floatY = 0;

    if (keys['KeyA'] && keys['KeyD']) {
        // Both pressed - use the most recent one
        floatX = inputQueue.x[inputQueue.x.length - 1] === 'KeyA' ? -1 : 1;
    } else if (keys['KeyA']) {
        floatX = -1; // A key = move left (negative X)
    } else if (keys['KeyD']) {
        floatX = 1;  // D key = move right (positive X)
    } else {
        floatX = 0;
    }

    // Handle Y axis (W/S keys)
    if (keys['KeyW'] && keys['KeyS']) {
        // Both pressed - use the most recent one
        floatY = inputQueue.y[inputQueue.y.length - 1] === 'KeyW' ? -1 : 1;
    } else if (keys['KeyW']) {
        floatY = -1; // W key = move up (negative Y)
    } else if (keys['KeyS']) {
        floatY = 1;  // S key = move down (positive Y)
    } else {
        floatY = 0;
    }
}




function getGunPositions(shipGrid) {
    const gunPositions = [];
    const cellSize = 100;
    const gridWidth = shipGrid[0].length;
    const gridHeight = shipGrid.length;

    const offsetX = -(gridWidth * cellSize) / 2;
    const offsetY = -(gridHeight * cellSize) / 2;

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const cell = shipGrid[row][col];

            if (cell && cell.id.includes('weapon')) {
                // Parse the weapon's individual rotation from the string
                let weaponRotation = 0; // Default facing right

                if (cell.rotation) {
                    const rotationStr = cell.rotation.toString();
                    console.log(`Weapon at [${row}][${col}] rotation string:`, rotationStr);

                    // Parse direction from the string
                    if (rotationStr.includes('UP')) {
                        weaponRotation = -Math.PI/2; // -90 degrees (up)
                    } else if (rotationStr.includes('DOWN')) {
                        weaponRotation = Math.PI/2;  // 90 degrees (down)
                    } else if (rotationStr.includes('LEFT')) {
                        weaponRotation = Math.PI;    // 180 degrees (left)
                    } else if (rotationStr.includes('RIGHT')) {
                        weaponRotation = 0;          // 0 degrees (right)
                    } else {
                        // Try to parse as a number if no direction string
                        const numericRotation = parseFloat(rotationStr);
                        if (!isNaN(numericRotation)) {
                            weaponRotation = numericRotation;
                        }
                    }
                }

                console.log(`Weapon facing direction: ${weaponRotation} radians (${weaponRotation * 180 / Math.PI} degrees)`);

                gunPositions.push({
                    x: offsetX + (col * cellSize) + (cellSize / 2),
                    y: offsetY + (row * cellSize) + (cellSize / 2),
                    rotation: weaponRotation, // Individual weapon direction
                    weaponType: cell.id
                });
            }
        }
    }

    return gunPositions;
}

function getScreenGunPositions(ship) {
    const screenPositions = [];

    ship.gunPositions.forEach(gunPos => {
        // Rotate gun position based on ship rotation
        const cos = Math.cos(ship.rotation);
        const sin = Math.sin(ship.rotation);

        // Apply ship size scaling - use shipSize variable instead of ship.scale
        const scaledX = gunPos.x * shipSize;
        const scaledY = gunPos.y * shipSize;

        // Rotate gun position around ship center
        const rotatedX = scaledX * cos - scaledY * sin;
        const rotatedY = scaledX * sin + scaledY * cos;

        // Combine ship rotation with weapon's individual rotation
        const finalGunRotation = ship.rotation + gunPos.rotation;

        screenPositions.push({
            x: ship.x + rotatedX,
            y: ship.y + rotatedY,
            rotation: finalGunRotation,
            weaponType: gunPos.weaponType
        });
    });

    return screenPositions;
}

function shootBullets() {
    console.log('=== MODULAR WEAPON SHOOTING ===');
    console.log('Ship rotation:', playerShip.rotation, 'radians (', playerShip.rotation * 180 / Math.PI, 'degrees)');

    const gunPositions = getScreenGunPositions(playerShip);

    gunPositions.forEach((gunPos, index) => {
        console.log(`Gun ${index}:`);
        console.log(`- Position: (${gunPos.x.toFixed(1)}, ${gunPos.y.toFixed(1)})`);
        console.log(`- Final rotation: ${gunPos.rotation.toFixed(3)} radians (${(gunPos.rotation * 180 / Math.PI).toFixed(1)}°)`);
        console.log(`- Direction: ${getDirectionName(gunPos.rotation)}`);
        console.log(`- Weapon type: ${gunPos.weaponType}`);

        createBullet(gunPos.x, gunPos.y, gunPos.rotation, gunPos.weaponType);
    });
}

function getDirectionName(radians) {
    const degrees = ((radians * 180 / Math.PI) % 360 + 360) % 360;
    if (degrees >= 315 || degrees < 45) return "RIGHT";
    if (degrees >= 45 && degrees < 135) return "DOWN";
    if (degrees >= 135 && degrees < 225) return "LEFT";
    if (degrees >= 225 && degrees < 315) return "UP";
    return "UNKNOWN";
}

function createBullet(x, y, angle, weaponType) {
    const bullet = PIXI.Sprite.from('../../../Assets/bullet.png');

    // Convert screen position to world position
    bullet.worldX = x - app.screen.width / 2 + playerWorldX;
    bullet.worldY = y - app.screen.height / 2 + playerWorldY;

    // Set screen position initially
    bullet.x = x;
    bullet.y = y;

    bullet.rotation = angle + Math.PI / 2;
    bullet.anchor.set(0.5);

    // Calculate bullet velocity in world space
    const speed = 200; // Bullet speed in pixels per second
    bullet.worldVx = Math.cos(angle) * speed;
    bullet.worldVy = Math.sin(angle) * speed;

    // Add lifetime to prevent memory leaks
    bullet.lifetime = 5000; // 5 seconds
    bullet.age = 0;

    app.stage.addChild(bullet);
    bullets.push(bullet);
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet in world space
        bullet.worldX += bullet.worldVx * deltaTime;
        bullet.worldY += bullet.worldVy * deltaTime;

        // Convert world position to screen position
        bullet.x = bullet.worldX - playerWorldX + app.screen.width / 2;
        bullet.y = bullet.worldY - playerWorldY + app.screen.height / 2;

        // Update age
        bullet.age += deltaTime * 1000; // Convert to milliseconds

        // Remove bullets that are too old or too far from player in world space
        const worldDistanceFromPlayer = Math.sqrt(
            Math.pow(bullet.worldX - playerWorldX, 2) +
            Math.pow(bullet.worldY - playerWorldY, 2)
        );

        if (bullet.age > bullet.lifetime || worldDistanceFromPlayer > 1000) {
            app.stage.removeChild(bullet);
            bullets.splice(i, 1);
        }
    }
}

// Make player temporarily invulnerable
function makeInvulnerable() {
    isInvulnerable = true;
    invulnerabilityTimer = invulnerabilityDuration;

    // Visual feedback - make ship flash
    if (playerShip) {
        playerShip.alpha = 0.5;
    }
}

// Handle player death
function handlePlayerDeath() {
    console.log("Player has died!");
    gameState = 'gameOver';

    // Stop ship movement
    floatX = 0;
    floatY = 0;

    // Show game over screen
    showGameOverScreen();

    // Optional: Add death effects
    createDeathEffect();
}

// Show game over screen
function showGameOverScreen() {
    const gameOverStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 64,
        fill: '#ff0000',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
    });

    const gameOverText = new PIXI.Text('GAME OVER', gameOverStyle);
    gameOverText.anchor.set(0.5);
    gameOverText.x = app.screen.width / 2;
    gameOverText.y = app.screen.height / 2 - 50;
    app.stage.addChild(gameOverText);

    const restartStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#ffffff',
        align: 'center'
    });

    const restartText = new PIXI.Text('Click to restart', restartStyle);
    restartText.anchor.set(0.5);
    restartText.x = app.screen.width / 2;
    restartText.y = app.screen.height / 2 + 50;
    app.stage.addChild(restartText);

    // Add click listener for restart
    app.view.addEventListener('click', restartGame);
}

// Update invulnerability timer - add this to your main update() function
function updateInvulnerability(deltaTime) {
    if (isInvulnerable) {
        invulnerabilityTimer -= deltaTime * 1000; // Convert to milliseconds

        if (invulnerabilityTimer <= 0) {
            isInvulnerable = false;

            // Restore ship visibility
            if (playerShip) {
                playerShip.alpha = 1.0;
            }
        } else {
            // Flash effect during invulnerability
            if (playerShip) {
                const flashSpeed = 10;
                playerShip.alpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() * flashSpeed / 1000));
            }
        }
    }
}

document.addEventListener('keydown', function(event) {
    // Test damage with 'T' key
    if (event.code === 'KeyT' && gameState === 'playing') {
        testDamage();
        console.log("Test damage applied!");
    }

    // Restart with 'R' key when dead
    if (event.code === 'KeyR' && gameState === 'gameOver') {
        restartGame();
    }
});

function startGame() {
    gameState = 'playing';
    countdownText.visible = false;

    playerHealth = maxHealth;
    isInvulnerable = false;
    createHealthUI();
    backgroundFill()


    //Temporary sprite add player bult ship later
    playerShip = PIXI.Sprite.from('../../../Data/Ship/ship.png');

    playerShip.scale.set(shipSize);


    playerShip.x = app.screen.width / 2;  // 400
    playerShip.y = app.screen.height / 2; // 300

    playerShip.anchor.set(0.5);

    playerShip.gunPositions = getGunPositions(shipGrid);

    app.stage.addChild(playerShip);


    document.addEventListener('keydown', function(event) {
        if (!keys[event.code]) { // Only if key wasn't already pressed
            keys[event.code] = true;

            // Track input order
            if (event.code === 'KeyA' || event.code === 'KeyD') {
                inputQueue.x.push(event.code);
            }
            if (event.code === 'KeyW' || event.code === 'KeyS') {
                inputQueue.y.push(event.code);
            }
        }
    });

    document.addEventListener('keyup', function(event) {
        keys[event.code] = false;

        // Remove from queue
        if (event.code === 'KeyA' || event.code === 'KeyD') {
            inputQueue.x = inputQueue.x.filter(key => key !== event.code);
        }
        if (event.code === 'KeyW' || event.code === 'KeyS') {
            inputQueue.y = inputQueue.y.filter(key => key !== event.code);
        }
    });

    app.view.addEventListener('mousemove', function(event) {
        const rect = app.view.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    });

    document.addEventListener('mousedown', function(event) {
        if (gameState === 'playing') {
            shootBullets();
        }
    });



    // Start main game loop
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {

    if (gameState === 'waiting' || gameState === 'countdown') return;

    if (currentTime - lastTime >= frameTime) {
        update();
        lastTime = currentTime;
    }



    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'playing') return;

    updateMovementInput();
    updateInvulnerability(frameTime / 1000);

    // Calculate movement
    const moveSpeed = acceleration / frameTime;
    const inputLength = Math.sqrt(floatX * floatX + floatY * floatY);

    let normalizedFloatX = floatX;
    let normalizedFloatY = floatY;

    if (inputLength > 1) {
        normalizedFloatX = floatX / inputLength;
        normalizedFloatY = floatY / inputLength;
    }

    const backgroundMoveX = -normalizedFloatX * moveSpeed;
    const backgroundMoveY = -normalizedFloatY * moveSpeed;

    // UPDATE PLAYER WORLD POSITION - This is the key addition
    playerWorldX += -backgroundMoveX;
    playerWorldY += -backgroundMoveY;

    moveBackground(backgroundMoveX, backgroundMoveY);

    // Existing rotation code...
    const xDiff = mouseX - playerShip.x;
    const yDiff = mouseY - playerShip.y;
    const angle = Math.atan2(yDiff, xDiff);
    playerShip.rotation = angle - (Math.PI * 3) / 2;

    updateBullets(frameTime / 1000);

    // Update enemy system
    updateEnemySystem(frameTime / 1000);
}

