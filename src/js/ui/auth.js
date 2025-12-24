import { api } from '../api/api.js';
import { showDashboard } from './dashboard.js';

export function initAuth() {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    // Create Toggle Link
    const toggleLink = document.createElement('p');
    toggleLink.style.cssText = "margin-top: 15px; font-size: 0.9rem; color: #b0bec5; cursor: pointer; text-decoration: underline;";
    toggleLink.innerText = "Don't have an account? Register";
    loginForm.appendChild(toggleLink);

    let isRegisterMode = false;

    toggleLink.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        const nicknameInput = document.getElementById('nickname');
        
        if (isRegisterMode) {
            submitBtn.innerText = "REGISTER";
            toggleLink.innerText = "Already have an account? Login";
            errorMsg.innerText = "";
            
            // Add nickname field if not exists
            if (!nicknameInput) {
                const usernameInput = document.getElementById('username');
                const nicknameField = document.createElement('input');
                nicknameField.type = 'text';
                nicknameField.id = 'nickname';
                nicknameField.placeholder = 'Nickname';
                nicknameField.required = true;
                nicknameField.style.cssText = usernameInput.style.cssText;
                usernameInput.parentNode.insertBefore(nicknameField, usernameInput.nextSibling);
            }
        } else {
            submitBtn.innerText = "ENTER CASINO";
            toggleLink.innerText = "Don't have an account? Register";
            errorMsg.innerText = "";
            
            // Remove nickname field
            if (nicknameInput) {
                nicknameInput.remove();
            }
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const nicknameInput = document.getElementById('nickname');
        const nickname = nicknameInput ? nicknameInput.value : null;
        
        errorMsg.innerText = "Processing...";

        try {
            let result;
            if (isRegisterMode) {
                if (!nickname || nickname.trim() === '') {
                    errorMsg.textContent = "Nickname is required";
                    return;
                }
                result = await api.register(username, password, nickname);
            } else {
                result = await api.login(username, password);
            }

            if (result.token) {
                // Success
                document.getElementById('login-screen').classList.add('hidden');
                showDashboard(result.user);
            } else {
                errorMsg.textContent = result.error || "Authentication failed";
            }
        } catch (err) {
            console.error(err);
            errorMsg.textContent = "System error";
        }
    });
}
