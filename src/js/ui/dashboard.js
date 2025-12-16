import { api } from '../api/api.js';

let balanceChart = null;

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
    initBalanceChart(user.id);
    
    // Настройка logout
    document.getElementById('logout-btn').addEventListener('click', logout);
}

async function initBalanceChart(userId) {
    const canvas = document.getElementById('balanceChart');
    const ctx = canvas.getContext('2d');
    
    try {
        // Получаем историю для графика
        const history = await api.getHistory(userId);
        
        // Подготавливаем данные для графика
        const chartData = prepareChartData(history);
        
        // Уничтожаем предыдущий график если есть
        if (balanceChart) {
            balanceChart.destroy();
        }
        
        // Создаем новый график
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Balance',
                    data: chartData.data,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4caf50',
                    pointBorderColor: '#2e7d32',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(28, 25, 25, 0.9)',
                        titleColor: '#e6e6e6',
                        bodyColor: '#e6e6e6',
                        borderColor: '#3d3838',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Balance: $${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(61, 56, 56, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#999595',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(61, 56, 56, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#999595',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#66bb6a'
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error initializing balance chart:', error);
        // Показываем заглушку если не удалось загрузить данные
        showChartPlaceholder();
    }
}

function prepareChartData(history) {
    if (!history || history.length === 0) {
        // Если нет истории, показываем базовый график
        return {
            labels: ['Start', 'Now'],
            data: [1000, 1000]
        };
    }
    
    // Сортируем по времени
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Вычисляем баланс на каждый момент времени
    let runningBalance = 1000; // Начальный баланс
    const labels = ['Start'];
    const data = [runningBalance];
    
    sortedHistory.forEach(record => {
        runningBalance += record.money_win_lose_ammount || 0;
        
        // Форматируем дату
        const date = new Date(record.timestamp);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            month: 'short',
            day: 'numeric'
        });
        
        labels.push(formattedDate);
        data.push(runningBalance);
    });
    
    return { labels, data };
}

function showChartPlaceholder() {
    const canvas = document.getElementById('balanceChart');
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем заглушку
    ctx.fillStyle = '#999595';
    ctx.font = '16px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('Balance chart will appear here', canvas.width / 2, canvas.height / 2);
    ctx.fillText('after your first game', canvas.width / 2, canvas.height / 2 + 25);
}

function logout() {
    // Очищаем данные
    if (balanceChart) {
        balanceChart.destroy();
        balanceChart = null;
    }
    
    // Скрываем основной интерфейс
    document.getElementById('app-header').classList.add('hidden');
    document.getElementById('main-wrapper').classList.add('hidden');
    
    // Показываем экран входа
    document.getElementById('login-screen').classList.remove('hidden');
    
    // Очищаем форму
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
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
