// Load environment variables
require('dotenv').config();

// ... imports ...
 const { app, BrowserWindow, ipcMain, Menu } = require('electron');
 const path = require('path');
 const koffi = require('koffi'); // Load Koffi for C++ DLL
 const db = require('../DB/db');
 const { checkAdminAccess } = require('./services/admin');
 const stripeService = require('./services/stripe');


 // часть вайбкода акима
ipcMain.handle('admin:getAllUsers', async (event, { adminProfileId, limit, offset, searchQuery }) => {
    console.log('admin:getAllUsers called with:', { adminProfileId, limit, offset, searchQuery });
    
    try {
        // Получаем информацию об админе для проверки прав
        const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
        if (!isAdmin) {
            console.error('Access denied: user is not admin');
            throw new Error("You don't have permission to perform this action");
        }
        
        console.log('Admin access granted, fetching users...');
        const users = await db.players.getAllPlayers({ limit, offset, searchQuery });
        console.log('Users fetched from DB:', users?.length || 0, 'users');
        
        return users || [];
    } catch (error) {
        console.error('Error in admin:getAllUsers:', error);
        throw error;
    }
});

ipcMain.handle('admin:updateUserRole', async (event, { adminProfileId, profileId, roleId }) => {
    console.log('admin:updateUserRole called with:', { adminProfileId, profileId, roleId });
    
    try {
        // Получаем информацию об админе для проверки прав
        const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
        if (!isAdmin) {
            console.error('Access denied: user is not admin');
            throw new Error("You don't have permission to perform this action");
        }
        
        // Валидация
        if (!profileId || !roleId) {
            throw new Error('profileId and roleId are required');
        }
        
        const roleIdNum = parseInt(roleId);
        if (isNaN(roleIdNum)) {
            throw new Error('Invalid roleId');
        }
        
        console.log('Updating role for profile:', profileId, 'to role:', roleIdNum);
        await db.players.updatePlayerRole({ profileId, roleId: roleIdNum });
        console.log('Role updated successfully');
        
        return { success: true };
    } catch (error) {
        console.error('Error in admin:updateUserRole:', error);
        throw error;
    }
});

ipcMain.handle('admin:updateUserBalance', async (event, { adminProfileId, profileId, newBalance }) => {
    console.log('admin:updateUserBalance called with:', { adminProfileId, profileId, newBalance });
    
    try {
        // Получаем информацию об админе для проверки прав
        const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
        if (!isAdmin) {
            console.error('Access denied: user is not admin');
            throw new Error("You don't have permission to perform this action");
        }
        
        // Валидация
        if (!profileId || newBalance === undefined || newBalance === null) {
            throw new Error('profileId and newBalance are required');
        }
        
        const balance = parseFloat(newBalance);
        if (isNaN(balance) || balance < 0) {
            throw new Error('Invalid balance value');
        }
        
        console.log('Updating balance for profile:', profileId, 'to:', balance);
        await db.players.updateBalance({ profileId, newBalance: balance });
        console.log('Balance updated successfully');
        
        return { success: true };
    } catch (error) {
        console.error('Error in admin:updateUserBalance:', error);
        throw error;
    }
});

ipcMain.handle('admin:resetUserHistory', async (event, { adminProfileId, profileId }) => {
    console.log('admin:resetUserHistory called with:', { adminProfileId, profileId });
    
    try {
        // Получаем информацию об админе для проверки прав
        const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
        if (!isAdmin) {
            console.error('Access denied: user is not admin');
            throw new Error("You don't have permission to perform this action");
        }
        
        // Валидация
        if (!profileId) {
            throw new Error('profileId is required');
        }
        
        console.log('Resetting history for profile:', profileId);
        const result = await db.players.resetPlayerHistory(profileId);
        console.log('History reset result:', result);
        
        return { success: true, deletedRounds: result.deletedRounds || 0 };
    } catch (error) {
        console.error('Error in admin:resetUserHistory:', error);
        throw error;
    }
});

ipcMain.handle('admin:getUserStatistics', async (event, { adminProfileId, profileId, startDate, endDate }) => {
    console.log('admin:getUserStatistics called with:', { adminProfileId, profileId, startDate, endDate });
    
    try {
        // Получаем информацию об админе для проверки прав
        const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
        if (!isAdmin) {
            console.error('Access denied: user is not admin');
            throw new Error("You don't have permission to perform this action");
        }
        
        // Валидация
        if (!profileId || !startDate || !endDate) {
            throw new Error('profileId, startDate and endDate are required');
        }
        
        console.log('Fetching statistics for profile:', profileId, 'from', startDate, 'to', endDate);
        
        // Получаем общую статистику
        const statistics = await db.statistics.getUserStatistics({ profileId, startDate, endDate });
        console.log('General statistics:', statistics);
        
        // Получаем статистику по играм
        const gameStatistics = await db.statistics.getUserGameStatistics({ profileId, startDate, endDate });
        console.log('Game statistics:', gameStatistics);
        
        // Для отладки: проверим, есть ли вообще записи для этого пользователя
        const testQuery = await db.rounds.getHistory(profileId, { limit: 5 });
        console.log('Recent games for profile', profileId, ':', testQuery?.length || 0, 'games');
        if (testQuery && testQuery.length > 0) {
            console.log('Sample timestamp:', testQuery[0].timestamp);
            console.log('Date range requested:', startDate, 'to', endDate);
        }
        
        return {
            statistics,
            gameStatistics
        };
    } catch (error) {
        console.error('Error in admin:getUserStatistics:', error);
        throw error;
    }
});

ipcMain.handle('admin:getAllUsersStatistics', async (event, { adminProfileId, startDate, endDate, limit, offset }) => {
    // Получаем информацию об админе для проверки прав
    const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
    if (!isAdmin) {
        throw new Error("You don't have permission to perform this action");
    }
    const statistics = await db.statistics.getAllUsersStatistics({ startDate, endDate, limit, offset });
    return statistics;
});

ipcMain.handle('admin:getTopPlayers', async (event, { adminProfileId, startDate, endDate, limit }) => {
    // Получаем информацию об админе для проверки прав
    const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
    if (!isAdmin) {
        throw new Error("You don't have permission to perform this action");
    }
    const topPlayers = await db.statistics.getTopWinners({ startDate, endDate, limit });
    return topPlayers;
});

ipcMain.handle('admin:getPlayerGamesCount', async (event, { adminProfileId, profileId }) => {
    // Получаем информацию об админе для проверки прав
    const isAdmin = await checkAdminAccess({ profileId: adminProfileId });
    if (!isAdmin) {
        throw new Error("You don't have permission to perform this action");
    }
    const gamesCount = await db.players.getPlayerGamesCount(profileId);
    return gamesCount;
});

 
ipcMain.handle('api:addBalance', async (event, { profileId, amount }) => {
    // Получаем информацию о пользователе для проверки прав
    const isAdmin = await checkAdminAccess({ profileId: profileId });
    if (!isAdmin) {
        throw new Error("You don't have permission to perform this action");
    }
    if (!amount || amount <= 0) {
        throw new Error("Amount must be a positive number");
    }
    
    // Получаем текущий баланс и добавляем к нему
    const currentPlayer = await db.players.getPlayer(profileId);
    const newBalance = currentPlayer.current_balance + amount;
    
    const result = await db.players.updateBalance({ profileId, newBalance });
    return { success: true, newBalance, changes: result.changes };
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
    autoHideMenuBar: true, // Скрывает меню Electron (File, Edit, View...)
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
  // Полностью удаляем меню Electron (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);
  
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
 ipcMain.handle('game:spin', async (event, betAmount, profileId) => {
     console.log('Main Process: Spinning with bet', betAmount, 'for profile', profileId);
     
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
             // Валидация входных данных
             if (!betAmount || betAmount <= 0 || isNaN(betAmount)) {
                 console.error('Slots: Invalid betAmount:', betAmount);
                 return { success: false, error: 'Invalid bet amount' };
             }
             
             // Используем profileId из параметров или дефолтный
             const currentProfileId = profileId || 1; 
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

             console.log('Slots: betAmount:', betAmount, 'winAmount:', winAmount, 'moneyChange:', moneyChange);
             
             const roundResult = await db.rounds.recordRound({
                 profileId: currentProfileId, 
                 gameId, 
                 moneyWinLoseAmount: moneyChange 
             });
             
             // Fetch updated balance from DB
             const updatedPlayer = await db.players.getPlayer(currentProfileId);
             updatedBalance = updatedPlayer.current_balance;
             
             console.log('Slots: Round recorded, roundId:', roundResult.roundId, 'new balance:', updatedBalance);
         } catch (dbErr) {
             console.error("DB Transaction failed:", dbErr);
             return {
                 success: false,
                 error: dbErr.message,
                 result: reelResult,
                 win: winAmount,
                 balanceChange: moneyChange
             };
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
 
 // 2b. Blackjack Handler - с интеграцией БД
 ipcMain.handle('game:blackjack', async (event, { action, betAmount, gameState, profileId }) => {
     console.log('Main Process: Blackjack action', action, 'bet:', betAmount);
     
     try {
         // Для упрощения используем profileId из параметров (в будущем из сессии)
         const currentProfileId = profileId || 1;
         const gameId = 2; // Blackjack game_id из БД
         
         // Проверяем существование игры
         let game = await db.games.getGame(gameId);
         if (!game) {
             await db.games.createGame({
                 categoryId: 2, // Table Games category
                 name: "European Blackjack",
                 minBet: 1,
                 maxBet: 100,
                 config: "{}"
             });
         }
         
         // Обрабатываем разные действия
         if (action === 'end') {
             // Игра завершена, записываем результат
             const { result, winAmount } = gameState; // result: 'win', 'lose', 'tie', 'bust'
             
             // В Blackjack ставка НЕ списывается при размещении, только при записи в БД
             // winAmount - это общая выплата (ставка + выигрыш при победе, или 0 при проигрыше, или ставка при ничьей)
             // Если выиграли: moneyChange = winAmount - betAmount (только выигрыш, ставка уже на балансе)
             // Если проиграли: moneyChange = -betAmount (списываем ставку)
             // Если ничья: moneyChange = 0 (ничего не меняется, так как ставка не была списана)
             let moneyChange = 0;
             if (result === 'win' || result === 'dealer_bust' || result === 'player_win') {
                 // winAmount = betAmount * 2 (ставка + выигрыш)
                 // Но ставка уже на балансе, поэтому добавляем только выигрыш
                 moneyChange = Number(winAmount) - Number(betAmount); // Только выигрыш
             } else if (result === 'lose' || result === 'bust' || result === 'dealer_win') {
                 moneyChange = -Number(betAmount); // Проигрыш, списываем ставку
             } else if (result === 'tie') {
                 // При ничьей ставка не была списана, поэтому ничего не меняется
                 moneyChange = 0; // Ничья, баланс не меняется
             }
             
             console.log('Blackjack backend: result:', result, 'betAmount:', betAmount, 'winAmount:', winAmount, 'moneyChange:', moneyChange, 'profileId:', currentProfileId);
             
             // Записываем раунд в БД
             await db.rounds.recordRound({
                 profileId: currentProfileId,
                 gameId: gameId,
                 moneyWinLoseAmount: moneyChange
             });
             
             // Получаем обновленный баланс
             const updatedPlayer = await db.players.getPlayer(currentProfileId);
             
             return {
                 success: true,
                 result: result,
                 winAmount: winAmount || 0,
                 balanceChange: moneyChange,
                 newBalance: updatedPlayer.current_balance
             };
         } else {
             // Для других действий (deal, hit, stand) просто возвращаем success
             return { success: true };
         }
     } catch (err) {
         console.error("Blackjack Handler failed:", err);
         return {
             success: false,
             error: err.message
         };
     }
 });

 // 2c. Roulette Handler - с интеграцией БД
 ipcMain.handle('game:roulette', async (event, { action, betAmount, gameState, profileId }) => {
     console.log('Main Process: Roulette action', action, 'bet:', betAmount);
     
     try {
         // Для упрощения используем profileId из параметров (в будущем из сессии)
         const currentProfileId = profileId || 1;
         const gameId = 3; // Roulette game_id из БД
         
         // Проверяем существование игры
         let game = await db.games.getGame(gameId);
         if (!game) {
             await db.games.createGame({
                 categoryId: 3, // Roulette category
                 name: "European Roulette",
                 minBet: 1,
                 maxBet: 100,
                 config: "{}"
             });
         }
         
         // Обрабатываем разные действия
         if (action === 'end') {
             // Игра завершена, записываем результат
             const { totalBet, winAmount, winningNumber } = gameState;
             
             // Валидация входных данных
             if (!totalBet || totalBet <= 0 || isNaN(totalBet)) {
                 console.error('Roulette: Invalid totalBet:', totalBet);
                 return { success: false, error: 'Invalid bet amount' };
             }
             
             if (winAmount === undefined || winAmount === null || isNaN(winAmount)) {
                 console.error('Roulette: Invalid winAmount:', winAmount);
                 return { success: false, error: 'Invalid win amount' };
             }
             
            // winAmount - это чистая прибыль (payout, без возврата ставки)
            // totalBet - это общая сумма ставок
            // В рулетке ставка НЕ списывается при размещении, только при записи в БД
            // Если выиграли: moneyChange = winAmount (только прибыль, ставка уже есть на балансе)
            // Если проиграли: moneyChange = -totalBet (списываем ставку)
            // 
            // Пример: ставка 100, выигрыш 1:1
            // winAmount = 100 * 1 = 100 (чистая прибыль)
            // moneyChange = 100 (добавляем только прибыль, ставка не списывалась)
            // 
            // Пример: ставка 10, выигрыш 35:1
            // winAmount = 10 * 35 = 350 (чистая прибыль)
            // moneyChange = 350 (добавляем только прибыль, ставка не списывалась)
            const moneyChange = Number(winAmount) > 0 
                ? Number(winAmount)  // Выигрыш: только прибыль (ставка уже на балансе)
                : -Number(totalBet);  // Проигрыш: списываем ставку
             
             console.log('Roulette backend: totalBet:', totalBet, 'winAmount:', winAmount, 'moneyChange:', moneyChange, 'profileId:', currentProfileId);
             
             // Записываем раунд в БД
             const roundResult = await db.rounds.recordRound({
                 profileId: currentProfileId,
                 gameId: gameId,
                 moneyWinLoseAmount: moneyChange
             });
             
             // Получаем обновленный баланс
             const updatedPlayer = await db.players.getPlayer(currentProfileId);
             
             console.log('Roulette: Round recorded, roundId:', roundResult.roundId, 'new balance:', updatedPlayer.current_balance);
             
             return {
                 success: true,
                 winningNumber: winningNumber,
                 totalBet: totalBet,
                 winAmount: winAmount || 0,
                 balanceChange: moneyChange,
                 newBalance: updatedPlayer.current_balance
             };
         } else {
             // Для других действий просто возвращаем success
             return { success: true };
         }
     } catch (err) {
         console.error("Roulette Handler failed:", err);
         return {
             success: false,
             error: err.message
         };
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


// 4. Get User With Permissions Handler
ipcMain.handle('api:getUserWithPermissions', async (event, profileId) => {
    try {
        const user = await db.players.getPlayerWithPermissions(profileId);
        return user;
    } catch (err) {
        console.error("Get user permissions failed:", err);
        return null;
    }
});

// 5. Stripe Payment Handlers
ipcMain.handle('api:createPaymentIntent', async (event, { amount, profileId }) => {
    console.log('Main Process: Creating payment intent', amount, 'for profile', profileId);
    try {
        if (!amount || amount < 1) {
            return { error: 'Amount must be at least $1' };
        }
        if (!profileId) {
            return { error: 'Profile ID is required' };
        }

        // Создаем Payment Intent через Stripe
        const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent({
            amount,
            profileId
        });

        // Сохраняем платеж в БД со статусом 'pending'
        // amount уже в долларах, конвертируем в центы для БД
        const amountInCents = Math.round(amount * 100);
        await db.payments.createPayment({
            profileId,
            stripePaymentIntentId: paymentIntentId,
            amount: amountInCents, // Сохраняем в центах для консистентности
            status: 'pending'
        });

        return {
            success: true,
            clientSecret,
            paymentIntentId
        };
    } catch (err) {
        console.error("Create payment intent failed:", err);
        return { error: err.message };
    }
});

ipcMain.handle('api:confirmPayment', async (event, { paymentIntentId, profileId }) => {
    console.log('Main Process: Confirming payment', paymentIntentId);
    try {
        if (!paymentIntentId) {
            return { error: 'Payment Intent ID is required' };
        }

        // Подтверждаем платеж через Stripe
        const paymentResult = await stripeService.confirmPayment({ paymentIntentId });

        if (!paymentResult.success) {
            // Обновляем статус в БД на failed
            const payment = await db.payments.getPaymentByStripeId(paymentIntentId);
            if (payment) {
                await db.payments.updatePaymentStatus({
                    paymentId: payment.payment_id,
                    status: 'failed'
                });
            }
            return paymentResult;
        }

        // Платеж успешен, обновляем статус в БД
        const payment = await db.payments.getPaymentByStripeId(paymentIntentId);
        if (!payment) {
            return { error: 'Payment not found in database' };
        }

        await db.payments.updatePaymentStatus({
            paymentId: payment.payment_id,
            status: 'succeeded'
        });

        // Пополняем баланс пользователя
        const currentPlayer = await db.players.getPlayer(paymentResult.profileId);
        const newBalance = currentPlayer.current_balance + paymentResult.amount;
        await db.players.updateBalance({
            profileId: paymentResult.profileId,
            newBalance: newBalance
        });

        // Получаем обновленного пользователя
        const updatedPlayer = await db.players.getPlayer(paymentResult.profileId);

        return {
            success: true,
            status: 'succeeded',
            amount: paymentResult.amount,
            newBalance: updatedPlayer.current_balance
        };
    } catch (err) {
        console.error("Confirm payment failed:", err);
        return { error: err.message };
    }
});

// API для статистики пользователя (без проверки админ прав)
ipcMain.handle('api:getUserStatistics', async (event, { profileId, startDate, endDate }) => {
    console.log('Main Process: Getting user statistics for profile', profileId);
    try {
        if (!profileId) {
            return { error: 'Profile ID is required' };
        }
        if (!startDate || !endDate) {
            return { error: 'Start date and end date are required' };
        }
        
        // Получаем статистику пользователя
        const statistics = await db.statistics.getUserStatistics({
            profileId,
            startDate,
            endDate
        });
        
        // Получаем статистику по играм
        const gameStatistics = await db.statistics.getUserGameStatistics({
            profileId,
            startDate,
            endDate
        });
        
        return {
            success: true,
            statistics: statistics,
            gameStatistics: gameStatistics
        };
    } catch (err) {
        console.error("Get user statistics failed:", err);
        return { error: err.message };
    }
});

// API для истории изменений баланса
ipcMain.handle('api:getBalanceHistory', async (event, { profileId, limit = 50, offset = 0 }) => {
    console.log('Main Process: Getting balance history for profile', profileId);
    try {
        if (!profileId) {
            return { error: 'Profile ID is required' };
        }
        
        // Получаем историю игр (изменения баланса через игры)
        const gameHistory = await db.rounds.getHistory(profileId, { limit, offset });
        
        // Получаем историю платежей (пополнения через Stripe)
        const paymentHistory = await db.payments.getPaymentsByProfile({
            profileId,
            limit,
            offset
        });
        
        // Объединяем и сортируем по дате
        const combinedHistory = [
            ...gameHistory.map(item => ({
                type: 'game',
                id: item.round_id,
                timestamp: item.timestamp,
                amount: item.money_win_lose_ammount,
                game_name: item.game_name,
                category_name: item.category_name,
                description: `${item.game_name} - ${item.money_win_lose_ammount > 0 ? 'Win' : 'Loss'}`
            })),
            ...paymentHistory.map(item => ({
                type: 'payment',
                id: item.payment_id,
                timestamp: item.created_at,
                amount: item.amount / 100, // Конвертируем из центов в доллары
                status: item.status,
                description: `Deposit via Stripe - ${item.status}`
            }))
        ].sort((a, b) => {
            // Сортируем по timestamp (новые сначала)
            return new Date(b.timestamp) - new Date(a.timestamp);
        }).slice(0, limit); // Ограничиваем общее количество
        
        return {
            success: true,
            history: combinedHistory,
            total: combinedHistory.length
        };
    } catch (err) {
        console.error("Get balance history failed:", err);
        return { error: err.message };
    }
});

ipcMain.handle('api:getPaymentHistory', async (event, profileId) => {
    console.log('Main Process: Getting payment history for profile', profileId);
    try {
        if (!profileId) {
            return { error: 'Profile ID is required' };
        }

        const payments = await db.payments.getPaymentsByProfile({
            profileId,
            limit: 50,
            offset: 0
        });

        // Конвертируем amount из центов в доллары для отображения
        const formattedPayments = payments.map(payment => ({
            ...payment,
            amount: payment.amount / 100
        }));

        return {
            success: true,
            payments: formattedPayments
        };
    } catch (err) {
        console.error("Get payment history failed:", err);
        return { error: err.message };
    }
});
