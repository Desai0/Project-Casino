import { api } from '../api/api.js';

export function showDashboard(user) {
    // Hide Login, Show Dashboard
    document.getElementById('login-screen').classList.add('hidden');
    const dashboard = document.getElementById('dashboard-screen');
    dashboard.classList.remove('hidden');
    
    // Fill User Info
    document.getElementById('display-username').textContent = user.name;
    document.getElementById('display-balance').textContent = `${user.balance} $`;

    setupNavigation(user.id);
    loadHistory(user.id);
}

function setupNavigation(userId) {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.id === 'logout-btn') {
                location.reload();
                return;
            }

            // Update Menu Active State
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show Target View
            const targetId = item.getAttribute('data-target');
            views.forEach(v => {
                if (v.id === targetId) {
                    v.classList.remove('hidden');
                    v.classList.add('active-view');
                    if (targetId === 'history-view') loadHistory(userId);
                } else {
                    v.classList.remove('active-view');
                    v.classList.add('hidden');
                }
            });
        });
    });
}

async function loadHistory(userId) {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Загрузка данных...</td></tr>';
    
    try {
        const rows = await api.getHistory(userId);
        tbody.innerHTML = '';
        
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #a0a0a0;">История игр пуста</td></tr>';
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            const isWin = row.money_win_lose_ammount >= 0;
            const sign = row.money_win_lose_ammount > 0 ? '+' : '';
            
            tr.innerHTML = `
                <td>${row.timestamp}</td>
                <td>${row.game_name || 'Игра'}</td>
                <td>${isWin ? 'Выигрыш' : 'Ставка'}</td>
                <td class="${isWin ? 'amount-positive' : 'amount-negative'}">
                    ${sign}${row.money_win_lose_ammount} $
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("History Error:", err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: red;">Ошибка связи с сервером</td></tr>';
    }
}
