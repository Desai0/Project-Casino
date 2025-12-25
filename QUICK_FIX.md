# 🚨 Быстрое исправление проблемы с базой данных

## Проблема
Ошибка: `NODE_MODULE_VERSION 127` vs `NODE_MODULE_VERSION 118`

Это означает, что `better-sqlite3` скомпилирован для другой версии Node.js.

## ✅ РЕШЕНИЕ (выполните в терминале):

### Шаг 1: Установите @electron/rebuild
```bash
npm install --save-dev @electron/rebuild
```

### Шаг 2: Установите setuptools для Python (важно!)
```bash
pip3 install setuptools
# или
brew install python-setuptools
```

### Шаг 3: Пересоберите ТОЛЬКО better-sqlite3
```bash
npx @electron/rebuild --only better-sqlite3
```

Или используйте скрипт:
```bash
npm run rebuild
```

### Шаг 3: Запустите приложение
```bash
npm start
```

## Альтернативное решение (если не работает):

### Вариант A: Полная переустановка
```bash
rm -rf node_modules package-lock.json
npm install
npx electron-rebuild -f -w better-sqlite3
npm start
```

### Вариант B: Ручная пересборка
```bash
cd node_modules/better-sqlite3
npm run build-release
cd ../..
npm start
```

## Если нужны права администратора:
```bash
sudo npm install --save-dev electron-rebuild
sudo npx electron-rebuild -f -w better-sqlite3
```

## Проверка версий

Убедитесь что версии совместимы:
```bash
node --version
npm list electron
```

---

**После выполнения этих команд приложение должно запуститься!**

