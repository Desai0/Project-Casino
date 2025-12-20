// ... imports ...
 const { app, BrowserWindow, ipcMain } = require('electron');
 const path = require('path');
 const koffi = require('koffi'); // Load Koffi for C++ DLL
 const db = require('../DB/db');
 const { checkAdminAccess } = require('./services/admin');


 // часть вайбкода акима
ipcMain.handle('admin:getAllUsers', async (event, { adminProfileId, limit, offset, searchQuery }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    const users = await db.players.getAllPlayers({ limit, offset, searchQuery });
    return users;
});

ipcMain.handle('admin:updateUserRole', async (event, { adminProfileId, profileId, roleId }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    await db.players.updatePlayerRole({ profileId, roleId });
    return true;
});

ipcMain.handle('admin:updateUserBalance', async (event, { adminProfileId, profileId, newBalance }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    await db.players.updateBalance({ profileId, newBalance });
    return true;
});

ipcMain.handle('admin:resetUserHistory', async (event, { adminProfileId, profileId }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    await db.players.resetPlayerHistory(profileId);
    return true;
});

ipcMain.handle('admin:getUserStatistics', async (event, { adminProfileId, profileId, startDate, endDate }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    const statistics = await db.statistics.getUserStatistics({ profileId, startDate, endDate });
    return statistics;
});

ipcMain.handle('admin:getAllUsersStatistics', async (event, { adminProfileId, startDate, endDate, limit, offset }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    const statistics = await db.statistics.getAllUsersStatistics({ startDate, endDate, limit, offset });
    return statistics;
});

ipcMain.handle('admin:getTopPlayers', async (event, { adminProfileId, startDate, endDate, limit }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    const topPlayers = await db.statistics.getTopPlayers({ startDate, endDate, limit });
    return topPlayers;
});

ipcMain.handle('admin:getPlayerGamesCount', async (event, { adminProfileId, profileId }) => {
    // Получаем информацию об админе для проверки прав
    const admin = await db.players.getPlayer(adminProfileId);
    if (!checkAdminAccess({ role: admin.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    const gamesCount = await db.players.getPlayerGamesCount(profileId);
    return gamesCount;
});

 
ipcMain.handle('api:addBalance', async (event, { profileId, amount }) => {
    // Получаем информацию о пользователе для проверки прав
    const user = await db.players.getPlayer(profileId);
    if (!checkAdminAccess({ role: user.role_id })) {
        throw new Error("You don't have permission to perform this action");
    }
    if (!amount) throw new Error("Amount is required");
    const result = await db.players.updateBalance({ profileId, newBalance: amount });
    return result;
});


// конец вайбкода акима



 // --- DLL Integration ---
 let spinSlotLib;
 try {
     const dllPath = path.resolve(__dirname, '../slots.dll'); // Assuming slots.dll is in root
     const lib = koffi.load(dllPath);
 
     // Define structure matching C++ SpinResult
     const SpinResult = koffi.struct('SpinResult', {
         win_ammount: 'int',
         spin_result: koffi.array('int', 15), // MAX_REELS = 15
         rows: 'int',
         cols: 'int'
     });
 
     // Define function signature
     spinSlotLib = lib.func('SpinResult spinSlot(int bet, str config)');
     console.log('DLL Loaded successfully');
 } catch (e) {
     console.error('Failed to load slots.dll:', e.message);
 }
 
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
 
 // 1. Login Handler
 ipcMain.handle('api:login', async (event, { username, password }) => {
     console.log('Main Process: Logging in', username);
     try {
         // Find user by username (login field)
         const user = await db.players.getPlayerByUsername(username);
         if (user) {
             // TODO: Verify password hash here
             // For now, just check if user exists
             return { 
                 token: "mock-session-token", 
                 user: { 
                     name: user.nickname, // Display nickname in UI
                     username: user.username, // Store username for reference
                     balance: user.current_balance, 
                     id: user.profile_id, 
                     avatar: user.profile_picture 
                 } 
             };
        } else {
             return { error: "User not found. Try 'register'." };
        }
     } catch (err) {
         console.error("Login DB error:", err);
         return { error: "DB Error" };
     }
 });

 // 1b. Registration Handler
 ipcMain.handle('api:register', async (event, { username, password, nickname }) => {
     console.log('Main Process: Registering', username, nickname);
     try {
         // Validate inputs
         if (!username || username.trim() === '') {
             return { error: "Username is required" };
         }
         if (!nickname || nickname.trim() === '') {
             return { error: "Nickname is required" };
         }
         
         // Create new player with separate username and nickname
         // Note: hashedPass should be hashed here or in frontend. Sending plain text is bad but OK for demo.
         const result = await db.players.createPlayer({ 
             username: username.trim(),
             nickname: nickname.trim(),
             hashedPass: "hashed_" + password, // Mock hash
             roleId: 1, 
             startingBalance: 1000 // Welcome bonus
         });
         
         // Auto login after register
         const newUser = await db.players.getPlayer(result.profileId);
         return { 
             success: true, 
             token: "mock-session-token", 
             user: { 
                 name: newUser.nickname, // Display nickname in UI
                 username: newUser.username, // Store username for reference
                 balance: newUser.current_balance, 
                 id: newUser.profile_id, 
                 avatar: newUser.profile_picture 
             } 
         };
     } catch (err) {
         console.error("Registration failed:", err);
         if (err.code === 'SQLITE_CONSTRAINT') {
             return { error: "Username or nickname already taken" };
         }
         return { error: "Registration failed" };
     }
 });

 // 1c. Update Profile Handlers
 ipcMain.handle('api:updateNickname', async (event, { profileId, nickname }) => {
     console.log('Main Process: Updating nickname', profileId, nickname);
     try {
         await db.players.updateNickname({ profileId, nickname });
         const updatedUser = await db.players.getPlayer(profileId);
         return { success: true, nickname: updatedUser.nickname };
     } catch (err) {
         console.error("Update nickname failed:", err);
         if (err.code === 'SQLITE_CONSTRAINT') {
             return { error: "Nickname already taken" };
         }
         return { error: "Failed to update nickname" };
     }
 });

 ipcMain.handle('api:updateAvatar', async (event, { profileId, avatarPath }) => {
     console.log('Main Process: Updating avatar', profileId, avatarPath);
     try {
         await db.players.updateAvatar({ profileId, avatarPath });
         return { success: true, avatarPath };
     } catch (err) {
         console.error("Update avatar failed:", err);
         return { error: "Failed to update avatar" };
     }
 });
 
 // 2. Game Spin Handler (Slots) - Uses DLL
 ipcMain.handle('game:spin', async (event, betAmount) => {
     console.log('Main Process: Spinning with bet', betAmount);
     
     try {
         let reelResult = [0, 0, 0]; // Default
         let winAmount = 0;
         let moneyChange = -betAmount;
 
         if (spinSlotLib) {
             // Call C++ DLL
             const resultStruct = spinSlotLib(betAmount, "{}"); // Passing empty config for now
             
             // Extract data from C++ struct
             winAmount = resultStruct.win_ammount; // Returns pure win amount (>=0)
             
             // Convert fixed array to JS array (taking only relevant 3x5 or similar)
             // Assuming 3x5 grid from C++ logic
             const rawGrid = resultStruct.spin_result;
             // For now, let's just take the first row (3 items) for the simple UI
             reelResult = [rawGrid[0], rawGrid[1], rawGrid[2]]; 
             
             moneyChange = winAmount - betAmount;
             
             console.log("DLL Result:", { winAmount, reelResult });
         } else {
             console.warn("DLL not loaded, using fallback logic");
             const reel1 = Math.floor(Math.random() * 7);
             const reel2 = Math.floor(Math.random() * 7);
             const reel3 = Math.floor(Math.random() * 7);
             reelResult = [reel1, reel2, reel3];
             const isWin = (reel1 === reel2 && reel2 === reel3);
             winAmount = isWin ? betAmount * 10 : 0;
             moneyChange = winAmount - betAmount;
         }
 
        // Record in DB
        let updatedBalance = 0;
        try {
            // Assuming profileId 1 for now (should come from session/context)
            const profileId = 1; 
            const gameId = 1; // Assuming Slots is game_id 1
            
            // Ensure game exists before recording round
            const game = await db.games.getGame(gameId);
            if (!game) {
                 await db.games.createGame({
                     categoryId: 1, // Slots category from seed
                     name: "Classic Slots",
                     minBet: 1,
                     maxBet: 100,
                     config: "{}"
                 });
            }

            await db.rounds.recordRound({
                profileId, 
                gameId, 
                moneyWinLoseAmount: moneyChange 
            });
            
            // Fetch updated balance from DB
            const updatedPlayer = await db.players.getPlayer(profileId);
            updatedBalance = updatedPlayer.current_balance;
        } catch (dbErr) {
            console.error("DB Transaction failed:", dbErr);
        }
        
        return {
            success: true,
            result: reelResult, // Passing simple array for now
            win: winAmount,
            balanceChange: moneyChange,
            newBalance: updatedBalance // Return updated balance
        };
         
     } catch (err) {
         console.error("Spin Handler failed:", err);
         return { 
             success: false, 
             error: err.message,
             result: [0, 0, 0],
             win: 0,
             balanceChange: 0
         };
     }
 });
 
 // 2b. Blackjack Handler (kept same)
 ipcMain.handle('game:blackjack', async (event, { action, betAmount, gameState }) => {
     // ... (Existing implementation) ...
     return { success: true }; 
 });
 
 // 2c. Roulette Handler (kept same)
 ipcMain.handle('game:roulette', async (event, { action, betAmount, gameState }) => {
     // ... (Existing implementation) ...
     return { success: true };
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
