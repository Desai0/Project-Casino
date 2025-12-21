import { api } from '../api/api.js';

let currentUsers = [];
let currentEditingUser = null;

export function initAdminPanel() {
    // Проверка прав доступа
    if (!window.currentUser?.permissions?.can_edit_balance) {
        console.log('User does not have admin permissions');
        return; // Не админ, не показываем панель
    }

    console.log('Initializing admin panel for admin user');
    
    // Показываем вкладку Admin
    const adminTab = document.querySelector('[data-target="admin-screen"]');
    if (adminTab) {
        adminTab.style.display = 'block';
    }

    loadUsersList();
    initUserEditHandlers();
    initStatisticsHandlers();
}

async function loadUsersList() {
    try {
        console.log('Loading users list...');
        const users = await api.admin.getAllUsers();
        console.log('Users loaded:', users);
        currentUsers = users;
        renderUsersTable(users);
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users list');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.profile_id}</td>
            <td>${user.username}</td>
            <td>${user.nickname}</td>
            <td>${user.role_name || 'User'}</td>
            <td>$${user.current_balance}</td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" onclick="window.adminActions.editUser(${user.profile_id})">Edit</button>
                <button class="action-btn stats-btn" onclick="window.adminActions.viewStatistics(${user.profile_id})">Stats</button>
                <button class="action-btn reset-btn" onclick="window.adminActions.resetHistory(${user.profile_id})">Reset</button>
            </td>
        </tr>
    `).join('');
}

function initUserEditHandlers() {
    // Обработчики для модального окна редактирования
    const editModal = document.getElementById('user-edit-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editForm = document.getElementById('user-edit-form');

    closeEditModal?.addEventListener('click', () => {
        editModal?.classList.add('hidden');
    });

    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUserUpdate();
    });

    // Глобальные функции для onclick
    window.adminActions = {
        editUser: showUserEditModal,
        viewStatistics: viewUserStatistics,
        resetHistory: resetUserHistory
    };
}

function initStatisticsHandlers() {
    // Обработчики для модального окна статистики
    const statsModal = document.getElementById('statistics-modal');
    const closeStatsModal = document.getElementById('close-stats-modal');

    closeStatsModal?.addEventListener('click', () => {
        statsModal?.classList.add('hidden');
    });

    // Обработчик для общей статистики
    const allStatsBtn = document.getElementById('load-all-stats-btn');
    allStatsBtn?.addEventListener('click', loadAllUsersStatistics);
}

async function showUserEditModal(userId) {
    const user = currentUsers.find(u => u.profile_id === userId);
    if (!user) {
        showError('User not found');
        return;
    }

    currentEditingUser = user;
    
    // Заполняем форму
    document.getElementById('edit-user-id').value = user.profile_id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-nickname').value = user.nickname;
    document.getElementById('edit-balance').value = user.current_balance;
    document.getElementById('edit-role').value = user.role_id || 1;

    // Показываем модальное окно
    const modal = document.getElementById('user-edit-modal');
    modal?.classList.remove('hidden');
}

async function handleUserUpdate() {
    if (!currentEditingUser) return;

    const formData = {
        userId: currentEditingUser.profile_id,
        balance: parseInt(document.getElementById('edit-balance').value),
        roleId: parseInt(document.getElementById('edit-role').value)
    };

    try {
        // Обновляем баланс
        await updateUserBalance(formData.userId, formData.balance);
        
        // Обновляем роль
        await updateUserRole(formData.userId, formData.roleId);

        // Закрываем модальное окно
        document.getElementById('user-edit-modal').classList.add('hidden');
        
        // Перезагружаем список пользователей
        await loadUsersList();
        
        showSuccess('User updated successfully');
    } catch (error) {
        console.error('Failed to update user:', error);
        showError('Failed to update user');
    }
}

async function updateUserRole(userId, roleId) {
    try {
        const result = await api.admin.updateUserRole({ userId, roleId });
        if (!result.success) {
            throw new Error(result.error || 'Failed to update role');
        }
        return result;
    } catch (error) {
        console.error('Update role error:', error);
        throw error;
    }
}

async function updateUserBalance(userId, newBalance) {
    try {
        const result = await api.admin.updateUserBalance({ userId, balance: newBalance });
        if (!result.success) {
            throw new Error(result.error || 'Failed to update balance');
        }
        return result;
    } catch (error) {
        console.error('Update balance error:', error);
        throw error;
    }
}

async function resetUserHistory(userId) {
    if (!confirm('Are you sure you want to reset this user\'s history? This action cannot be undone.')) {
        return;
    }

    try {
        const result = await api.admin.resetUserHistory({ userId });
        if (!result.success) {
            throw new Error(result.error || 'Failed to reset history');
        }
        
        await loadUsersList(); // Перезагружаем список
        showSuccess('User history reset successfully');
    } catch (error) {
        console.error('Reset history error:', error);
        showError('Failed to reset user history');
    }
}

async function viewUserStatistics(userId) {
    const startDate = document.getElementById('stats-start-date').value || 
                     new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = document.getElementById('stats-end-date').value || 
                   new Date().toISOString().split('T')[0];

    try {
        const stats = await api.admin.getUserStatistics({
            profileId: userId,
            startDate,
            endDate
        });

        showUserStatistics(userId, stats);
    } catch (error) {
        console.error('Failed to load user statistics:', error);
        showError('Failed to load statistics');
    }
}

function showUserStatistics(userId, stats) {
    const user = currentUsers.find(u => u.profile_id === userId);
    const userName = user ? user.username : `User ${userId}`;

    // Заполняем данные в модальном окне
    document.getElementById('stats-user-name').textContent = userName;
    document.getElementById('stats-total-games').textContent = stats.statistics?.total_games || 0;
    document.getElementById('stats-total-bets').textContent = `$${stats.statistics?.total_bet_amount || 0}`;
    document.getElementById('stats-total-wins').textContent = `$${stats.statistics?.total_wins || 0}`;
    document.getElementById('stats-total-losses').textContent = `$${stats.statistics?.total_losses || 0}`;
    document.getElementById('stats-net-result').textContent = `$${stats.statistics?.net_result || 0}`;

    // Отображаем график если есть данные
    if (stats.gameStatistics && stats.gameStatistics.length > 0) {
        renderStatisticsChart(stats.gameStatistics);
    }

    // Показываем модальное окно
    document.getElementById('statistics-modal').classList.remove('hidden');
}

async function loadAllUsersStatistics() {
    const startDate = document.getElementById('stats-start-date').value || 
                     new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = document.getElementById('stats-end-date').value || 
                   new Date().toISOString().split('T')[0];

    try {
        const allStats = await api.admin.getAllUsersStatistics({ startDate, endDate });
        
        // Отображаем общую статистику
        const container = document.getElementById('all-users-stats');
        container.innerHTML = `
            <h3>All Users Statistics (${startDate} - ${endDate})</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Users:</span>
                    <span class="stat-value">${allStats.totalUsers || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Games:</span>
                    <span class="stat-value">${allStats.totalGames || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Bets:</span>
                    <span class="stat-value">$${allStats.totalBets || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">House Edge:</span>
                    <span class="stat-value">${allStats.houseEdge || 0}%</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load all users statistics:', error);
        showError('Failed to load statistics');
    }
}

function renderStatisticsChart(gameStats) {
    const canvas = document.getElementById('statistics-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Подготавливаем данные для графика
    const labels = gameStats.map(stat => stat.game_name);
    const gamesData = gameStats.map(stat => stat.games_count);
    const winsData = gameStats.map(stat => stat.total_wins);
    const lossesData = gameStats.map(stat => Math.abs(stat.total_losses));

    // Уничтожаем предыдущий график если есть
    if (window.statsChart) {
        window.statsChart.destroy();
    }

    // Создаем новый график
    window.statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Games Played',
                    data: gamesData,
                    backgroundColor: 'rgba(76, 175, 80, 0.6)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Wins ($)',
                    data: winsData,
                    backgroundColor: 'rgba(33, 150, 243, 0.6)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Losses ($)',
                    data: lossesData,
                    backgroundColor: 'rgba(244, 67, 54, 0.6)',
                    borderColor: 'rgba(244, 67, 54, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#e6e6e6'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#999595'
                    },
                    grid: {
                        color: 'rgba(61, 56, 56, 0.3)'
                    }
                },
                y: {
                    ticks: {
                        color: '#999595'
                    },
                    grid: {
                        color: 'rgba(61, 56, 56, 0.3)'
                    }
                }
            }
        }
    });
}

function showError(message) {
    // Простое отображение ошибки (можно улучшить)
    const errorDiv = document.getElementById('admin-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert('Error: ' + message);
    }
}

function showSuccess(message) {
    // Простое отображение успеха (можно улучшить)
    const successDiv = document.getElementById('admin-success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert('Success: ' + message);
    }
}