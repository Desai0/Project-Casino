const db = require('./init');

function listCategories() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT category_id, name, description
       FROM game_categories
       ORDER BY category_id`,
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function createCategory({ name, description = null }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO game_categories (name, description)
       VALUES (?, ?)`,
      [name, description],
      function onInsert(err) {
        if (err) return reject(err);
        resolve({ categoryId: this.lastID });
      }
    );
  });
}

module.exports = {
  listCategories,
  createCategory,
};
