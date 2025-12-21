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

    async getUserWithPermissions(profileId) {
        return await window.electronAPI.getUserWithPermissions(profileId);
    },

    onBalanceUpdate(callback) {
        window.electronAPI.onUpdateBalance(callback);
    },

    // Admin API methods
    admin: {
        async getAllUsers() {
            return await window.electronAPI.admin.getAllUsers();
        },

        async updateUserRole({ userId, roleId }) {
            return await window.electronAPI.admin.updateUserRole({ userId, roleId });
        },

        async updateUserBalance({ userId, balance }) {
            return await window.electronAPI.admin.updateUserBalance({ userId, balance });
        },

        async resetUserHistory({ userId }) {
            return await window.electronAPI.admin.resetUserHistory({ userId });
        },

        async getUserStatistics({ profileId, startDate, endDate }) {
            return await window.electronAPI.admin.getUserStatistics({ profileId, startDate, endDate });
        },

        async getAllUsersStatistics({ startDate, endDate }) {
            return await window.electronAPI.admin.getAllUsersStatistics({ startDate, endDate });
        }
    }
};
