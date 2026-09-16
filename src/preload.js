import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('file:open'),
  openFileAtPath: (filePath) => ipcRenderer.invoke('file:open-path', filePath),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  saveFileAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  confirmDiscardChanges: () => ipcRenderer.invoke('file:confirm-discard'),
  setSyntaxToggleChecked: (checked) => ipcRenderer.send('app:set-toggle-checked', checked),
  respondBeforeClose: (shouldClose) => ipcRenderer.send('app:close-response', shouldClose),
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
  onBeforeClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:before-close', listener);
    return () => ipcRenderer.removeListener('app:before-close', listener);
  },
  onOpenPath: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on('app:open-path', listener);
    return () => ipcRenderer.removeListener('app:open-path', listener);
  },
});
