const checkAdminAccess = (profileId) => {
    // Проверка, является ли пользователь админом
    return profileId.role === 3; // Если роль пользователя равна 3, то это админ
};

const checkPermission = (profileId, permission) => {
    // Проверка конкретного права
    if (checkAdminAccess(profileId)) {
        switch (permission) {
            case 'readUsers':
                return true;
            case 'updateUserBalance':
                return true;
            case 'resetUserHistory':
                return true;
            default:
                return false;
        }
    } else {
        return false;
    }
};
