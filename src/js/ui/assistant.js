// Virtual Assistant / Chat Bot Module
// Provides real-time help and navigation assistance

export function initAssistant() {
    createAssistantUI();
    setupAssistantLogic();
    
    // Hide assistant initially (until user logs in)
    hideAssistant();
}

export function showAssistant() {
    const button = document.getElementById('assistant-button');
    if (button) {
        button.style.display = 'flex';
    }
}

export function hideAssistant() {
    const button = document.getElementById('assistant-button');
    const chat = document.getElementById('assistant-chat');
    if (button) {
        button.style.display = 'none';
    }
    if (chat) {
        chat.classList.add('hidden');
    }
}

// Make hideAssistant globally available for logout
window.hideAssistant = hideAssistant;

function createAssistantUI() {
    // Create floating button
    const assistantButton = document.createElement('div');
    assistantButton.id = 'assistant-button';
    assistantButton.className = 'assistant-button';
    assistantButton.innerHTML = '💬';
    assistantButton.title = 'Помощник';
    
    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'assistant-chat';
    chatWindow.className = 'assistant-chat hidden';
    
    chatWindow.innerHTML = `
        <div class="assistant-header">
            <div class="assistant-title">
                <span class="assistant-icon">🤖</span>
                <span>Виртуальный помощник</span>
            </div>
            <button class="assistant-close" id="assistant-close">×</button>
        </div>
        <div class="assistant-messages" id="assistant-messages">
            <div class="assistant-message bot-message">
                <div class="message-content">
                    Привет! Я виртуальный помощник. Чем могу помочь?
                </div>
            </div>
        </div>
        <div class="assistant-input-container">
            <input type="text" id="assistant-input" placeholder="Задайте вопрос..." autocomplete="off">
            <button id="assistant-send">Отправить</button>
        </div>
        <div class="assistant-quick-actions" id="assistant-quick-actions">
            <button class="quick-action-btn" data-action="games">🎮 Игры</button>
            <button class="quick-action-btn" data-action="profile">👤 Профиль</button>
            <button class="quick-action-btn" data-action="balance">💰 Баланс</button>
            <button class="quick-action-btn" data-action="help">❓ Помощь</button>
        </div>
    `;
    
    document.body.appendChild(assistantButton);
    document.body.appendChild(chatWindow);
}

function setupAssistantLogic() {
    const assistantButton = document.getElementById('assistant-button');
    const chatWindow = document.getElementById('assistant-chat');
    const closeButton = document.getElementById('assistant-close');
    const input = document.getElementById('assistant-input');
    const sendButton = document.getElementById('assistant-send');
    const quickActions = document.querySelectorAll('.quick-action-btn');
    
    // Toggle chat window
    assistantButton.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            input.focus();
        }
    });
    
    closeButton.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });
    
    // Send message
    const sendMessage = () => {
        const message = input.value.trim();
        if (!message) return;
        
        addUserMessage(message);
        input.value = '';
        
        // Process message and get response
        setTimeout(() => {
            const response = processMessage(message);
            addBotMessage(response.text, response.action);
        }, 500);
    };
    
    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Quick actions
    quickActions.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });
}

function addUserMessage(text) {
    const messagesContainer = document.getElementById('assistant-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'assistant-message user-message';
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(text, action = null) {
    const messagesContainer = document.getElementById('assistant-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'assistant-message bot-message';
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Execute action if provided
    if (action && typeof action === 'function') {
        setTimeout(action, 100);
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('assistant-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function processMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Navigation queries
    if (matches(lowerMessage, ['профиль', 'profile', 'мой профиль', 'мой аккаунт'])) {
        return {
            text: 'Открываю ваш профиль. Здесь вы можете посмотреть баланс, историю игр и изменить настройки.',
            action: () => navigateToScreen('profile-screen')
        };
    }
    
    if (matches(lowerMessage, ['игры', 'games', 'игровой зал', 'казино', 'играть'])) {
        return {
            text: 'Открываю игровой зал. Здесь доступны игры: Blackjack (21), Roulette (Рулетка) и Slots (Слоты).',
            action: () => navigateToScreen('menu-screen')
        };
    }
    
    if (matches(lowerMessage, ['админ', 'admin', 'админка', 'панель администратора'])) {
        return {
            text: 'Проверяю доступ к админ-панели...',
            action: () => navigateToScreen('admin-screen')
        };
    }
    
    // Game-specific queries
    if (matches(lowerMessage, ['блэкджек', 'blackjack', '21', 'двадцать один'])) {
        return {
            text: 'Blackjack (21) - карточная игра против дилера. Цель: набрать 21 очко или больше дилера, не превышая 21. Открываю игру...',
            action: () => {
                if (typeof window.launchGame === 'function') {
                    window.launchGame('blackjack');
                }
            }
        };
    }
    
    if (matches(lowerMessage, ['рулетка', 'roulette', 'колесо'])) {
        return {
            text: 'Roulette (Рулетка) - ставьте на числа, цвета или диапазоны. Колесо вращается, и выигрывает выпавшее число. Открываю игру...',
            action: () => {
                if (typeof window.launchGame === 'function') {
                    window.launchGame('roulette');
                }
            }
        };
    }
    
    if (matches(lowerMessage, ['слоты', 'slots', 'автоматы', 'однорукий бандит'])) {
        return {
            text: 'Slots (Слоты) - классические игровые автоматы. Крутите барабаны и выигрывайте при совпадении символов! Открываю игру...',
            action: () => {
                if (typeof window.launchGame === 'function') {
                    window.launchGame('slots');
                }
            }
        };
    }
    
    // Balance queries
    if (matches(lowerMessage, ['баланс', 'balance', 'деньги', 'сколько денег', 'мой баланс'])) {
        const balance = getCurrentBalance();
        return {
            text: `Ваш текущий баланс: $${balance}. Вы можете пополнить баланс через кнопку "Deposit" в профиле.`
        };
    }
    
    if (matches(lowerMessage, ['пополнить', 'deposit', 'добавить деньги', 'пополнение', 'купить'])) {
        return {
            text: 'Для пополнения баланса используйте кнопку "Deposit" в вашем профиле. Платежи обрабатываются через Stripe.',
            action: () => {
                navigateToScreen('profile-screen');
                // Try to trigger deposit button if exists
                setTimeout(() => {
                    const depositBtn = document.querySelector('[data-action="deposit"], .deposit-button, #deposit-btn');
                    if (depositBtn) {
                        depositBtn.click();
                    }
                }, 500);
            }
        };
    }
    
    // Help queries
    if (matches(lowerMessage, ['помощь', 'help', 'как', 'что делать', 'инструкция'])) {
        return {
            text: `Я могу помочь вам с:
• Навигацией по приложению
• Правилами игр
• Пополнением баланса
• Поиском функций

Просто спросите меня о чем-то конкретном!`
        };
    }
    
    if (matches(lowerMessage, ['правила', 'как играть', 'правила игры'])) {
        return {
            text: `Правила игр:

🎮 BLACKJACK (21):
- Цель: набрать 21 очко или больше дилера
- Не превышайте 21, иначе проигрыш
- Туз = 1 или 11 очков
- Картинки (J, Q, K) = 10 очков

🔴 ROULETTE:
- Ставьте на числа (1-36, 0), цвета (красный/черный) или диапазоны
- Прямая ставка (на число): выплата 35:1
- Ставка на цвет: выплата 1:1

🍒 SLOTS:
- Выберите ставку и нажмите SPIN
- Совпадение символов = выигрыш
- Чем больше совпадений, тем больше выигрыш`
        };
    }
    
    // History queries
    if (matches(lowerMessage, ['история', 'history', 'мои игры', 'статистика'])) {
        return {
            text: 'Открываю ваш профиль с историей игр и графиком баланса.',
            action: () => navigateToScreen('profile-screen')
        };
    }
    
    // Logout queries
    if (matches(lowerMessage, ['выйти', 'logout', 'выход', 'выйти из аккаунта'])) {
        return {
            text: 'Вы уверены, что хотите выйти? Нажмите "Logout" в верхнем меню.',
            action: () => {
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    // Just inform, don't auto-logout for safety
                }
            }
        };
    }
    
    // Greetings
    if (matches(lowerMessage, ['привет', 'hello', 'hi', 'здравствуй', 'добрый день'])) {
        return {
            text: 'Привет! Чем могу помочь? Спросите меня о играх, балансе или навигации.'
        };
    }
    
    // Default response
    return {
        text: `Я не совсем понял ваш вопрос. Попробуйте спросить о:
• Играх (Blackjack, Roulette, Slots)
• Балансе и пополнении
• Навигации по приложению
• Правилах игр

Или используйте быстрые кнопки ниже!`
    };
}

function handleQuickAction(action) {
    switch (action) {
        case 'games':
            addUserMessage('Покажи игры');
            setTimeout(() => {
                const response = processMessage('игры');
                addBotMessage(response.text, response.action);
            }, 300);
            break;
        case 'profile':
            addUserMessage('Открой профиль');
            setTimeout(() => {
                const response = processMessage('профиль');
                addBotMessage(response.text, response.action);
            }, 300);
            break;
        case 'balance':
            addUserMessage('Покажи баланс');
            setTimeout(() => {
                const response = processMessage('баланс');
                addBotMessage(response.text, response.action);
            }, 300);
            break;
        case 'help':
            addUserMessage('Помощь');
            setTimeout(() => {
                const response = processMessage('помощь');
                addBotMessage(response.text, response.action);
            }, 300);
            break;
    }
}

function navigateToScreen(screenId) {
    // Switch to the target screen
    document.querySelectorAll('.screen-section').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-target') === screenId) {
            tab.classList.add('active');
        }
    });
}

function getCurrentBalance() {
    const balanceElement = document.getElementById('header-balance');
    if (balanceElement) {
        const balanceText = balanceElement.textContent.replace(/\s/g, '');
        return balanceText || '0';
    }
    return '0';
}

function matches(message, keywords) {
    return keywords.some(keyword => message.includes(keyword));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

