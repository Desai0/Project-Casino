 зависимость: npm install sqlite3
  инициализациz: node db/init.js (создаст db/casino.db, применит DDL+seed)
 в основном коде, пример:
      const { addOperation } = require('./db/operations');
     await addOperation({
       userId: 1,
       amount: -10,
       categoryId: 1,
       dateISO: '2025-01-01',
       timeISO: '12:00:00',
     });

     держать PRAGMA foreign_keys = ON (в init уже есть). Все записи делаются в транзакции


db/schema.sql — все таблицы и индекс
db/seed.sql — стартовые данные валюты/категорий
db/init.js — инициализация БД, прогон схемы и сидов (атомарно)
db/operations.js — запись операции (ставка/выигрыш) в транзакции, выборка истории
db/users.js — создание пользователя, апдейт профиля, привязка категорий


Пример записи раунда:
;
const { recordRound } = require('./db/operations');await recordRound({ profileId: 1, gameId: 1, betAmount: 10, winAmount: 25, resultSnapshot: '{"reels":[1,2,3]}' });
