// Скрипт для проверки и исправления базы данных
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'casino.db');
console.log('Путь к БД:', dbPath);

let db;
try {
  db = new Database(dbPath);
  console.log('✅ База данных открыта');
} catch (error) {
  console.error('❌ Ошибка открытия БД:', error);
  process.exit(1);
}

// Проверяем админа
const admin = db.prepare('SELECT * FROM players WHERE nickname = ?').get('admin');
if (admin) {
  console.log('Админ найден:', admin.nickname);
  console.log('Хеш пароля:', admin.hashed_pass.substring(0, 20) + '...');
  
  // Тестируем пароль
  const testPass = bcrypt.compareSync('admin123', admin.hashed_pass);
  console.log('Тест пароля admin123:', testPass ? '✅ OK' : '❌ FAIL');
  
  if (!testPass) {
    console.log('Исправляем пароль админа...');
    const newHash = bcrypt.hashSync('admin123', 10);
    db.prepare('UPDATE players SET hashed_pass = ? WHERE nickname = ?').run(newHash, 'admin');
    console.log('✅ Пароль админа обновлен');
  }
} else {
  console.log('Админ не найден, создаем...');
  const hashedPass = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO players (nickname, hashed_pass, role_id, current_balance) 
    VALUES (?, ?, 3, 999999999)
  `).run('admin', hashedPass);
  console.log('✅ Админ создан');
}

// Проверяем всех пользователей
const users = db.prepare('SELECT nickname, role_id, current_balance FROM players').all();
console.log('\nВсе пользователи:');
users.forEach(u => {
  console.log(`  - ${u.nickname} (роль: ${u.role_id}, баланс: ${u.current_balance})`);
});

db.close();
console.log('\n✅ Проверка завершена');

