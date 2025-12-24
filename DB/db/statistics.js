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
        COALESCE(SUM(ABS(money_win_lose_ammount)), 0) as total_bet_amount,
        COALESCE(SUM(CASE WHEN money_win_lose_ammount > 0 THEN money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(CASE WHEN money_win_lose_ammount < 0 THEN ABS(money_win_lose_ammount) ELSE 0 END), 0) as total_losses,
        COALESCE(SUM(money_win_lose_ammount), 0) as net_result,
        COALESCE(AVG(ABS(money_win_lose_ammount)), 0) as avg_bet,
        COALESCE(MAX(money_win_lose_ammount), 0) as max_win,
        COALESCE(MIN(money_win_lose_ammount), 0) as max_loss
       FROM game_rounds
       WHERE profile_id = ? 
         AND substr(timestamp, 1, 10) >= replace(?, '-', '.')
         AND substr(timestamp, 1, 10) <= replace(?, '-', '.')`,
      [profileId, startDate, endDate],
      (err, row) => {
        if (err) return reject(err);
        // Обрабатываем NULL значения
        const result = row || {};
        resolve({
          total_games: result.total_games || 0,
          total_bet_amount: result.total_bet_amount || 0,
          total_wins: result.total_wins || 0,
          total_losses: result.total_losses || 0,
          net_result: result.net_result || 0,
          avg_bet: result.avg_bet || 0,
          max_win: result.max_win || 0,
          max_loss: result.max_loss || 0
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
        COALESCE(SUM(ABS(r.money_win_lose_ammount)), 0) as total_bet_amount,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as total_losses,
        COALESCE(SUM(r.money_win_lose_ammount), 0) as net_result,
        COALESCE(AVG(ABS(r.money_win_lose_ammount)), 0) as avg_bet,
        COALESCE(MAX(r.money_win_lose_ammount), 0) as max_win,
        COALESCE(MIN(r.money_win_lose_ammount), 0) as max_loss
       FROM games g
       JOIN game_rounds r ON g.game_id = r.game_id
       JOIN game_categories c ON g.category_id = c.category_id
       WHERE r.profile_id = ? 
         AND substr(r.timestamp, 1, 10) >= replace(?, '-', '.')
         AND substr(r.timestamp, 1, 10) <= replace(?, '-', '.')
       GROUP BY g.game_id, g.name, c.name
       ORDER BY games_count DESC`,
      [profileId, startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        // Обрабатываем NULL значения в каждой строке
        const processedRows = (rows || []).map(row => ({
          ...row,
          total_bet_amount: row.total_bet_amount || 0,
          total_wins: row.total_wins || 0,
          total_losses: row.total_losses || 0,
          net_result: row.net_result || 0,
          avg_bet: row.avg_bet || 0,
          max_win: row.max_win || 0,
          max_loss: row.max_loss || 0
        }));
        resolve(processedRows);
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
        COALESCE(SUM(ABS(r.money_win_lose_ammount)), 0) as total_bets,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as total_losses,
        COALESCE(SUM(r.money_win_lose_ammount), 0) as house_profit,
        COALESCE(AVG(ABS(r.money_win_lose_ammount)), 0) as avg_bet
       FROM game_rounds r
       WHERE substr(r.timestamp, 1, 10) >= replace(?, '-', '.')
         AND substr(r.timestamp, 1, 10) <= replace(?, '-', '.')`,
      [startDate, endDate],
      (err, row) => {
        if (err) return reject(err);
        
        const stats = row || {};
        const totalBets = stats.total_bets || 0;
        const houseProfit = stats.house_profit || 0;

        // Вычисляем house edge (преимущество казино)
        const houseEdge = totalBets > 0 
          ? ((houseProfit / totalBets) * 100).toFixed(2)
          : 0;

        resolve({
          totalUsers: stats.total_users || 0,
          totalGames: stats.total_games || 0,
          totalBets: totalBets,
          totalWins: stats.total_wins || 0,
          totalLosses: stats.total_losses || 0,
          houseProfit: houseProfit,
          avgBet: stats.avg_bet || 0,
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
       WHERE substr(r.timestamp, 1, 10) >= replace(?, '-', '.')
         AND substr(r.timestamp, 1, 10) <= replace(?, '-', '.')
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
         AND substr(r.timestamp, 1, 10) >= replace(?, '-', '.')
         AND substr(r.timestamp, 1, 10) <= replace(?, '-', '.')
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