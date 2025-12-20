const db = require('./init');

/**
 * Создание нового платежа Stripe
 * @param {Object} params
 * @param {number} params.profileId - ID профиля игрока
 * @param {string} params.stripePaymentIntentId - ID платежного намерения Stripe
 * @param {number} params.amount - Сумма платежа (в центах/копейках)
 * @param {string} params.status - Статус платежа ('pending', 'succeeded', 'failed', 'canceled')
 * @returns {Promise<Object>} Объект с paymentId
 */
function createPayment({ profileId, stripePaymentIntentId, amount, status = 'pending' }) {
  return new Promise((resolve, reject) => {
    if (!profileId || !stripePaymentIntentId || !amount || amount <= 0) {
      return reject(new Error('Неверные параметры для создания платежа'));
    }

    if (!['pending', 'succeeded', 'failed', 'canceled'].includes(status)) {
      return reject(new Error('Неверный статус платежа'));
    }

    db.run(
      `INSERT INTO stripe_payments (profile_id, stripe_payment_intent_id, amount, status, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [profileId, stripePaymentIntentId, amount, status],
      function onInsert(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return reject(new Error('Платеж с таким stripe_payment_intent_id уже существует'));
          }
          if (err.message.includes('FOREIGN KEY constraint failed')) {
            return reject(new Error('Профиль не найден'));
          }
          return reject(err);
        }
        resolve({ paymentId: this.lastID });
      }
    );
  });
}

/**
 * Обновление статуса платежа
 * @param {Object} params
 * @param {number} params.paymentId - ID платежа
 * @param {string} params.status - Новый статус
 * @param {string} [params.completedAt] - Дата завершения (опционально)
 * @returns {Promise<Object>} Объект с количеством измененных записей
 */
function updatePaymentStatus({ paymentId, status, completedAt = null }) {
  return new Promise((resolve, reject) => {
    if (!paymentId || !status) {
      return reject(new Error('paymentId и status обязательны'));
    }

    if (!['pending', 'succeeded', 'failed', 'canceled'].includes(status)) {
      return reject(new Error('Неверный статус платежа'));
    }

    // Если статус завершенный и completedAt не указан, устанавливаем текущее время
    const shouldSetCompletedAt = (status === 'succeeded' || status === 'failed' || status === 'canceled') && !completedAt;

    if (shouldSetCompletedAt) {
      db.run(
        `UPDATE stripe_payments 
         SET status = ?, completed_at = datetime('now')
         WHERE payment_id = ?`,
        [status, paymentId],
        function onUpdate(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            return reject(new Error('Платеж не найден'));
          }
          resolve({ changes: this.changes });
        }
      );
    } else if (completedAt) {
      db.run(
        `UPDATE stripe_payments 
         SET status = ?, completed_at = ?
         WHERE payment_id = ?`,
        [status, completedAt, paymentId],
        function onUpdate(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            return reject(new Error('Платеж не найден'));
          }
          resolve({ changes: this.changes });
        }
      );
    } else {
      db.run(
        `UPDATE stripe_payments 
         SET status = ?, completed_at = NULL
         WHERE payment_id = ?`,
        [status, paymentId],
        function onUpdate(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            return reject(new Error('Платеж не найден'));
          }
          resolve({ changes: this.changes });
        }
      );
    }
  });
}

/**
 * Получение платежей по профилю с пагинацией
 * @param {Object} params
 * @param {number} params.profileId - ID профиля
 * @param {number} [params.limit=50] - Лимит записей
 * @param {number} [params.offset=0] - Смещение
 * @returns {Promise<Array>} Массив платежей
 */
function getPaymentsByProfile({ profileId, limit = 50, offset = 0 }) {
  return new Promise((resolve, reject) => {
    if (!profileId) {
      return reject(new Error('profileId обязателен'));
    }

    db.all(
      `SELECT payment_id, profile_id, stripe_payment_intent_id, amount, status, 
              created_at, completed_at
       FROM stripe_payments
       WHERE profile_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [profileId, limit, offset],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

/**
 * Получение платежа по Stripe Payment Intent ID
 * @param {string} stripePaymentIntentId - ID платежного намерения Stripe
 * @returns {Promise<Object|null>} Объект платежа или null
 */
function getPaymentByStripeId(stripePaymentIntentId) {
  return new Promise((resolve, reject) => {
    if (!stripePaymentIntentId) {
      return reject(new Error('stripePaymentIntentId обязателен'));
    }

    db.get(
      `SELECT payment_id, profile_id, stripe_payment_intent_id, amount, status, 
              created_at, completed_at
       FROM stripe_payments
       WHERE stripe_payment_intent_id = ?`,
      [stripePaymentIntentId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

module.exports = {
  createPayment,
  updatePaymentStatus,
  getPaymentsByProfile,
  getPaymentByStripeId,
};

