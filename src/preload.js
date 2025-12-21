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
  getUserWithPermissions: (profileId) => ipcRenderer.invoke('api:getUserWithPermissions', profileId),
  
  // Admin Methods
  admin: {
    getAllUsers: () => ipcRenderer.invoke('admin:getAllUsers'),
    updateUserRole: (data) => ipcRenderer.invoke('admin:updateUserRole', data),
    updateUserBalance: (data) => ipcRenderer.invoke('admin:updateUserBalance', data),
    resetUserHistory: (data) => ipcRenderer.invoke('admin:resetUserHistory', data),
    getUserStatistics: (data) => ipcRenderer.invoke('admin:getUserStatistics', data),
    getAllUsersStatistics: (data) => ipcRenderer.invoke('admin:getAllUsersStatistics', data)
  },
  
  // Notification system
  onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (_event, value) => callback(value))
});
