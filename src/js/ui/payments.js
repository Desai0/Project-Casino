import { api } from '../api/api.js';

let paymentModal = null;

/**
 * Инициализация UI для пополнения баланса
 */
export function initPaymentUI() {
    // Создаем модальное окно для пополнения
    createPaymentModal();
    
    // Добавляем кнопку "Deposit" в профиль
    addDepositButton();
}

/**
 * Создает модальное окно для пополнения баланса
 */
function createPaymentModal() {
    // Проверяем, не существует ли уже модальное окно
    if (document.getElementById('payment-modal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.className = 'payment-modal hidden';
    modal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <h2>Deposit Funds</h2>
                <button class="payment-modal-close" id="payment-modal-close">×</button>
            </div>
            <div class="payment-modal-body">
                <div class="payment-amount-selection">
                    <label>Select Amount:</label>
                    <div class="payment-amount-buttons">
                        <button class="amount-btn" data-amount="10">$10</button>
                        <button class="amount-btn" data-amount="50">$50</button>
                        <button class="amount-btn" data-amount="100">$100</button>
                        <button class="amount-btn" data-amount="500">$500</button>
                    </div>
                    <div class="payment-custom-amount">
                        <label>Or enter custom amount:</label>
                        <input type="number" id="custom-amount-input" placeholder="Amount in $ (min $1)" min="1" step="1">
                    </div>
                </div>
                <div class="payment-info">
                    <div class="payment-stripe-badge">
                        <span class="stripe-logo">💳</span>
                        <span class="stripe-text">Powered by <strong>Stripe</strong></span>
                    </div>
                    <p class="payment-note">
                        <strong>🔒 Secure Payment Processing:</strong> All payments are processed securely through Stripe, 
                        a leading payment platform trusted by millions of businesses worldwide.
                    </p>
                    <p class="payment-note">
                        <strong>🧪 Test Mode Active:</strong> This is a test environment. No real money will be charged. 
                        Payments are processed using Stripe's test infrastructure with test card: <code>4242 4242 4242 4242</code>
                    </p>
                    <div class="payment-stripe-links">
                        <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener noreferrer">
                            📚 Stripe Test Mode Documentation
                        </a>
                        <a href="https://stripe.com/security" target="_blank" rel="noopener noreferrer">
                            🔐 Stripe Security
                        </a>
                    </div>
                </div>
                <div id="payment-process-steps" class="payment-process-steps hidden">
                    <div class="payment-step active" id="step-1">
                        <span class="step-icon">1</span>
                        <span class="step-text">Creating payment intent...</span>
                    </div>
                    <div class="payment-step" id="step-2">
                        <span class="step-icon">2</span>
                        <span class="step-text">Processing through Stripe...</span>
                    </div>
                    <div class="payment-step" id="step-3">
                        <span class="step-icon">3</span>
                        <span class="step-text">Confirming payment...</span>
                    </div>
                    <div class="payment-step" id="step-4">
                        <span class="step-icon">4</span>
                        <span class="step-text">Updating balance...</span>
                    </div>
                </div>
                <div class="payment-actions">
                    <button id="payment-confirm-btn" class="payment-confirm-btn" disabled>Confirm Deposit</button>
                    <button id="payment-cancel-btn" class="payment-cancel-btn">Cancel</button>
                </div>
                <div id="payment-status" class="payment-status hidden"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий
    setupPaymentModalHandlers();
}

/**
 * Настраивает обработчики событий для модального окна
 */
function setupPaymentModalHandlers() {
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.getElementById('payment-modal-close');
    const cancelBtn = document.getElementById('payment-cancel-btn');
    const confirmBtn = document.getElementById('payment-confirm-btn');
    const amountButtons = document.querySelectorAll('.amount-btn');
    const customInput = document.getElementById('custom-amount-input');
    
    let selectedAmount = 0;
    
    // Закрытие модального окна
    const closeModal = () => {
        modal.classList.add('hidden');
        selectedAmount = 0;
        confirmBtn.disabled = true;
        customInput.value = '';
        amountButtons.forEach(btn => btn.classList.remove('active'));
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Выбор суммы через кнопки
    amountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            amountButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            customInput.value = '';
            selectedAmount = parseFloat(btn.dataset.amount); // Храним в долларах
            confirmBtn.disabled = false;
        });
    });
    
    // Кастомная сумма
    customInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value && value >= 1) { // Минимум $1
            selectedAmount = value; // Храним в долларах
            amountButtons.forEach(b => b.classList.remove('active'));
            confirmBtn.disabled = false;
        } else {
            selectedAmount = 0;
            confirmBtn.disabled = true;
        }
    });
    
    // Подтверждение платежа
    confirmBtn.addEventListener('click', async () => {
        if (!selectedAmount || selectedAmount < 1) {
            showPaymentStatus('Please select an amount (minimum $1)', 'error');
            return;
        }
        
        await processPayment(selectedAmount);
    });
}

/**
 * Обрабатывает платеж
 * @param {number} amountInDollars - Сумма в долларах
 */
async function processPayment(amountInDollars) {
    const statusDiv = document.getElementById('payment-status');
    const confirmBtn = document.getElementById('payment-confirm-btn');
    const stepsDiv = document.getElementById('payment-process-steps');
    
    // Функция для обновления шагов процесса
    const updateStep = (stepNumber, isActive = true, isCompleted = false) => {
        const step = document.getElementById(`step-${stepNumber}`);
        if (step) {
            step.classList.toggle('active', isActive);
            step.classList.toggle('completed', isCompleted);
        }
    };
    
    // Функция для сброса всех шагов
    const resetSteps = () => {
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step-${i}`);
            if (step) {
                step.classList.remove('active', 'completed');
            }
        }
    };
    
    try {
        confirmBtn.disabled = true;
        stepsDiv.classList.remove('hidden');
        resetSteps();
        updateStep(1, true, false);
        showPaymentStatus('Connecting to Stripe...', 'info');
        
        const profileId = window.currentUser?.id;
        if (!profileId) {
            throw new Error('User not logged in');
        }
        
        // Шаг 1: Создаем Payment Intent
        await new Promise(resolve => setTimeout(resolve, 500)); // Небольшая задержка для визуализации
        updateStep(1, false, true);
        updateStep(2, true, false);
        showPaymentStatus('Creating payment intent through Stripe...', 'info');
        
        const paymentIntent = await api.createPaymentIntent({
            amount: amountInDollars,
            profileId: profileId
        });
        
        if (!paymentIntent || !paymentIntent.clientSecret) {
            throw new Error('Failed to create payment intent');
        }
        
        // Шаг 2: Обрабатываем через Stripe
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStep(2, false, true);
        updateStep(3, true, false);
        showPaymentStatus('Processing payment through Stripe test environment...', 'info');
        
        // Шаг 3: Подтверждаем платеж
        await new Promise(resolve => setTimeout(resolve, 500));
        const confirmResult = await api.confirmPayment({
            paymentIntentId: paymentIntent.paymentIntentId,
            profileId: profileId
        });
        
        if (confirmResult.success) {
            // Шаг 4: Обновляем баланс
            updateStep(3, false, true);
            updateStep(4, true, false);
            showPaymentStatus('Payment confirmed! Updating balance...', 'info');
            
            // Обновляем баланс
            if (confirmResult.newBalance !== undefined) {
                // Используем глобальную функцию или импортируем
                if (window.updateAllBalances) {
                    window.updateAllBalances(confirmResult.newBalance);
                } else {
                    // Fallback: обновляем вручную
                    const formatted = confirmResult.newBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                    const headerBalance = document.getElementById('header-balance');
                    const profileBalance = document.getElementById('profile-balance');
                    if (headerBalance) headerBalance.textContent = formatted;
                    if (profileBalance) profileBalance.textContent = formatted;
                }
            }
            
            // Обновляем историю
            if (window.refreshHistoryAfterGame) {
                window.refreshHistoryAfterGame();
            } else {
                // Fallback: обновляем историю напрямую
                const { refreshHistory } = await import('./dashboard.js');
                if (refreshHistory) {
                    refreshHistory();
                }
            }
            
            // Завершаем процесс
            await new Promise(resolve => setTimeout(resolve, 500));
            updateStep(4, false, true);
            showPaymentStatus(`Payment successful! $${amountInDollars.toFixed(2)} added to your balance.`, 'success');
            
            // Закрываем модальное окно через 3 секунды
            setTimeout(() => {
                document.getElementById('payment-modal').classList.add('hidden');
                showPaymentStatus('', '');
                stepsDiv.classList.add('hidden');
                resetSteps();
                // Сбрасываем форму
                document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('custom-amount-input').value = '';
                confirmBtn.disabled = true;
            }, 3000);
        } else {
            throw new Error(confirmResult.error || 'Payment failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showPaymentStatus(`Error: ${error.message}`, 'error');
        stepsDiv.classList.add('hidden');
        resetSteps();
        confirmBtn.disabled = false;
    }
}

/**
 * Показывает статус платежа
 */
function showPaymentStatus(message, type) {
    const statusDiv = document.getElementById('payment-status');
    if (!message) {
        statusDiv.classList.add('hidden');
        statusDiv.textContent = '';
        return;
    }
    
    statusDiv.classList.remove('hidden');
    statusDiv.textContent = message;
    statusDiv.className = `payment-status ${type}`;
}

/**
 * Добавляет кнопку "Deposit" в профиль
 */
function addDepositButton() {
    // Проверяем, не добавлена ли уже кнопка
    const existingBtn = document.getElementById('deposit-btn');
    if (existingBtn) {
        return;
    }
    
    // Находим место для кнопки (в секции с балансом в профиле)
    const balancePill = document.querySelector('.big-balance-pill');
    if (!balancePill) {
        // Если баланс еще не загружен, попробуем позже
        setTimeout(addDepositButton, 100);
        return;
    }
    
    const depositBtn = document.createElement('button');
    depositBtn.id = 'deposit-btn';
    depositBtn.className = 'deposit-btn';
    depositBtn.textContent = 'Deposit';
    depositBtn.title = 'Deposit funds via Stripe';
    
    depositBtn.addEventListener('click', () => {
        const modal = document.getElementById('payment-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    });
    
    // Добавляем кнопку в секцию с именем (рядом с балансом)
    const nameSection = balancePill.closest('.profile-name-section');
    if (nameSection) {
        nameSection.appendChild(depositBtn);
    } else {
        // Fallback: добавляем после баланса
        balancePill.parentNode.insertBefore(depositBtn, balancePill.nextSibling);
    }
}

/**
 * Показывает модальное окно пополнения
 */
export function showDepositModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

