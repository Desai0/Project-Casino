# Исправление проблемы с better-sqlite3

## Проблема
Модуль `better-sqlite3` скомпилирован для другой версии Node.js, чем та, которую использует Electron.

## Решение

### Вариант 1: Автоматическая пересборка (рекомендуется)

1. Установите electron-rebuild:
```bash
npm install --save-dev electron-rebuild
```

2. Пересоберите модуль:
```bash
npm run rebuild
```

Или вручную:
```bash
npx electron-rebuild -f -w better-sqlite3
```

3. Запустите приложение:
```bash
npm start
```

### Вариант 2: Переустановка модулей

```bash
rm -rf node_modules
npm install
npm run rebuild
```

### Вариант 3: Использование npm rebuild

```bash
npm rebuild better-sqlite3 --build-from-source
```

## Проверка

После пересборки запустите приложение. Ошибка `NODE_MODULE_VERSION` должна исчезнуть.

## Если проблема сохраняется

1. Убедитесь, что версия Electron совместима:
```bash
npm list electron
```

2. Проверьте версию Node.js:
```bash
node --version
```

3. Переустановите все зависимости:
```bash
rm -rf node_modules package-lock.json
npm install
npm run rebuild
```

