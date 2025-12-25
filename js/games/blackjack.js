let blackjackGame = {
    deck: [],
    playerCards: [],
    dealerCards: [],
    playerScore: 0,
    dealerScore: 0,
    bet: 0,
    gameStarted: false,
    gameEnded: false
};

// Статистика блэкджека
let blackjackStats = {
    wins: 0,
    losses: 0
};

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function initBlackjackGame() {
    const dealBtn = document.getElementById('deal-btn');
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const betSlider = document.getElementById('bet-slider-bj');
    const betAmount = document.getElementById('bet-amount-bj');

    // Обновление баланса
    if (window.currentUser) {
        const user = window.currentUser();
        document.getElementById('game-balance-bj').textContent = 
            new Intl.NumberFormat('ru-RU').format(user.current_balance) + ' ₽';
    }

    // Загружаем статистику из localStorage
    loadBlackjackStats();
    updateBlackjackStatsDisplay();

    // Слайдер ставки
    betSlider.addEventListener('input', (e) => {
        betAmount.textContent = new Intl.NumberFormat('ru-RU').format(e.target.value);
    });

    // Кнопки
    dealBtn.addEventListener('click', () => dealCards());
    hitBtn.addEventListener('click', () => playerHit());
    standBtn.addEventListener('click', () => playerStand());

    resetGame();
}

function resetGame() {
    blackjackGame = {
        deck: createDeck(),
        playerCards: [],
        dealerCards: [],
        playerScore: 0,
        dealerScore: 0,
        bet: 0,
        gameStarted: false,
        gameEnded: false
    };

    document.getElementById('player-cards').innerHTML = '';
    document.getElementById('dealer-cards').innerHTML = '';
    document.getElementById('player-score').textContent = 'Очки: 0';
    document.getElementById('dealer-score').textContent = 'Очки: 0';
    document.getElementById('bj-result').textContent = '';

    document.getElementById('deal-btn').disabled = false;
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;
}

function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    // Перемешивание
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getCardValue(card) {
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
}

function calculateScore(cards) {
    let score = 0;
    let aces = 0;

    for (let card of cards) {
        if (card.rank === 'A') {
            aces++;
            score += 11;
        } else {
            score += getCardValue(card);
        }
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function displayCard(card, container, hidden = false) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    
    if (hidden) {
        cardDiv.textContent = '🂠';
        cardDiv.style.background = '#333';
    } else {
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardDiv.textContent = `${card.rank}${card.suit}`;
        if (isRed) {
            cardDiv.classList.add('red');
        }
    }
    
    container.appendChild(cardDiv);
}

async function dealCards() {
    if (blackjackGame.gameStarted) return;

    const bet = parseInt(document.getElementById('bet-slider-bj').value);
    const user = window.currentUser();

    if (!user) {
        alert('Ошибка: пользователь не найден');
        return;
    }

    if (user.current_balance < bet) {
        alert('Недостаточно средств!');
        return;
    }

    // Списываем ставку
    await window.updateBalance(-bet, 'Блэкджек');
    blackjackGame.bet = bet;

    // Раздача карт
    blackjackGame.playerCards = [blackjackGame.deck.pop(), blackjackGame.deck.pop()];
    blackjackGame.dealerCards = [blackjackGame.deck.pop(), blackjackGame.deck.pop()];

    blackjackGame.playerScore = calculateScore(blackjackGame.playerCards);
    blackjackGame.dealerScore = calculateScore([blackjackGame.dealerCards[0]]);

    // Отображение
    const playerContainer = document.getElementById('player-cards');
    const dealerContainer = document.getElementById('dealer-cards');
    playerContainer.innerHTML = '';
    dealerContainer.innerHTML = '';

    blackjackGame.playerCards.forEach(card => displayCard(card, playerContainer));
    displayCard(blackjackGame.dealerCards[0], dealerContainer);
    displayCard(blackjackGame.dealerCards[1], dealerContainer, true);

    document.getElementById('player-score').textContent = `Очки: ${blackjackGame.playerScore}`;
    document.getElementById('dealer-score').textContent = 'Очки: ?';

    blackjackGame.gameStarted = true;
    document.getElementById('deal-btn').disabled = true;
    document.getElementById('hit-btn').disabled = false;
    document.getElementById('stand-btn').disabled = false;

    // Проверка на блэкджек
    if (blackjackGame.playerScore === 21) {
        setTimeout(() => playerStand(), 1000);
    }
}

function playerHit() {
    if (!blackjackGame.gameStarted || blackjackGame.gameEnded) return;

    const card = blackjackGame.deck.pop();
    blackjackGame.playerCards.push(card);
    blackjackGame.playerScore = calculateScore(blackjackGame.playerCards);

    displayCard(card, document.getElementById('player-cards'));
    document.getElementById('player-score').textContent = `Очки: ${blackjackGame.playerScore}`;

    if (blackjackGame.playerScore > 21) {
        endGame('Перебор! Вы проиграли.');
    } else if (blackjackGame.playerScore === 21) {
        setTimeout(() => playerStand(), 500);
    }
}

async function playerStand() {
    if (!blackjackGame.gameStarted || blackjackGame.gameEnded) return;

    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;

    // Открываем карту дилера
    const dealerContainer = document.getElementById('dealer-cards');
    dealerContainer.innerHTML = '';
    blackjackGame.dealerCards.forEach(card => displayCard(card, dealerContainer));
    
    blackjackGame.dealerScore = calculateScore(blackjackGame.dealerCards);
    document.getElementById('dealer-score').textContent = `Очки: ${blackjackGame.dealerScore}`;

    // Дилер берет карты
    while (blackjackGame.dealerScore < 17) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const card = blackjackGame.deck.pop();
        blackjackGame.dealerCards.push(card);
        blackjackGame.dealerScore = calculateScore(blackjackGame.dealerCards);
        displayCard(card, dealerContainer);
        document.getElementById('dealer-score').textContent = `Очки: ${blackjackGame.dealerScore}`;
    }

    endGame();
}

async function endGame(message = null) {
    blackjackGame.gameEnded = true;
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;

    let result = '';
    let winAmount = 0;
    let isWin = false;
    let isLoss = false;

    if (message) {
        result = message;
        isLoss = true;
    } else {
        const playerBJ = blackjackGame.playerScore === 21 && blackjackGame.playerCards.length === 2;
        const dealerBJ = blackjackGame.dealerScore === 21 && blackjackGame.dealerCards.length === 2;

        if (playerBJ && !dealerBJ) {
            winAmount = Math.floor(blackjackGame.bet * 2.5);
            result = 'Блэкджек! Вы выиграли!';
            isWin = true;
        } else if (dealerBJ) {
            result = 'Дилер блэкджек! Вы проиграли.';
            isLoss = true;
        } else if (blackjackGame.playerScore > 21) {
            result = 'Перебор! Вы проиграли.';
            isLoss = true;
        } else if (blackjackGame.dealerScore > 21) {
            winAmount = blackjackGame.bet * 2;
            result = 'Дилер перебрал! Вы выиграли!';
            isWin = true;
        } else if (blackjackGame.playerScore > blackjackGame.dealerScore) {
            winAmount = blackjackGame.bet * 2;
            result = 'Вы выиграли!';
            isWin = true;
        } else if (blackjackGame.playerScore < blackjackGame.dealerScore) {
            result = 'Вы проиграли.';
            isLoss = true;
        } else {
            winAmount = blackjackGame.bet;
            result = 'Ничья! Ставка возвращена.';
            // Ничья не считается ни победой, ни поражением
        }
    }

    // Обновляем статистику
    if (isWin) {
        blackjackStats.wins++;
    } else if (isLoss) {
        blackjackStats.losses++;
    }
    saveBlackjackStats();
    updateBlackjackStatsDisplay();

    document.getElementById('bj-result').textContent = result;
    if (winAmount > 0) {
        await window.updateBalance(winAmount, 'Блэкджек');
    }

    setTimeout(() => {
        resetGame();
    }, 3000);
}

function loadBlackjackStats() {
    const saved = localStorage.getItem('blackjackStats');
    if (saved) {
        try {
            blackjackStats = { ...blackjackStats, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Ошибка загрузки статистики блэкджека:', e);
        }
    }
}

function saveBlackjackStats() {
    localStorage.setItem('blackjackStats', JSON.stringify(blackjackStats));
}

function updateBlackjackStatsDisplay() {
    const winsEl = document.getElementById('bj-wins');
    const lossesEl = document.getElementById('bj-losses');
    
    if (winsEl) winsEl.textContent = blackjackStats.wins;
    if (lossesEl) lossesEl.textContent = blackjackStats.losses;
}


