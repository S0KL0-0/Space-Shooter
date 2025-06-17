const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 1000,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('src/index.html');
}

// Handle JSON loading
ipcMain.handle('load-json', async (event, filePath) => {
    try {
        // Resolve path relative to app directory
        const fullPath = path.resolve(__dirname, filePath);

        // Security check - ensure file is within app directory
        if (!fullPath.startsWith(__dirname)) {
            throw new Error('Access denied: File outside app directory');
        }

        const data = await fs.readFile(fullPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Failed to load JSON: ${error.message}`);
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});