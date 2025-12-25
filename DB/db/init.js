const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Путь к файлу базы данных. При необходимости измените на app.getPath('userData').
const dbPath = path.join(__dirname, 'casino.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

// Создаем директорию, если её нет.
fs.mkdirSync(__dirname, { recursive: true });

// Открываем/создаем базу.
const db = new sqlite3.Database(dbPath);

// Применяем DDL и сиды атомарно.
function runScript(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('BEGIN');

  // Схема
  for (const statement of runScript(schemaPath)) {
    db.run(statement);
  }

  // Сиды
  for (const statement of runScript(seedPath)) {
    db.run(statement);
  }

  db.run('COMMIT');
});

module.exports = db;

