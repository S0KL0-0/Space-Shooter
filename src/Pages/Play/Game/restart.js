function restartGame() {
    console.log("Restarting game...");

    // Reset game state
    gameState = 'playing';

    // Reset health
    playerHealth = maxHealth;
    isInvulnerable = false;
    invulnerabilityTimer = 0;

    // Reset movement
    floatX = 0;
    floatY = 0;
    keys = {};
    inputQueue = { x: [], y: [] };

    // Reset world position
    playerWorldX = 0;
    playerWorldY = 0;

    // Clear arrays
    bullets = [];
    enemies = [];

    // ADD THIS LINE - Clear enemy system
    clearAllEnemies();

    clearAllBullets();

    // Rest of your existing restart code...
    app.stage.removeChildren();
    existingTiles.clear();
    lastTileCheckX = 0;
    lastTileCheckY = 0;
    backgroundContainer = null;

    backgroundFill();

    // Recreate player ship...
    playerShip = PIXI.Sprite.from('../../../Data/Ship/ship.png');
    playerShip.scale.set(shipSize);
    playerShip.x = app.screen.width / 2;
    playerShip.y = app.screen.height / 2;
    playerShip.anchor.set(0.5);
    playerShip.gunPositions = getGunPositions(shipGrid);
    playerShip.visible = true;
    playerShip.alpha = 1.0;
    app.stage.addChild(playerShip);

    healthBar = null;
    healthText = null;
    createHealthUI();

    app.view.removeEventListener('click', restartGame);

    console.log("Game restarted successfully!");
}