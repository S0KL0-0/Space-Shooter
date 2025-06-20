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

let sharedData = {} // GlobalData, persists across html pages

ipcMain.handle('set-global', (event, key, value) => {
    sharedData[key] = value
})

ipcMain.handle('get-global', (event, key) => {
    return sharedData[key]
})

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

ipcMain.handle('update-json', async (event, filePath, item, data) => {
    try {
        // Resolve path relative to app directory
        const fullPath = path.resolve(__dirname, filePath);

        // Security check - ensure file is within app directory
        if (!fullPath.startsWith(__dirname)) {
            throw new Error('Access denied: File outside app directory');
        }

        const loadedData = await fs.readFile(fullPath, 'utf8');
        const parsedData = JSON.parse(loadedData);

        parsedData[item] = data;

        await fs.writeFile(fullPath, JSON.stringify(parsedData, null, 2), 'utf8');

    } catch (error) {
        throw new Error(`Failed to load JSON: ${error.message}`);
    }
});

ipcMain.handle('save-json', async (event, filePath, data) => {
    try {
        // Resolve path relative to app directory
        const fullPath = path.resolve(__dirname, filePath);

        // Security check - ensure file is within app directory
        if (!fullPath.startsWith(__dirname)) {
            throw new Error('Access denied: File outside app directory');
        }

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Write JSON data to file (create or overwrite)
        await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf8');

    } catch (error) {
        throw new Error(`Failed to save JSON: ${error.message}`);
    }
});

ipcMain.handle('save-png', async (event, filePath, base64Data) => {
    try {
        // Resolve path relative to app directory
        const fullPath = path.resolve(__dirname, filePath);

        // Security check - ensure file is within app directory
        if (!fullPath.startsWith(__dirname)) {
            throw new Error('Access denied: File outside app directory');
        }

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Convert base64 string to Buffer
        // The base64Data should be just the base64 string without the data URL prefix
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Write PNG data to file
        await fs.writeFile(fullPath, imageBuffer);

        console.log(`PNG saved successfully to: ${fullPath}`);

    } catch (error) {
        console.error(`Failed to save PNG: ${error.message}`);
        throw new Error(`Failed to save PNG: ${error.message}`);
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});