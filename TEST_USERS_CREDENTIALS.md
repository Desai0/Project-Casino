# Данные для входа в систему

## 🔴 АДМИНЫ (role_id = 3)

### Админ 1
- **Username:** `admin`
- **Password:** `admin123`
- **Nickname:** Admin
- **Balance:** $10,000
- **Profile ID:** 5
- **Права:** Все права доступа (админ панель, streamer mode, редактирование баланса)

### Админ 2
- **Username:** `admin2`
- **Password:** `admin456`
- **Nickname:** Admin Two
- **Balance:** $15,000
- **Profile ID:** 6
- **Права:** Все права доступа (админ панель, streamer mode, редактирование баланса)

---

## 🎮 СТРИМЕРЫ (role_id = 2)

### Стример 1
- **Username:** `streamer`
- **Password:** `streamer123`
- **Nickname:** Streamer
- **Balance:** $5,000
- **Profile ID:** 7
- **Права:** Streamer Mode, просмотр debug информации

### Стример 2
- **Username:** `streamer2`
- **Password:** `streamer456`
- **Nickname:** Streamer Two
- **Balance:** $8,000
- **Profile ID:** 8
- **Права:** Streamer Mode, просмотр debug информации

---

## 📝 Примечания

- Все пароли хешированы с помощью `bcryptjs` (10 rounds)
- Email адреса созданы для тестирования (формат: `username@casino.test`)
- Балансы установлены при создании пользователей
- Для повторного создания пользователей запустите: `node DB/create_test_users.js`
  (существующие пользователи будут пропущены)

---

## 🔧 Создание дополнительных пользователей

Для создания новых пользователей отредактируйте файл `DB/create_test_users.js` и запустите:

```bash
node DB/create_test_users.js
```

