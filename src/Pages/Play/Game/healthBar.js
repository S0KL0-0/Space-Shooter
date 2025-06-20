// Health UI styles
const healthBarStyle = {
    width: 200,
    height: 20,
    x: 20,
    y: 20
};

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

function takeDamage(damage, damageSource = "unknown") {

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

    screenShake();

    return false; // Player survived
}

function healPlayer(healAmount) {
    const oldHealth = playerHealth;
    playerHealth = Math.min(maxHealth, playerHealth + healAmount);

    console.log(`Player healed for ${healAmount}. Health: ${oldHealth} -> ${playerHealth}`);
    updateHealthBar();

    return playerHealth - oldHealth; // Return actual amount healed
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

function collectHealthPowerup(healAmount = 25) {
    return healPlayer(healAmount);
}

function testDamage() {
    takeDamage(25, "test damage");
}