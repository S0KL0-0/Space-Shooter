const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadJSON: (filePath) => ipcRenderer.invoke('load-json', filePath),
    updateJSON: (filePath, item, data) => ipcRenderer.invoke('update-json', filePath, item, data)
});