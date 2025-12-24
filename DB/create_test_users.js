const db = require('./db/init');
const bcrypt = require('bcryptjs');

/**
 * Скрипт для создания тестовых пользователей (админов и стримеров)
 */

async function createTestUsers() {
    try {
        console.log('Creating test users...\n');

        // Хешируем пароли
        const saltRounds = 10;
        const adminPassword = await bcrypt.hash('admin123', saltRounds);
        const admin2Password = await bcrypt.hash('admin456', saltRounds);
        const streamerPassword = await bcrypt.hash('streamer123', saltRounds);
        const streamer2Password = await bcrypt.hash('streamer456', saltRounds);

        // Админы (role_id = 3)
        const admin1 = {
            username: 'admin',
            nickname: 'Admin',
            email: 'admin@casino.test',
            hashedPass: adminPassword,
            roleId: 3,
            startingBalance: 10000
        };

        const admin2 = {
            username: 'admin2',
            nickname: 'Admin Two',
            email: 'admin2@casino.test',
            hashedPass: admin2Password,
            roleId: 3,
            startingBalance: 15000
        };

        // Стримеры (role_id = 2)
        const streamer1 = {
            username: 'streamer',
            nickname: 'Streamer',
            email: 'streamer@casino.test',
            hashedPass: streamerPassword,
            roleId: 2,
            startingBalance: 5000
        };

        const streamer2 = {
            username: 'streamer2',
            nickname: 'Streamer Two',
            email: 'streamer2@casino.test',
            hashedPass: streamer2Password,
            roleId: 2,
            startingBalance: 8000
        };

        // Создаем пользователей
        const users = [admin1, admin2, streamer1, streamer2];
        const createdUsers = [];

        for (const user of users) {
            try {
                const result = await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO players (username, nickname, email, hashed_pass, role_id, current_balance)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [user.username, user.nickname, user.email, user.hashedPass, user.roleId, user.startingBalance],
                        function(err) {
                            if (err) {
                                // Если пользователь уже существует, пропускаем
                                if (err.message.includes('UNIQUE constraint')) {
                                    console.log(`⚠️  User "${user.username}" already exists, skipping...`);
                                    resolve(null);
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve({ profileId: this.lastID, ...user });
                            }
                        }
                    );
                });
                
                if (result) {
                    createdUsers.push(result);
                    const roleName = result.roleId === 3 ? 'Admin' : 'Streamer';
                    console.log(`✅ Created ${roleName}: ${result.username} (ID: ${result.profileId})`);
                }
            } catch (error) {
                console.error(`❌ Error creating user ${user.username}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 USER CREDENTIALS');
        console.log('='.repeat(60) + '\n');

        // Выводим данные для входа
        console.log('🔴 ADMINS (role_id = 3):');
        console.log('─'.repeat(60));
        console.log('1. Username: admin');
        console.log('   Password: admin123');
        console.log('   Balance: $10,000');
        console.log('');
        console.log('2. Username: admin2');
        console.log('   Password: admin456');
        console.log('   Balance: $15,000');
        console.log('');

        console.log('🎮 STREAMERS (role_id = 2):');
        console.log('─'.repeat(60));
        console.log('1. Username: streamer');
        console.log('   Password: streamer123');
        console.log('   Balance: $5,000');
        console.log('');
        console.log('2. Username: streamer2');
        console.log('   Password: streamer456');
        console.log('   Balance: $8,000');
        console.log('');

        console.log('='.repeat(60));
        console.log(`✅ Successfully created ${createdUsers.length} users`);
        console.log('='.repeat(60));

        // Закрываем соединение с БД
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('\nDatabase connection closed.');
            }
        });

    } catch (error) {
        console.error('Error creating test users:', error);
        process.exit(1);
    }
}

// Запускаем скрипт
createTestUsers();

