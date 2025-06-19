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
const maxSpeed = 200;
const acceleration = 0.5;
const deceleration = 0.5;
const dash = 0;

// Game states
let gameState = 'waiting'; // waiting, countdown, playing
let countdownValue = 3;
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

function startGame() {
    gameState = 'playing';
    countdownText.visible = false;


    //Temporary sprite add player bult ship later
    playerShip = PIXI.Sprite.from('../../ShipModules/Images/Player/Player_Reactor.png');

    playerShip.x = app.screen.width / 2;  // 400
    playerShip.y = app.screen.height / 2; // 300

    playerShip.anchor.set(0.5);

    app.stage.addChild(playerShip);

    app.view.addEventListener('mousemove', function(event) {
        const rect = app.view.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
    });

    // Start main game loop
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    if (gameState !== 'playing') return;

    if (currentTime - lastTime >= frameTime) {
        update();
        lastTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
}



function update() {
    if (gameState !== 'playing') return;

    // Calculate angle and rotate ship
    const xDiff = mouseX - playerShip.x;
    const yDiff = mouseY - playerShip.y;
    const angle = Math.atan2(yDiff, xDiff);

    playerShip.rotation = angle;


}


