// Wrapper for the secure bridge exposed in preload.js

export const api = {
    async login(username, password) {
        return await window.electronAPI.login({ username, password });
    },

    async register(username, password, nickname) {
        return await window.electronAPI.register({ username, password, nickname });
    },

    async spinSlots(betAmount) {
        return await window.electronAPI.spinSlots(betAmount);
    },
    
    async getHistory(profileId) {
        return await window.electronAPI.getHistory(profileId);
    },

    async updateNickname(profileId, nickname) {
        return await window.electronAPI.updateNickname({ profileId, nickname });
    },

    async updateAvatar(profileId, avatarPath) {
        return await window.electronAPI.updateAvatar({ profileId, avatarPath });
    },

    onBalanceUpdate(callback) {
        window.electronAPI.onUpdateBalance(callback);
    }
};
