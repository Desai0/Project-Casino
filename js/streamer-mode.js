let streamerModeActive = false;
let streamerUpdateInterval = null;
let sessionStats = {
    gamesPlayed: 0,
    totalWins: 0,
    totalLosses: 0,
    lastBalance: 0,
    lastGameChange: 0
};

// Инициализация Streamer Mode
function initStreamerMode() {
    // Получаем currentUser из window
    if (window.currentUser) {
        currentUser = window.currentUser();
    }
    
    const streamerBtn = document.getElementById('streamer-mode-btn');
    const closeOverlayBtn = document.getElementById('close-streamer-overlay');
    const overlay = document.getElementById('streamer-overlay');

    // Проверяем права пользователя
    if (currentUser && (currentUser.permissions?.streamer_mode_access || currentUser.permissions?.can_edit_balance)) {
        if (streamerBtn) {
            streamerBtn.classList.remove('hidden');
            // Удаляем старый обработчик если есть
            const newBtn = streamerBtn.cloneNode(true);
            streamerBtn.parentNode.replaceChild(newBtn, streamerBtn);
            document.getElementById('streamer-mode-btn').addEventListener('click', toggleStreamerMode);
        }
    } else {
        if (streamerBtn) {
            streamerBtn.classList.add('hidden');
        }
    }

    if (closeOverlayBtn) {
        closeOverlayBtn.addEventListener('click', () => {
            toggleStreamerMode();
        });
    }

    // Инициализируем сессию
    if (currentUser) {
        sessionStats.lastBalance = currentUser.current_balance || 0;
    }
}

// Переключение режима
function toggleStreamerMode() {
    streamerModeActive = !streamerModeActive;
    const overlay = document.getElementById('streamer-overlay');
    const streamerBtn = document.getElementById('streamer-mode-btn');

    if (overlay && streamerBtn) {
        if (streamerModeActive) {
            overlay.classList.remove('hidden');
            streamerBtn.classList.add('active');
            streamerBtn.textContent = '⏸️ Streamer Mode';
            startStreamerUpdates();
        } else {
            overlay.classList.add('hidden');
            streamerBtn.classList.remove('active');
            streamerBtn.textContent = '🔴 Streamer Mode';
            stopStreamerUpdates();
        }
    }
}

// Запуск автообновления
function startStreamerUpdates() {
    // Первое обновление сразу
    updateStreamerOverlay();

    // Затем каждые 2 секунды
    streamerUpdateInterval = setInterval(() => {
        updateStreamerOverlay();
    }, 2000);
}

// Остановка автообновления
function stopStreamerUpdates() {
    if (streamerUpdateInterval) {
        clearInterval(streamerUpdateInterval);
        streamerUpdateInterval = null;
    }
}

// Обновление overlay
async function updateStreamerOverlay() {
    // Получаем актуального пользователя
    if (window.currentUser) {
        currentUser = window.currentUser();
    }
    
    if (!currentUser) return;

    try {
        // Обновляем баланс
        updateBalanceInfo();

        // Получаем историю игр
        await updateRecentGames();

        // Обновляем статистику сессии
        updateSessionStats();
    } catch (error) {
        console.error('Ошибка обновления Streamer Mode:', error);
    }
}

// Обновление информации о балансе
function updateBalanceInfo() {
    const currentBalanceEl = document.getElementById('streamer-current-balance');
    const balanceChangeEl = document.getElementById('streamer-balance-change');

    // Получаем актуального пользователя
    if (window.currentUser) {
        currentUser = window.currentUser();
    }
    
    if (!currentUser) return;

    const currentBalance = currentUser.current_balance || 0;
    const balanceChange = currentBalance - sessionStats.lastBalance;

    if (currentBalanceEl) {
        currentBalanceEl.textContent = formatMoneyForStreamer(currentBalance);
    }

    if (balanceChangeEl) {
        if (balanceChange !== 0) {
            balanceChangeEl.textContent = (balanceChange > 0 ? '+' : '') + formatMoneyForStreamer(balanceChange);
            balanceChangeEl.className = 'streamer-value ' + (balanceChange > 0 ? 'streamer-positive' : 'streamer-negative');
            sessionStats.lastGameChange = balanceChange;
        } else if (sessionStats.lastGameChange !== 0) {
            balanceChangeEl.textContent = (sessionStats.lastGameChange > 0 ? '+' : '') + formatMoneyForStreamer(sessionStats.lastGameChange);
            balanceChangeEl.className = 'streamer-value ' + (sessionStats.lastGameChange > 0 ? 'streamer-positive' : 'streamer-negative');
        } else {
            balanceChangeEl.textContent = '$0';
            balanceChangeEl.className = 'streamer-value';
        }
    }

    sessionStats.lastBalance = currentBalance;
}

// Обновление последних игр
async function updateRecentGames() {
    const recentGamesEl = document.getElementById('streamer-recent-games');
    
    // Получаем актуального пользователя
    if (window.currentUser) {
        currentUser = window.currentUser();
    }
    
    if (!recentGamesEl || !currentUser) return;

    try {
        const { ipcRenderer } = require('electron');
        const history = await ipcRenderer.invoke('db:getTransactionHistory', currentUser.profile_id, 5);
        
        if (!history || history.length === 0) {
            recentGamesEl.innerHTML = '<div class="streamer-no-games">No games yet</div>';
            return;
        }

        // Получаем информацию об играх
        const gamesMap = {
            1: { name: 'Аниме слот', icon: '🍒' },
            2: { name: 'Фурри слот', icon: '🍒' },
            3: { name: 'Русская рулетка', icon: '🔴' },
            4: { name: 'Блэкджек', icon: '♠️' }
        };

        recentGamesEl.innerHTML = '';

        history.forEach(round => {
            const gameInfo = gamesMap[round.game_id] || { name: 'Unknown', icon: '🎲' };
            const amount = round.money_win_lose_amount || 0;
            const isWin = amount > 0;
            const timestamp = round.timestamp || '';
            
            // Парсим время из формата YYYY.MM.DD:HH:MM:SS
            let timeStr = '00:00:00';
            if (timestamp.includes(':')) {
                const timePart = timestamp.split(':').slice(-2).join(':');
                timeStr = timePart || '00:00:00';
            }

            const gameItem = document.createElement('div');
            gameItem.className = `streamer-game-item ${isWin ? 'win' : 'loss'}`;
            gameItem.innerHTML = `
                <div class="streamer-game-icon">${gameInfo.icon}</div>
                <div class="streamer-game-info">
                    <div class="streamer-game-name">${gameInfo.name}</div>
                    <div class="streamer-game-time">${timeStr}</div>
                </div>
                <div class="streamer-game-amount ${isWin ? 'positive' : 'negative'}">
                    ${isWin ? '+' : ''}${formatMoneyForStreamer(amount)}
                </div>
            `;
            recentGamesEl.appendChild(gameItem);
        });
    } catch (error) {
        console.error('Ошибка получения истории игр:', error);
        recentGamesEl.innerHTML = '<div class="streamer-no-games">Error loading games</div>';
    }
}

// Обновление статистики сессии
function updateSessionStats() {
    const gamesPlayedEl = document.getElementById('streamer-games-played');
    const totalWinsEl = document.getElementById('streamer-total-wins');
    const totalLossesEl = document.getElementById('streamer-total-losses');
    const netResultEl = document.getElementById('streamer-net-result');

    if (gamesPlayedEl) {
        gamesPlayedEl.textContent = sessionStats.gamesPlayed;
    }

    if (totalWinsEl) {
        totalWinsEl.textContent = formatMoneyForStreamer(sessionStats.totalWins);
    }

    if (totalLossesEl) {
        totalLossesEl.textContent = formatMoneyForStreamer(Math.abs(sessionStats.totalLosses));
    }

    if (netResultEl) {
        const netResult = sessionStats.totalWins + sessionStats.totalLosses;
        netResultEl.textContent = formatMoneyForStreamer(netResult);
        netResultEl.className = 'streamer-value ' + (netResult >= 0 ? 'streamer-positive' : 'streamer-negative');
    }
}

// Форматирование денег для Streamer Mode (всегда в долларах)
function formatMoneyForStreamer(amount) {
    return '$' + new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Обновление статистики при игре
function updateStreamerStats(gameAmount) {
    if (!streamerModeActive) return;

    sessionStats.gamesPlayed++;
    
    if (gameAmount > 0) {
        sessionStats.totalWins += gameAmount;
    } else {
        sessionStats.totalLosses += gameAmount; // уже отрицательное
    }

    sessionStats.lastGameChange = gameAmount;
    
    // Обновляем overlay сразу
    updateStreamerOverlay();
}

// Экспорт функций
window.initStreamerMode = initStreamerMode;
window.updateStreamerStats = updateStreamerStats;
window.toggleStreamerMode = toggleStreamerMode;

