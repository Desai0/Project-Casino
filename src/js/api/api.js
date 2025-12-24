// Wrapper for the secure bridge exposed in preload.js

export const api = {
    async login(username, password) {
        return await window.electronAPI.login({ username, password });
    },

    async register(username, password, nickname) {
        return await window.electronAPI.register({ username, password, nickname });
    },

    async spinSlots(betAmount) {
        const profileId = window.currentUser?.id || 1;
        return await window.electronAPI.spinSlots(betAmount, profileId);
    },

    async playBlackjack({ action, betAmount, gameState, profileId }) {
        return await window.electronAPI.playBlackjack({ action, betAmount, gameState, profileId });
    },

    async playRoulette({ action, betAmount, gameState, profileId }) {
        return await window.electronAPI.playRoulette({ action, betAmount, gameState, profileId });
    },
    
    async getHistory(profileId) {
        return await window.electronAPI.getHistory(profileId);
    },

    async createPaymentIntent({ amount, profileId }) {
        return await window.electronAPI.createPaymentIntent({ amount, profileId });
    },

    async confirmPayment({ paymentIntentId, profileId }) {
        return await window.electronAPI.confirmPayment({ paymentIntentId, profileId });
    },

    async getPaymentHistory(profileId) {
        return await window.electronAPI.getPaymentHistory(profileId);
    },
    
    // User Statistics (for regular users)
    async getUserStatistics({ profileId, startDate, endDate }) {
        return await window.electronAPI.getUserStatistics({ profileId, startDate, endDate });
    },
    
    async getBalanceHistory({ profileId, limit, offset }) {
        return await window.electronAPI.getBalanceHistory({ profileId, limit, offset });
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
        async getAllUsers({ limit, offset, searchQuery } = {}) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.getAllUsers({ adminProfileId, limit, offset, searchQuery });
        },

        async updateUserRole({ userId, roleId }) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.updateUserRole({ adminProfileId, profileId: userId, roleId });
        },

        async updateUserBalance({ userId, balance }) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.updateUserBalance({ adminProfileId, profileId: userId, newBalance: balance });
        },

        async resetUserHistory({ userId }) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.resetUserHistory({ adminProfileId, profileId: userId });
        },

        async getUserStatistics({ profileId, startDate, endDate }) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.getUserStatistics({ adminProfileId, profileId, startDate, endDate });
        },

        async getAllUsersStatistics({ startDate, endDate }) {
            const adminProfileId = window.currentUser?.id;
            if (!adminProfileId) {
                throw new Error('User not logged in');
            }
            return await window.electronAPI.admin.getAllUsersStatistics({ adminProfileId, startDate, endDate });
        }
    }
};
