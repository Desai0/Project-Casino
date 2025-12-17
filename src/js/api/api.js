// Wrapper for the secure bridge exposed in preload.js

export const api = {
    async login(username, password) {
        // Calls the Main process which then talks to DB
        return await window.electronAPI.login({ username, password });
    },

    async spinSlots(betAmount) {
        // Calls Main process -> Logic -> DB
        return await window.electronAPI.spinSlots(betAmount);
    },
    
    async playBlackjack(action, betAmount, gameState) {
        // Calls Main process for blackjack actions
        return await window.electronAPI.playBlackjack(action, betAmount, gameState);
    },
    
    async playRoulette(action, betAmount, gameState) {
        // Calls Main process for roulette actions
        return await window.electronAPI.playRoulette(action, betAmount, gameState);
    },
    
    async getHistory(profileId) {
        return await window.electronAPI.getHistory(profileId);
    },

    onBalanceUpdate(callback) {
        window.electronAPI.onUpdateBalance(callback);
    }
};
