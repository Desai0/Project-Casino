# Исправление проблемы с Python/distutils

## Проблема
Ошибка: `ModuleNotFoundError: No module named 'distutils'`

Это происходит потому что в Python 3.12+ модуль `distutils` был удален.

## Решение

### Вариант 1: Установить setuptools (рекомендуется)

```bash
# Установите setuptools который включает distutils
pip3 install setuptools

# Или через brew на macOS
brew install python-setuptools
```

### Вариант 2: Использовать только better-sqlite3 (быстрое решение)

Пересоберите только better-sqlite3, пропустив bcrypt:

```bash
npx @electron/rebuild --only better-sqlite3
```

### Вариант 3: Использовать предкомпилированные бинарники

```bash
npm install better-sqlite3@latest --force
```

### Вариант 4: Исправить Python окружение

```bash
# Установите Python 3.11 или используйте pyenv
brew install python@3.11
```

## Быстрое решение (выполните сейчас):

```bash
# 1. Установите новый rebuild
npm install --save-dev @electron/rebuild

# 2. Пересоберите только better-sqlite3
npx @electron/rebuild --only better-sqlite3

# 3. Запустите приложение
npm start
```

## Если проблема с пробелами в пути

Проблема: путь содержит "новое казино" (пробел)

Решение: переименуйте папку или используйте симлинк:

```bash
# Создайте папку без пробелов
mkdir -p ~/casino-app
ln -s "/Users/aizen/Documents/новое казино" ~/casino-app/casino
cd ~/casino-app/casino
npm start
```

