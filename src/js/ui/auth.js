import { api } from '../api/api.js';
import { showDashboard } from './dashboard.js';

export function initAuth() {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const result = await api.login(username, password);
            if (result.token) {
                // Success
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('login-screen').classList.add('hidden');
                
                showDashboard(result.user);
            } else {
                errorMsg.textContent = "Login failed";
            }
        } catch (err) {
            console.error(err);
            errorMsg.textContent = "System error";
        }
    });
}

