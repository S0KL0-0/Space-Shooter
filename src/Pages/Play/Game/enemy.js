// Enemy system for the space shooter game - FIXED FOR WORLD SPACE
// Replace your existing enemy.js with this corrected version

// Enemy configuration
const ENEMY_CONFIG = {
    enemy_1_gun: {
        sprite: '../../../Assets/Enemies/enemy_1_gun.png',
        health: 30,
        speed: 80,
        damage: 15,
        shootCooldown: 2000, // 2 seconds
        bulletSpeed: 150,
        scale: 0.3,
        scoreValue: 100,
        points: 10
    },
    enemy_3_gun: {
        sprite: '../../../Assets/Enemies/enemy_3_gun.png',
        health: 50,
        speed: 60,
        damage: 25,
        shootCooldown: 1500, // 1.5 seconds
        bulletSpeed: 180,
        scale: 0.35,
        scoreValue: 200,
        points: 20
    }
};

// Enemy bullets array (separate from player bullets)
let enemyBullets = [];

// Enemy spawn system
let enemySpawnTimer = 0;
const ENEMY_SPAWN_INTERVAL = 100; // 3 seconds between spawns
let maxEnemies = 5; // Maximum enemies on screen at once

// Calculate spawn radius based on screen size
function getSpawnRadius() {
    const maxViewDistance = Math.max(app.screen.width / 2, app.screen.height / 2);
    return maxViewDistance * 1.5;
}

// Get random spawn position outside player's view IN WORLD SPACE
function getRandomSpawnPosition() {
    const radius = getSpawnRadius();
    const angle = Math.random() * Math.PI * 2;

    // Spawn in world coordinates relative to player's world position
    return {
        worldX: playerWorldX + Math.cos(angle) * radius,
        worldY: playerWorldY + Math.sin(angle) * radius
    };
}

// Create a new enemy
function createEnemy(type = null) {
    // Random enemy type if not specified
    const enemyTypes = Object.keys(ENEMY_CONFIG);
    const enemyType = type || enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const config = ENEMY_CONFIG[enemyType];

    const spawnPos = getRandomSpawnPosition();

    // Create enemy sprite
    const enemy = PIXI.Sprite.from(config.sprite);

    // Store world position
    enemy.worldX = spawnPos.worldX;
    enemy.worldY = spawnPos.worldY;

    // Convert to screen position for display
    enemy.x = enemy.worldX - playerWorldX + app.screen.width / 2;
    enemy.y = enemy.worldY - playerWorldY + app.screen.height / 2;

    enemy.anchor.set(0.5);
    enemy.scale.set(config.scale);

    // Enemy properties
    enemy.enemyType = enemyType;
    enemy.health = config.health;
    enemy.maxHealth = config.health;
    enemy.speed = config.speed;
    enemy.damage = config.damage;
    enemy.shootCooldown = config.shootCooldown;
    enemy.bulletSpeed = config.bulletSpeed;
    enemy.scoreValue = config.scoreValue;
    enemy.lastShootTime = 0;

    // Movement properties (world space velocities)
    enemy.worldVx = 0;
    enemy.worldVy = 0;

    app.stage.addChild(enemy);
    enemies.push(enemy);

    //console.log(`Spawned ${enemyType} at world (${spawnPos.worldX.toFixed(1)}, ${spawnPos.worldY.toFixed(1)})`);

    return enemy;
}

// Update enemy behavior
function updateEnemies(deltaTime) {
    const currentTime = Date.now();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const config = ENEMY_CONFIG[enemy.enemyType];

        // Calculate distance and direction to player IN WORLD SPACE
        const dx = playerWorldX - enemy.worldX;
        const dy = playerWorldY - enemy.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Remove enemies that are too far away (cleanup)
        const maxDistance = getSpawnRadius() * 2;
        if (distance > maxDistance) {
            app.stage.removeChild(enemy);
            enemies.splice(i, 1);
            continue;
        }

        // Move towards player in world space
        if (distance > 0) {
            const dirX = dx / distance;
            const dirY = dy / distance;

            enemy.worldVx = dirX * enemy.speed;
            enemy.worldVy = dirY * enemy.speed;

            // Move enemy in world space
            enemy.worldX += enemy.worldVx * deltaTime;
            enemy.worldY += enemy.worldVy * deltaTime;

            // Update screen position
            enemy.x = enemy.worldX - playerWorldX + app.screen.width / 2;
            enemy.y = enemy.worldY - playerWorldY + app.screen.height / 2;

            // Rotate enemy to face player
            const angle = Math.atan2(dy, dx);
            enemy.rotation = angle - Math.PI / 2; // Adjust for sprite orientation
        }

        // Shooting behavior
        if (currentTime - enemy.lastShootTime >= enemy.shootCooldown) {
            // Only shoot if player is within reasonable range
            if (distance < getSpawnRadius() * 1.2) {
                enemyShoot(enemy);
                enemy.lastShootTime = currentTime;
            }
        }

        // Check collision with player (world space)
        if (distance < 40) { // Collision threshold
            if (enemyCollisionDamage(enemy.enemyType)) {
                // Player died from collision
                return;
            }

            // Remove enemy after collision
            createEnemyDeathEffect(enemy);
            app.stage.removeChild(enemy);
            enemies.splice(i, 1);
        }
    }
}

// Enemy shooting function - NOW USES WORLD SPACE
function enemyShoot(enemy) {
    // Calculate direction to player in world space
    const dx = playerWorldX - enemy.worldX;
    const dy = playerWorldY - enemy.worldY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const dirX = dx / distance;
    const dirY = dy / distance;

    // Create enemy bullet
    const bullet = PIXI.Sprite.from('../../../Assets/bullet.png');

    // Set world position
    bullet.worldX = enemy.worldX;
    bullet.worldY = enemy.worldY;

    // Set screen position
    bullet.x = enemy.x;
    bullet.y = enemy.y;

    bullet.anchor.set(0.5);
    bullet.scale.set(0.8); // Slightly smaller than player bullets
    bullet.tint = 0xff4444; // Red tint to distinguish from player bullets

    // Set bullet velocity IN WORLD SPACE
    bullet.worldVx = dirX * enemy.bulletSpeed;
    bullet.worldVy = dirY * enemy.bulletSpeed;
    bullet.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    // Bullet properties
    bullet.damage = enemy.damage;
    bullet.lifetime = 5000; // 5 seconds
    bullet.age = 0;

    app.stage.addChild(bullet);
    enemyBullets.push(bullet);
}

// Update enemy bullets - NOW USES WORLD SPACE
function updateEnemyBullets(deltaTime) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        // Move bullet in world space
        bullet.worldX += bullet.worldVx * deltaTime;
        bullet.worldY += bullet.worldVy * deltaTime;

        // Update screen position
        bullet.x = bullet.worldX - playerWorldX + app.screen.width / 2;
        bullet.y = bullet.worldY - playerWorldY + app.screen.height / 2;

        // Update age
        bullet.age += deltaTime * 1000;

        // Check collision with player (world space)
        const dx = playerWorldX - bullet.worldX;
        const dy = playerWorldY - bullet.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30) { // Collision threshold
            // Player hit by enemy bullet
            if (bulletHitPlayer(bullet.damage)) {
                // Player died
                app.stage.removeChild(bullet);
                enemyBullets.splice(i, 1);
                return;
            }

            // Remove bullet after hit
            app.stage.removeChild(bullet);
            enemyBullets.splice(i, 1);
            continue;
        }

        // Remove bullets that are too old or too far from player (world space)
        const worldDistanceFromPlayer = Math.sqrt(
            Math.pow(bullet.worldX - playerWorldX, 2) +
            Math.pow(bullet.worldY - playerWorldY, 2)
        );

        if (bullet.age > bullet.lifetime || worldDistanceFromPlayer > 1000) {
            app.stage.removeChild(bullet);
            enemyBullets.splice(i, 1);
        }
    }
}

// Player bullet vs enemy collision - ALREADY CORRECT
function checkPlayerBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];

            // Calculate distance using world positions
            const bulletWorldX = bullet.worldX;
            const bulletWorldY = bullet.worldY;
            const enemyWorldX = enemy.worldX;
            const enemyWorldY = enemy.worldY;

            const dx = bulletWorldX - enemyWorldX;
            const dy = bulletWorldY - enemyWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 30) { // Collision threshold
                // Enemy hit by player bullet
                enemy.health -= 20; // Player bullet damage

                // Remove bullet
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);

                // Create hit effect at screen position
                createHitEffect(enemy.x, enemy.y);

                // Check if enemy is destroyed
                if (enemy.health <= 0) {
                    createEnemyDeathEffect(enemy);
                    app.stage.removeChild(enemy);
                    enemies.splice(j, 1);

                    onEnemyDefeated(enemy);
                }

                break; // Bullet can only hit one enemy
            }
        }
    }
}

// Enemy spawn management
function updateEnemySpawning(deltaTime) {
    enemySpawnTimer += deltaTime * 1000;

    if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL && enemies.length < maxEnemies) {
        createEnemy();
        enemySpawnTimer = 0;
    }
}

// Create hit effect when enemy is hit
function createHitEffect(x, y) {
    for (let i = 0; i < 5; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xffff00); // Yellow hit effect
        particle.drawCircle(0, 0, Math.random() * 3 + 1);
        particle.endFill();

        particle.x = x;
        particle.y = y;

        // Random velocity
        particle.vx = (Math.random() - 0.5) * 100;
        particle.vy = (Math.random() - 0.5) * 100;
        particle.life = 1.0;

        app.stage.addChild(particle);

        // Animate particle
        const animateParticle = () => {
            particle.x += particle.vx * 0.016;
            particle.y += particle.vy * 0.016;
            particle.life -= 0.05;
            particle.alpha = particle.life;

            if (particle.life <= 0) {
                app.stage.removeChild(particle);
            } else {
                requestAnimationFrame(animateParticle);
            }
        };

        requestAnimationFrame(animateParticle);
    }
}

// Create enemy death effect
function createEnemyDeathEffect(enemy) {
    for (let i = 0; i < 15; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(Math.random() > 0.5 ? 0xff6600 : 0xff0000);
        particle.drawCircle(0, 0, Math.random() * 4 + 2);
        particle.endFill();

        particle.x = enemy.x;
        particle.y = enemy.y;

        // Random velocity
        particle.vx = (Math.random() - 0.5) * 150;
        particle.vy = (Math.random() - 0.5) * 150;
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
}

// Add this to your main update function
function updateEnemySystem(deltaTime) {
    updateEnemySpawning(deltaTime);
    updateEnemies(deltaTime);
    updateEnemyBullets(deltaTime);
    checkPlayerBulletEnemyCollisions();
}

// Clear all enemies (for game restart)
function clearAllEnemies() {
    // Remove all enemies
    enemies.forEach(enemy => {
        app.stage.removeChild(enemy);
    });
    enemies = [];

    // Remove all enemy bullets
    enemyBullets.forEach(bullet => {
        app.stage.removeChild(bullet);
    });
    enemyBullets = [];

    // Reset spawn timer
    enemySpawnTimer = 0;
}

function clearAllBullets() {
    bullets.forEach(bullet => {
        app.stage.removeChild(bullet);
    });
    bullets = [];
}


async function addResearchPoints(points) {
    try {
        // Load current points from the JSON file
        const data = await window.electronAPI.loadJSON('Data/other.json');
        const currentPoints = data && typeof data.Points === 'number' ? data.Points : 0;

        // Add the new points
        const newPoints = currentPoints + points;

        // Update just the Points property in the JSON file
        await window.electronAPI.updateJSON('Data/other.json', 'Points', newPoints);

        return newPoints;
    } catch (error) {
        console.error('Failed to add research points:', error);
        return 0;
    }
}

function onEnemyDefeated(enemy) {
    // Get enemy type from the enemy object
    const enemyType = enemy.enemyType || 'enemy_1_gun'; // fallback to default type

    // Get points from enemy config
    const enemyConfig = ENEMY_CONFIG[enemyType];
    if (enemyConfig && enemyConfig.points) {
        // Add research points asynchronously
        addResearchPoints(enemyConfig.points).then(newTotal => {
            console.log(`Enemy defeated! Gained ${enemyConfig.points} points. Total: ${newTotal}`);
        }).catch(error => {
            console.error('Error adding research points:', error);
        });
    }

    // Add to score if there's a global score variable
    if (typeof score !== 'undefined' && enemyConfig && enemyConfig.scoreValue) {
        score += enemyConfig.scoreValue;
    }

}