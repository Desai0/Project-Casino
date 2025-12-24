const db = require('./init');

function listGames() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT g.game_id, g.name, g.min_bet, g.max_bet, g.config, g.game_icon,
              c.category_id, c.name AS category_name
       FROM games g
       JOIN game_categories c ON g.category_id = c.category_id
       ORDER BY g.game_id`,
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function createGame({ categoryId, name, minBet, maxBet, config, gameIcon = null }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO games (category_id, name, min_bet, max_bet, config, game_icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryId, name, minBet, maxBet, config, gameIcon],
      function onInsert(err) {
        if (err) return reject(err);
        resolve({ gameId: this.lastID });
      }
    );
  });
}

function getGame(gameId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT g.game_id, g.name, g.min_bet, g.max_bet, g.config, g.game_icon,
              c.category_id, c.name AS category_name, c.description AS category_description
       FROM games g
       JOIN game_categories c ON g.category_id = c.category_id
       WHERE g.game_id = ?`,
      [gameId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

module.exports = {
  listGames,
  createGame,
  getGame,
};
