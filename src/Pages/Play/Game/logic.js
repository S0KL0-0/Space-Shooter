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

    const tile = PIXI.Sprite.from('../../../Assets/Modules/Modules/Images/background/background.png');

    tile.x = worldX + TILE_SIZE / 2;
    tile.y = worldY + TILE_SIZE / 2;
    tile.anchor.set(0.5);

    const randomRotation = (Math.floor(seedRandom(seedX, seedY) * 4) * Math.PI) / 2;
    tile.rotation = randomRotation;

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


// movement function
function updateMovementInput(){

    floatX = 0;
    floatY = 0;

    if (keys['KeyA'] && keys['KeyD']) {
        // Both pressed - use the most recent one
        floatX = inputQueue.x[inputQueue.x.length - 1] === 'KeyA' ? -1 : 1;
    } else if (keys['KeyA']) {
        floatX = 1;
    } else if (keys['KeyD']) {
        floatX = -1;
    } else {
        floatX = 0;
    }

    // Handle Y axis (W/S keys)
    if (keys['KeyW'] && keys['KeyS']) {
        // Both pressed - use the most recent one
        floatY = inputQueue.y[inputQueue.y.length - 1] === 'KeyW' ? -1 : 1;
    } else if (keys['KeyW']) {
        floatY = 1;
    } else if (keys['KeyS']) {
        floatY = -1;
    } else {
        floatY = 0;
    }

}




function getGunPositions(shipGrid) {
    const gunPositions = [];
    const cellSize = 32;
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

        // Apply ship scale
        const scaledX = gunPos.x * ship.scale.x;
        const scaledY = gunPos.y * ship.scale.y;

        // Rotate gun position around ship center
        const rotatedX = scaledX * cos - scaledY * sin;
        const rotatedY = scaledX * sin + scaledY * cos;

        // IMPORTANT: Combine ship rotation with weapon's individual rotation
        // This makes the weapon maintain its relative direction even when ship rotates
        const finalGunRotation = ship.rotation + gunPos.rotation;

        screenPositions.push({
            x: ship.x + rotatedX,
            y: ship.y + rotatedY,
            rotation: finalGunRotation, // Combined rotation
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

// Fixed createBullet function
function createBullet(x, y, angle, weaponType) {
    const bullet = PIXI.Sprite.from('../../../Data/Bullets/bullet.png');
    bullet.x = x;
    bullet.y = y;
    // Adjust rotation - your ship rotation already accounts for sprite orientation
    bullet.rotation = angle;
    bullet.anchor.set(0.5);

    // Calculate bullet velocity based on the ship's facing direction
    const speed = 200; // Bullet speed in pixels per second
    bullet.vx = Math.cos(angle) * speed;
    bullet.vy = Math.sin(angle) * speed;

    // Add lifetime to prevent memory leaks
    bullet.lifetime = 5000; // 5 seconds
    bullet.age = 0;

    app.stage.addChild(bullet);
    bullets.push(bullet);
}

// Add bullet update function to your update() function
function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet in screen space
        bullet.x += bullet.vx * deltaTime;
        bullet.y += bullet.vy * deltaTime;

        // Update age
        bullet.age += deltaTime * 1000; // Convert to milliseconds

        // Remove bullets that are too old or off screen
        if (bullet.age > bullet.lifetime ||
            bullet.x < -100 || bullet.x > app.screen.width + 100 ||
            bullet.y < -100 || bullet.y > app.screen.height + 100) {

            app.stage.removeChild(bullet);
            bullets.splice(i, 1);
        }
    }
}



// Health UI styles
const healthBarStyle = {
    width: 200,
    height: 20,
    x: 20,
    y: 20
};

// Create health UI function - call this in startGame()
function createHealthUI() {
    // Health bar background
    const healthBarBg = new PIXI.Graphics();
    healthBarBg.beginFill(0x333333);
    healthBarBg.drawRect(healthBarStyle.x, healthBarStyle.y, healthBarStyle.width, healthBarStyle.height);
    healthBarBg.endFill();
    app.stage.addChild(healthBarBg);

    // Health bar foreground
    healthBar = new PIXI.Graphics();
    updateHealthBar();
    app.stage.addChild(healthBar);

    // Health text
    const healthTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#ffffff',
        align: 'left'
    });

    healthText = new PIXI.Text(`Health: ${playerHealth}/${maxHealth}`, healthTextStyle);
    healthText.x = healthBarStyle.x;
    healthText.y = healthBarStyle.y + healthBarStyle.height + 5;
    app.stage.addChild(healthText);
}

// Update health bar visual
function updateHealthBar() {
    if (!healthBar) return;

    healthBar.clear();

    // Calculate health percentage
    const healthPercent = Math.max(0, playerHealth / maxHealth);
    const barWidth = healthBarStyle.width * healthPercent;

    // Choose color based on health percentage
    let healthColor;
    if (healthPercent > 0.6) {
        healthColor = 0x00ff00; // Green
    } else if (healthPercent > 0.3) {
        healthColor = 0xffff00; // Yellow
    } else {
        healthColor = 0xff0000; // Red
    }

    // Draw health bar
    healthBar.beginFill(healthColor);
    healthBar.drawRect(healthBarStyle.x, healthBarStyle.y, barWidth, healthBarStyle.height);
    healthBar.endFill();

    // Update text
    if (healthText) {
        healthText.text = `Health: ${Math.max(0, playerHealth)}/${maxHealth}`;
    }
}

// Main function to remove health
function takeDamage(damage, damageSource = "unknown") {
    // Check if player is invulnerable
    if (isInvulnerable) {
        console.log(`Damage blocked by invulnerability: ${damage} from ${damageSource}`);
        return false;
    }

    // Apply damage
    playerHealth -= damage;
    console.log(`Player took ${damage} damage from ${damageSource}. Health: ${playerHealth}/${maxHealth}`);

    // Update UI
    updateHealthBar();

    // Make player temporarily invulnerable
    makeInvulnerable();

    // Check if player died
    if (playerHealth <= 0) {
        playerHealth = 0;
        handlePlayerDeath();
        return true; // Player died
    }

    // Add screen shake effect for damage feedback
    screenShake();

    return false; // Player survived
}

// Function to heal player
function healPlayer(healAmount) {
    const oldHealth = playerHealth;
    playerHealth = Math.min(maxHealth, playerHealth + healAmount);

    console.log(`Player healed for ${healAmount}. Health: ${oldHealth} -> ${playerHealth}`);
    updateHealthBar();

    return playerHealth - oldHealth; // Return actual amount healed
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

// Simple screen shake effect
function screenShake() {
    if (!app.stage) return;

    const shakeIntensity = 10;
    const shakeDuration = 200; // milliseconds
    let shakeTimer = 0;

    const originalX = app.stage.x;
    const originalY = app.stage.y;

    const shakeInterval = setInterval(() => {
        shakeTimer += 16; // Assuming ~60 FPS

        if (shakeTimer >= shakeDuration) {
            // Reset position and stop shaking
            app.stage.x = originalX;
            app.stage.y = originalY;
            clearInterval(shakeInterval);
        } else {
            // Apply random shake
            const progress = 1 - (shakeTimer / shakeDuration); // Fade out shake
            const currentIntensity = shakeIntensity * progress;

            app.stage.x = originalX + (Math.random() - 0.5) * currentIntensity;
            app.stage.y = originalY + (Math.random() - 0.5) * currentIntensity;
        }
    }, 16);
}

// Create death effect (explosion)
function createDeathEffect() {
    if (!playerShip) return;

    // Simple explosion effect using particles
    for (let i = 0; i < 20; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(Math.random() > 0.5 ? 0xff6600 : 0xff0000);
        particle.drawCircle(0, 0, Math.random() * 5 + 2);
        particle.endFill();

        particle.x = playerShip.x;
        particle.y = playerShip.y;

        // Random velocity
        particle.vx = (Math.random() - 0.5) * 200;
        particle.vy = (Math.random() - 0.5) * 200;
        particle.life = 1.0;

        app.stage.addChild(particle);

        // Animate particle
        const animateParticle = () => {
            particle.x += particle.vx * 0.016;
            particle.y += particle.vy * 0.016;
            particle.life -= 0.02;
            particle.alpha = particle.life;
            particle.scale.set(particle.life);

            if (particle.life <= 0) {
                app.stage.removeChild(particle);
            } else {
                requestAnimationFrame(animateParticle);
            }
        };

        requestAnimationFrame(animateParticle);
    }

    // Hide player ship
    if (playerShip) {
        playerShip.visible = false;
    }
}

// Restart game function
function restartGame() {
    console.log("Restarting game...");

    // Reset game state
    gameState = 'playing'; // Go directly to playing, skip waiting/countdown

    // Reset health
    playerHealth = maxHealth;
    isInvulnerable = false;
    invulnerabilityTimer = 0;

    // Reset movement
    floatX = 0;
    floatY = 0;
    keys = {}; // Clear all pressed keys
    inputQueue = { x: [], y: [] }; // Clear input queue

    // Reset world position
    playerWorldX = 0;
    playerWorldY = 0;

    // Clear arrays
    bullets = [];
    enemies = [];

    // Clear stage completely
    app.stage.removeChildren();

    // Reset background system
    existingTiles.clear();
    lastTileCheckX = 0;
    lastTileCheckY = 0;
    backgroundContainer = null;

    // Recreate everything
    backgroundFill();

    // Recreate player ship
    playerShip = PIXI.Sprite.from('../../../Data/Ship/ship.png');
    playerShip.scale.set(0.5);
    playerShip.x = app.screen.width / 2;
    playerShip.y = app.screen.height / 2;
    playerShip.anchor.set(0.5);
    playerShip.gunPositions = getGunPositions(shipGrid);
    playerShip.visible = true;
    playerShip.alpha = 1.0;
    app.stage.addChild(playerShip);

    // Recreate health UI
    healthBar = null; // Reset references
    healthText = null;
    createHealthUI();

    // Remove any existing click listeners
    app.view.removeEventListener('click', restartGame);

    console.log("Game restarted successfully!");
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


function bulletHitPlayer(bulletDamage = 10) {
    return takeDamage(bulletDamage, "enemy bullet");
}

function enemyCollisionDamage(enemyType = "basic") {
    const damage = enemyType === "basic" ? 20 : 30;
    return takeDamage(damage, `${enemyType} enemy collision`);
}

function environmentalDamage(damageAmount = 5) {
    return takeDamage(damageAmount, "environmental hazard");
}

// Health powerup function
function collectHealthPowerup(healAmount = 25) {
    return healPlayer(healAmount);
}

function testDamage() {
    takeDamage(25, "test damage");
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

    playerShip.scale.set(0.5);


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
    updateInvulnerability(frameTime / 1000)

    const moveSpeed = acceleration / frameTime;

// Calculate the length of the movement vector
    const inputLength = Math.sqrt(floatX * floatX + floatY * floatY);

    let normalizedFloatX = floatX;
    let normalizedFloatY = floatY;

// If we're moving diagonally, normalize to keep speed consistent
    if (inputLength > 1) {
        normalizedFloatX = floatX / inputLength;
        normalizedFloatY = floatY / inputLength;
    }

    const backgroundMoveX = -normalizedFloatX * moveSpeed;
    const backgroundMoveY = -normalizedFloatY * moveSpeed;


    moveBackground(backgroundMoveX, backgroundMoveY);


    // Calculate angle and rotate ship
    const xDiff = mouseX - playerShip.x;
    const yDiff = mouseY - playerShip.y;
    const angle = Math.atan2(yDiff, xDiff);

    // ADD THIS LINE: Subtract π/2 (90 degrees) because your sprite points up by default
    playerShip.rotation = angle - (Math.PI * 3) /2;


    updateBullets(frameTime / 1000);
}


