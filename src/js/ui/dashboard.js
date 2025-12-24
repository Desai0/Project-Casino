import { api } from '../api/api.js';
import { initAdminPanel } from './admin.js';
import { showStreamerButton } from './streamer.js';
import { initPaymentUI } from './payments.js';
import { showAssistant } from './assistant.js';

let balanceChart = null; // Chart instance

export function showDashboard(user) {
    // Hide Login
    document.getElementById('login-screen').classList.add('hidden');
    
    // Show Header and Main Wrapper
    document.getElementById('app-header').classList.remove('hidden');
    document.getElementById('main-wrapper').classList.remove('hidden');

    // Update Header Info
    updateAvatarDisplay('header-avatar', user.avatar, user.name);
    document.getElementById('header-balance').textContent = formatMoney(user.balance);

    // Update Profile Info
    document.getElementById('profile-username').textContent = `[${user.name}]`;
    document.getElementById('profile-balance').textContent = formatMoney(user.balance);
    updateAvatarDisplay('profile-avatar', user.avatar, user.name);

    // Store user data globally
    window.currentUserId = user.id;
    window.currentUser = user;

    // Initialize profile editing
    initProfileEditing();
    
    // Initialize payment UI (adds Deposit button)
    initPaymentUI();

    // Загружаем права пользователя и инициализируем админ панель
    loadUserPermissions(user.id);

    loadHistory(user.id);
    
    // Show virtual assistant
    showAssistant();
}

async function loadUserPermissions(userId) {
    try {
        const userWithPermissions = await api.getUserWithPermissions(userId);
        console.log('User permissions loaded:', userWithPermissions);
        
        // Сохраняем права в глобальном объекте
        if (window.currentUser) {
            window.currentUser.permissions = {
                can_edit_balance: userWithPermissions.can_edit_balance === 1,
                can_view_debug_info: userWithPermissions.can_view_debug_info === 1,
                streamer_mode_access: userWithPermissions.streamer_mode_access === 1,
                can_reset_history: userWithPermissions.can_reset_history === 1
            };
        }
        
        // Инициализируем админ панель если есть права
        initAdminPanel();
        
        // Показываем/скрываем UI элементы в зависимости от прав
        updateUIBasedOnPermissions();
        
    } catch (error) {
        console.error('Failed to load user permissions:', error);
        // Если не удалось загрузить права, считаем что это обычный пользователь
        if (window.currentUser) {
            window.currentUser.permissions = {
                can_edit_balance: false,
                can_view_debug_info: false,
                streamer_mode_access: false,
                can_reset_history: false
            };
        }
    }
}

function updateUIBasedOnPermissions() {
    const permissions = window.currentUser?.permissions || {};
    
    // Показываем/скрываем кнопку Streamer Mode
    if (typeof showStreamerButton === 'function') {
        showStreamerButton();
    }
    
    // Показываем/скрываем вкладку Admin
    const adminTab = document.querySelector('[data-target="admin-screen"]');
    if (adminTab) {
        if (permissions.can_edit_balance) {
            adminTab.style.display = 'block';
        } else {
            adminTab.style.display = 'none';
        }
    }
    
    // Здесь можно добавить другие проверки прав для UI элементов
    // Например, кнопка Streamer Mode, Deposit и т.д.
}

function updateAvatarDisplay(elementId, avatarPath, fallbackName) {
    if (elementId === 'header-avatar') {
        // Header avatar (simple text/icon)
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar) {
            if (avatarPath && avatarPath.trim() !== '') {
                // Create a new image to test if it loads
                const img = new Image();
                img.onload = () => {
                    headerAvatar.style.backgroundImage = `url(${avatarPath})`;
                    headerAvatar.style.backgroundSize = 'cover';
                    headerAvatar.style.backgroundPosition = 'center';
                    headerAvatar.style.backgroundRepeat = 'no-repeat';
                    headerAvatar.textContent = '';
                };
                img.onerror = () => {
                    // If image fails to load, show fallback
                    headerAvatar.style.backgroundImage = '';
                    headerAvatar.textContent = (fallbackName || 'U').charAt(0).toUpperCase();
                };
                img.src = avatarPath;
            } else {
                headerAvatar.style.backgroundImage = '';
                headerAvatar.textContent = (fallbackName || 'U').charAt(0).toUpperCase();
            }
        }
    } else if (elementId === 'profile-avatar') {
        // Profile avatar (with image)
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
        
        if (avatarPath && avatarPath.trim() !== '') {
            if (avatarImg) {
                // Create a new image to test if it loads and adjust object-position
                const img = new Image();
                img.onload = () => {
                    avatarImg.src = avatarPath;
                    avatarImg.classList.remove('hidden');
                    
                    // Для не квадратных изображений - обрезаем по бокам, сохраняя центр по вертикали
                    // Если изображение вертикальное (выше, чем шире), обрезаем сверху и снизу
                    // Если горизонтальное (шире, чем выше), обрезаем слева и справа
                    const aspectRatio = img.width / img.height;
                    if (aspectRatio > 1) {
                        // Горизонтальное - обрезаем по бокам (центрируем по горизонтали)
                        avatarImg.style.objectPosition = 'center center';
                    } else {
                        // Вертикальное - обрезаем сверху и снизу (центрируем по вертикали)
                        avatarImg.style.objectPosition = 'center center';
                    }
                    
                    if (avatarPlaceholder) {
                        avatarPlaceholder.classList.add('hidden');
                    }
                };
                img.onerror = () => {
                    // If image fails to load, show placeholder
                    if (avatarImg) {
                        avatarImg.classList.add('hidden');
                    }
                    if (avatarPlaceholder) {
                        avatarPlaceholder.textContent = (fallbackName || 'U').charAt(0).toUpperCase();
                        avatarPlaceholder.classList.remove('hidden');
                    }
                };
                img.src = avatarPath;
            }
        } else {
            if (avatarImg) {
                avatarImg.classList.add('hidden');
            }
            if (avatarPlaceholder) {
                avatarPlaceholder.textContent = (fallbackName || 'U').charAt(0).toUpperCase();
                avatarPlaceholder.classList.remove('hidden');
            }
        }
    }
}

function initProfileEditing() {
    const editBtn = document.getElementById('edit-nickname-btn');
    const nicknameInput = document.getElementById('nickname-edit-input');
    const usernameDisplay = document.getElementById('profile-username');
    const avatarUpload = document.getElementById('avatar-upload');

    // Edit nickname
    if (editBtn && nicknameInput && usernameDisplay) {
        editBtn.addEventListener('click', () => {
            usernameDisplay.classList.add('hidden');
            editBtn.classList.add('hidden');
            nicknameInput.classList.remove('hidden');
            nicknameInput.value = usernameDisplay.textContent.replace(/[\[\]]/g, '');
            nicknameInput.focus();
        });

        nicknameInput.addEventListener('blur', async () => {
            const newNickname = nicknameInput.value.trim();
            if (newNickname && newNickname !== usernameDisplay.textContent.replace(/[\[\]]/g, '')) {
                try {
                    const result = await api.updateNickname(window.currentUserId, newNickname);
                    if (result.success) {
                        usernameDisplay.textContent = `[${newNickname}]`;
                        window.currentUser.name = newNickname;
                        // Update header avatar if needed
                        updateAvatarDisplay('header-avatar', window.currentUser.avatar, newNickname);
                    } else {
                        alert(result.error || 'Failed to update nickname');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error updating nickname');
                }
            }
            nicknameInput.classList.add('hidden');
            usernameDisplay.classList.remove('hidden');
            editBtn.classList.remove('hidden');
        });

        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                nicknameInput.blur();
            }
        });
    }

    // Upload avatar
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }

            try {
                // Read file as data URL
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target.result;
                    
                    // Save to database (as data URL for simplicity, or save to file system)
                    const result = await api.updateAvatar(window.currentUserId, dataUrl);
                    if (result.success) {
                        window.currentUser.avatar = dataUrl;
                        updateAvatarDisplay('profile-avatar', dataUrl, window.currentUser.name);
                        updateAvatarDisplay('header-avatar', dataUrl, window.currentUser.name);
                    } else {
                        alert(result.error || 'Failed to update avatar');
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.error(err);
                alert('Error uploading avatar');
            }
        });
    }
}

// Экспортируем функцию для обновления истории извне (после игры)
export function refreshHistory() {
    if (window.currentUserId) {
        loadHistory(window.currentUserId);
    }
}

function formatMoney(amount) {
    // Adds spaces (e.g. 2 007)
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function loadHistory(userId) {
    const listContainer = document.getElementById('history-list');
    
    // Check if elements exist before interacting
    if (listContainer) {
        listContainer.innerHTML = '<div style="text-align:center; color:#666;">Loading...</div>';
    }
    
    try {
        const rows = await api.getHistory(userId);
        
        if (listContainer) listContainer.innerHTML = '';
        
        if (!rows || rows.length === 0) {
            if (listContainer) listContainer.innerHTML = '<div style="text-align:center; color:#666;">No history found</div>';
            renderBalanceChart([]); // Render empty chart
            return;
        }

        // Rows come from SQL in DESC order (newest first)
        // We need to reverse them to calculate balance chronologically (oldest -> newest)
        const reversedRows = [...rows].reverse();
        
        // Calculate starting balance: current balance minus all transactions
        const balanceElement = document.getElementById('header-balance');
        const balanceText = balanceElement ? balanceElement.textContent.replace(/\s/g, '') : '0';
        const currentBalance = parseInt(balanceText) || 0;
        
        if (isNaN(currentBalance) || currentBalance === 0) {
            console.warn('Current balance is invalid, using 0');
        }
        
        const totalChange = rows.reduce((sum, row) => sum + (parseInt(row.money_win_lose_ammount) || 0), 0);
        let runningBalance = currentBalance - totalChange; // Starting balance before all transactions
        
        const chartData = [];
        
        // Add starting point
        chartData.push({
            x: 'Start',
            y: runningBalance,
            label: 'Start'
        });
        
        // Process rows in chronological order (oldest -> newest)
        reversedRows.forEach((row, index) => {
            const isWin = row.money_win_lose_ammount >= 0;
            const amountClass = isWin ? 'win-text' : 'loss-text';
            const sign = row.money_win_lose_ammount > 0 ? '+' : '';
            const icon = getGameIcon(row.game_name);
            
            // Parse timestamp: "2025.12.18:01:36:00" -> Date object
            const parsedDate = parseCustomTimestamp(row.timestamp);
            const timeLabel = formatTimeLabel(parsedDate, row.timestamp);

            // --- Render Main History Card (keep newest first for display) ---
            // But we'll render in original order (newest first) for the list
            if (listContainer && index === 0) {
                // Clear and render all cards in correct order (newest first)
                listContainer.innerHTML = '';
                rows.forEach((displayRow) => {
                    const displayIsWin = displayRow.money_win_lose_ammount >= 0;
                    const displayAmountClass = displayIsWin ? 'win-text' : 'loss-text';
                    const displaySign = displayRow.money_win_lose_ammount > 0 ? '+' : '';
                    const displayIcon = getGameIcon(displayRow.game_name);
                    
                    const card = document.createElement('div');
                    card.className = 'history-card';
                    card.innerHTML = `
                        <div class="history-icon">${displayIcon}</div>
                        <div class="history-info">
                            <div class="history-game-name">${displayRow.game_name || 'Game'}</div>
                            <div class="history-date">Date: ${displayRow.timestamp}</div>
                        </div>
                        <div class="history-amount ${displayAmountClass}">
                            ${displaySign} ${displayRow.money_win_lose_ammount} $
                        </div>
                    `;
                    listContainer.appendChild(card);
                });
            }

            // --- Prepare Chart Data (chronological order) ---
            // Add transaction amount to running balance
            runningBalance += row.money_win_lose_ammount;
            
            chartData.push({
                x: parsedDate,
                y: runningBalance,
                label: timeLabel
            });
        });
        
        renderBalanceChart(chartData);

    } catch (err) {
        console.error(err);
        if (listContainer) listContainer.innerHTML = '<div style="text-align:center; color:red;">Error loading history</div>';
    }
}

function parseCustomTimestamp(timestampStr) {
    // Format: "2025.12.18:01:36:21" or "2025.12.18:01:36"
    try {
        // Split by first colon to separate date and time
        const firstColonIndex = timestampStr.indexOf(':');
        if (firstColonIndex === -1) {
            throw new Error('Invalid timestamp format');
        }
        
        const datePart = timestampStr.substring(0, firstColonIndex);
        const timePart = timestampStr.substring(firstColonIndex + 1);
        
        const [year, month, day] = datePart.split('.');
        const timeParts = timePart.split(':');
        const hours = timeParts[0] || '00';
        const minutes = timeParts[1] || '00';
        const seconds = timeParts[2] || '00';
        
        return new Date(
            parseInt(year),
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
        );
    } catch (e) {
        console.warn('Failed to parse timestamp:', timestampStr, e);
        return new Date(); // Fallback to now
    }
}

function formatTimeLabel(dateObj, originalTimestamp) {
    if (dateObj === 'Start') return 'Start';
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        // Fallback: extract time from original string
        const match = originalTimestamp.match(/:(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : originalTimestamp;
    }
    // Format as HH:MM
    return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
}

function renderBalanceChart(dataPoints) {
    const ctx = document.getElementById('balanceChart');
    if (!ctx) {
        console.warn('Chart canvas not found');
        return;
    }

    if (balanceChart) {
        balanceChart.destroy();
    }

    if (!dataPoints || dataPoints.length === 0) {
        console.warn('No data points for chart');
        return;
    }

    const labels = dataPoints.map(d => {
        if(d.x === 'Start') return 'Start';
        return d.label || formatTimeLabel(d.x, '');
    });
    const data = dataPoints.map(d => {
        const value = typeof d.y === 'number' ? d.y : parseFloat(d.y) || 0;
        if (isNaN(value)) {
            console.warn('Invalid chart data point:', d);
            return 0;
        }
        return value;
    });

    // Green line color
    const lineColor = '#4caf50'; 

    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Balance',
                data: data,
                borderColor: lineColor,
                backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green fill
                borderWidth: 2,
                tension: 0.4, // Smooth curve
                pointRadius: 3,
                pointBackgroundColor: lineColor,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#2b2727',
                    titleColor: '#ccc',
                    bodyColor: '#fff',
                    borderColor: '#3d3838',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#999', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: '#333' },
                    ticks: { color: '#999' }
                }
            }
        }
    });
}

function getGameIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('slot')) return '🍒';
    if (n.includes('black') || n.includes('21')) return '♠️';
    if (n.includes('roulette')) return '🔴';
    return '🎲';
}
