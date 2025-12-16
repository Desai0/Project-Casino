import { api } from '../api/api.js';

export function initGames() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const gameType = card.getAttribute('data-game');
            launchGame(gameType);
        });
    });

    document.getElementById('close-game').addEventListener('click', () => {
        document.getElementById('game-container').classList.add('hidden');
    });
}

function launchGame(type) {
    const container = document.getElementById('game-container');
    const area = document.getElementById('game-render-area');
    container.classList.remove('hidden');
    
    area.innerHTML = `<h3>Загрузка ${type}...</h3>`;

    if (type === 'slots') {
        renderSlots(area);
    } else {
        area.innerHTML = '<p>В разработке...</p>';
    }
}

function renderSlots(container) {
    container.innerHTML = `
        <div class="slots-machine">
            <div class="reels">[ 7 ] [ 7 ] [ 7 ]</div>
            <button id="spin-btn">SPIN (10$)</button>
            <div id="slot-result"></div>
        </div>
    `;

    document.getElementById('spin-btn').addEventListener('click', async () => {
        const result = await api.spinSlots(10);
        document.querySelector('.reels').textContent = `[ ${result.result[0]} ] [ ${result.result[1]} ] [ ${result.result[2]} ]`;
        
        if (result.win > 0) {
            document.getElementById('slot-result').textContent = `WIN: ${result.win}$!`;
        } else {
            document.getElementById('slot-result').textContent = "Try again";
        }
    });
}

