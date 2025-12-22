import { api } from '../api/api.js';

let streamerModeActive = false;
let debugInfoInterval = null;
let debugOverlay = null;

/**
 * Инициализация Streamer Mode
 */
export function initStreamerMode() {
    // Создаем debug оверлей
    createDebugOverlay();
    
    // Добавляем кнопку Streamer Mode в профиль
    addStreamerModeButton();
}

/**
 * Создает debug оверлей
 */
function createDebugOverlay() {
    // Проверяем, не существует ли уже оверлей
    if (document.getElementById('streamer-debug-overlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'streamer-debug-overlay';
    overlay.className = 'streamer-debug-overlay hidden';
    overlay.innerHTML = `
        <div class="streamer-debug-panel">
            <div class="streamer-debug-header">
                <h3>🔴 LIVE - Streamer Mode</h3>
                <button id="streamer-close-btn" class="streamer-close-btn">×</button>
            </div>
            <div class="streamer-debug-content">
                <div class="debug-section">
                    <h4>💰 Balance Info</h4>
                    <div class="debug-item">
                        <span class="debug-label">Current Balance:</span>
                        <span class="debug-value" id="debug-balance">$0</span>
                    </div>
                    <div class="debug-item">
                        <span class="debug-label">Balance Change (Last Game):</span>
                        <span class="debug-value" id="debug-balance-change">$0</span>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🎮 Recent Games</h4>
                    <div class="debug-games-list" id="debug-games-list">
                        <div class="debug-game-item">No games yet</div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>📊 Session Stats</h4>
                    <div class="debug-item">
                        <span class="debug-label">Games Played:</span>
                        <span class="debug-value" id="debug-games-count">0</span>
                    </div>
                    <div class="debug-item">
                        <span class="debug-label">Total Wins:</span>
                        <span class="debug-value win-text" id="debug-total-wins">$0</span>
                    </div>
                    <div class="debug-item">
                        <span class="debug-label">Total Losses:</span>
                        <span class="debug-value lose-text" id="debug-total-losses">$0</span>
                    </div>
                    <div class="debug-item">
                        <span class="debug-label">Net Result:</span>
                        <span class="debug-value" id="debug-net-result">$0</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    debugOverlay = overlay;
    
    // Обработчик закрытия
    const closeBtn = document.getElementById('streamer-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleStreamerMode();
        });
    }
}

/**
 * Добавляет кнопку Streamer Mode в профиль
 */
function addStreamerModeButton() {
    // Проверяем, не добавлена ли уже кнопка
    const existingBtn = document.getElementById('streamer-mode-btn');
    if (existingBtn) {
        return;
    }
    
    // Находим место для кнопки (рядом с Deposit)
    const depositBtn = document.getElementById('deposit-btn');
    const nameSection = document.querySelector('.profile-name-section');
    
    if (!nameSection) {
        // Если секция еще не загружена, попробуем позже
        setTimeout(addStreamerModeButton, 100);
        return;
    }
    
    const streamerBtn = document.createElement('button');
    streamerBtn.id = 'streamer-mode-btn';
    streamerBtn.className = 'streamer-mode-btn hidden'; // Скрыта по умолчанию
    streamerBtn.textContent = '🔴 Streamer Mode';
    streamerBtn.title = 'Enable Streamer Mode (Debug Info Overlay)';
    
    streamerBtn.addEventListener('click', () => {
        toggleStreamerMode();
    });
    
    // Добавляем кнопку после Deposit или в секцию
    if (depositBtn && depositBtn.parentNode) {
        depositBtn.parentNode.insertBefore(streamerBtn, depositBtn.nextSibling);
    } else {
        nameSection.appendChild(streamerBtn);
    }
    
    // Показываем кнопку если есть права
    checkAndShowStreamerButton();
}

/**
 * Проверяет права и показывает кнопку Streamer Mode
 */
function checkAndShowStreamerButton() {
    const streamerBtn = document.getElementById('streamer-mode-btn');
    if (!streamerBtn) return;
    
    const permissions = window.currentUser?.permissions || {};
    if (permissions.streamer_mode_access || permissions.can_edit_balance) {
        // Показываем кнопку для стримеров и админов
        streamerBtn.classList.remove('hidden');
    } else {
        streamerBtn.classList.add('hidden');
    }
}

/**
 * Переключает Streamer Mode
 */
export function toggleStreamerMode() {
    streamerModeActive = !streamerModeActive;
    
    if (!debugOverlay) {
        createDebugOverlay();
    }
    
    if (streamerModeActive) {
        // Включаем режим
        debugOverlay.classList.remove('hidden');
        startDebugInfoUpdates();
        console.log('Streamer Mode: ON');
    } else {
        // Выключаем режим
        debugOverlay.classList.add('hidden');
        stopDebugInfoUpdates();
        console.log('Streamer Mode: OFF');
    }
    
    // Обновляем текст кнопки
    const streamerBtn = document.getElementById('streamer-mode-btn');
    if (streamerBtn) {
        streamerBtn.textContent = streamerModeActive 
            ? '⏸️ Streamer Mode' 
            : '🔴 Streamer Mode';
    }
}

/**
 * Начинает автообновление debug информации
 */
function startDebugInfoUpdates() {
    // Обновляем сразу
    updateDebugInfo();
    
    // Обновляем каждые 2 секунды
    if (debugInfoInterval) {
        clearInterval(debugInfoInterval);
    }
    
    debugInfoInterval = setInterval(() => {
        updateDebugInfo();
    }, 2000);
}

/**
 * Останавливает автообновление debug информации
 */
function stopDebugInfoUpdates() {
    if (debugInfoInterval) {
        clearInterval(debugInfoInterval);
        debugInfoInterval = null;
    }
}

/**
 * Обновляет debug информацию
 */
async function updateDebugInfo() {
    if (!streamerModeActive || !debugOverlay) {
        return;
    }
    
    try {
        const profileId = window.currentUser?.id;
        if (!profileId) {
            return;
        }
        
        // Обновляем баланс
        const headerBalance = document.getElementById('header-balance');
        if (headerBalance) {
            const balance = headerBalance.textContent.replace(/\s/g, '');
            document.getElementById('debug-balance').textContent = `$${balance}`;
        }
        
        // Получаем последние игры из истории
        const history = await api.getHistory(profileId);
        if (history && history.length > 0) {
            updateGamesList(history.slice(0, 5)); // Последние 5 игр
            updateSessionStats(history);
        }
        
    } catch (error) {
        console.error('Failed to update debug info:', error);
    }
}

/**
 * Обновляет список последних игр
 */
function updateGamesList(games) {
    const gamesList = document.getElementById('debug-games-list');
    if (!gamesList) return;
    
    if (!games || games.length === 0) {
        gamesList.innerHTML = '<div class="debug-game-item">No games yet</div>';
        return;
    }
    
    gamesList.innerHTML = games.map(game => {
        const amount = game.money_win_lose_ammount || 0;
        const isWin = amount > 0;
        const icon = getGameIcon(game.game_name);
        const time = formatTime(game.timestamp);
        
        return `
            <div class="debug-game-item">
                <span class="debug-game-icon">${icon}</span>
                <span class="debug-game-name">${game.game_name}</span>
                <span class="debug-game-time">${time}</span>
                <span class="debug-game-amount ${isWin ? 'win-text' : 'lose-text'}">
                    ${isWin ? '+' : ''}$${Math.abs(amount)}
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Обновляет статистику сессии
 */
function updateSessionStats(history) {
    if (!history || history.length === 0) {
        document.getElementById('debug-games-count').textContent = '0';
        document.getElementById('debug-total-wins').textContent = '$0';
        document.getElementById('debug-total-losses').textContent = '$0';
        document.getElementById('debug-net-result').textContent = '$0';
        return;
    }
    
    const totalGames = history.length;
    const totalWins = history
        .filter(game => (game.money_win_lose_ammount || 0) > 0)
        .reduce((sum, game) => sum + (game.money_win_lose_ammount || 0), 0);
    const totalLosses = history
        .filter(game => (game.money_win_lose_ammount || 0) < 0)
        .reduce((sum, game) => sum + Math.abs(game.money_win_lose_ammount || 0), 0);
    const netResult = history.reduce((sum, game) => sum + (game.money_win_lose_ammount || 0), 0);
    
    document.getElementById('debug-games-count').textContent = totalGames;
    document.getElementById('debug-total-wins').textContent = `$${totalWins}`;
    document.getElementById('debug-total-losses').textContent = `$${totalLosses}`;
    document.getElementById('debug-net-result').textContent = `$${netResult}`;
    document.getElementById('debug-net-result').className = `debug-value ${netResult >= 0 ? 'win-text' : 'lose-text'}`;
}

/**
 * Получает иконку игры
 */
function getGameIcon(gameName) {
    const name = (gameName || '').toLowerCase();
    if (name.includes('slot')) return '🍒';
    if (name.includes('black') || name.includes('21')) return '♠️';
    if (name.includes('roulette')) return '🔴';
    return '🎲';
}

/**
 * Форматирует время
 */
function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        // Формат: YYYY.MM.DD:HH:MM:SS
        const parts = timestamp.split(':');
        if (parts.length >= 3) {
            return `${parts[1]}:${parts[2]}`; // HH:MM:SS
        }
        return timestamp;
    } catch (e) {
        return timestamp;
    }
}

// Экспортируем функцию для проверки и показа кнопки (используем внутреннюю функцию)
export { checkAndShowStreamerButton as showStreamerButton };

