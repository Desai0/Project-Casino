const { ipcRenderer } = require('electron');

let currentUser = null;
let balanceChart = null;
let transactionChart = null;

// Настройки пользователя
let userSettings = {
    currency: 'RUB',
    currencyRate: 100,
    preferredPayment: 'card',
    email: '',
    phone: '',
    birthday: '',
    autoSpin: false,
    quickBet: false,
    soundEffects: true,
    backgroundMusic: false,
    soundVolume: 50,
    theme: 'dark',
    fontSize: 'medium',
    animations: true,
    fullscreen: false,
    notifyWins: true,
    notifyBonuses: true,
    notifyBalance: false,
    twoFactor: false,
    sessionTimeout: true,
    sessionTimeoutMinutes: 30
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем настройки при старте
    const saved = localStorage.getItem('userSettings');
    if (saved) {
        try {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
            applyTheme(userSettings.theme);
            applyFontSize(userSettings.fontSize);
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
    console.log('DOM загружен, инициализация приложения...');
    
    // Проверяем доступность необходимых элементов
    const checkElements = () => {
        const required = [
            'login-btn',
            'register-btn',
            'login-nickname',
            'register-nickname',
            'register-password'
        ];
        
        const missing = [];
        required.forEach(id => {
            if (!document.getElementById(id)) {
                missing.push(id);
            }
        });
        
        if (missing.length > 0) {
            console.error('Отсутствуют элементы:', missing);
            return false;
        }
        return true;
    };
    
    if (!checkElements()) {
        console.error('Не все необходимые элементы найдены. Повторная попытка через 100мс...');
        setTimeout(() => {
            if (checkElements()) {
                initializeApp();
            } else {
                alert('Ошибка: не все элементы интерфейса загружены. Перезагрузите приложение.');
            }
        }, 100);
        return;
    }
    
    initializeApp();
});

function initializeApp() {
    try {
        console.log('Инициализация модулей...');
        initAuth();
        initLobby();
        initProfile();
        initTransactions();
        initWindowControls();
        
        // Инициализация Streamer Mode после загрузки пользователя
        if (window.initStreamerMode) {
            // Будет вызвано после входа пользователя
        }
        
        console.log('Все модули инициализированы успешно');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        console.error('Стек ошибки:', error.stack);
        alert('Ошибка инициализации приложения: ' + error.message);
    }
}

// Управление окном
function initWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.invoke('window:minimize');
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.invoke('window:maximize');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.invoke('window:close');
        });
    }
}

// Авторизация
function initAuth() {
    console.log('Инициализация авторизации...');
    
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');

    if (!loginBtn) {
        console.error('Кнопка входа не найдена!');
        return;
    }

    if (!registerBtn) {
        console.error('Кнопка регистрации не найдена!');
        return;
    }

    console.log('Кнопки найдены:', { loginBtn: !!loginBtn, registerBtn: !!registerBtn });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form-content').forEach(f => f.classList.remove('active'));
            
            btn.classList.add('active');
            const form = document.getElementById(`${tab}-form`);
            if (form) {
                form.classList.add('active');
            }
        });
    });

    loginBtn.addEventListener('click', async () => {
        const nickname = document.getElementById('login-nickname').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('auth-error');
        const loginBtn = document.getElementById('login-btn');

        if (!nickname || !password) {
            errorDiv.textContent = 'Заполните все поля';
            errorDiv.style.display = 'block';
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';

        try {
            console.log('Попытка входа:', { nickname, passwordLength: password.length });
            
            if (!ipcRenderer) {
                throw new Error('IPC Renderer не доступен');
            }
            
            const user = await ipcRenderer.invoke('db:getUser', nickname, password);
            console.log('Результат входа:', user ? 'Успешно' : 'Неудачно');
            
            if (user) {
                currentUser = user;
                console.log('Текущий пользователь установлен:', user.nickname);
                
                // Инициализируем Streamer Mode если доступен
                if (window.initStreamerMode) {
                    window.initStreamerMode();
                }
                
                showScreen('lobby-screen');
                updateUI();
                // Очищаем поля
                const nicknameInput = document.getElementById('login-nickname');
                const passwordInput = document.getElementById('login-password');
                if (nicknameInput) nicknameInput.value = '';
                if (passwordInput) passwordInput.value = '';
            } else {
                console.log('Вход не удался: неверный логин или пароль');
                errorDiv.textContent = 'Неверный логин или пароль';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Исключение при входе:', error);
            errorDiv.textContent = 'Ошибка входа: ' + (error.message || 'Неизвестная ошибка');
            errorDiv.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        }
    });

    // Валидация пароля в реальном времени
    const passwordInput = document.getElementById('register-password');
    const passwordStrength = document.getElementById('password-strength');
    
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            passwordStrength.className = 'password-strength';
            
            if (password.length === 0) {
                passwordStrength.style.display = 'none';
            } else {
                passwordStrength.style.display = 'block';
                if (password.length < 6) {
                    passwordStrength.classList.add('weak');
                } else if (password.length < 10) {
                    passwordStrength.classList.add('medium');
                } else {
                    passwordStrength.classList.add('strong');
                }
            }
        });
    }

    // Обработчик регистрации
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Кнопка регистрации нажата');
        
        const nicknameInput = document.getElementById('register-nickname');
        const passwordInput = document.getElementById('register-password');
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        
        if (!nicknameInput || !passwordInput || !errorDiv || !successDiv) {
            console.error('Не найдены необходимые элементы:', {
                nicknameInput: !!nicknameInput,
                passwordInput: !!passwordInput,
                errorDiv: !!errorDiv,
                successDiv: !!successDiv
            });
            alert('Ошибка: не найдены элементы формы. Перезагрузите страницу.');
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        const password = passwordInput.value;
        
        const btnText = registerBtn.querySelector('.btn-text');
        const btnLoader = registerBtn.querySelector('.btn-loader');

        // Скрываем предыдущие сообщения
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        // Валидация
        if (!nickname || !password) {
            errorDiv.textContent = 'Заполните все поля';
            errorDiv.style.display = 'block';
            return;
        }

        if (nickname.length < 3 || nickname.length > 50) {
            errorDiv.textContent = 'Никнейм должен быть от 3 до 50 символов';
            errorDiv.style.display = 'block';
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'Пароль должен быть не менее 6 символов';
            errorDiv.style.display = 'block';
            return;
        }

        // Проверка на спецсимволы в никнейме
        if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(nickname)) {
            errorDiv.textContent = 'Никнейм может содержать только буквы, цифры и подчеркивание';
            errorDiv.style.display = 'block';
            return;
        }

        // Показываем индикатор загрузки
        registerBtn.disabled = true;
        if (btnText) btnText.style.opacity = '0';
        if (btnLoader) btnLoader.style.display = 'block';
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        console.log('Отправка запроса на регистрацию:', { nickname, passwordLength: password.length });

        try {
            if (!ipcRenderer) {
                throw new Error('IPC Renderer не доступен');
            }
            
            const result = await ipcRenderer.invoke('db:createUser', nickname, password);
            console.log('Результат регистрации:', result);
            
            if (result && result.success) {
                // Показываем успех
                successDiv.style.display = 'block';
                errorDiv.style.display = 'none';
                
                // Получаем пользователя
                const user = await ipcRenderer.invoke('db:getUserById', result.userId);
                console.log('Получен пользователь:', user);
                
                if (user) {
                    currentUser = user;
                    
                    // Инициализируем Streamer Mode если доступен
                    if (window.initStreamerMode) {
                        window.initStreamerMode();
                    }
                    
                    // Задержка перед переходом
                    setTimeout(() => {
                        showScreen('lobby-screen');
                        updateUI();
                        // Очищаем поля
                        if (nicknameInput) nicknameInput.value = '';
                        if (passwordInput) passwordInput.value = '';
                        if (passwordStrength) {
                            passwordStrength.style.display = 'none';
                            passwordStrength.className = 'password-strength';
                        }
                    }, 1500);
                } else {
                    throw new Error('Не удалось получить данные пользователя');
                }
            } else {
                const errorMsg = result?.error || 'Ошибка регистрации';
                console.error('Ошибка регистрации:', errorMsg);
                errorDiv.textContent = errorMsg;
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Исключение при регистрации:', error);
            const errorMsg = error.message || 'Неизвестная ошибка';
            errorDiv.textContent = 'Ошибка регистрации: ' + errorMsg;
            errorDiv.style.display = 'block';
            successDiv.style.display = 'none';
        } finally {
            registerBtn.disabled = false;
            if (btnText) btnText.style.opacity = '1';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    });
    
    // Также добавляем обработчик на Enter в полях регистрации
    const registerNicknameInput = document.getElementById('register-nickname');
    const registerPasswordInput = document.getElementById('register-password');
    
    if (registerNicknameInput) {
        registerNicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                registerBtn.click();
            }
        });
    }
    
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                registerBtn.click();
            }
        });
    }
    
    console.log('Обработчики регистрации установлены');
}

// Лобби
function initLobby() {
    const gameCards = document.querySelectorAll('.game-card');
    const profileBtn = document.getElementById('profile-btn');
    const backBtns = document.querySelectorAll('.btn-back');

    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const game = card.dataset.game;
            switch(game) {
                case 'slots':
                    showScreen('slots-screen');
                    initSlotsGame();
                    break;
                case 'blackjack':
                    showScreen('blackjack-screen');
                    initBlackjackGame();
                    break;
                case 'roulette':
                    showScreen('roulette-screen');
                    initRouletteGame();
                    break;
            }
        });
    });

    profileBtn.addEventListener('click', () => {
        showScreen('profile-screen');
        loadProfile();
    });

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showScreen('settings-screen');
            loadSettings();
        });
    }

    const backSettingsBtn = document.getElementById('back-to-lobby-settings');
    if (backSettingsBtn) {
        backSettingsBtn.addEventListener('click', () => {
            showScreen('lobby-screen');
            updateUI();
        });
    }

    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen('lobby-screen');
            updateUI();
        });
    });
}

// Профиль
function initProfile() {
    const depositBtn = document.getElementById('deposit-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const backBtn = document.getElementById('back-to-lobby-profile');

    depositBtn.addEventListener('click', () => {
        showTransactionModal('deposit');
    });

    withdrawBtn.addEventListener('click', () => {
        showTransactionModal('withdraw');
    });
}

async function loadProfile() {
    if (!currentUser) return;

    document.getElementById('profile-nickname').textContent = currentUser.nickname;
    document.getElementById('profile-balance').textContent = formatMoney(currentUser.current_balance);

    // Проверяем права для Streamer Mode
    const streamerBtn = document.getElementById('streamer-mode-btn');
    if (streamerBtn) {
        if (currentUser.permissions?.streamer_mode_access || currentUser.permissions?.can_edit_balance) {
            streamerBtn.classList.remove('hidden');
            // Инициализируем если еще не инициализирован
            if (window.initStreamerMode && !streamerModeActive) {
                window.initStreamerMode();
            }
        } else {
            streamerBtn.classList.add('hidden');
        }
    }

    try {
        const stats = await ipcRenderer.invoke('db:getUserStats', currentUser.profile_id);
        document.getElementById('profile-total-games').textContent = stats.total_rounds || 0;
        document.getElementById('profile-total-result').textContent = formatMoney(stats.total_net_result || 0);

        const history = await ipcRenderer.invoke('db:getBalanceHistory', currentUser.profile_id);
        updateBalanceChart(history);

        const transactions = await ipcRenderer.invoke('db:getTransactionHistory', currentUser.profile_id);
        updateTransactionChart(transactions);
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        alert('Ошибка загрузки данных профиля: ' + error.message);
    }
}

function updateBalanceChart(history) {
    const ctx = document.getElementById('balance-chart');
    if (!ctx) return;

    if (balanceChart) {
        balanceChart.destroy();
    }

    if (!history || history.length === 0) {
        // Если нет истории, показываем текущий баланс
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Начало'],
                datasets: [{
                    label: 'Баланс',
                    data: [currentUser.current_balance],
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatMoney(value);
                            }
                        }
                    }
                }
            }
        });
        return;
    }

    const labels = history.map((h, i) => {
        const date = new Date(h.timestamp);
        return `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`;
    });
    const balances = history.map(h => h.balance_at_time || currentUser.current_balance);

    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Баланс',
                data: balances,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Баланс: ' + formatMoney(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updateTransactionChart(transactions) {
    const ctx = document.getElementById('transaction-chart');
    if (!ctx) return;

    if (transactionChart) {
        transactionChart.destroy();
    }

    if (!transactions || transactions.length === 0) {
        transactionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Нет данных'],
                datasets: [{
                    label: 'Траты',
                    data: [0],
                    backgroundColor: 'rgba(255, 68, 68, 0.5)'
                }, {
                    label: 'Пополнения',
                    data: [0],
                    backgroundColor: 'rgba(0, 255, 136, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatMoney(value);
                            },
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        return;
    }

    // Группируем по дням
    const dailyData = {};
    transactions.forEach(t => {
        const date = new Date(t.timestamp);
        const dateKey = `${date.getDate()}.${date.getMonth() + 1}`;
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { deposits: 0, withdrawals: 0 };
        }
        
        if (t.money_win_lose_amount > 0) {
            dailyData[dateKey].deposits += t.money_win_lose_amount;
        } else if (t.money_win_lose_amount < 0) {
            dailyData[dateKey].withdrawals += Math.abs(t.money_win_lose_amount);
        }
    });

    const labels = Object.keys(dailyData).slice(-30); // Последние 30 дней
    const deposits = labels.map(label => dailyData[label].deposits);
    const withdrawals = labels.map(label => dailyData[label].withdrawals);

    transactionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Пополнения',
                data: deposits,
                backgroundColor: 'rgba(0, 255, 136, 0.7)',
                borderColor: '#00ff88',
                borderWidth: 1
            }, {
                label: 'Траты',
                data: withdrawals,
                backgroundColor: 'rgba(255, 68, 68, 0.7)',
                borderColor: '#ff4444',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatMoney(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: false,
                    ticks: {
                        callback: function(value) {
                            return formatMoney(value);
                        },
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    stacked: false,
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Транзакции
function initTransactions() {
    const closeBtn = document.getElementById('close-transaction');
    const confirmBtn = document.getElementById('confirm-transaction');

    closeBtn.addEventListener('click', () => {
        document.getElementById('transaction-screen').classList.remove('active');
    });

    confirmBtn.addEventListener('click', async () => {
        const amount = parseInt(document.getElementById('transaction-amount').value);
        const method = document.getElementById('transaction-method').value;
        const title = document.getElementById('transaction-title').textContent;

        if (!amount || amount < 100) {
            alert('Минимальная сумма: 100 ₽');
            return;
        }

        const isDeposit = title === 'Пополнение';
        const newBalance = isDeposit 
            ? currentUser.current_balance + amount 
            : currentUser.current_balance - amount;

        if (!isDeposit && newBalance < 0) {
            alert('Недостаточно средств');
            return;
        }

        try {
            await ipcRenderer.invoke('db:updateBalance', currentUser.profile_id, newBalance);
            currentUser.current_balance = newBalance;
            updateUI();
            document.getElementById('transaction-screen').classList.remove('active');
            alert(isDeposit ? 'Баланс пополнен!' : 'Средства выведены!');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    });
}

function showTransactionModal(type) {
    const screen = document.getElementById('transaction-screen');
    const title = document.getElementById('transaction-title');
    title.textContent = type === 'deposit' ? 'Пополнение' : 'Вывод средств';
    screen.classList.add('active');
}

// Утилиты
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateUI() {
    if (!currentUser) return;

    const balanceElements = document.querySelectorAll('#user-balance, #game-balance-slots, #game-balance-bj, #game-balance-roulette');
    balanceElements.forEach(el => {
        if (el) el.textContent = formatMoney(currentUser.current_balance);
    });

    const nicknameElements = document.querySelectorAll('#user-nickname, #profile-nickname');
    nicknameElements.forEach(el => {
        if (el) el.textContent = currentUser.nickname;
    });
}

function formatMoney(amount) {
    const currency = userSettings.currency || 'RUB';
    const symbols = {
        'RUB': '₽',
        'USD': '$',
        'EUR': '€',
        'BTC': '₿',
        'ETH': 'Ξ'
    };
    const symbol = symbols[currency] || '₽';
    
    // Конвертация валюты
    if (currency !== 'RUB') {
        const rate = userSettings.currencyRate || 100;
        amount = amount / rate;
    }
    
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 4 : 0,
        maximumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 4 : 2
    }).format(amount) + ' ' + symbol;
}

// Настройки
function loadSettings() {
    // Загружаем настройки из localStorage
    const saved = localStorage.getItem('userSettings');
    if (saved) {
        try {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }

    // Заполняем форму
    if (currentUser) {
        document.getElementById('settings-nickname').value = currentUser.nickname || '';
    }
    
    document.getElementById('settings-email').value = userSettings.email || '';
    document.getElementById('settings-phone').value = userSettings.phone || '';
    document.getElementById('settings-birthday').value = userSettings.birthday || '';
    document.getElementById('settings-currency').value = userSettings.currency || 'RUB';
    document.getElementById('currency-rate').value = userSettings.currencyRate || 100;
    document.getElementById('preferred-payment').value = userSettings.preferredPayment || 'card';
    document.getElementById('auto-spin').checked = userSettings.autoSpin || false;
    document.getElementById('quick-bet').checked = userSettings.quickBet || false;
    document.getElementById('sound-effects').checked = userSettings.soundEffects !== false;
    document.getElementById('background-music').checked = userSettings.backgroundMusic || false;
    document.getElementById('sound-volume').value = userSettings.soundVolume || 50;
    document.getElementById('volume-value').textContent = (userSettings.soundVolume || 50) + '%';
    document.getElementById('theme-select').value = userSettings.theme || 'dark';
    document.getElementById('font-size').value = userSettings.fontSize || 'medium';
    document.getElementById('animations').checked = userSettings.animations !== false;
    document.getElementById('fullscreen').checked = userSettings.fullscreen || false;
    document.getElementById('notify-wins').checked = userSettings.notifyWins !== false;
    document.getElementById('notify-bonuses').checked = userSettings.notifyBonuses !== false;
    document.getElementById('notify-balance').checked = userSettings.notifyBalance || false;
    document.getElementById('two-factor').checked = userSettings.twoFactor || false;
    document.getElementById('session-timeout').checked = userSettings.sessionTimeout !== false;
    document.getElementById('session-timeout-minutes').value = userSettings.sessionTimeoutMinutes || 30;

    // Обработчики
    setupSettingsHandlers();
}

function setupSettingsHandlers() {
    // Громкость звука
    const volumeSlider = document.getElementById('sound-volume');
    const volumeValue = document.getElementById('volume-value');
    if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('input', (e) => {
            volumeValue.textContent = e.target.value + '%';
        });
    }

    // Сохранение настроек
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Сброс настроек
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }

    // Изменение валюты
    const currencySelect = document.getElementById('settings-currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            userSettings.currency = e.target.value;
            updateUI(); // Обновляем отображение баланса
        });
    }

    // Изменение темы
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // Полноэкранный режим
    const fullscreenCheck = document.getElementById('fullscreen');
    if (fullscreenCheck) {
        fullscreenCheck.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        });
    }

    // Изменение никнейма
    const changeNicknameBtn = document.getElementById('change-nickname-btn');
    if (changeNicknameBtn) {
        changeNicknameBtn.addEventListener('click', () => {
            const nicknameInput = document.getElementById('settings-nickname');
            if (nicknameInput) {
                nicknameInput.readOnly = false;
                nicknameInput.focus();
                changeNicknameBtn.textContent = 'Сохранить';
                changeNicknameBtn.onclick = async () => {
                    const newNickname = nicknameInput.value.trim();
                    if (newNickname && newNickname.length >= 3) {
                        // Здесь можно добавить сохранение в БД
                        currentUser.nickname = newNickname;
                        nicknameInput.readOnly = true;
                        changeNicknameBtn.textContent = 'Изменить';
                        changeNicknameBtn.onclick = null;
                        updateUI();
                        alert('Никнейм изменен!');
                    } else {
                        alert('Никнейм должен быть не менее 3 символов');
                    }
                };
            }
        });
    }

    // Сохранение email и телефона
    document.getElementById('save-email-btn')?.addEventListener('click', () => {
        const email = document.getElementById('settings-email').value;
        if (email && email.includes('@')) {
            userSettings.email = email;
            saveSettings();
            alert('Email сохранен!');
        } else {
            alert('Введите корректный email');
        }
    });

    document.getElementById('save-phone-btn')?.addEventListener('click', () => {
        const phone = document.getElementById('settings-phone').value;
        userSettings.phone = phone;
        saveSettings();
        alert('Телефон сохранен!');
    });

    // Изменение пароля
    document.getElementById('change-password-btn')?.addEventListener('click', () => {
        const oldPass = prompt('Введите текущий пароль:');
        if (!oldPass) return;
        
        const newPass = prompt('Введите новый пароль (минимум 6 символов):');
        if (!newPass || newPass.length < 6) {
            alert('Пароль должен быть не менее 6 символов');
            return;
        }
        
        const confirmPass = prompt('Подтвердите новый пароль:');
        if (newPass !== confirmPass) {
            alert('Пароли не совпадают');
            return;
        }
        
        alert('Пароль изменен! (В реальном приложении здесь будет запрос к серверу)');
    });
}

function saveSettings() {
    // Собираем все настройки
    userSettings.email = document.getElementById('settings-email').value;
    userSettings.phone = document.getElementById('settings-phone').value;
    userSettings.birthday = document.getElementById('settings-birthday').value;
    userSettings.currency = document.getElementById('settings-currency').value;
    userSettings.currencyRate = parseFloat(document.getElementById('currency-rate').value) || 100;
    userSettings.preferredPayment = document.getElementById('preferred-payment').value;
    userSettings.autoSpin = document.getElementById('auto-spin').checked;
    userSettings.quickBet = document.getElementById('quick-bet').checked;
    userSettings.soundEffects = document.getElementById('sound-effects').checked;
    userSettings.backgroundMusic = document.getElementById('background-music').checked;
    userSettings.soundVolume = parseInt(document.getElementById('sound-volume').value) || 50;
    userSettings.theme = document.getElementById('theme-select').value;
    userSettings.fontSize = document.getElementById('font-size').value;
    userSettings.animations = document.getElementById('animations').checked;
    userSettings.fullscreen = document.getElementById('fullscreen').checked;
    userSettings.notifyWins = document.getElementById('notify-wins').checked;
    userSettings.notifyBonuses = document.getElementById('notify-bonuses').checked;
    userSettings.notifyBalance = document.getElementById('notify-balance').checked;
    userSettings.twoFactor = document.getElementById('two-factor').checked;
    userSettings.sessionTimeout = document.getElementById('session-timeout').checked;
    userSettings.sessionTimeoutMinutes = parseInt(document.getElementById('session-timeout-minutes').value) || 30;

    // Сохраняем в localStorage
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    
    // Применяем настройки
    applyTheme(userSettings.theme);
    applyFontSize(userSettings.fontSize);
    updateUI();
    
    alert('✅ Настройки сохранены!');
}

function resetSettings() {
    if (confirm('Вы уверены, что хотите сбросить все настройки к умолчаниям?')) {
        userSettings = {
            currency: 'RUB',
            currencyRate: 100,
            preferredPayment: 'card',
            email: '',
            phone: '',
            birthday: '',
            autoSpin: false,
            quickBet: false,
            soundEffects: true,
            backgroundMusic: false,
            soundVolume: 50,
            theme: 'dark',
            fontSize: 'medium',
            animations: true,
            fullscreen: false,
            notifyWins: true,
            notifyBonuses: true,
            notifyBalance: false,
            twoFactor: false,
            sessionTimeout: true,
            sessionTimeoutMinutes: 30
        };
        localStorage.removeItem('userSettings');
        loadSettings();
        alert('Настройки сброшены к умолчаниям');
    }
}

function applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
}

function applyFontSize(size) {
    document.documentElement.style.fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
}

// Экспорт для игр
window.currentUser = () => currentUser;
window.updateBalance = async (amount, gameName = 'Слоты') => {
    if (!currentUser) return;
    try {
        const gameId = await ipcRenderer.invoke('db:getGameIdByName', gameName);
        const result = await ipcRenderer.invoke('db:addGameRound', currentUser.profile_id, gameId, amount);
        if (result.success) {
            currentUser.current_balance = result.newBalance;
            updateUI();
            
            // Обновляем статистику Streamer Mode
            if (window.updateStreamerStats) {
                window.updateStreamerStats(amount);
            }
            
            return result.newBalance;
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
};

