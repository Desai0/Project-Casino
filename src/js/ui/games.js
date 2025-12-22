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
        } else if (type === 'roulette') {
            renderRoulette(area);
        } else {
            area.innerHTML = '<div class="game-placeholder">В разработке...</div>';
        }
    }, 500);
}

// Слоты с анимацией
function renderSlots(container) {
    // Массив символов - делаем константой для доступа из всех функций
    const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    
    // Получаем текущий баланс из хедера
    const currentBalance = document.getElementById('header-balance').textContent.replace(/\s/g, '');
    
    container.innerHTML = `
        <div class="slots-machine">
            <div class="slots-header">
                <h2>SLOT MACHINE</h2>
                <div class="balance-display">Balance: $<span id="game-balance">${currentBalance}</span></div>
            </div>
            
            <div class="reels-container">
                <div class="reel" id="reel1">
                    <div class="reel-symbols">
                        ${SLOT_SYMBOLS.map(s => `<div class="symbol">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="reel" id="reel2">
                    <div class="reel-symbols">
                        ${SLOT_SYMBOLS.map(s => `<div class="symbol">${s}</div>`).join('')}
                    </div>
                </div>
                <div class="reel" id="reel3">
                    <div class="reel-symbols">
                        ${SLOT_SYMBOLS.map(s => `<div class="symbol">${s}</div>`).join('')}
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
            
            console.log('Spin result received:', result);
            
            if (!result || !result.success) {
                throw new Error(result?.error || 'Invalid result from server');
            }
            
            // Остановить барабаны по очереди для драматического эффекта
            stopReelsSequentially(result.result, SLOT_SYMBOLS, () => {
                try {
                    showSlotResult(result);
                } catch (stopError) {
                    console.error('Error showing result:', stopError);
                    resultDiv.innerHTML = '<div class="lose-message">Display error occurred</div>';
                }
                
                isSpinning = false;
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN';
            });
            
        } catch (error) {
            console.error('Spin error:', error);
            
            // Останавливаем анимацию даже при ошибке
            setTimeout(() => {
                const reels = document.querySelectorAll('.reel-symbols');
                reels.forEach(reel => {
                    reel.className = 'reel-symbols stopped';
                    reel.style.animation = 'none';
                });
            }, 500);
            
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = 'SPIN';
            resultDiv.innerHTML = `<div class="lose-message">Error: ${error.message}</div>`;
        }
    });
}

// Блэкджек
function renderBlackjack(container) {
    // Получаем текущий баланс из хедера
    const currentBalance = document.getElementById('header-balance').textContent.replace(/\s/g, '');
    
    container.innerHTML = `
        <div class="blackjack-table">
            <div class="blackjack-header">
                <h2>BLACKJACK</h2>
                <div class="balance-display">Balance: $<span id="game-balance">${currentBalance}</span></div>
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
    const reelContainers = document.querySelectorAll('.reel');
    console.log('Animating reels, found:', reels.length);
    
    reels.forEach((reel, index) => {
        // Сбрасываем все предыдущие состояния
        reel.className = 'reel-symbols';
        reel.style.animation = '';
        
        // Сбрасываем состояние контейнера
        const container = reelContainers[index];
        if (container) {
            container.classList.remove('stopping');
        }
        
        // Принудительный reflow
        reel.offsetHeight;
        
        // Добавляем класс анимации
        reel.classList.add('spinning');
        console.log(`Reel ${index} animation started`);
    });
}

// Останавливает барабаны по очереди (левый -> средний -> правый)
function stopReelsSequentially(results, symbols, onComplete) {
    console.log('stopReelsSequentially called with:', { results, symbols });
    
    const reels = document.querySelectorAll('.reel-symbols');
    console.log('Found reels:', reels.length);
    
    if (reels.length === 0) {
        console.error('No reels found!');
        if (onComplete) onComplete();
        return;
    }
    
    if (!results || !Array.isArray(results)) {
        console.error('Invalid results array:', results);
        results = [0, 1, 2];
    }
    
    if (results.length !== reels.length) {
        console.warn(`Results length (${results.length}) doesn't match reels count (${reels.length})`);
        while (results.length < reels.length) {
            results.push(Math.floor(Math.random() * symbols.length));
        }
        results = results.slice(0, reels.length);
    }
    
    // Останавливаем барабаны по очереди с задержкой
    const stopDelays = [1500, 2200, 3000]; // Задержки для каждого барабана
    
    reels.forEach((reel, index) => {
        setTimeout(() => {
            try {
                stopSingleReel(reel, results[index], symbols, index);
                
                // Если это последний барабан, вызываем callback
                if (index === reels.length - 1 && onComplete) {
                    setTimeout(onComplete, 300); // Небольшая задержка после последнего барабана
                }
            } catch (reelError) {
                console.error(`Error stopping reel ${index}:`, reelError);
                reel.innerHTML = `<div class="symbol active">❓</div>`;
            }
        }, stopDelays[index] || 1000 + index * 500);
    });
}

// Останавливает один барабан
function stopSingleReel(reel, symbolIndex, symbols, reelIndex) {
    console.log(`Stopping reel ${reelIndex}: symbolIndex=${symbolIndex}`);
    
    // Добавляем подсветку барабана который останавливается
    const reelContainer = reel.closest('.reel');
    if (reelContainer) {
        reelContainer.classList.add('stopping');
    }
    
    // Добавляем эффект замедления перед остановкой
    reel.style.animation = 'spinSlow 0.3s ease-out forwards';
    
    // Звук остановки барабана
    playSound('reelStop');
    
    setTimeout(() => {
        // Полностью останавливаем анимацию
        reel.classList.remove('spinning');
        reel.classList.add('stopped');
        reel.style.animation = 'none';
        reel.style.transform = 'translateY(0)';
        
        const symbol = symbols[symbolIndex] || symbols[0] || '❓';
        console.log(`Reel ${reelIndex} stopped with symbol: ${symbol}`);
        
        // Заменяем содержимое на финальный символ с анимацией появления
        reel.innerHTML = `<div class="symbol active">${symbol}</div>`;
        
        // Добавляем эффект "подпрыгивания" при остановке
        const symbolElement = reel.querySelector('.symbol');
        if (symbolElement) {
            symbolElement.style.animation = 'reelBounce 0.4s ease-out';
        }
        
        // Убираем подсветку после остановки
        if (reelContainer) {
            setTimeout(() => {
                reelContainer.classList.remove('stopping');
            }, 400);
        }
    }, 300);
}

// Старая функция для совместимости (останавливает все сразу)
function stopReels(results, symbols) {
    console.log('stopReels called with:', { results, symbols });
    
    const reels = document.querySelectorAll('.reel-symbols');
    
    if (reels.length === 0) {
        console.error('No reels found!');
        return;
    }
    
    if (!results || !Array.isArray(results)) {
        console.error('Invalid results array:', results);
        results = [0, 1, 2];
    }
    
    reels.forEach((reel, index) => {
        stopSingleReel(reel, results[index] || 0, symbols, index);
    });
}

function showSlotResult(result) {
    const resultDiv = document.getElementById('slot-result');
    
    console.log('Showing slot result:', result);
    
    if (!result) {
        resultDiv.innerHTML = `<div class="lose-message">Error: No result</div>`;
        return;
    }
    
    const win = result.win || 0;
    const balanceChange = result.balanceChange || 0;
    const newBalance = result.newBalance;
    
    if (win > 0) {
        resultDiv.innerHTML = `<div class="win-message">🎉 WIN: $${win}! 🎉</div>`;
        playSound('win');
        // Эффект "вылетающих" цифр
        createWinEffect(win);
    } else {
        resultDiv.innerHTML = `<div class="lose-message">Try again!</div>`;
        playSound('lose');
    }
    
    // Обновить баланс ИЗ БАЗЫ ДАННЫХ
    if (newBalance !== undefined) {
        updateAllBalances(newBalance);
        // Обновить график истории
        refreshHistoryAfterGame();
    }
}

async function refreshHistoryAfterGame() {
    try {
        const { refreshHistory } = await import('./dashboard.js');
        refreshHistory();
    } catch (err) {
        console.error('Failed to refresh history:', err);
    }
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
    
    // Сохраняем betAmount в gameState для использования в endBlackjackGame
    gameState.betAmount = betAmount;
    
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
        endBlackjackGame(gameState, 'bust', gameState.betAmount);
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
    
    endBlackjackGame(gameState, result, gameState.betAmount);
}

async function endBlackjackGame(gameState, result, betAmount) {
    const resultDiv = document.getElementById('blackjack-result');
    const gameActions = document.getElementById('game-actions');
    
    let message = '';
    let isWin = false;
    let winAmount = 0;
    
    // Получаем profileId из текущего пользователя
    const profileId = window.currentUser?.id || 1;
    
    switch (result) {
        case 'bust':
            message = 'Bust! You lose!';
            playSound('lose');
            winAmount = 0;
            break;
        case 'dealer_bust':
            message = 'Dealer bust! You win!';
            isWin = true;
            playSound('win');
            winAmount = betAmount * 2; // Выигрыш = ставка * 2 (ставка + выигрыш)
            break;
        case 'player_win':
            message = 'You win!';
            isWin = true;
            playSound('win');
            winAmount = betAmount * 2;
            break;
        case 'dealer_win':
            message = 'Dealer wins!';
            playSound('lose');
            winAmount = 0;
            break;
        case 'tie':
            message = 'Push (Tie)!';
            playSound('tie');
            winAmount = betAmount; // Возврат ставки
            break;
    }
    
    resultDiv.innerHTML = `<div class="${isWin ? 'win-message' : 'lose-message'}">${message}</div>`;
    
    // Записываем результат в БД
    try {
        const gameResult = await api.playBlackjack({
            action: 'end',
            betAmount: betAmount,
            gameState: {
                result: result,
                winAmount: winAmount
            },
            profileId: profileId
        });
        
        if (gameResult.success && gameResult.newBalance !== undefined) {
            // Обновляем баланс во всех местах
            updateAllBalances(gameResult.newBalance);
            // Обновляем график истории
            refreshHistoryAfterGame();
        }
    } catch (error) {
        console.error('Failed to record blackjack result:', error);
    }
    
    gameActions.style.display = 'none';
    document.getElementById('deal-btn').style.display = 'inline-block';
    gameState.gameActive = false;
}

// Рулетка
function renderRoulette(container) {
    // Числа на рулетке в правильном порядке (европейская рулетка)
    const rouletteNumbers = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
        24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];
    
    // Цвета чисел (0 - зеленый, четные красные, нечетные черные, кроме исключений)
    const getNumberColor = (num) => {
        if (num === 0) return 'green';
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        return redNumbers.includes(num) ? 'red' : 'black';
    };
    
    // Получаем текущий баланс из хедера
    const currentBalance = document.getElementById('header-balance').textContent.replace(/\s/g, '');
    
    container.innerHTML = `
        <div class="roulette-table">
            <div class="roulette-header">
                <h2>ROULETTE</h2>
                <div class="balance-display">Balance: $<span id="game-balance">${currentBalance}</span></div>
            </div>
            
            <div class="roulette-game">
                <!-- Колесо рулетки -->
                <div class="roulette-wheel-container">
                    <div class="roulette-wheel" id="roulette-wheel">
                        <div class="wheel-center"></div>
                        <div class="wheel-numbers">
                            ${rouletteNumbers.map((num, index) => {
                                const angle = (360 / rouletteNumbers.length) * index;
                                const color = getNumberColor(num);
                                return `<div class="wheel-number ${color}" style="transform: rotate(${angle}deg) translateY(-120px) rotate(-${angle}deg)">${num}</div>`;
                            }).join('')}
                        </div>
                        <div class="wheel-pointer"></div>
                    </div>
                    
                    <div class="spin-controls">
                        <button id="spin-roulette-btn" class="spin-button">SPIN</button>
                        <div id="roulette-result" class="game-result"></div>
                    </div>
                </div>
                
                <!-- Стол для ставок -->
                <div class="betting-table">
                    <div class="betting-header">
                        <div class="bet-amount-control">
                            <label>Bet: $</label>
                            <input type="number" id="roulette-bet-amount" value="10" min="1" max="100">
                        </div>
                        <div class="selected-bets" id="selected-bets">
                            <span>Selected: None</span>
                        </div>
                    </div>
                    
                    <!-- Числовая сетка -->
                    <div class="numbers-grid">
                        <div class="zero-section">
                            <div class="bet-spot number-bet green" data-bet="0" data-type="straight">0</div>
                        </div>
                        
                        <div class="main-numbers">
                            ${Array.from({length: 36}, (_, i) => i + 1).map(num => {
                                const color = getNumberColor(num);
                                const row = Math.ceil(num / 3);
                                return `<div class="bet-spot number-bet ${color}" data-bet="${num}" data-type="straight">${num}</div>`;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- Внешние ставки -->
                    <div class="outside-bets">
                        <div class="bet-spot outside-bet" data-bet="red" data-type="color">RED</div>
                        <div class="bet-spot outside-bet" data-bet="black" data-type="color">BLACK</div>
                        <div class="bet-spot outside-bet" data-bet="even" data-type="parity">EVEN</div>
                        <div class="bet-spot outside-bet" data-bet="odd" data-type="parity">ODD</div>
                        <div class="bet-spot outside-bet" data-bet="1-18" data-type="range">1-18</div>
                        <div class="bet-spot outside-bet" data-bet="19-36" data-type="range">19-36</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    initRouletteGame(rouletteNumbers, getNumberColor);
}

function initRouletteGame(rouletteNumbers, getNumberColor) {
    let isSpinning = false;
    let currentBets = [];
    
    const spinBtn = document.getElementById('spin-roulette-btn');
    const betAmountInput = document.getElementById('roulette-bet-amount');
    const selectedBetsDiv = document.getElementById('selected-bets');
    const resultDiv = document.getElementById('roulette-result');
    const wheel = document.getElementById('roulette-wheel');
    
    // Обработчики ставок
    document.querySelectorAll('.bet-spot').forEach(spot => {
        spot.addEventListener('click', () => {
            if (isSpinning) return;
            
            const betAmount = parseInt(betAmountInput.value) || 10;
            const betValue = spot.dataset.bet;
            const betType = spot.dataset.type;
            
            // Добавляем ставку
            const existingBet = currentBets.find(bet => bet.value === betValue);
            if (existingBet) {
                existingBet.amount += betAmount;
            } else {
                currentBets.push({
                    value: betValue,
                    type: betType,
                    amount: betAmount
                });
            }
            
            // Визуальное отображение ставки
            spot.classList.add('has-bet');
            const chip = document.createElement('div');
            chip.className = 'betting-chip';
            chip.textContent = `$${betAmount}`;
            spot.appendChild(chip);
            
            updateSelectedBets();
            playSound('bet');
        });
    });
    
    // Кнопка очистки ставок
    const clearBetsBtn = document.createElement('button');
    clearBetsBtn.textContent = 'CLEAR BETS';
    clearBetsBtn.className = 'action-button';
    clearBetsBtn.addEventListener('click', clearAllBets);
    document.querySelector('.betting-header').appendChild(clearBetsBtn);
    
    // Обработчик кнопки SPIN
    spinBtn.addEventListener('click', async () => {
        if (isSpinning || currentBets.length === 0) {
            if (currentBets.length === 0) {
                resultDiv.innerHTML = '<div class="lose-message">Place a bet first!</div>';
            }
            return;
        }
        
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = 'SPINNING...';
        resultDiv.innerHTML = '';
        
        // Сначала выбираем случайное выигрышное число
        const winningNumber = rouletteNumbers[Math.floor(Math.random() * rouletteNumbers.length)];
        const winningIndex = rouletteNumbers.indexOf(winningNumber);
        
        // Вычисляем нужный угол для этого числа
        const sectorAngle = 360 / rouletteNumbers.length;
        const targetAngle = winningIndex * sectorAngle;
        
        // Добавляем несколько полных оборотов для эффекта
        const spins = 8 + Math.random() * 4; // 8-12 оборотов
        const totalRotation = spins * 360 + targetAngle;
        
        // Анимация вращения
        wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheel.style.transform = `rotate(${totalRotation}deg)`;
        
        playSound('spin');
        
        try {
            // Ждем окончания анимации
            setTimeout(async () => {
                // Добавляем небольшую задержку для драматического эффекта
                setTimeout(async () => {
                    const result = await calculateRouletteWin(winningNumber, currentBets, getNumberColor);
                    showRouletteResult(result, winningNumber);
                    
                    isSpinning = false;
                    spinBtn.disabled = false;
                    spinBtn.textContent = 'SPIN';
                    
                    // Очищаем ставки после игры
                    setTimeout(clearAllBets, 3000);
                }, 500);
            }, 4000);
            
        } catch (error) {
            console.error('Roulette error:', error);
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = 'SPIN';
            resultDiv.innerHTML = '<div class="lose-message">Error occurred</div>';
        }
    });
    
    function updateSelectedBets() {
        const totalBet = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
        const betsList = currentBets.map(bet => `${bet.value}: $${bet.amount}`).join(', ');
        selectedBetsDiv.innerHTML = `<span>Total: $${totalBet} | ${betsList}</span>`;
    }
    
    function clearAllBets() {
        currentBets = [];
        document.querySelectorAll('.bet-spot').forEach(spot => {
            spot.classList.remove('has-bet');
            const chips = spot.querySelectorAll('.betting-chip');
            chips.forEach(chip => chip.remove());
        });
        selectedBetsDiv.innerHTML = '<span>Selected: None</span>';
    }
}

async function calculateRouletteWin(winningNumber, bets, getNumberColor) {
    // Валидация входных данных
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
        console.error('Roulette: Invalid bets array:', bets);
        return {
            winningNumber,
            totalWin: 0,
            totalBet: 0,
            netWin: 0,
            bets: []
        };
    }
    
    let totalWin = 0;
    // Суммируем ставки с валидацией
    let totalBet = 0;
    bets.forEach(bet => {
        if (bet && bet.amount && !isNaN(bet.amount) && bet.amount > 0) {
            totalBet += Number(bet.amount);
        }
    });
    
    // Валидация
    if (!totalBet || totalBet <= 0 || isNaN(totalBet)) {
        console.error('Roulette: Invalid totalBet:', totalBet, 'from bets:', bets);
        return {
            winningNumber,
            totalWin: 0,
            totalBet: 0,
            netWin: 0,
            bets: []
        };
    }
    
    const winningColor = getNumberColor(winningNumber);
    const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
    const isLow = winningNumber >= 1 && winningNumber <= 18;
    
    bets.forEach(bet => {
        // Валидация ставки
        if (!bet || !bet.amount || bet.amount <= 0 || isNaN(bet.amount)) {
            console.warn('Roulette: Invalid bet:', bet);
            return;
        }
        
        let isWinningBet = false;
        let payout = 0;
        
        switch (bet.type) {
            case 'straight':
                if (parseInt(bet.value) === winningNumber) {
                    isWinningBet = true;
                    // 35:1 означает: выигрыш = ставка * 35 (чистая прибыль, ставка возвращается отдельно)
                    payout = Number(bet.amount) * 35;
                }
                break;
            case 'color':
                if (bet.value === winningColor) {
                    isWinningBet = true;
                    // 1:1 означает: выигрыш = ставка * 1 (чистая прибыль, ставка возвращается отдельно)
                    payout = Number(bet.amount) * 1;
                }
                break;
            case 'parity':
                if ((bet.value === 'even' && isEven) || (bet.value === 'odd' && !isEven && winningNumber !== 0)) {
                    isWinningBet = true;
                    payout = Number(bet.amount) * 1;
                }
                break;
            case 'range':
                if ((bet.value === '1-18' && isLow) || (bet.value === '19-36' && !isLow && winningNumber !== 0)) {
                    isWinningBet = true;
                    payout = Number(bet.amount) * 1;
                }
                break;
        }
        
        if (isWinningBet) {
            totalWin += payout;
        }
    });
    
    // totalWin - это чистая прибыль (payout, без возврата ставки)
    // В рулетке: если выиграли, получаем payout (чистая прибыль)
    // Ставка списывается при записи в БД через moneyChange = totalWin - totalBet
    // Если выиграли: moneyChange = payout - ставка (положительное число)
    // Если проиграли: moneyChange = 0 - ставка (отрицательное число)
    const netWin = totalWin - totalBet;
    
    console.log('Roulette calculation:', {
        totalBet,
        totalWin,
        netWin,
        winningNumber,
        betsCount: bets.length
    });
    
    // Записываем в БД
    try {
        const profileId = window.currentUser?.id || 1;
        
        if (!profileId) {
            console.error('Roulette: No profileId found');
            return {
                winningNumber,
                totalWin: 0,
                totalBet: totalBet,
                netWin: -totalBet,
                bets
            };
        }
        
        // Валидация перед отправкой
        if (!totalBet || totalBet <= 0 || isNaN(totalBet)) {
            console.error('Roulette: Invalid totalBet before sending:', totalBet);
            return {
                winningNumber,
                totalWin: 0,
                totalBet: 0,
                netWin: 0,
                bets
            };
        }
        
        if (isNaN(totalWin)) {
            console.error('Roulette: Invalid totalWin before sending:', totalWin);
            totalWin = 0;
        }
        
        console.log('Roulette: Sending to backend:', {
            totalBet: Number(totalBet),
            totalWin: Number(totalWin),
            netWin: Number(netWin),
            winningNumber,
            profileId
        });
        
        const gameResult = await api.playRoulette({
            action: 'end',
            betAmount: Number(totalBet),
            gameState: {
                totalBet: Number(totalBet),
                winAmount: Number(totalWin), // Чистая прибыль (payout, без возврата ставки)
                winningNumber: winningNumber
            },
            profileId: profileId
        });
        
        console.log('Roulette: Backend response:', gameResult);
        
        if (!gameResult || !gameResult.success) {
            console.error('Roulette: Backend returned error:', gameResult?.error);
            return {
                winningNumber,
                totalWin: 0,
                totalBet: totalBet,
                netWin: -totalBet,
                bets
            };
        }
        
        if (gameResult.newBalance !== undefined && gameResult.newBalance !== null) {
            // Обновляем баланс во всех местах
            updateAllBalances(gameResult.newBalance);
            // Обновляем график истории
            refreshHistoryAfterGame();
        } else {
            console.warn('Roulette: Backend did not return newBalance, got:', gameResult);
        }
    } catch (error) {
        console.error('Failed to record roulette result:', error);
    }
    
    return {
        winningNumber,
        totalWin,
        totalBet,
        netWin,
        bets
    };
}

function showRouletteResult(result, winningNumber) {
    const resultDiv = document.getElementById('roulette-result');
    const { totalWin, netWin } = result;
    
    let message = `Number: ${winningNumber}`;
    if (totalWin > 0) {
        message += ` | Win: $${totalWin}`;
        resultDiv.innerHTML = `<div class="win-message">${message}</div>`;
        playSound('win');
        createWinEffect(totalWin);
    } else {
        message += ` | No win`;
        resultDiv.innerHTML = `<div class="lose-message">${message}</div>`;
        playSound('lose');
    }
    
    // Баланс уже обновлен в calculateRouletteWin через API и updateAllBalances
    // НЕ вызываем updateGameBalance здесь, чтобы не дублировать обновление
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
        case 'bet':
            frequency = 600;
            duration = 0.1;
            break;
        case 'reelStop':
            frequency = 350;
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

// Обновляет ВСЕ отображения баланса (хедер, профиль, игра)
function updateAllBalances(newBalance) {
    // Форматируем с пробелами
    const formatted = newBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    
    // Хедер
    const headerBalance = document.getElementById('header-balance');
    if (headerBalance) {
        headerBalance.textContent = formatted;
    }
    
    // Профиль
    const profileBalance = document.getElementById('profile-balance');
    if (profileBalance) {
        profileBalance.textContent = formatted;
    }
    
    // Баланс внутри игры
    const gameBalance = document.getElementById('game-balance');
    if (gameBalance) {
        gameBalance.textContent = formatted;
    }
}

// Делаем функцию глобальной для использования в других модулях
window.updateAllBalances = updateAllBalances;

