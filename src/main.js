const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// const koffi = require('koffi'); // Uncomment when DLL is ready

// Import DB Layer (Assuming DB folder is at project root, need to adjust path if necessary)
// In packaged app, paths might differ, but for dev this works.
const db = require('../DB/db/index'); 

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Security best practice
      nodeIntegration: false  // Security best practice
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Initialize DB on startup
  // This runs schema.sql and seed.sql if DB doesn't exist
  // db.db refers to the 'init.js' module from index.js export
  // But init.js runs automatically on require? No, it exports the db instance.
  // The provided init.js seems to run init logic immediately if we look at it? 
  // Let's assume require('./init') returns the db instance and ensures tables exist.
}

app.whenReady().then(() => {
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

// --- IPC Handlers (Backend Logic) ---

// 1. Login Handler (Mock for now, but ready for DB)
ipcMain.handle('api:login', async (event, { username, password }) => {
    console.log('Main Process: Logging in', username);
    
    // In a real app, you'd check password hash here.
    // Since we don't have a 'getUserByUsername' yet in users.js (only getPlayer by ID),
    // we will simulate login or you'd add that method to users.js.
    
    // For now, let's create a dummy user or fetch profile 1
    try {
        const user = await db.players.getPlayer(1); // Fetch Admin/User 1
        if (user) {
             return { token: "mock-session-token", user: { name: user.nickname, balance: user.current_balance, id: user.profile_id } };
        } else {
             // If DB is empty, maybe create default user?
             // For demo, return mock if DB fails or empty
             return { token: "mock-token-123", user: { name: username, balance: 1000, id: 0 } };
        }
    } catch (err) {
        console.error("Login DB error:", err);
        return { error: "DB Error" };
    }
});

// 2. Game Spin Handler (Slots)
ipcMain.handle('game:spin', async (event, betAmount) => {
    console.log('Main Process: Spinning with bet', betAmount);
    
    // MOCK Logic for result (C++ DLL would go here)
    const reel1 = Math.floor(Math.random() * 7); // 0-6 для 7 символов
    const reel2 = Math.floor(Math.random() * 7);
    const reel3 = Math.floor(Math.random() * 7);
    const isWin = (reel1 === reel2 && reel2 === reel3);
    const winAmount = isWin ? betAmount * 10 : 0;
    const moneyChange = winAmount - betAmount; // Net change

    // Record in DB
    try {
        // Assuming profileId 1 for now (should come from session/context)
        const profileId = 1; 
        const gameId = 1; // Assuming Slots is game_id 1
        
        await db.rounds.recordRound({
            profileId, 
            gameId, 
            moneyWinLoseAmount: moneyChange 
        });
        
        return {
            success: true,
            result: [reel1, reel2, reel3],
            win: winAmount,
            balanceChange: moneyChange
        };
    } catch (err) {
        console.error("Spin Transaction failed:", err);
        return { success: false, error: err.message };
    }
});

// 2b. Blackjack Handler
ipcMain.handle('game:blackjack', async (event, { action, betAmount, gameState }) => {
    console.log('Main Process: Blackjack action', action, 'bet', betAmount);
    
    try {
        const profileId = 1;
        const gameId = 2; // Assuming Blackjack is game_id 2
        
        if (action === 'deal') {
            // Начало новой игры - пока не записываем в БД
            return { success: true, message: 'Game started' };
        } else if (action === 'end') {
            // Конец игры - записываем результат
            const { result, winAmount } = gameState;
            const moneyChange = winAmount - betAmount;
            
            await db.rounds.recordRound({
                profileId,
                gameId,
                moneyWinLoseAmount: moneyChange
            });
            
            return {
                success: true,
                balanceChange: moneyChange,
                result: result
            };
        }
        
        return { success: true };
    } catch (err) {
        console.error("Blackjack Transaction failed:", err);
        return { success: false, error: err.message };
    }
});

// 3. Get History Handler
ipcMain.handle('api:history', async (event, profileId) => {
    try {
        const history = await db.rounds.getHistory(profileId || 1, { limit: 10 });
        return history;
    } catch (err) {
        console.error("Fetch history failed:", err);
        return [];
    }
});
