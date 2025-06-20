const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadJSON: (filePath) => ipcRenderer.invoke('load-json', filePath),
    updateJSON: (filePath, item, data) => ipcRenderer.invoke('update-json', filePath, item, data),
    saveJSON: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
    savePNG: (filePath, buffer) => ipcRenderer.invoke('save-png', filePath, buffer),
    setGlobal: (key, value) => ipcRenderer.invoke('set-global', key, value),
    getGlobal: (key) => ipcRenderer.invoke('get-global', key),
});
