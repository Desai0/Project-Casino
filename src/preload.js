const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game Methods
  spinSlots: (bet) => ipcRenderer.invoke('game:spin', bet),
  playBlackjack: (action, betAmount, gameState) => ipcRenderer.invoke('game:blackjack', { action, betAmount, gameState }),
  
  // User/Auth Methods
  login: (credentials) => ipcRenderer.invoke('api:login', credentials),
  getHistory: (profileId) => ipcRenderer.invoke('api:history', profileId),
  
  // Notification system
  onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (_event, value) => callback(value))
});
