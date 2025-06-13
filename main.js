const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// https://www.youtube.com/watch?v=TkAiVKfWtjI

let win

const createWindow = () => {
    win = new BrowserWindow({
        width: 1000,
        height: 800
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})