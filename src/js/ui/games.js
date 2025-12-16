import { api } from '../api/api.js';

export function initGames() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const gameType = card.getAttribute('data-game');
            launchGame(gameType);
        });
    });

    document.getElementById('close-game').addEventListener('click', () => {
        document.getElementById('game-container').classList.add('hidden');
        // Остановить все звуки при закрытии
        stopAllSounds();
    });
}

// Глобальная функция для запуска игр (используется в index.html)
window.launchGame = launchGame;

function launchGame(type) {
    const container = document.getElementById('game-container');
    const area = document.getElementById('game-render-area');
    container.classList.remove('hidden');
    
    area.innerHTML = `<div class="game-loading">Загрузка ${type}...</div>`;

    setTimeout(() => {
        if (type === 'slots') {
            renderSlots(area);
        } else if (type === 'blackjack') {
            renderBlackjack(area);
        } else {
            area.innerHTML = '<div class="game-placeholder">В разработке...</div>';
        }
    }, 500);
}

// Слоты с анимацией
function renderSlots(container) {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    
    container.innerHTML = `
        <div class="slots-machine">
            <div class="slots-header">
                <h2>SLOT MACHINE</h2>
                <div class="balance-display">Balance: $<span id="game-balance">1000</span></div>
            </div>
            
            <div class="reels-container">
                <div class="reel" id="reel1">
                    <div class="reel-symbols">
                        ${symbols.map(s => `<div class="symbol">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="reel" id="reel2">
                    <div class="reel-symbols">
                        ${symbols.map(s => `<div class="symbol">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="reel" id="reel3">
                    <div class="reel-symbols">
                        ${symbols.map(s => `<div class="symbol">${s}</div>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="slots-controls">
                <div class="bet-controls">
                    <label>Bet: $</label>
                    <input type="number" id="bet-amount" value="10" min="1" max="100">
                </div>
                <button id="spin-btn" class="spin-button">SPIN</button>
            </div>
            
            <div id="slot-result" class="game-result"></div>
        </div>
    `;

    let isSpinning = false;
    const spinBtn = document.getElementById('spin-btn');
    const betInput = document.getElementById('bet-amount');
    const resultDiv = document.getElementById('slot-result');

    spinBtn.addEventListener('click', async () => {
        if (isSpinning) return;
        
        const betAmount = parseInt(betInput.value) || 10;
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = 'SPINNING...';
        resultDiv.textContent = '';

        // Анимация вращения барабанов
        animateReels();
        playSound('spin');

        try {
            const result = await api.spinSlots(betAmount);
            
            // Остановить анимацию через 2 секунды и показать результат
            setTimeout(() => {
                stopReels(result.result, symbols);
                showSlotResult(result);
                isSpinning = false;
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN';
            }, 2000);
            
        } catch (error) {
            console.error('Spin error:', error);
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = 'SPIN';
            resultDiv.textContent = 'Error occurred';
        }
    });
}

// Блэкджек
function renderBlackjack(container) {
    container.innerHTML = `
        <div class="blackjack-table">
            <div class="blackjack-header">
                <h2>BLACKJACK</h2>
                <div class="balance-display">Balance: $<span id="game-balance">1000</span></div>
            </div>
            
            <div class="game-area">
                <div class="dealer-area">
                    <h3>Dealer (<span id="dealer-score">0</span>)</h3>
                    <div id="dealer-cards" class="card-area"></div>
                </div>
                
                <div class="player-area">
                    <h3>Player (<span id="player-score">0</span>)</h3>
                    <div id="player-cards" class="card-area"></div>
                </div>
            </div>
            
            <div class="blackjack-controls">
                <div class="bet-controls">
                    <label>Bet: $</label>
                    <input type="number" id="bet-amount" value="10" min="1" max="100">
                    <button id="deal-btn" class="action-button">DEAL</button>
                </div>
                
                <div class="game-actions" id="game-actions" style="display: none;">
                    <button id="hit-btn" class="action-button">HIT</button>
                    <button id="stand-btn" class="action-button">STAND</button>
                </div>
            </div>
            
            <div id="blackjack-result" class="game-result"></div>
        </div>
    `;

    initBlackjackGame();
}

// Анимация барабанов слотов
function animateReels() {
    const reels = document.querySelectorAll('.reel-symbols');
    reels.forEach(reel => {
        reel.style.animation = 'spin 0.1s linear infinite';
    });
}

function stopReels(results, symbols) {
    const reels = document.querySelectorAll('.reel-symbols');
    reels.forEach((reel, index) => {
        reel.style.animation = 'none';
        const symbolIndex = results[index];
        const symbol = symbols[symbolIndex] || symbols[0];
        reel.innerHTML = `<div class="symbol active">${symbol}</div>`;
    });
}

function showSlotResult(result) {
    const resultDiv = document.getElementById('slot-result');
    if (result.win > 0) {
        resultDiv.innerHTML = `<div class="win-message">🎉 WIN: $${result.win}! 🎉</div>`;
        playSound('win');
        // Эффект "вылетающих" цифр
        createWinEffect(result.win);
    } else {
        resultDiv.innerHTML = `<div class="lose-message">Try again!</div>`;
        playSound('lose');
    }
    
    // Обновить баланс
    updateGameBalance(result.balanceChange);
}

// Инициализация игры в блэкджек
function initBlackjackGame() {
    let gameState = {
        playerCards: [],
        dealerCards: [],
        playerScore: 0,
        dealerScore: 0,
        gameActive: false,
        dealerHidden: true
    };

    const dealBtn = document.getElementById('deal-btn');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const gameActions = document.getElementById('game-actions');
    const betInput = document.getElementById('bet-amount');

    dealBtn.addEventListener('click', () => startBlackjackGame(gameState, gameActions, betInput));
    hitBtn.addEventListener('click', () => playerHit(gameState));
    standBtn.addEventListener('click', () => playerStand(gameState, gameActions));
}

function startBlackjackGame(gameState, gameActions, betInput) {
    const betAmount = parseInt(betInput.value) || 10;
    
    // Сброс состояния
    gameState.playerCards = [];
    gameState.dealerCards = [];
    gameState.gameActive = true;
    gameState.dealerHidden = true;
    
    // Раздача карт
    dealCard(gameState, 'player');
    dealCard(gameState, 'dealer');
    dealCard(gameState, 'player');
    dealCard(gameState, 'dealer'); // Вторая карта дилера скрыта
    
    updateBlackjackDisplay(gameState);
    
    document.getElementById('deal-btn').style.display = 'none';
    gameActions.style.display = 'flex';
    
    playSound('deal');
}

function dealCard(gameState, target) {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    const card = { suit, value, numValue: getCardValue(value) };
    
    if (target === 'player') {
        gameState.playerCards.push(card);
        gameState.playerScore = calculateScore(gameState.playerCards);
    } else {
        gameState.dealerCards.push(card);
        if (!gameState.dealerHidden) {
            gameState.dealerScore = calculateScore(gameState.dealerCards);
        }
    }
}

function getCardValue(value) {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
}

function calculateScore(cards) {
    let score = 0;
    let aces = 0;
    
    cards.forEach(card => {
        if (card.value === 'A') {
            aces++;
            score += 11;
        } else {
            score += card.numValue;
        }
    });
    
    // Обработка тузов
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

function updateBlackjackDisplay(gameState) {
    const playerCardsDiv = document.getElementById('player-cards');
    const dealerCardsDiv = document.getElementById('dealer-cards');
    const playerScoreSpan = document.getElementById('player-score');
    const dealerScoreSpan = document.getElementById('dealer-score');
    
    // Отображение карт игрока
    playerCardsDiv.innerHTML = gameState.playerCards.map(card => 
        `<div class="card">${card.value}${card.suit}</div>`
    ).join('');
    
    // Отображение карт дилера
    dealerCardsDiv.innerHTML = gameState.dealerCards.map((card, index) => {
        if (index === 1 && gameState.dealerHidden) {
            return '<div class="card card-hidden">🂠</div>';
        }
        return `<div class="card">${card.value}${card.suit}</div>`;
    }).join('');
    
    playerScoreSpan.textContent = gameState.playerScore;
    dealerScoreSpan.textContent = gameState.dealerHidden ? '?' : gameState.dealerScore;
}

function playerHit(gameState) {
    dealCard(gameState, 'player');
    updateBlackjackDisplay(gameState);
    
    if (gameState.playerScore > 21) {
        endBlackjackGame(gameState, 'bust');
    }
    
    playSound('card');
}

function playerStand(gameState, gameActions) {
    gameState.dealerHidden = false;
    gameState.dealerScore = calculateScore(gameState.dealerCards);
    
    // Дилер берет карты до 17
    while (gameState.dealerScore < 17) {
        dealCard(gameState, 'dealer');
        gameState.dealerScore = calculateScore(gameState.dealerCards);
    }
    
    updateBlackjackDisplay(gameState);
    
    // Определение победителя
    let result;
    if (gameState.dealerScore > 21) {
        result = 'dealer_bust';
    } else if (gameState.playerScore > gameState.dealerScore) {
        result = 'player_win';
    } else if (gameState.playerScore < gameState.dealerScore) {
        result = 'dealer_win';
    } else {
        result = 'tie';
    }
    
    endBlackjackGame(gameState, result);
}

function endBlackjackGame(gameState, result) {
    const resultDiv = document.getElementById('blackjack-result');
    const gameActions = document.getElementById('game-actions');
    
    let message = '';
    let isWin = false;
    
    switch (result) {
        case 'bust':
            message = 'Bust! You lose!';
            playSound('lose');
            break;
        case 'dealer_bust':
            message = 'Dealer bust! You win!';
            isWin = true;
            playSound('win');
            break;
        case 'player_win':
            message = 'You win!';
            isWin = true;
            playSound('win');
            break;
        case 'dealer_win':
            message = 'Dealer wins!';
            playSound('lose');
            break;
        case 'tie':
            message = 'Push (Tie)!';
            playSound('tie');
            break;
    }
    
    resultDiv.innerHTML = `<div class="${isWin ? 'win-message' : 'lose-message'}">${message}</div>`;
    
    gameActions.style.display = 'none';
    document.getElementById('deal-btn').style.display = 'inline-block';
    gameState.gameActive = false;
}

// Звуковые эффекты
function playSound(type) {
    // Используем Web Audio API для простых звуков
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    let frequency;
    let duration;
    
    switch (type) {
        case 'spin':
            frequency = 200;
            duration = 0.1;
            break;
        case 'win':
            frequency = 800;
            duration = 0.5;
            break;
        case 'lose':
            frequency = 150;
            duration = 0.3;
            break;
        case 'deal':
        case 'card':
            frequency = 400;
            duration = 0.1;
            break;
        case 'tie':
            frequency = 300;
            duration = 0.2;
            break;
        default:
            return;
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function stopAllSounds() {
    // Остановка всех звуков при закрытии игры
    try {
        if (window.audioContext) {
            window.audioContext.close();
        }
    } catch (e) {
        console.log('Audio context cleanup error:', e);
    }
}

// Эффект "вылетающих" цифр при выигрыше
function createWinEffect(amount) {
    const container = document.getElementById('game-render-area');
    const effect = document.createElement('div');
    effect.className = 'win-effect';
    effect.textContent = `+$${amount}`;
    effect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        color: #4caf50;
        font-weight: bold;
        pointer-events: none;
        animation: winFloat 2s ease-out forwards;
        z-index: 1000;
    `;
    
    container.appendChild(effect);
    
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 2000);
}

function updateGameBalance(change) {
    const balanceSpan = document.getElementById('game-balance');
    if (balanceSpan) {
        const currentBalance = parseInt(balanceSpan.textContent) || 1000;
        const newBalance = currentBalance + change;
        balanceSpan.textContent = newBalance;
        
        // Обновить баланс в хедере тоже
        const headerBalance = document.getElementById('header-balance');
        if (headerBalance) {
            headerBalance.textContent = newBalance;
        }
    }
}

