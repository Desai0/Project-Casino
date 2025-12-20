import { initAuth } from './js/ui/auth.js';
import { initGames } from './js/ui/games.js';

console.log('Renderer process started');

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initGames();
});

