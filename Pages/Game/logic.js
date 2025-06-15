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
app.view.addEventListener('click', startCountdown);

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


function RotateShip(event){

    if (gameState !== 'playing') return;

    const rect = app.view.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const xDiff = mouseX - playerShip.x;
    const yDiff = mouseY - playerShip.y;
    const angle = Math.atan2(yDiff, xDiff);

    playerShip.rotation = angle;
}

app.view.addEventListener('mousemove', RotateShip);

function update() {

}

// Add click event listener for coordinates
app.view.addEventListener('mousemove', handleGameClick);

function handleGameClick(event) {
    if (gameState !== 'playing') return;

    // Get the canvas bounding rect to handle any scaling/positioning
    const rect = app.view.getBoundingClientRect();

    // Calculate coordinates relative to the canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;


    console.log(`Clicked at: X=${Math.round(x)}, Y=${Math.round(y)}`);
}

