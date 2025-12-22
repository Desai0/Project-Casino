// Скрипт для полного сброса базы данных
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'casino.db');

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✓ База данных удалена');
} else {
    console.log('ℹ База данных не найдена (это нормально)');
}

// Теперь инициализируем заново
const db = require('./db/init');

console.log('✓ База данных создана заново');
console.log('\nТеперь можно запустить приложение: npm start');
console.log('При первом входе будет создан тестовый пользователь.');

process.exit(0);

