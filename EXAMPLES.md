# Примеры кода для реализации

## 🗄️ DB Developer - Примеры

### payments.js - Создание платежа
```javascript
const db = require('./init');

function createPayment({ profileId, stripePaymentIntentId, amount, status = 'pending' }) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.run(
      `INSERT INTO stripe_payments (profile_id, stripe_payment_intent_id, amount, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [profileId, stripePaymentIntentId, amount, status, timestamp],
      function onInsert(err) {
        if (err) return reject(err);
        resolve({ paymentId: this.lastID });
      }
    );
  });
}
```

### statistics.js - Статистика пользователя
```javascript
function getUserStatistics({ profileId, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(*) as total_games,
        SUM(ABS(money_win_lose_ammount)) as total_bet_amount,
        SUM(CASE WHEN money_win_lose_ammount > 0 THEN money_win_lose_ammount ELSE 0 END) as total_wins,
        SUM(CASE WHEN money_win_lose_ammount < 0 THEN ABS(money_win_lose_ammount) ELSE 0 END) as total_losses,
        SUM(money_win_lose_ammount) as net_result,
        AVG(ABS(money_win_lose_ammount)) as avg_bet,
        MAX(money_win_lose_ammount) as max_win,
        MIN(money_win_lose_ammount) as max_loss
       FROM game_rounds
       WHERE profile_id = ? 
         AND timestamp >= ? 
         AND timestamp <= ?`,
      [profileId, startDate, endDate],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || {
          total_games: 0,
          total_bet_amount: 0,
          total_wins: 0,
          total_losses: 0,
          net_result: 0,
          avg_bet: 0,
          max_win: 0,
          max_loss: 0
        });
      }
    );
  });
}
```

---

## 🔧 Backend Developer 1 - Примеры

### stripe.js - Создание Payment Intent
```javascript
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

async function createPaymentIntent({ amount, profileId }) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe использует центы
      currency: 'usd',
      metadata: {
        profileId: profileId.toString()
      }
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    throw new Error(`Stripe error: ${error.message}`);
  }
}
```

### main.js - IPC Handler для пополнения
```javascript
ipcMain.handle('api:createPaymentIntent', async (event, { amount, profileId }) => {
  try {
    // Валидация
    if (!amount || amount < 1) {
      return { error: 'Invalid amount' };
    }
    
    // Создание Payment Intent
    const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent({
      amount,
      profileId
    });
    
    // Сохранение в БД
    await db.payments.createPayment({
      profileId,
      stripePaymentIntentId: paymentIntentId,
      amount,
      status: 'pending'
    });
    
    return { clientSecret, paymentIntentId };
  } catch (err) {
    console.error('Create payment intent error:', err);
    return { error: err.message };
  }
});
```

---

## 🔧 Backend Developer 2 - Примеры

### admin.js - Проверка прав доступа
```javascript
const db = require('../DB/db/index');

async function checkAdminAccess(profileId) {
  try {
    const user = await db.players.getPlayerWithPermissions(profileId);
    return user && user.can_edit_balance === 1;
  } catch (err) {
    console.error('Check admin access error:', err);
    return false;
  }
}

async function checkPermission(profileId, permission) {
  try {
    const user = await db.players.getPlayerWithPermissions(profileId);
    if (!user) return false;
    
    const permissionMap = {
      'edit_balance': user.can_edit_balance === 1,
      'view_debug': user.can_view_debug_info === 1,
      'streamer_mode': user.streamer_mode_access === 1,
      'reset_history': user.can_reset_history === 1
    };
    
    return permissionMap[permission] || false;
  } catch (err) {
    return false;
  }
}
```

### main.js - IPC Handler для статистики
```javascript
ipcMain.handle('admin:getUserStatistics', async (event, { profileId, startDate, endDate, requesterId }) => {
  try {
    // Проверка прав доступа
    const isAdmin = await adminService.checkAdminAccess(requesterId);
    if (!isAdmin && requesterId !== profileId) {
      return { error: 'Access denied' };
    }
    
    // Получение статистики
    const stats = await db.statistics.getUserStatistics({
      profileId,
      startDate,
      endDate
    });
    
    // Получение статистики по играм
    const gameStats = await db.statistics.getUserGameStatistics({
      profileId,
      startDate,
      endDate
    });
    
    return {
      success: true,
      statistics: stats,
      gameStatistics: gameStats
    };
  } catch (err) {
    console.error('Get user statistics error:', err);
    return { error: err.message };
  }
});
```

---

## 🎨 Frontend Developer 1 - Примеры

### payments.js - Инициализация UI пополнения
```javascript
import { api } from '../api/api.js';

export function initPaymentUI() {
  const depositBtn = document.getElementById('deposit-btn');
  const paymentModal = document.getElementById('payment-modal');
  const closeModal = document.getElementById('close-payment-modal');
  
  depositBtn?.addEventListener('click', () => {
    paymentModal?.classList.remove('hidden');
  });
  
  closeModal?.addEventListener('click', () => {
    paymentModal?.classList.add('hidden');
  });
  
  // Обработка формы пополнения
  const paymentForm = document.getElementById('payment-form');
  paymentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('payment-amount').value);
    
    try {
      const result = await api.createPaymentIntent({ amount });
      if (result.error) {
        alert(result.error);
        return;
      }
      
      // Здесь интеграция с Stripe Elements
      // или редирект на Stripe Checkout
      await handleStripePayment(result.clientSecret, result.paymentIntentId);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed');
    }
  });
}
```

### streamer.js - Streamer Mode
```javascript
let streamerModeActive = false;
let debugUpdateInterval = null;

export function initStreamerMode() {
  const streamerBtn = document.getElementById('streamer-mode-btn');
  const debugOverlay = document.getElementById('debug-overlay');
  
  // Проверка прав доступа
  if (!window.currentUser?.permissions?.streamer_mode_access) {
    streamerBtn?.remove();
    return;
  }
  
  streamerBtn?.addEventListener('click', toggleStreamerMode);
  
  function toggleStreamerMode() {
    streamerModeActive = !streamerModeActive;
    
    if (streamerModeActive) {
      debugOverlay?.classList.remove('hidden');
      startDebugUpdates();
      api.enableStreamerMode();
    } else {
      debugOverlay?.classList.add('hidden');
      stopDebugUpdates();
      api.disableStreamerMode();
    }
  }
  
  function startDebugUpdates() {
    debugUpdateInterval = setInterval(async () => {
      const debugInfo = await api.getDebugInfo();
      updateDebugDisplay(debugInfo);
    }, 2000);
  }
  
  function stopDebugUpdates() {
    if (debugUpdateInterval) {
      clearInterval(debugUpdateInterval);
      debugUpdateInterval = null;
    }
  }
  
  function updateDebugDisplay(info) {
    document.getElementById('debug-balance').textContent = `$${info.balance}`;
    document.getElementById('debug-games').textContent = info.recentGames.length;
    document.getElementById('debug-session-time').textContent = info.sessionTime;
  }
}
```

---

## 🎨 Frontend Developer 2 - Примеры

### admin.js - Загрузка списка пользователей
```javascript
import { api } from '../api/api.js';

export function initAdminPanel() {
  // Проверка прав доступа
  if (!window.currentUser?.permissions?.can_edit_balance) {
    return; // Не админ, не показываем панель
  }
  
  loadUsersList();
  initUserEditHandlers();
}

async function loadUsersList() {
  try {
    const users = await api.admin.getAllUsers();
    renderUsersTable(users);
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.profile_id}</td>
      <td>${user.username}</td>
      <td>${user.nickname}</td>
      <td>${user.role_name}</td>
      <td>$${user.current_balance}</td>
      <td>
        <button onclick="editUser(${user.profile_id})">Edit</button>
        <button onclick="viewStatistics(${user.profile_id})">Stats</button>
        <button onclick="resetHistory(${user.profile_id})">Reset</button>
      </td>
    </tr>
  `).join('');
}

async function viewStatistics(userId) {
  const startDate = document.getElementById('stats-start-date').value;
  const endDate = document.getElementById('stats-end-date').value;
  
  try {
    const stats = await api.admin.getUserStatistics({
      profileId: userId,
      startDate,
      endDate
    });
    
    showStatisticsModal(stats);
  } catch (error) {
    console.error('Failed to load statistics:', error);
  }
}
```

---

## 📝 Примечания

- Все примеры требуют адаптации под реальную структуру проекта
- Не забывайте обрабатывать ошибки
- Используйте существующие паттерны кода в проекте
- Тестируйте каждую функцию отдельно перед интеграцией

