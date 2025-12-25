const botResponses = {
    'привет': 'Привет! Чем могу помочь?',
    'здравствуй': 'Здравствуйте! Как дела?',
    'помощь': 'Я могу помочь с вопросами о играх, балансе и техническими проблемами. Что вас интересует?',
    'баланс': 'Ваш баланс отображается в верхней части экрана. Вы также можете пополнить или вывести средства в профиле.',
    'пополнить': 'Для пополнения баланса перейдите в профиль и нажмите кнопку "Пополнить".',
    'вывести': 'Для вывода средств перейдите в профиль и нажмите кнопку "Вывести".',
    'слоты': 'В слотах вы крутите барабаны и выигрываете при совпадении символов. Чем больше совпадений, тем больше выигрыш!',
    'блэкджек': 'В блэкджеке цель - набрать 21 очко или максимально близко к этому числу, не превышая его. Блэкджек (21 с двух карт) дает максимальный выигрыш!',
    'рулетка': 'В рулетке вы ставите на цвет или четность числа. Красное/черное и четное/нечетное дают x2, зеленое (0) дает x36!',
    'правила': 'В нашем казино доступны три игры: Слоты, Блэкджек и Рулетка. Каждая игра имеет свои правила и коэффициенты выплат.',
    'ошибка': 'Если возникла ошибка, попробуйте перезапустить приложение. Если проблема сохраняется, опишите её подробнее.',
    'спасибо': 'Пожалуйста! Удачи в игре! 🎰',
    'пока': 'До свидания! Возвращайтесь еще!',
    'default': 'Извините, я не совсем понял. Можете переформулировать вопрос? Я могу помочь с играми, балансом и техническими вопросами.'
};

function initSupportChat() {
    const toggleBtn = document.getElementById('toggle-chat');
    const sendBtn = document.getElementById('send-message-btn');
    const chatInput = document.getElementById('chat-input');
    const chatWidget = document.getElementById('support-chat');
    let isMinimized = false;

    toggleBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        const messages = chatWidget.querySelector('.chat-messages');
        const inputArea = chatWidget.querySelector('.chat-input-area');
        
        if (isMinimized) {
            messages.style.display = 'none';
            inputArea.style.display = 'none';
            chatWidget.style.height = '50px';
            toggleBtn.textContent = '+';
        } else {
            messages.style.display = 'flex';
            inputArea.style.display = 'flex';
            chatWidget.style.height = '500px';
            toggleBtn.textContent = '−';
        }
    });

    function sendMessage(text, isUser = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function getBotResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase().trim();
        
        for (let key in botResponses) {
            if (lowerMessage.includes(key) && key !== 'default') {
                return botResponses[key];
            }
        }
        
        return botResponses['default'];
    }

    function handleSend() {
        const message = chatInput.value.trim();
        if (!message) return;

        sendMessage(message, true);
        chatInput.value = '';

        // Имитация задержки ответа бота
        setTimeout(() => {
            const botResponse = getBotResponse(message);
            sendMessage(botResponse, false);
        }, 500);
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initSupportChat);

