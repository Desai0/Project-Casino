const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game Methods
  spinSlots: (bet) => ipcRenderer.invoke('game:spin', bet),
  
  // User/Auth Methods
  login: (credentials) => ipcRenderer.invoke('api:login', credentials),
  register: (credentials) => ipcRenderer.invoke('api:register', credentials),
  getHistory: (profileId) => ipcRenderer.invoke('api:history', profileId),
  updateNickname: (data) => ipcRenderer.invoke('api:updateNickname', data),
  updateAvatar: (data) => ipcRenderer.invoke('api:updateAvatar', data),
  
  // Notification system
  onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (_event, value) => callback(value))
});
