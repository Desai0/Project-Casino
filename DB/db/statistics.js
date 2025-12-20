const db = require('./init');

/**
 * Получение статистики пользователя за период
 * @param {Object} params
 * @param {number} params.profileId - ID профиля
 * @param {string} [params.startDate] - Начальная дата (ISO формат или SQL datetime)
 * @param {string} [params.endDate] - Конечная дата (ISO формат или SQL datetime)
 * @returns {Promise<Object>} Объект со статистикой
 */
function getUserStatistics({ profileId, startDate = null, endDate = null }) {
  return new Promise((resolve, reject) => {
    if (!profileId) {
      return reject(new Error('profileId обязателен'));
    }

    // Формируем условие для фильтрации по датам
    let dateFilter = '';
    const params = [profileId];

    if (startDate && endDate) {
      dateFilter = 'AND r.timestamp >= ? AND r.timestamp <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND r.timestamp >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND r.timestamp <= ?';
      params.push(endDate);
    }

    // Основная статистика
    db.get(
      `SELECT 
        COUNT(*) as total_games,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(r.money_win_lose_ammount), 0) as net_profit,
        COALESCE(AVG(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE NULL END), 0) as avg_bet,
        COALESCE(MAX(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE NULL END), 0) as max_win,
        COALESCE(MIN(CASE WHEN r.money_win_lose_ammount < 0 THEN r.money_win_lose_ammount ELSE NULL END), 0) as max_loss
       FROM game_rounds r
       WHERE r.profile_id = ? ${dateFilter}`,
      params,
      (err, stats) => {
        if (err) return reject(err);

        // Статистика по играм
        db.all(
          `SELECT 
            g.game_id,
            g.name as game_name,
            COUNT(*) as game_count,
            COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as game_bets,
            COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as game_wins,
            COALESCE(SUM(r.money_win_lose_ammount), 0) as game_profit
           FROM game_rounds r
           JOIN games g ON r.game_id = g.game_id
           WHERE r.profile_id = ? ${dateFilter}
           GROUP BY g.game_id, g.name
           ORDER BY game_count DESC`,
          params,
          (errGames, gamesStats) => {
            if (errGames) return reject(errGames);

            resolve({
              profileId,
              period: {
                startDate: startDate || null,
                endDate: endDate || null,
              },
              summary: {
                totalGames: stats.total_games || 0,
                totalBets: stats.total_bets || 0,
                totalWins: stats.total_wins || 0,
                netProfit: stats.net_profit || 0,
                avgBet: Math.round((stats.avg_bet || 0) * 100) / 100,
                maxWin: stats.max_win || 0,
                maxLoss: stats.max_loss || 0,
              },
              games: (gamesStats || []).map(game => ({
                gameId: game.game_id,
                gameName: game.game_name,
                gameCount: game.game_count,
                gameBets: game.game_bets,
                gameWins: game.game_wins,
                gameProfit: game.game_profit,
              })),
            });
          }
        );
      }
    );
  });
}

/**
 * Получение статистики всех пользователей за период
 * @param {Object} params
 * @param {string} [params.startDate] - Начальная дата
 * @param {string} [params.endDate] - Конечная дата
 * @param {number} [params.limit=100] - Лимит записей
 * @param {number} [params.offset=0] - Смещение
 * @returns {Promise<Array>} Массив статистики по пользователям
 */
function getAllUsersStatistics({ startDate = null, endDate = null, limit = 100, offset = 0 }) {
  return new Promise((resolve, reject) => {
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE r.timestamp >= ? AND r.timestamp <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE r.timestamp >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE r.timestamp <= ?';
      params.push(endDate);
    }

    params.push(limit, offset);

    db.all(
      `SELECT 
        p.profile_id,
        p.nickname,
        p.email,
        COUNT(*) as total_games,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(r.money_win_lose_ammount), 0) as net_profit,
        COALESCE(AVG(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE NULL END), 0) as avg_bet,
        COALESCE(MAX(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE NULL END), 0) as max_win
       FROM game_rounds r
       JOIN players p ON r.profile_id = p.profile_id
       ${dateFilter}
       GROUP BY p.profile_id, p.nickname, p.email
       ORDER BY total_wins DESC
       LIMIT ? OFFSET ?`,
      params,
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map(row => ({
          profileId: row.profile_id,
          nickname: row.nickname,
          email: row.email,
          totalGames: row.total_games,
          totalBets: row.total_bets,
          totalWins: row.total_wins,
          netProfit: row.net_profit,
          avgBet: Math.round((row.avg_bet || 0) * 100) / 100,
          maxWin: row.max_win,
        })));
      }
    );
  });
}

/**
 * Получение топ игроков по выигрышам за период
 * @param {Object} params
 * @param {string} [params.startDate] - Начальная дата
 * @param {string} [params.endDate] - Конечная дата
 * @param {number} [params.limit=10] - Количество топ игроков
 * @returns {Promise<Array>} Массив топ игроков
 */
function getTopPlayers({ startDate = null, endDate = null, limit = 10 }) {
  return new Promise((resolve, reject) => {
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE r.timestamp >= ? AND r.timestamp <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE r.timestamp >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE r.timestamp <= ?';
      params.push(endDate);
    }

    params.push(limit);

    db.all(
      `SELECT 
        p.profile_id,
        p.nickname,
        p.email,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(r.money_win_lose_ammount), 0) as net_profit,
        COUNT(*) as total_games
       FROM game_rounds r
       JOIN players p ON r.profile_id = p.profile_id
       ${dateFilter}
       GROUP BY p.profile_id, p.nickname, p.email
       HAVING total_wins > 0
       ORDER BY total_wins DESC
       LIMIT ?`,
      params,
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map((row, index) => ({
          rank: index + 1,
          profileId: row.profile_id,
          nickname: row.nickname,
          email: row.email,
          totalWins: row.total_wins,
          netProfit: row.net_profit,
          totalGames: row.total_games,
        })));
      }
    );
  });
}

module.exports = {
  getUserStatistics,
  getAllUsersStatistics,
  getTopPlayers,
};

