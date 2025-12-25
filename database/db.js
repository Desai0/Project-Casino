const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

class CasinoDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'casino.db');
    this.db = null;
  }

  init() {
    this.db = new Database(this.dbPath);
    this.createTables();
    this.insertDefaultData();
  }

  createTables() {
    // Таблица ролей
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT(50) NOT NULL UNIQUE
      );
    `);

    // Таблица прав доступа
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        role_id INTEGER PRIMARY KEY,
        can_edit_balance BOOLEAN NOT NULL DEFAULT 0,
        can_view_debug_info BOOLEAN NOT NULL DEFAULT 0,
        streamer_mode_access BOOLEAN NOT NULL DEFAULT 0,
        can_reset_history BOOLEAN NOT NULL DEFAULT 0,
        can_change_roles BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
      );
    `);

    // Таблица игроков
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL DEFAULT 1,
        nickname TEXT(50) NOT NULL UNIQUE,
        hashed_pass TEXT(255) NOT NULL,
        current_balance INTEGER NOT NULL DEFAULT 10000,
        profile_picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
      );
    `);

    // Таблица категорий игр
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT(50) NOT NULL UNIQUE,
        description TEXT(255)
      );
    `);

    // Таблица игр
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        game_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT(50) NOT NULL UNIQUE,
        min_bet INTEGER NOT NULL,
        max_bet INTEGER NOT NULL,
        config TEXT NOT NULL,
        game_icon TEXT,
        FOREIGN KEY (category_id) REFERENCES game_categories(category_id)
      );
    `);

    // Таблица игровых раундов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_rounds (
        round_id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        money_win_lose_amount INTEGER NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES players(profile_id),
        FOREIGN KEY (game_id) REFERENCES games(game_id)
      );
    `);

    // Индексы для оптимизации
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rounds_profile ON game_rounds(profile_id);
      CREATE INDEX IF NOT EXISTS idx_rounds_game ON game_rounds(game_id);
      CREATE INDEX IF NOT EXISTS idx_rounds_timestamp ON game_rounds(timestamp);
    `);
  }

  insertDefaultData() {
    // Роли
    const roles = this.db.prepare('SELECT COUNT(*) as count FROM roles').get();
    if (roles.count === 0) {
      this.db.exec(`
        INSERT INTO roles (role_name) VALUES 
          ('Игрок'),
          ('Стример'),
          ('Админ');
      `);

      // Права доступа
      this.db.exec(`
        INSERT INTO permissions (role_id, can_edit_balance, can_view_debug_info, streamer_mode_access, can_reset_history, can_change_roles) VALUES
          (1, 0, 0, 0, 0, 0),
          (2, 0, 0, 1, 0, 0),
          (3, 1, 1, 1, 1, 1);
      `);
    }

    // Категории игр
    const categories = this.db.prepare('SELECT COUNT(*) as count FROM game_categories').get();
    if (categories.count === 0) {
      this.db.exec(`
        INSERT INTO game_categories (name, description) VALUES
          ('Slots', 'Крутишь барабан'),
          ('Roulette', 'Крутишь рулетку'),
          ('21', 'Играешь с дилером');
      `);
    }

    // Игры
    const games = this.db.prepare('SELECT COUNT(*) as count FROM games').get();
    if (games.count === 0) {
      const slotsConfig = JSON.stringify({
        "elem modyfier": [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0],
        "column modyfier": [1.2, 1.5, 2.0],
        "number of rows": 3,
        "luck value": 50,
        "wild chance": 5,
        "freespins chance": 3
      });

      const blackjackConfig = JSON.stringify({
        "dealer_stand": 17,
        "blackjack_multiplier": 2.5
      });

      const rouletteConfig = JSON.stringify({
        "numbers": 37,
        "red_numbers": [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
      });

      this.db.exec(`
        INSERT INTO games (category_id, name, min_bet, max_bet, config) VALUES
          (1, 'Аниме слот', 3000, 250000, '${slotsConfig.replace(/'/g, "''")}'),
          (1, 'Фурри слот', 2500, 400000, '${slotsConfig.replace(/'/g, "''")}'),
          (2, 'Русская рулетка', 1000, 500000, '${rouletteConfig.replace(/'/g, "''")}'),
          (3, 'Блэкджек', 2000, 300000, '${blackjackConfig.replace(/'/g, "''")}');
      `);
    }

    // Создание тестовых пользователей
    const testUsers = [
      {
        nickname: 'admin',
        password: 'admin123',
        role_id: 3, // Админ
        balance: 999999999
      },
      {
        nickname: 'player1',
        password: 'player123',
        role_id: 1, // Игрок
        balance: 50000
      },
      {
        nickname: 'player2',
        password: 'player123',
        role_id: 1, // Игрок
        balance: 25000
      },
      {
        nickname: 'streamer',
        password: 'streamer123',
        role_id: 2, // Стример
        balance: 100000
      },
      {
        nickname: 'test',
        password: 'test123',
        role_id: 1, // Игрок
        balance: 10000
      },
      {
        nickname: 'rich',
        password: 'rich123',
        role_id: 1, // Игрок
        balance: 500000
      }
    ];

    testUsers.forEach(user => {
      try {
        const userCheck = this.db.prepare('SELECT COUNT(*) as count FROM players WHERE nickname = ?').get(user.nickname);
        if (userCheck && userCheck.count === 0) {
          const hashedPass = bcrypt.hashSync(user.password, 10);
          const result = this.db.prepare(`
            INSERT INTO players (nickname, hashed_pass, role_id, current_balance) 
            VALUES (?, ?, ?, ?)
          `).run(user.nickname, hashedPass, user.role_id, user.balance);
          console.log(`✅ Создан тестовый пользователь: ${user.nickname} (ID: ${result.lastInsertRowid})`);
        } else {
          console.log(`⏭️  Пользователь ${user.nickname} уже существует`);
        }
      } catch (error) {
        console.error(`❌ Ошибка создания пользователя ${user.nickname}:`, error);
      }
    });
    
    // Проверяем что админ создан правильно
    const adminCheck = this.db.prepare('SELECT * FROM players WHERE nickname = ?').get('admin');
    if (adminCheck) {
      console.log('✅ Админ найден в БД, проверка пароля...');
      const testPassword = bcrypt.compareSync('admin123', adminCheck.hashed_pass);
      console.log('Тест пароля админа:', testPassword ? '✅ OK' : '❌ FAIL');
    } else {
      console.error('❌ Админ не найден в БД!');
    }
  }

  getUser(nickname, password) {
    try {
      console.log('getUser вызван:', { nickname, passwordLength: password?.length });
      
      if (!this.db) {
        console.error('this.db не существует');
        throw new Error('База данных не инициализирована');
      }

      if (!nickname || !password) {
        console.log('Отсутствует nickname или password');
        return null;
      }

      const user = this.db.prepare('SELECT * FROM players WHERE nickname = ?').get(nickname);
      
      if (!user) {
        console.log('Пользователь не найден:', nickname);
        return null;
      }

      console.log('Пользователь найден, проверка пароля...');
      
      let passwordMatch = false;
      try {
        passwordMatch = bcrypt.compareSync(password, user.hashed_pass);
        console.log('Результат проверки пароля:', passwordMatch);
      } catch (compareError) {
        console.error('Ошибка сравнения пароля:', compareError);
        return null;
      }

      if (passwordMatch) {
        const role = this.db.prepare('SELECT * FROM roles WHERE role_id = ?').get(user.role_id);
        const permissions = this.db.prepare('SELECT * FROM permissions WHERE role_id = ?').get(user.role_id);
        
        const userData = {
          ...user,
          role: role,
          permissions: permissions
        };
        
        console.log('Авторизация успешна:', userData.nickname);
        return userData;
      } else {
        console.log('Пароль не совпадает');
        return null;
      }
    } catch (error) {
      console.error('Исключение в getUser:', error);
      return null;
    }
  }

  createUser(nickname, password) {
    try {
      console.log('createUser вызван:', { nickname, passwordLength: password?.length });
      
      if (!this.db) {
        console.error('this.db не существует');
        throw new Error('База данных не инициализирована');
      }

      if (!nickname || !password) {
        return { success: false, error: 'Никнейм и пароль обязательны' };
      }

      // Валидация никнейма
      if (nickname.length < 3 || nickname.length > 50) {
        return { success: false, error: 'Никнейм должен быть от 3 до 50 символов' };
      }

      // Валидация пароля
      if (password.length < 6) {
        return { success: false, error: 'Пароль должен быть не менее 6 символов' };
      }

      // Проверка на существующего пользователя
      try {
        const existing = this.db.prepare('SELECT COUNT(*) as count FROM players WHERE nickname = ?').get(nickname);
        if (existing && existing.count > 0) {
          return { success: false, error: 'Пользователь с таким никнеймом уже существует' };
        }
      } catch (checkError) {
        console.error('Ошибка проверки существующего пользователя:', checkError);
        // Продолжаем, если таблица еще не создана
      }

      // Хеширование пароля
      let hashedPass;
      try {
        hashedPass = bcrypt.hashSync(password, 10);
      } catch (hashError) {
        console.error('Ошибка хеширования пароля:', hashError);
        throw new Error('Ошибка обработки пароля');
      }

      // Вставка пользователя
      const result = this.db.prepare(`
        INSERT INTO players (nickname, hashed_pass, role_id, current_balance) 
        VALUES (?, ?, 1, 10000)
      `).run(nickname, hashedPass);
      
      console.log('Пользователь создан успешно:', result.lastInsertRowid);
      return { success: true, userId: result.lastInsertRowid };
    } catch (error) {
      console.error('Исключение в createUser:', error);
      return { success: false, error: error.message || 'Неизвестная ошибка при создании пользователя' };
    }
  }

  getUserById(userId) {
    const user = this.db.prepare('SELECT * FROM players WHERE profile_id = ?').get(userId);
    if (!user) return null;

    const role = this.db.prepare('SELECT * FROM roles WHERE role_id = ?').get(user.role_id);
    const permissions = this.db.prepare('SELECT * FROM permissions WHERE role_id = ?').get(user.role_id);
    
    return {
      ...user,
      role: role,
      permissions: permissions
    };
  }

  updateBalance(userId, newBalance) {
    this.db.prepare('UPDATE players SET current_balance = ? WHERE profile_id = ?')
      .run(newBalance, userId);
    return { success: true };
  }

  addGameRound(userId, gameId, amount) {
    try {
      // Обновляем баланс
      const user = this.db.prepare('SELECT current_balance FROM players WHERE profile_id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      const newBalance = user.current_balance + amount;
      this.updateBalance(userId, newBalance);

      // Добавляем раунд
      this.db.prepare(`
        INSERT INTO game_rounds (profile_id, game_id, money_win_lose_amount) 
        VALUES (?, ?, ?)
      `).run(userId, gameId, amount);

      return { success: true, newBalance: newBalance };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getUserStats(userId) {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(r.round_id) AS total_rounds,
        COALESCE(SUM(r.money_win_lose_amount), 0) AS total_net_result,
        AVG(r.money_win_lose_amount) AS avg_result_per_round
      FROM players p
      LEFT JOIN game_rounds r ON p.profile_id = r.profile_id
      WHERE p.profile_id = ?
    `).get(userId);

    return stats;
  }

  getBalanceHistory(userId, limit = 100) {
    // Получаем начальный баланс
    const user = this.db.prepare('SELECT current_balance FROM players WHERE profile_id = ?').get(userId);
    if (!user) return [];
    
    // Получаем все раунды
    const rounds = this.db.prepare(`
      SELECT 
        round_id,
        timestamp,
        money_win_lose_amount,
        game_id
      FROM game_rounds
      WHERE profile_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(userId, limit);

    // Вычисляем баланс на каждый момент времени
    let runningBalance = user.current_balance;
    const history = [];
    
    // Идем с конца, вычитая суммы
    for (let i = rounds.length - 1; i >= 0; i--) {
      runningBalance -= rounds[i].money_win_lose_amount;
      history.unshift({
        timestamp: rounds[i].timestamp,
        money_win_lose_amount: rounds[i].money_win_lose_amount,
        balance_at_time: runningBalance,
        game_id: rounds[i].game_id
      });
    }

    return history;
  }

  getTransactionHistory(userId, limit = 100) {
    // Получаем историю пополнений и выводов (пока только игровые раунды)
    const transactions = this.db.prepare(`
      SELECT 
        timestamp,
        money_win_lose_amount,
        CASE 
          WHEN money_win_lose_amount > 0 THEN 'deposit'
          WHEN money_win_lose_amount < 0 THEN 'withdraw'
          ELSE 'neutral'
        END as type,
        game_id
      FROM game_rounds
      WHERE profile_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit);

    return transactions;
  }

  getAllUsers() {
    return this.db.prepare(`
      SELECT p.*, r.role_name 
      FROM players p
      JOIN roles r ON p.role_id = r.role_id
      ORDER BY p.profile_id
    `).all();
  }

  updateUserRole(userId, roleId) {
    this.db.prepare('UPDATE players SET role_id = ? WHERE profile_id = ?')
      .run(roleId, userId);
    return { success: true };
  }

  getGameIdByName(gameName) {
    const game = this.db.prepare('SELECT game_id FROM games WHERE name = ?').get(gameName);
    return game ? game.game_id : 1; // По умолчанию возвращаем 1
  }
}

module.exports = CasinoDatabase;

