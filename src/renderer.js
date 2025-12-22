import { initAuth } from './js/ui/auth.js';
import { initGames } from './js/ui/games.js';
import { initPaymentUI } from './js/ui/payments.js';
import { initStreamerMode } from './js/ui/streamer.js';

console.log('Renderer process started');

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initGames();
    initPaymentUI();
    initStreamerMode();
});

