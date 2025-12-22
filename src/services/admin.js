const db = require('../../DB/db');

/**
 * Проверка, является ли пользователь админом
 * @param {Object} params - Параметры для проверки
 * @param {number} [params.profileId] - ID профиля (если передан, будет запрос в БД)
 * @param {number} [params.role] - Роль пользователя (если передан напрямую)
 * @returns {Promise<boolean>|boolean} true если админ
 */
async function checkAdminAccess({ profileId, role }) {
    // Если передан profileId, получаем данные из БД
    if (profileId) {
        try {
            const player = await db.players.getPlayer(profileId);
            if (!player) {
                return false;
            }
            // Роль 3 = админ
            return player.role_id === 3;
        } catch (error) {
            console.error('Error checking admin access:', error);
            return false;
        }
    }
    
    // Если передан role напрямую
    if (role !== undefined) {
        return role === 3;
    }
    
    return false;
}

/**
 * Проверка конкретного права доступа
 * @param {Object} params - Параметры для проверки
 * @param {number} [params.profileId] - ID профиля
 * @param {number} [params.role] - Роль пользователя
 * @param {string} params.permission - Право для проверки
 * @returns {Promise<boolean>|boolean} true если есть право
 */
async function checkPermission({ profileId, role, permission }) {
    const isAdmin = await checkAdminAccess({ profileId, role });
    
    if (!isAdmin) {
        return false;
    }
    
    // Админы имеют все права
    switch (permission) {
        case 'readUsers':
        case 'updateUserBalance':
        case 'resetUserHistory':
        case 'viewStatistics':
        case 'updateUserRole':
            return true;
        default:
            return false;
    }
}

module.exports = {
    checkAdminAccess,
    checkPermission
};
