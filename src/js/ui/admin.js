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

    // Загружаем пользователей с небольшой задержкой, чтобы убедиться что все инициализировано
    setTimeout(() => {
        loadUsersList();
    }, 100);
    
    initUserEditHandlers();
    initStatisticsHandlers();
}

async function loadUsersList() {
    try {
        console.log('Loading users list...');
        console.log('Current user:', window.currentUser);
        
        // Проверяем, что пользователь залогинен
        if (!window.currentUser?.id) {
            console.error('User not logged in');
            showError('User not logged in');
            return;
        }
        
        const users = await api.admin.getAllUsers({});
        console.log('Users loaded:', users);
        
        if (!users || !Array.isArray(users)) {
            console.error('Invalid users data:', users);
            showError('Invalid users data received');
            return;
        }
        
        currentUsers = users;
        renderUsersTable(users);
        
        if (users.length === 0) {
            console.warn('No users found in database');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showError(`Failed to load users list: ${error.message || error}`);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.profile_id}</td>
            <td>${user.username || 'N/A'}</td>
            <td>${user.nickname || 'N/A'}</td>
            <td>${user.role_name || 'User'}</td>
            <td>$${user.current_balance || 0}</td>
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
        console.log('Updating balance for user:', userId, 'new balance:', newBalance);
        const result = await api.admin.updateUserBalance({ userId, balance: newBalance });
        console.log('Update balance result:', result);
        
        // Обновляем список пользователей после изменения баланса
        await loadUsersList();
        showSuccess('Balance updated successfully');
        return result;
    } catch (error) {
        console.error('Update balance error:', error);
        showError(`Failed to update balance: ${error.message || error}`);
        throw error;
    }
}

async function resetUserHistory(userId) {
    if (!confirm('Are you sure you want to reset this user\'s history? This action cannot be undone.')) {
        return;
    }

    try {
        console.log('Resetting history for user:', userId);
        const result = await api.admin.resetUserHistory({ userId });
        console.log('Reset history result:', result);
        
        await loadUsersList(); // Перезагружаем список
        showSuccess('User history reset successfully');
    } catch (error) {
        console.error('Reset history error:', error);
        showError(`Failed to reset user history: ${error.message || error}`);
    }
}

async function viewUserStatistics(userId) {
    // Получаем даты из инпутов (type="date" возвращает YYYY-MM-DD)
    const startDateInput = document.getElementById('stats-start-date');
    const endDateInput = document.getElementById('stats-end-date');
    
    let startDate, endDate;
    
    if (startDateInput && startDateInput.value) {
        startDate = startDateInput.value; // Уже в формате YYYY-MM-DD
    } else {
        // По умолчанию: 30 дней назад
        const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        startDate = date.toISOString().split('T')[0];
    }
    
    if (endDateInput && endDateInput.value) {
        endDate = endDateInput.value; // Уже в формате YYYY-MM-DD
    } else {
        // По умолчанию: сегодня
        endDate = new Date().toISOString().split('T')[0];
    }

    try {
        console.log('Loading statistics for user:', userId, 'from', startDate, 'to', endDate);
        const stats = await api.admin.getUserStatistics({
            profileId: userId,
            startDate,
            endDate
        });
        console.log('Statistics loaded:', stats);

        showUserStatistics(userId, stats);
    } catch (error) {
        console.error('Failed to load user statistics:', error);
        showError(`Failed to load statistics: ${error.message || error}`);
    }
}

function showUserStatistics(userId, stats) {
    const user = currentUsers.find(u => u.profile_id === userId);
    const userName = user ? user.username : `User ${userId}`;

    // stats может быть объектом напрямую или обернутым в statistics
    const statsData = stats.statistics || stats;
    const gameStats = stats.gameStatistics || [];

    // Заполняем данные в модальном окне
    const statsUserName = document.getElementById('stats-user-name');
    const statsTotalGames = document.getElementById('stats-total-games');
    const statsTotalBets = document.getElementById('stats-total-bets');
    const statsTotalWins = document.getElementById('stats-total-wins');
    const statsTotalLosses = document.getElementById('stats-total-losses');
    const statsNetResult = document.getElementById('stats-net-result');

    if (statsUserName) statsUserName.textContent = userName;
    if (statsTotalGames) statsTotalGames.textContent = statsData?.total_games || 0;
    if (statsTotalBets) statsTotalBets.textContent = `$${statsData?.total_bet_amount || 0}`;
    if (statsTotalWins) statsTotalWins.textContent = `$${statsData?.total_wins || 0}`;
    if (statsTotalLosses) statsTotalLosses.textContent = `$${statsData?.total_losses || 0}`;
    if (statsNetResult) {
        const netResult = statsData?.net_result || 0;
        statsNetResult.textContent = `$${netResult}`;
        statsNetResult.className = netResult >= 0 ? 'win-text' : 'lose-text';
    }

    // Отображаем график если есть данные
    if (gameStats.length > 0) {
        renderStatisticsChart(gameStats);
    }

    // Показываем модальное окно
    const statsModal = document.getElementById('statistics-modal');
    if (statsModal) {
        statsModal.classList.remove('hidden');
    }
}

async function loadAllUsersStatistics() {
    // Получаем даты из инпутов (type="date" возвращает YYYY-MM-DD)
    const startDateInput = document.getElementById('stats-start-date');
    const endDateInput = document.getElementById('stats-end-date');
    
    let startDate, endDate;
    
    if (startDateInput && startDateInput.value) {
        startDate = startDateInput.value; // Уже в формате YYYY-MM-DD
    } else {
        // По умолчанию: 30 дней назад
        const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        startDate = date.toISOString().split('T')[0];
    }
    
    if (endDateInput && endDateInput.value) {
        endDate = endDateInput.value; // Уже в формате YYYY-MM-DD
    } else {
        // По умолчанию: сегодня
        endDate = new Date().toISOString().split('T')[0];
    }

    try {
        const allStats = await api.admin.getAllUsersStatistics({ startDate, endDate });
        
        // Отображаем общую статистику
        const container = document.getElementById('all-users-stats');
        if (!container) {
            console.error('all-users-stats container not found');
            return;
        }
        
        const startDateDisplay = startDateInput?.value || startDate;
        const endDateDisplay = endDateInput?.value || endDate;
        
        container.innerHTML = `
            <h3>All Users Statistics (${startDateDisplay} - ${endDateDisplay})</h3>
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
                    <span class="stat-label">Total Wins:</span>
                    <span class="stat-value">$${allStats.totalWins || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Losses:</span>
                    <span class="stat-value">$${allStats.totalLosses || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">House Profit:</span>
                    <span class="stat-value">$${allStats.houseProfit || 0}</span>
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