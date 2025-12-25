let slotsSpinning = false;
let freespinsLeft = 0;

const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '💎', '🎰'];
const wildSymbol = '🌟';
const freespinSymbol = '🎁';

function initSlotsGame() {
    const spinBtn = document.getElementById('spin-btn');
    const betSlider = document.getElementById('bet-slider');
    const betAmount = document.getElementById('bet-amount');
    const reels = document.querySelectorAll('.reel');

    // Обновление баланса
    if (window.currentUser) {
        const user = window.currentUser();
        document.getElementById('game-balance-slots').textContent = 
            new Intl.NumberFormat('ru-RU').format(user.current_balance) + ' ₽';
    }

    // Слайдер ставки
    betSlider.addEventListener('input', (e) => {
        betAmount.textContent = new Intl.NumberFormat('ru-RU').format(e.target.value);
    });

    // Кнопка спина
    spinBtn.addEventListener('click', async () => {
        if (slotsSpinning) return;

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

        await spinSlots(bet);
    });

    // Инициализация барабанов
    reels.forEach(reel => {
        // Очищаем существующие символы
        reel.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const symbol = document.createElement('div');
            symbol.className = 'reel-symbol';
            symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            reel.appendChild(symbol);
        }
    });
    
    // Сбрасываем состояние
    slotsSpinning = false;
    freespinsLeft = 0;
}

async function spinSlots(bet) {
    if (slotsSpinning) return;
    
    slotsSpinning = true;
    const spinBtn = document.getElementById('spin-btn');
    const winDisplay = document.getElementById('win-display');
    const reels = document.querySelectorAll('.reel');

    if (!spinBtn || !winDisplay || !reels.length) {
        slotsSpinning = false;
        return;
    }

    spinBtn.disabled = true;
    winDisplay.textContent = '';

    // Используем бесплатный спин если есть
    const isFreeSpin = freespinsLeft > 0;
    if (isFreeSpin) {
        freespinsLeft--;
    } else {
        // Списываем ставку
        await window.updateBalance(-bet, 'Аниме слот');
    }

    // Генерируем финальные результаты ДО начала анимации
    const finalResults = [];
    reels.forEach(() => {
        const reelResult = [];
        for (let i = 0; i < 3; i++) {
            const rand = Math.random();
            let finalSymbol;
            
            if (rand < 0.05) {
                finalSymbol = wildSymbol;
            } else if (rand < 0.08) {
                finalSymbol = freespinSymbol;
            } else {
                finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            }
            reelResult.push(finalSymbol);
        }
        finalResults.push(reelResult);
    });

    // Добавляем класс для анимации
    reels.forEach(reel => reel.classList.add('spinning'));

    // Анимация вращения
    const spinDuration = 2000;
    const spinSpeed = 50;
    let elapsed = 0;
    let intervalId = null;

    const spinInterval = setInterval(() => {
        reels.forEach((reel, reelIndex) => {
            const symbolElements = reel.querySelectorAll('.reel-symbol');
            symbolElements.forEach((symbol, symbolIndex) => {
                // Показываем случайные символы во время вращения
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                symbol.textContent = randomSymbol;
            });
        });
        
        elapsed += spinSpeed;
        
        if (elapsed >= spinDuration) {
            clearInterval(intervalId);
            intervalId = null;
            
            // Останавливаем анимацию и показываем финальные результаты
            reels.forEach((reel, reelIndex) => {
                reel.classList.remove('spinning');
                const symbolElements = reel.querySelectorAll('.reel-symbol');
                symbolElements.forEach((symbol, symbolIndex) => {
                    symbol.textContent = finalResults[reelIndex][symbolIndex];
                });
            });
            
            // Запускаем финальную обработку
            setTimeout(() => {
                finishSpin(bet, isFreeSpin, finalResults);
            }, 100);
        }
    }, spinSpeed);
    
    intervalId = spinInterval;
}

async function finishSpin(bet, isFreeSpin, finalResults) {
    const winDisplay = document.getElementById('win-display');
    const spinBtn = document.getElementById('spin-btn');
    
    if (!winDisplay || !spinBtn) {
        slotsSpinning = false;
        return;
    }
    
    // Используем переданные результаты
    const result = finalResults || [];

    // Проверка выигрыша
    let winAmount = 0;
    let newFreespins = 0;

    // Проверка по строкам
    for (let row = 0; row < 3; row++) {
        const line = [result[0][row], result[1][row], result[2][row]];
        
        // Подсчет фриспинов
        const freespinCount = line.filter(s => s === freespinSymbol).length;
        if (freespinCount >= 3) {
            newFreespins += 10;
        }

        // Проверка комбинаций
        if (line[0] === line[1] && line[1] === line[2]) {
            const symbol = line[0];
            if (symbol === wildSymbol) {
                winAmount += bet * 10;
            } else if (symbol === freespinSymbol) {
                // Уже обработано выше
            } else {
                const symbolIndex = symbols.indexOf(symbol);
                if (symbolIndex !== -1) {
                    const multiplier = [1, 1.5, 2, 2.5, 3, 4, 5][symbolIndex] || 1;
                    winAmount += bet * multiplier;
                }
            }
        } else if (line[0] === line[1] || line[1] === line[2]) {
            const symbol = line[0] === line[1] ? line[0] : line[1];
            if (symbol !== freespinSymbol && symbol !== wildSymbol) {
                const symbolIndex = symbols.indexOf(symbol);
                if (symbolIndex !== -1) {
                    winAmount += bet * 0.5;
                }
            }
        }

        // Wild заменяет любой символ
        if (line.includes(wildSymbol)) {
            const otherSymbols = line.filter(s => s !== wildSymbol && s !== freespinSymbol);
            if (otherSymbols.length >= 2 && otherSymbols[0] === otherSymbols[1]) {
                const symbolIndex = symbols.indexOf(otherSymbols[0]);
                if (symbolIndex !== -1) {
                    winAmount += bet * 2;
                }
            }
        }
    }

    freespinsLeft += newFreespins;

    // Обновление баланса
    if (winAmount > 0) {
        await window.updateBalance(winAmount, 'Аниме слот');
        winDisplay.textContent = `🎉 Выигрыш: ${new Intl.NumberFormat('ru-RU').format(winAmount)} ₽`;
        winDisplay.classList.add('win-animation');
        setTimeout(() => winDisplay.classList.remove('win-animation'), 1000);
    } else {
        winDisplay.textContent = 'Попробуйте еще раз!';
    }

    if (freespinsLeft > 0) {
        winDisplay.textContent += ` 🎁 Фриспинов: ${freespinsLeft}`;
    }

    // Восстанавливаем кнопку
    slotsSpinning = false;
    spinBtn.disabled = false;
    
    // Обновляем баланс на экране
    const user = window.currentUser();
    if (user) {
        const balanceEl = document.getElementById('game-balance-slots');
        if (balanceEl) {
            balanceEl.textContent = new Intl.NumberFormat('ru-RU').format(user.current_balance) + ' ₽';
        }
    }
}

