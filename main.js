const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database/db');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    backgroundColor: '#0a0a0a',
    show: false, // Не показывать окно до полной загрузки
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Используем абсолютный путь
  const indexPath = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath).then(() => {
    // Показываем окно только после загрузки
    mainWindow.show();
    
    // Открываем DevTools в режиме разработки
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  }).catch((error) => {
    console.error('Ошибка загрузки index.html:', error);
    // Показываем окно даже при ошибке для отладки
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Ошибка загрузки:', errorCode, errorDescription);
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    // Инициализация базы данных
    console.log('Инициализация базы данных...');
    db = new Database();
    db.init();
    console.log('✅ База данных инициализирована успешно');
    
    // Проверяем что админ доступен
    setTimeout(() => {
      try {
        const admin = db.getUser('admin', 'admin123');
        if (admin) {
          console.log('✅ Тест входа админа: УСПЕШНО');
        } else {
          console.error('❌ Тест входа админа: НЕУДАЧНО - проверьте пароль в БД');
        }
      } catch (testError) {
        console.error('❌ Ошибка теста входа админа:', testError);
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    console.error('Стек ошибки:', error.stack);
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC обработчики для базы данных
ipcMain.handle('db:getUser', async (event, nickname, password) => {
  try {
    console.log('Получен запрос на вход:', { nickname, hasPassword: !!password });
    
    if (!db) {
      console.error('База данных не инициализирована');
      throw new Error('База данных не инициализирована');
    }
    
    if (!db.db) {
      console.error('Объект базы данных не существует');
      throw new Error('Объект базы данных не существует');
    }
    
    const user = db.getUser(nickname, password);
    console.log('Результат получения пользователя:', user ? 'Найден' : 'Не найден');
    return user;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
});

ipcMain.handle('db:createUser', async (event, nickname, password) => {
  try {
    console.log('Получен запрос на создание пользователя:', { nickname, hasPassword: !!password });
    
    if (!db) {
      console.error('База данных не инициализирована');
      throw new Error('База данных не инициализирована. Перезапустите приложение.');
    }
    
    if (!db.db) {
      console.error('Объект базы данных не существует');
      throw new Error('Объект базы данных не существует. Перезапустите приложение.');
    }
    
    const result = db.createUser(nickname, password);
    console.log('Результат создания пользователя:', result);
    return result;
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
});

ipcMain.handle('db:updateBalance', async (event, userId, newBalance) => {
  return db.updateBalance(userId, newBalance);
});

ipcMain.handle('db:addGameRound', async (event, userId, gameId, amount) => {
  return db.addGameRound(userId, gameId, amount);
});

ipcMain.handle('db:getUserStats', async (event, userId) => {
  return db.getUserStats(userId);
});

ipcMain.handle('db:getBalanceHistory', async (event, userId) => {
  return db.getBalanceHistory(userId);
});

ipcMain.handle('db:getTransactionHistory', async (event, userId) => {
  return db.getTransactionHistory(userId);
});

ipcMain.handle('db:getAllUsers', async (event) => {
  return db.getAllUsers();
});

ipcMain.handle('db:updateUserRole', async (event, userId, roleId) => {
  return db.updateUserRole(userId, roleId);
});

ipcMain.handle('db:getUserById', async (event, userId) => {
  return db.getUserById(userId);
});

ipcMain.handle('db:getGameIdByName', async (event, gameName) => {
  return db.getGameIdByName(gameName);
});

// IPC обработчики для управления окном
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

