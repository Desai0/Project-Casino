const db = require('./init');

function createPlayer({ username, nickname, hashedPass, roleId = 1, profilePicture = null, startingBalance = 0 }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO players (username, nickname, hashed_pass, role_id, profile_picture, current_balance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, nickname, hashedPass, roleId, profilePicture, startingBalance],
      function onInsert(err) {
        if (err) return reject(err);
        resolve({ profileId: this.lastID });
      }
    );
  });
}

function updateBalance({ profileId, newBalance }) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE players
       SET current_balance = ?
       WHERE profile_id = ?`,
      [newBalance, profileId],
      function onUpdate(err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function getPlayer(profileId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.profile_id, p.username, p.nickname, p.current_balance, p.profile_picture, p.role_id,
              r.role_name
       FROM players p
       JOIN roles r ON p.role_id = r.role_id
       WHERE p.profile_id = ?`,
      [profileId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getPlayerByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.profile_id, p.username, p.nickname, p.current_balance, p.profile_picture, p.role_id,
              r.role_name
       FROM players p
       JOIN roles r ON p.role_id = r.role_id
       WHERE p.username = ?`,
      [username],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getPlayerWithPermissions(profileId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.profile_id, p.username, p.nickname, p.current_balance, p.profile_picture, p.role_id,
              r.role_name,
              perm.can_edit_balance, perm.can_view_debug_info,
              perm.streamer_mode_access, perm.can_reset_history
       FROM players p
       JOIN roles r ON p.role_id = r.role_id
       JOIN permissions perm ON r.role_id = perm.role_id
       WHERE p.profile_id = ?`,
      [profileId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function updateAvatar({ profileId, avatarPath }) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE players
       SET profile_picture = ?
       WHERE profile_id = ?`,
      [avatarPath, profileId],
      function onUpdate(err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function updateNickname({ profileId, nickname }) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE players
       SET nickname = ?
       WHERE profile_id = ?`,
      [nickname, profileId],
      function onUpdate(err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

/**
 * Получение списка всех игроков с пагинацией и поиском
 * @param {Object} params
 * @param {number} [params.limit=50] - Лимит записей
 * @param {number} [params.offset=0] - Смещение
 * @param {string} [params.searchQuery] - Поисковый запрос (по nickname, username, email)
 * @returns {Promise<Array>} Массив игроков
 */
function getAllPlayers({ limit = 50, offset = 0, searchQuery = null }) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT p.profile_id, p.username, p.nickname, p.email, p.current_balance, 
             p.profile_picture, p.role_id, p.created_at, p.last_login,
             r.role_name
      FROM players p
      JOIN roles r ON p.role_id = r.role_id
    `;
    const params = [];

    if (searchQuery) {
      query += ` WHERE p.nickname LIKE ? OR p.username LIKE ? OR p.email LIKE ?`;
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Изменение роли пользователя
 * @param {Object} params
 * @param {number} params.profileId - ID профиля
 * @param {number} params.roleId - ID новой роли
 * @returns {Promise<Object>} Объект с количеством измененных записей
 */
function updatePlayerRole({ profileId, roleId }) {
  return new Promise((resolve, reject) => {
    if (!profileId || !roleId) {
      return reject(new Error('profileId и roleId обязательны'));
    }

    // Проверяем существование роли
    db.get(
      `SELECT role_id FROM roles WHERE role_id = ?`,
      [roleId],
      (err, role) => {
        if (err) return reject(err);
        if (!role) {
          return reject(new Error('Роль не найдена'));
        }

        db.run(
          `UPDATE players
           SET role_id = ?
           WHERE profile_id = ?`,
          [roleId, profileId],
          function onUpdate(err) {
            if (err) return reject(err);
            if (this.changes === 0) {
              return reject(new Error('Игрок не найден'));
            }
            resolve({ changes: this.changes });
          }
        );
      }
    );
  });
}

/**
 * Удаление всей истории игр для пользователя
 * @param {number} profileId - ID профиля
 * @returns {Promise<Object>} Объект с количеством удаленных записей
 */
function resetPlayerHistory(profileId) {
  return new Promise((resolve, reject) => {
    if (!profileId) {
      return reject(new Error('profileId обязателен'));
    }

    db.run(
      `DELETE FROM game_rounds WHERE profile_id = ?`,
      [profileId],
      function onDelete(err) {
        if (err) return reject(err);
        resolve({ deletedRounds: this.changes });
      }
    );
  });
}

/**
 * Получение количества игр по каждой игре для пользователя
 * @param {number} profileId - ID профиля
 * @returns {Promise<Array>} Массив объектов с информацией о количестве игр
 */
function getPlayerGamesCount(profileId) {
  return new Promise((resolve, reject) => {
    if (!profileId) {
      return reject(new Error('profileId обязателен'));
    }

    db.all(
      `SELECT 
        g.game_id,
        g.name as game_name,
        c.name as category_name,
        COUNT(r.round_id) as game_count,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount < 0 THEN ABS(r.money_win_lose_ammount) ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN r.money_win_lose_ammount > 0 THEN r.money_win_lose_ammount ELSE 0 END), 0) as total_wins
       FROM games g
       LEFT JOIN game_rounds r ON g.game_id = r.game_id AND r.profile_id = ?
       JOIN game_categories c ON g.category_id = c.category_id
       GROUP BY g.game_id, g.name, c.name
       ORDER BY game_count DESC`,
      [profileId],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map(row => ({
          gameId: row.game_id,
          gameName: row.game_name,
          categoryName: row.category_name,
          gameCount: row.game_count,
          totalBets: row.total_bets,
          totalWins: row.total_wins,
        })));
      }
    );
  });
}

module.exports = {
  createPlayer,
  updateBalance,
  updateAvatar,
  updateNickname,
  getPlayer,
  getPlayerByUsername,
  getPlayerWithPermissions,
  getAllPlayers,
  updatePlayerRole,
  resetPlayerHistory,
  getPlayerGamesCount,
};
