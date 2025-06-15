const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadJSON: (filePath) => ipcRenderer.invoke('load-json', filePath)
});