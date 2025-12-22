const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game Methods
  spinSlots: (bet, profileId) => ipcRenderer.invoke('game:spin', bet, profileId),
  playBlackjack: (data) => ipcRenderer.invoke('game:blackjack', data),
  playRoulette: (data) => ipcRenderer.invoke('game:roulette', data),
  
  // User/Auth Methods
  login: (credentials) => ipcRenderer.invoke('api:login', credentials),
  register: (credentials) => ipcRenderer.invoke('api:register', credentials),
  getHistory: (profileId) => ipcRenderer.invoke('api:history', profileId),
  updateNickname: (data) => ipcRenderer.invoke('api:updateNickname', data),
  updateAvatar: (data) => ipcRenderer.invoke('api:updateAvatar', data),
  getUserWithPermissions: (profileId) => ipcRenderer.invoke('api:getUserWithPermissions', profileId),
  
  // Payment Methods
  createPaymentIntent: (data) => ipcRenderer.invoke('api:createPaymentIntent', data),
  confirmPayment: (data) => ipcRenderer.invoke('api:confirmPayment', data),
  getPaymentHistory: (profileId) => ipcRenderer.invoke('api:getPaymentHistory', profileId),
  
  // User Statistics (for regular users)
  getUserStatistics: (data) => ipcRenderer.invoke('api:getUserStatistics', data),
  getBalanceHistory: (data) => ipcRenderer.invoke('api:getBalanceHistory', data),
  
  // Admin Methods
  admin: {
    getAllUsers: (data) => ipcRenderer.invoke('admin:getAllUsers', data),
    updateUserRole: (data) => ipcRenderer.invoke('admin:updateUserRole', data),
    updateUserBalance: (data) => ipcRenderer.invoke('admin:updateUserBalance', data),
    resetUserHistory: (data) => ipcRenderer.invoke('admin:resetUserHistory', data),
    getUserStatistics: (data) => ipcRenderer.invoke('admin:getUserStatistics', data),
    getAllUsersStatistics: (data) => ipcRenderer.invoke('admin:getAllUsersStatistics', data)
  },
  
  // Notification system
  onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (_event, value) => callback(value))
});
