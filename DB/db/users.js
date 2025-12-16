const db = require('./init');

function createPlayer({ nickname, hashedPass, roleId = 1, profilePicture = null, startingBalance = 0 }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO players (nickname, hashed_pass, role_id, profile_picture, current_balance)
       VALUES (?, ?, ?, ?, ?)`,
      [nickname, hashedPass, roleId, profilePicture, startingBalance],
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
      `SELECT p.profile_id, p.nickname, p.current_balance, p.profile_picture, p.role_id,
              r.role_name
       FROM players p
       JOIN roles r ON p.role_id = r.role_id
       WHERE p.profile_id = ?`,
      [profileId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getPlayerWithPermissions(profileId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.profile_id, p.nickname, p.current_balance, p.profile_picture, p.role_id,
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

module.exports = {
  createPlayer,
  updateBalance,
  getPlayer,
  getPlayerWithPermissions,
};
