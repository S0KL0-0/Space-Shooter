// Ship visualization configuration
const SHIP_RENDER_CONFIG = {
    cellSize: 64,           // Size of each grid cell in pixels
    padding: 10,            // Padding around the ship
    backgroundColor: 'transparent', // Background color ('transparent', '#000000', etc.)
    outputFormat: 'png',    // Output format ('png', 'jpeg', 'webp')
    quality: 1.0,           // Quality for lossy formats (0.0 to 1.0)
    scale: 1,               // Scale multiplier for higher resolution
    gridLines: false,       // Show grid lines
    gridLineColor: 'rgba(255,255,255,0.2)', // Grid line color
    gridLineWidth: 1        // Grid line width
};

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

        // Load and draw all component images
        const imagePromises = [];

        Object.keys(shipData).forEach(key => {
            const [x, y] = key.split(',').map(Number);
            const componentType = shipData[key];
            const component = getComponent(componentType);

            if (component && component.image) {
                const imagePromise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const drawX = actualPadding + (x * actualCellSize);
                        const drawY = actualPadding + (y * actualCellSize);

                        // Draw the image
                        ctx.drawImage(img, drawX, drawY, actualCellSize, actualCellSize);
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image for component: ${componentType}`);

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

                        resolve();
                    };
                    img.src = component.image;
                });

                imagePromises.push(imagePromise);
            }
        });

        // Wait for all images to load
        await Promise.all(imagePromises);

        // Convert canvas to data URL
        const dataURL = canvas.toDataURL(`image/${SHIP_RENDER_CONFIG.outputFormat}`, SHIP_RENDER_CONFIG.quality);

        // Extract base64 data (remove data:image/png;base64, prefix)
        const base64Data = dataURL.split(',')[1];

        // Save using Electron API
        const filePath = 'Data/Ship/ship.png';

        if (window.electronAPI && window.electronAPI.savePNG) {
            await window.electronAPI.savePNG(filePath, base64Data);
            console.log('Ship image saved successfully to:', filePath);
        } else {
            console.error('electronAPI.savePNG function not available');
            throw new Error('savePNG function not available');
        }

        console.log('Ship image constructed and downloaded successfully');

        return canvas; // Return canvas in case you want to use it elsewhere

    } catch (error) {
        console.error('Failed to construct ship image:', error);
        throw error;
    }
}