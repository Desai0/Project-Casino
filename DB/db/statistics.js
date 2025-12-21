const db = require('./init');

/**
 * Получение статистики пользователя за период
 * @param {Object} params
 * @param {number} params.profileId - ID профиля
 * @param {string} params.startDate - Начальная дата (YYYY-MM-DD)
 * @param {string} params.endDate - Конечная дата (YYYY-MM-DD)
 * @returns {Promise<Object>} Объект со статистикой
 */
function getUserStatistics({ profileId, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    if (!profileId || !startDate || !endDate) {
      return reject(new Error('profileId, startDate и endDate обязательны'));
    }

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
         AND date(timestamp) >= date(?) 
         AND date(timestamp) <= date(?)`,
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

/**
 * Получение статистики пользователя по играм за период
 * @param {Object} params
 * @param {number} params.profileId - ID профиля
 * @param {string} params.startDate - Начальная дата (YYYY-MM-DD)
 * @param {string} params.endDate - Конечная дата (YYYY-MM-DD)
 * @returns {Promise<Array>} Массив объектов со статистикой по играм
 */
function getUserGameStatistics({ profileId, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    if (!profileId || !startDate || !endDate) {
      return reject(new Error('profileId, startDate и endDate обязательны'));
    }

    db.all(
      `SELECT 
        g.game_id,
        g.name as game_name,
        c.name as category_name,
        COUNT(r.round_id) as games_count,
        SUM(ABS(r.money_win_lose_ammount)) as total_bet_amount,
        SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END) as total_wins,
        SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END) as total_losses,
        SUM(r.money_win_lose_ammount) as net_result,
        AVG(ABS(r.money_win_lose_ammount)) as avg_bet,
        MAX(r.money_win_lose_ammount) as max_win,
        MIN(r.money_win_lose_ammount) as max_loss
       FROM games g
       JOIN game_rounds r ON g.game_id = r.game_id
       JOIN game_categories c ON g.category_id = c.category_id
       WHERE r.profile_id = ? 
         AND date(r.timestamp) >= date(?) 
         AND date(r.timestamp) <= date(?)
       GROUP BY g.game_id, g.name, c.name
       ORDER BY games_count DESC`,
      [profileId, startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

/**
 * Получение общей статистики всех пользователей за период
 * @param {Object} params
 * @param {string} params.startDate - Начальная дата (YYYY-MM-DD)
 * @param {string} params.endDate - Конечная дата (YYYY-MM-DD)
 * @returns {Promise<Object>} Объект с общей статистикой
 */
function getAllUsersStatistics({ startDate, endDate }) {
  return new Promise((resolve, reject) => {
    if (!startDate || !endDate) {
      return reject(new Error('startDate и endDate обязательны'));
    }

    db.get(
      `SELECT 
        COUNT(DISTINCT r.profile_id) as total_users,
        COUNT(r.round_id) as total_games,
        SUM(ABS(r.money_win_lose_ammount)) as total_bets,
        SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END) as total_wins,
        SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END) as total_losses,
        SUM(r.money_win_lose_ammount) as house_profit,
        AVG(ABS(r.money_win_lose_ammount)) as avg_bet
       FROM game_rounds r
       WHERE date(r.timestamp) >= date(?) 
         AND date(r.timestamp) <= date(?)`,
      [startDate, endDate],
      (err, row) => {
        if (err) return reject(err);
        
        const stats = row || {
          total_users: 0,
          total_games: 0,
          total_bets: 0,
          total_wins: 0,
          total_losses: 0,
          house_profit: 0,
          avg_bet: 0
        };

        // Вычисляем house edge (преимущество казино)
        const houseEdge = stats.total_bets > 0 
          ? ((stats.house_profit / stats.total_bets) * 100).toFixed(2)
          : 0;

        resolve({
          totalUsers: stats.total_users,
          totalGames: stats.total_games,
          totalBets: stats.total_bets,
          totalWins: stats.total_wins,
          totalLosses: stats.total_losses,
          houseProfit: stats.house_profit,
          avgBet: stats.avg_bet,
          houseEdge: parseFloat(houseEdge)
        });
      }
    );
  });
}

/**
 * Получение топ игроков по выигрышам за период
 * @param {Object} params
 * @param {string} params.startDate - Начальная дата (YYYY-MM-DD)
 * @param {string} params.endDate - Конечная дата (YYYY-MM-DD)
 * @param {number} [params.limit=10] - Количество игроков
 * @returns {Promise<Array>} Массив топ игроков
 */
function getTopWinners({ startDate, endDate, limit = 10 }) {
  return new Promise((resolve, reject) => {
    if (!startDate || !endDate) {
      return reject(new Error('startDate и endDate обязательны'));
    }

    db.all(
      `SELECT 
        p.profile_id,
        p.username,
        p.nickname,
        COUNT(r.round_id) as games_played,
        SUM(r.money_win_lose_ammount) as net_winnings,
        SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END) as total_wins,
        MAX(r.money_win_lose_ammount) as biggest_win
       FROM players p
       JOIN game_rounds r ON p.profile_id = r.profile_id
       WHERE date(r.timestamp) >= date(?) 
         AND date(r.timestamp) <= date(?)
       GROUP BY p.profile_id, p.username, p.nickname
       ORDER BY net_winnings DESC
       LIMIT ?`,
      [startDate, endDate, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

/**
 * Получение статистики по играм за период
 * @param {Object} params
 * @param {string} params.startDate - Начальная дата (YYYY-MM-DD)
 * @param {string} params.endDate - Конечная дата (YYYY-MM-DD)
 * @returns {Promise<Array>} Массив статистики по играм
 */
function getGamesStatistics({ startDate, endDate }) {
  return new Promise((resolve, reject) => {
    if (!startDate || !endDate) {
      return reject(new Error('startDate и endDate обязательны'));
    }

    db.all(
      `SELECT 
        g.game_id,
        g.name as game_name,
        c.name as category_name,
        COUNT(r.round_id) as total_rounds,
        COUNT(DISTINCT r.profile_id) as unique_players,
        SUM(ABS(r.money_win_lose_ammount)) as total_bets,
        SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END) as total_payouts,
        SUM(r.money_win_lose_ammount) as house_profit,
        AVG(ABS(r.money_win_lose_ammount)) as avg_bet
       FROM games g
       LEFT JOIN game_rounds r ON g.game_id = r.game_id 
         AND date(r.timestamp) >= date(?) 
         AND date(r.timestamp) <= date(?)
       JOIN game_categories c ON g.category_id = c.category_id
       GROUP BY g.game_id, g.name, c.name
       ORDER BY total_rounds DESC`,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

module.exports = {
  getUserStatistics,
  getUserGameStatistics,
  getAllUsersStatistics,
  getTopWinners,
  getGamesStatistics
};