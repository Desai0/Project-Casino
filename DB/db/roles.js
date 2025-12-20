const db = require('./init');

function listRoles() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT r.role_id, r.role_name,
              p.can_edit_balance, p.can_view_debug_info,
              p.streamer_mode_access, p.can_reset_history
       FROM roles r
       JOIN permissions p ON r.role_id = p.role_id
       ORDER BY r.role_id`,
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function getRole(roleId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT r.role_id, r.role_name,
              p.can_edit_balance, p.can_view_debug_info,
              p.streamer_mode_access, p.can_reset_history
       FROM roles r
       JOIN permissions p ON r.role_id = p.role_id
       WHERE r.role_id = ?`,
      [roleId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function createRole({ roleName, permissions }) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN');

      db.run(
        `INSERT INTO roles (role_name)
         VALUES (?)`,
        [roleName],
        function onInsert(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }

          const roleId = this.lastID;
          db.run(
            `INSERT INTO permissions (role_id, can_edit_balance, can_view_debug_info, streamer_mode_access, can_reset_history)
             VALUES (?, ?, ?, ?, ?)`,
            [
              roleId,
              permissions.canEditBalance ? 1 : 0,
              permissions.canViewDebugInfo ? 1 : 0,
              permissions.streamerModeAccess ? 1 : 0,
              permissions.canResetHistory ? 1 : 0,
            ],
            (permErr) => {
              if (permErr) {
                db.run('ROLLBACK');
                return reject(permErr);
              }
              db.run('COMMIT', (commitErr) => {
                if (commitErr) return reject(commitErr);
                resolve({ roleId });
              });
            }
          );
        }
      );
    });
  });
}

module.exports = {
  listRoles,
  getRole,
  createRole,
};

