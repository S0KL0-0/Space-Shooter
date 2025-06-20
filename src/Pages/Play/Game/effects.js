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