// Ship visualization configuration
const SHIP_RENDER_CONFIG = {
    cellSize: 100,           // Size of each grid cell in pixels
    padding: 10,            // Padding around the ship
    backgroundColor: 'transparent', // Background color ('transparent', '#000000', etc.)
    outputFormat: 'png',    // Output format ('png', 'jpeg', 'webp')
    quality: 1.0,           // Quality for lossy formats (0.0 to 1.0)
    scale: 1,               // Scale multiplier for higher resolution
    gridLines: false,       // Show grid lines
    gridLineColor: 'rgba(255,255,255,0.2)', // Grid line color
    gridLineWidth: 1        // Grid line width
};

// Get rotation angle in degrees for rendering
function getRotationAngle(rotation) {
    const rotationAngles = {
        'UP': 0,
        'RIGHT': 90,
        'DOWN': 180,
        'LEFT': 270
    };
    return rotationAngles[rotation] || 0;
}

// Load and rotate image
function loadAndRotateImage(imageSrc, rotation) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const angle = getRotationAngle(rotation);

            if (angle === 0) {
                // No rotation needed
                resolve(img);
                return;
            }

            // Create a canvas to rotate the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // For 90 and 270 degree rotations, swap width and height
            if (angle === 90 || angle === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            // Move to center, rotate, then move back
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            // Create a new image from the rotated canvas
            const rotatedImg = new Image();
            rotatedImg.onload = () => resolve(rotatedImg);
            rotatedImg.onerror = reject;
            rotatedImg.src = canvas.toDataURL();
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

async function constructShip() {
    try {
        // Calculate actual dimensions
        const actualCellSize = SHIP_RENDER_CONFIG.cellSize * SHIP_RENDER_CONFIG.scale;
        const actualPadding = SHIP_RENDER_CONFIG.padding * SHIP_RENDER_CONFIG.scale;

        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = (gridSize * actualCellSize) + (actualPadding * 2);
        canvas.height = (gridSize * actualCellSize) + (actualPadding * 2);

        // Set background
        if (SHIP_RENDER_CONFIG.backgroundColor !== 'transparent') {
            ctx.fillStyle = SHIP_RENDER_CONFIG.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw grid lines if enabled
        if (SHIP_RENDER_CONFIG.gridLines) {
            ctx.strokeStyle = SHIP_RENDER_CONFIG.gridLineColor;
            ctx.lineWidth = SHIP_RENDER_CONFIG.gridLineWidth;

            // Vertical lines
            for (let x = 0; x <= gridSize; x++) {
                const xPos = actualPadding + (x * actualCellSize);
                ctx.beginPath();
                ctx.moveTo(xPos, actualPadding);
                ctx.lineTo(xPos, canvas.height - actualPadding);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= gridSize; y++) {
                const yPos = actualPadding + (y * actualCellSize);
                ctx.beginPath();
                ctx.moveTo(actualPadding, yPos);
                ctx.lineTo(canvas.width - actualPadding, yPos);
                ctx.stroke();
            }
        }

        // Load and draw all component images with rotation
        const imagePromises = [];

        Object.keys(shipData).forEach(key => {
            const [x, y] = key.split(',').map(Number);
            const componentData = shipData[key];

            // Handle both old format (string) and new format (object)
            const componentType = typeof componentData === 'string' ? componentData : componentData.id;
            const rotation = typeof componentData === 'object' ? componentData.rotation : 'UP';

            const component = getComponent(componentType);

            if (component && component.image) {
                const imagePromise = loadAndRotateImage(component.image, rotation)
                    .then(rotatedImg => {
                        const drawX = actualPadding + (x * actualCellSize);
                        const drawY = actualPadding + (y * actualCellSize);

                        // Draw the rotated image
                        ctx.drawImage(rotatedImg, drawX, drawY, actualCellSize, actualCellSize);
                    })
                    .catch(error => {
                        console.warn(`Failed to load/rotate image for component: ${componentType}`, error);

                        // Draw a fallback rectangle with text
                        const drawX = actualPadding + (x * actualCellSize);
                        const drawY = actualPadding + (y * actualCellSize);

                        ctx.fillStyle = '#444444';
                        ctx.fillRect(drawX, drawY, actualCellSize, actualCellSize);

                        ctx.fillStyle = '#ffffff';
                        ctx.font = `${Math.floor(actualCellSize * 0.2)}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(
                            component.displayName || componentType,
                            drawX + actualCellSize / 2,
                            drawY + actualCellSize / 2
                        );

                        // Add rotation indicator
                        ctx.fillStyle = '#ffff00';
                        ctx.font = `${Math.floor(actualCellSize * 0.15)}px Arial`;
                        ctx.fillText(
                            rotation,
                            drawX + actualCellSize / 2,
                            drawY + actualCellSize * 0.8
                        );
                    });

                imagePromises.push(imagePromise);
            }
        });

        // Wait for all images to load and be drawn
        await Promise.all(imagePromises);

        // Convert canvas to data URL
        const dataURL = canvas.toDataURL(`image/${SHIP_RENDER_CONFIG.outputFormat}`, SHIP_RENDER_CONFIG.quality);

        // Extract base64 data (remove data:image/png;base64, prefix)
        const base64Data = dataURL.split(',')[1];

        // Save using Electron API
        const filePath = 'Data/Ship/ship.png';

        if (window.electronAPI && window.electronAPI.savePNG) {
            await window.electronAPI.savePNG(filePath, base64Data);
            //console.log('Ship image saved successfully to:', filePath);
        } else {
            console.error('electronAPI.savePNG function not available');
            throw new Error('savePNG function not available');
        }

        return canvas; // Return canvas in case you want to use it elsewhere

    } catch (error) {
        console.error('Failed to construct ship image:', error);
        throw error;
    }
}