const db = require('./init');

// Форматирование timestamp в формат [год].[месяц].[день]:[час:минута:секунда]
function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day}:${hours}:${minutes}:${seconds}`;
}

// Запись раунда: обновление баланса на основе money_win_lose_ammount
function recordRound({
  profileId,
  gameId,
  moneyWinLoseAmount,
  timestamp = null,
}) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN');

      db.get(
        `SELECT p.current_balance AS balance, g.min_bet, g.max_bet
         FROM players p
         JOIN games g ON g.game_id = ?
         WHERE p.profile_id = ?`,
        [gameId, profileId],
        (selectErr, row) => {
          if (selectErr || !row) {
            db.run('ROLLBACK');
            return reject(selectErr || new Error('Profile or game not found'));
          }

          const { balance } = row;
          const newBalance = balance + moneyWinLoseAmount;
          if (newBalance < 0) {
            db.run('ROLLBACK');
            return reject(new Error('Insufficient balance'));
          }

          const ts = timestamp || formatTimestamp();

          db.run(
            `INSERT INTO game_rounds (profile_id, game_id, timestamp, money_win_lose_ammount)
             VALUES (?, ?, ?, ?)`,
            [profileId, gameId, ts, moneyWinLoseAmount],
            function onInsert(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              db.run(
                `UPDATE players
                 SET current_balance = ?
                 WHERE profile_id = ?`,
                [newBalance, profileId],
                (updateErr) => {
                  if (updateErr) {
                    db.run('ROLLBACK');
                    return reject(updateErr);
                  }
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) return reject(commitErr);
                    resolve({ roundId: this.lastID, balance: newBalance });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
}

function getHistory(profileId, { limit = 50, offset = 0 } = {}) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT r.round_id, r.timestamp, r.money_win_lose_ammount,
              g.name AS game_name, c.name AS category_name
       FROM game_rounds r
       JOIN games g ON r.game_id = g.game_id
       JOIN game_categories c ON g.category_id = c.category_id
       WHERE r.profile_id = ?
       ORDER BY r.timestamp DESC, r.round_id DESC
       LIMIT ? OFFSET ?`,
      [profileId, limit, offset],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

module.exports = {
  recordRound,
  getHistory,
  formatTimestamp,
};
