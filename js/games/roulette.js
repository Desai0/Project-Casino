let rouletteSpinning = false;
let selectedBet = null;

const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const greenNumbers = [0];

// Статистика рулетки
let rouletteStats = {
    wins: 0,
    losses: 0
};

// Порядок номеров на европейской рулетке
const rouletteOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

function createRouletteNumbers(container) {
    container.innerHTML = '';
    
    rouletteOrder.forEach((number, index) => {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'roulette-number';
        numberDiv.textContent = number;
        numberDiv.dataset.number = number;
        
        // Определяем цвет
        if (greenNumbers.includes(number)) {
            numberDiv.classList.add('green');
        } else if (redNumbers.includes(number)) {
            numberDiv.classList.add('red');
        } else {
            numberDiv.classList.add('black');
        }
        
        // Определяем четность
        if (number > 0) {
            if (number % 2 === 0) {
                numberDiv.classList.add('even');
            } else {
                numberDiv.classList.add('odd');
            }
        }
        
        // Позиционирование
        const angle = (index / rouletteOrder.length) * 360;
        numberDiv.style.transform = `rotate(${angle}deg) translateY(-180px) rotate(-${angle}deg)`;
        
        container.appendChild(numberDiv);
    });
}

function initRouletteGame() {
    const spinBtn = document.getElementById('spin-roulette-btn');
    const betSlider = document.getElementById('bet-slider-roulette');
    const betAmount = document.getElementById('bet-amount-roulette');
    const betOptions = document.querySelectorAll('.bet-option');
    const wheelInner = document.getElementById('wheel-inner');

    // Создаем номера на рулетке
    if (wheelInner) {
        createRouletteNumbers(wheelInner);
    }

    // Обновление баланса
    if (window.currentUser) {
        const user = window.currentUser();
        document.getElementById('game-balance-roulette').textContent = 
            new Intl.NumberFormat('ru-RU').format(user.current_balance) + ' ₽';
    }

    // Загружаем статистику из localStorage
    loadRouletteStats();
    updateRouletteStatsDisplay();

    // Слайдер ставки
    betSlider.addEventListener('input', (e) => {
        betAmount.textContent = new Intl.NumberFormat('ru-RU').format(e.target.value);
    });

    // Выбор ставки
    betOptions.forEach(option => {
        option.addEventListener('click', () => {
            betOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedBet = option.dataset.bet;
        });
    });

    // Кнопка спина
    spinBtn.addEventListener('click', async () => {
        if (rouletteSpinning) return;
        if (!selectedBet) {
            alert('Выберите тип ставки!');
            return;
        }

        const bet = parseInt(betSlider.value);
        const user = window.currentUser();
        
        if (!user) {
            alert('Ошибка: пользователь не найден');
            return;
        }

        if (user.current_balance < bet) {
            alert('Недостаточно средств!');
            return;
        }

        await spinRoulette(bet);
    });
}

async function spinRoulette(bet) {
    rouletteSpinning = true;
    const spinBtn = document.getElementById('spin-roulette-btn');
    const resultDiv = document.getElementById('roulette-result');
    const wheel = document.getElementById('roulette-wheel');
    const ball = document.getElementById('roulette-ball');

    spinBtn.disabled = true;
    resultDiv.textContent = '';

    // Списываем ставку
    await window.updateBalance(-bet, 'Русская рулетка');

    // Генерируем случайное число
    const winningNumber = Math.floor(Math.random() * 37);
    const isRed = redNumbers.includes(winningNumber);
    const isBlack = blackNumbers.includes(winningNumber);
    const isGreen = greenNumbers.includes(winningNumber);
    const isEven = winningNumber > 0 && winningNumber % 2 === 0;
    const isOdd = winningNumber > 0 && winningNumber % 2 === 1;

    // Находим позицию выигрышного номера на колесе
    const winningIndex = rouletteOrder.indexOf(winningNumber);
    const numberAngle = (winningIndex / rouletteOrder.length) * 360;
    
    // Анимация вращения
    const spinDuration = 3000;
    const rotations = 5 + Math.random() * 3;
    // Финальный угол: позиция номера + несколько оборотов
    const finalAngle = numberAngle + (rotations * 360);

    let currentAngle = 0;
    const startTime = Date.now();

    const spinInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        currentAngle = easeOut * finalAngle;
        wheel.style.transform = `rotate(${currentAngle}deg)`;

        if (progress >= 1) {
            clearInterval(spinInterval);
            // Подсвечиваем выигрышный номер
            highlightWinningNumber(winningNumber);
            finishRouletteSpin(winningNumber, isRed, isBlack, isGreen, isEven, isOdd, bet);
        }
    }, 16);
}

async function finishRouletteSpin(number, isRed, isBlack, isGreen, isEven, isOdd, bet) {
    const resultDiv = document.getElementById('roulette-result');
    const spinBtn = document.getElementById('spin-roulette-btn');
    
    let win = false;
    let multiplier = 1;

    switch(selectedBet) {
        case 'red':
            win = isRed;
            multiplier = 2;
            break;
        case 'black':
            win = isBlack;
            multiplier = 2;
            break;
        case 'green':
            win = isGreen;
            multiplier = 36;
            break;
        case 'even':
            win = isEven;
            multiplier = 2;
            break;
        case 'odd':
            win = isOdd;
            multiplier = 2;
            break;
    }

    // Обновляем статистику
    if (win) {
        rouletteStats.wins++;
    } else {
        rouletteStats.losses++;
    }
    saveRouletteStats();
    updateRouletteStatsDisplay();

    const color = isRed ? 'красное' : isBlack ? 'черное' : 'зеленое';
    resultDiv.textContent = `Выпало: ${number} (${color})`;

    if (win) {
        const winAmount = bet * multiplier;
        await window.updateBalance(winAmount, 'Русская рулетка');
        resultDiv.textContent += ` | Выигрыш: ${new Intl.NumberFormat('ru-RU').format(winAmount)} ₽`;
        resultDiv.style.color = '#00ff88';
    } else {
        resultDiv.textContent += ' | Вы проиграли';
        resultDiv.style.color = '#ff4444';
    }

    rouletteSpinning = false;
    spinBtn.disabled = false;
    selectedBet = null;
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('selected'));
}

function loadRouletteStats() {
    const saved = localStorage.getItem('rouletteStats');
    if (saved) {
        try {
            rouletteStats = { ...rouletteStats, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Ошибка загрузки статистики рулетки:', e);
        }
    }
}

function saveRouletteStats() {
    localStorage.setItem('rouletteStats', JSON.stringify(rouletteStats));
}

function updateRouletteStatsDisplay() {
    const winsEl = document.getElementById('roulette-wins');
    const lossesEl = document.getElementById('roulette-losses');
    
    if (winsEl) winsEl.textContent = rouletteStats.wins;
    if (lossesEl) lossesEl.textContent = rouletteStats.losses;
}

function highlightWinningNumber(number) {
    // Убираем предыдущую подсветку
    document.querySelectorAll('.roulette-number').forEach(el => {
        el.classList.remove('winning');
    });
    
    // Подсвечиваем выигрышный номер
    const winningEl = document.querySelector(`.roulette-number[data-number="${number}"]`);
    if (winningEl) {
        winningEl.classList.add('winning');
        setTimeout(() => {
            winningEl.classList.remove('winning');
        }, 3000);
    }
}

