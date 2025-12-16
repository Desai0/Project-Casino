import { api } from '../api/api.js';

export function showDashboard(user) {
    // Hide Login
    document.getElementById('login-screen').classList.add('hidden');
    
    // Show Header and Main Wrapper
    document.getElementById('app-header').classList.remove('hidden');
    document.getElementById('main-wrapper').classList.remove('hidden');

    // Update Header Info
    document.getElementById('header-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('header-balance').textContent = user.balance;

    // Update Profile Info
    document.getElementById('profile-username').textContent = `[${user.name}]`;
    document.getElementById('profile-balance').textContent = formatMoney(user.balance);

    loadHistory(user.id);
}

function formatMoney(amount) {
    // Adds spaces (e.g. 2 007)
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function loadHistory(userId) {
    const listContainer = document.getElementById('history-list');
    listContainer.innerHTML = '<div style="text-align:center; color:#666;">Loading...</div>';
    
    try {
        const rows = await api.getHistory(userId);
        listContainer.innerHTML = '';
        
        if (!rows || rows.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:#666;">No history found</div>';
            return;
        }

        rows.forEach(row => {
            const isWin = row.money_win_lose_ammount >= 0;
            const amountClass = isWin ? 'win-text' : 'loss-text';
            const sign = row.money_win_lose_ammount > 0 ? '+' : '';
            const icon = getGameIcon(row.game_name);
            const dateStr = new Date(row.timestamp).toLocaleDateString().replace(/\//g, '.'); // Approx format

            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-icon">${icon}</div>
                <div class="history-info">
                    <div class="history-game-name">${row.game_name || 'Game'}</div>
                    <div class="history-date">Date: ${row.timestamp}</div>
                </div>
                <div class="history-amount ${amountClass}">
                    ${sign} ${row.money_win_lose_ammount} $
                </div>
            `;
            listContainer.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div style="text-align:center; color:red;">Error loading history</div>';
    }
}

function getGameIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('slot')) return '🍒';
    if (n.includes('black') || n.includes('21')) return '♠️';
    if (n.includes('roulette')) return '🔴';
    return '🎲';
}
