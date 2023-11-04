const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('$gnb', {
  $desktop: ({ type, data }) => ipcRenderer.invoke('desktop:service', { type, data }),
})
