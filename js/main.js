import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { initLivingWorld } from './environment.js';
import { 
    getDatabase, 
    ref, 
    set, 
    onValue, 
    update, 
    remove, 
    onDisconnect,
    get,
    serverTimestamp,
    push,
    query,
    orderByChild,
    limitToLast,
    child
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCbs6Tazgr5r3S6AnwJVk1WVYulBSzV32U",
    authDomain: "balloon-app-7cd05.firebaseapp.com",
    databaseURL: "https://balloon-app-7cd05-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "balloon-app-7cd05",
    storageBucket: "balloon-app-7cd05.firebasestorage.app",
    messagingSenderId: "938956090462",
    appId: "1:938956090462:web:9d150454218cd5ea8198cf"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Expose Firebase to window for compatibility with existing logic
window.firebaseDB = database;
window.firebaseRefs = { 
    ref, set, onValue, update, remove, onDisconnect, 
    get, serverTimestamp, push, query, orderByChild, limitToLast, child
};
window.isFirebaseReady = true;
console.log("🔥 Firebase ініціалізовано!");

// ==================== ІГРОВІ ЗМІННІ ====================
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    lives: 3,
    level: 1,
    balloons: [],
    spawnInterval: 3500,
    baseSpeed: 0.6,
    heartsCollected: 0,
    sunClicks: 0,
    cheatUsed: false,
    typingBuffer: '',
    isTyping: false,
    isMultiplayer: false,
    roomId: null,
    playerId: null,
    opponentName: '',
    opponentScore: 0,
    opponentLives: 3,
    opponentFinished: false,
    isHost: false,
    gameStarted: false,
    gameEnded: false,
    maxBalloons: 3,
    hintActive: false,
    hintAnswer: null,
    waitingForRematch: false,
    lastSavedScore: 0,  // Для відстеження змін
    currentLeaderboardId: null,  // ID поточного запису в таблиці лідерів
    birds: [] // Для керування живими пташками
};

let intervals = { spawn: null, move: null, physics: null, autosave: null };
let playerName = localStorage.getItem('mathBalloonPlayer') || 'Гравець';

// Firebase
let db = null;
let roomRef = null;
let unsubscribeRoom = null;
let isFirebaseConnected = false;

// Таблиця лідерів
let allScores = [];
let currentTab = 'all';

// ==================== ІНІЦІАЛІЗАЦІЯ ====================
window.onload = () => {
    // Перевіряємо Firebase
    setTimeout(() => {
        if (window.isFirebaseReady && window.firebaseDB) {
            db = window.firebaseDB;
            isFirebaseConnected = true;
            updateConnectionStatus('online');
            loadGlobalLeaderboard();
            console.log("✅ Firebase підключено!");
        } else {
            updateConnectionStatus('offline');
            console.log("❌ Firebase не доступний");
        }
    }, 1000);

    // Перевіряємо ім'я
    if (!localStorage.getItem('mathBalloonPlayer')) {
        document.getElementById('name-modal').style.display = 'flex';
    } else {
        playerName = localStorage.getItem('mathBalloonPlayer');
    }
    
    setupKeyboardControls();
    
    // Додаємо обробник для закриття таблиці на телефоні
    document.addEventListener('click', (e) => {
        const leaderboard = document.getElementById('leaderboard-section');
        const toggle = document.getElementById('leaderboard-toggle');
        if (window.innerWidth <= 768 &&
            leaderboard.classList.contains('show') &&
            !leaderboard.contains(e.target) &&
            !toggle.contains(e.target)) {
            leaderboard.classList.remove('show');
        }
    });

    // Ініціалізуємо живий світ
    initLivingWorld(gameState);
};

function updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    if (status === 'online') { 
        el.className = 'connection-status connection-online'; 
        el.textContent = '🟢 Онлайн'; 
    } else { 
        el.className = 'connection-status connection-offline'; 
        el.textContent = '🔴 Офлайн'; 
    }
}

// ==================== ТАБЛИЦЯ ЛІДЕРІВ ====================
async function loadGlobalLeaderboard() {
    if (!db) return;
    try {
        const { ref, onValue, query, orderByChild, limitToLast } = window.firebaseRefs;
        const leaderboardRef = ref(db, 'leaderboard');
        
        onValue(query(leaderboardRef, orderByChild('score'), limitToLast(100)), (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                allScores = [];
                renderLeaderboard('all');
                return;
            }
            
            allScores = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
            renderLeaderboard(currentTab);
            
            // Оновлюємо кількість унікальних гравців
            const uniquePlayers = new Set(allScores.map(s => s.name)).size;
            document.getElementById('players-count').textContent = uniquePlayers;
        });
    } catch (e) { console.error(e); }
}

function renderLeaderboard(mode) {
    const list = document.getElementById('leaderboard-list');
    
    // Фільтруємо за режимом
    let filtered = allScores;
    if (mode === 'single') {
        filtered = allScores.filter(s => s.mode === 'single');
    } else if (mode === 'multi') {
        filtered = allScores.filter(s => s.mode === 'multiplayer-win' || s.mode === 'multiplayer');
    }
    
    // Сортуємо за спаданням очок
    filtered.sort((a, b) => b.score - a.score);
    
    // Групуємо за гравцем (тільки найкращий результат)
    const bestByPlayer = {};
    filtered.forEach(s => {
        const key = s.name;
        if (!bestByPlayer[key] || bestByPlayer[key].score < s.score) {
            bestByPlayer[key] = s;
        }
    });
    
    let uniqueScores = Object.values(bestByPlayer).sort((a, b) => b.score - a.score).slice(0, 20);
    
    if (uniqueScores.length === 0) {
        list.innerHTML = '<li style="text-align:center; padding:20px; color:#718096;">😢 Поки що немає результатів</li>';
        return;
    }

    list.innerHTML = uniqueScores.map((s, idx) => {
        const rank = idx + 1;
        
        // Медаль або номер
        let rankHtml = '';
        if (rank === 1) rankHtml = '<span class="rank-medal rank-1">🥇</span>';
        else if (rank === 2) rankHtml = '<span class="rank-medal rank-2">🥈</span>';
        else if (rank === 3) rankHtml = '<span class="rank-medal rank-3">🥉</span>';
        else rankHtml = `<span class="rank-number">#${rank}</span>`;

        // Режим
        let modeText = '';
        if (s.mode === 'single') modeText = '🧑 Один';
        else if (s.mode === 'multiplayer-win') modeText = '👑 Перемога';
        else modeText = '👥 На двох';

        // Статус (живий запис чи фінальний)
        let statusText = '';
        if (s.isLive) statusText = ' 🔴';

        return `
            <li class="leaderboard-item">
                ${rankHtml}
                <div class="player-info">
                    <span class="player-name">${s.name}${statusText}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="player-score">${s.score}</span>
                        <span class="player-mode">${modeText}</span>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

function switchLeaderboardTab(tab) {
    currentTab = tab;
    
    // Оновлюємо активний таб
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    renderLeaderboard(tab);
}

function toggleLeaderboardMobile() {
    document.getElementById('leaderboard-section').classList.toggle('show');
}

// ==================== АВТОМАТИЧНЕ ЗБЕРЕЖЕННЯ В ТАБЛИЦЮ ЛІДЕРІВ ====================

// Показати індикатор збереження
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Створити або оновити запис в таблиці лідерів
async function saveToLeaderboardRealtime() {
    if (!db || !gameState.isRunning || gameState.score === 0) return;
    
    // Зберігаємо тільки якщо рахунок змінився або ще не створювали запис
    if (gameState.score === gameState.lastSavedScore && gameState.currentLeaderboardId) return;
    
    try {
        const { ref, set, update, push, serverTimestamp } = window.firebaseRefs;
        
        const mode = gameState.isMultiplayer ? 'multiplayer' : 'single';
        const data = {
            name: playerName,
            score: gameState.score,
            mode: mode,
            level: gameState.level,
            lives: gameState.lives,
            isLive: true,  // Позначаємо що гра ще триває
            timestamp: serverTimestamp()
        };
        
        if (!gameState.currentLeaderboardId) {
            // Створюємо новий запис
            const leaderboardRef = ref(db, 'leaderboard');
            const newRef = push(leaderboardRef);
            gameState.currentLeaderboardId = newRef.key;
            await set(newRef, data);
        } else {
            // Оновлюємо існуючий запис
            const currentRef = ref(db, 'leaderboard/' + gameState.currentLeaderboardId);
            await update(currentRef, data);
        }
        
        gameState.lastSavedScore = gameState.score;
        
        // Показуємо індикатор тільки при значних змінах (кожні 20 очок)
        if (gameState.score % 20 === 0) {
            showSaveIndicator();
        }
        
    } catch (error) {
        console.error("Error saving to leaderboard:", error);
    }
}

// Фінальне збереження (коли гра закінчена) - позначаємо як не "live"
async function finalizeLeaderboardEntry() {
    if (!db || !gameState.currentLeaderboardId) return;
    
    try {
        const { update, ref } = window.firebaseRefs;
        const currentRef = ref(db, 'leaderboard/' + gameState.currentLeaderboardId);
        
        const mode = gameState.isMultiplayer ? 
            (gameState.lives > 0 ? 'multiplayer-win' : 'multiplayer') : 
            'single';
        
        await update(currentRef, {
            isLive: false,  // Гра закінчена
            mode: mode,
            finalScore: gameState.score,
            endTime: window.firebaseRefs.serverTimestamp()
        });
        
        showSaveIndicator();
        
    } catch (error) {
        console.error("Error finalizing leaderboard entry:", error);
    }
}

// Очистити поточний запис при виході/перезапуску
async function clearCurrentLeaderboardEntry() {
    if (!db || !gameState.currentLeaderboardId) return;
    
    try {
        const { remove, ref } = window.firebaseRefs;
        const currentRef = ref(db, 'leaderboard/' + gameState.currentLeaderboardId);
        await remove(currentRef);
    } catch (error) {
        console.error("Error clearing leaderboard entry:", error);
    } finally {
        gameState.currentLeaderboardId = null;
        gameState.lastSavedScore = 0;
    }
}


// ==================== ОСНОВНА ЛОГІКА ====================
function savePlayerName() {
    const input = document.getElementById('player-name');
    if (input.value.trim()) {
        playerName = input.value.trim();
        localStorage.setItem('mathBalloonPlayer', playerName);
        document.getElementById('name-modal').style.display = 'none';
        showNotification('Вітаємо!', `Приємної гри, ${playerName}!`, 'success');
    }
}

function showNotification(title, text, type = 'info') {
    const panel = document.getElementById('notifications-panel');
    const notif = document.createElement('div');
    notif.className = 'notification';
    
    let color = '#9F7AEA';
    if (type === 'success') color = '#48BB78';
    if (type === 'error') color = '#E53E3E';
    
    notif.style.borderLeftColor = color;
    notif.innerHTML = `<div style="font-size:1.1em;">${title}</div><div>${text}</div>`;
    panel.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'notificationSlide 0.3s reverse';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!gameState.isRunning || gameState.isPaused) return;
        if (e.key >= '0' && e.key <= '9') {
            gameState.typingBuffer += e.key;
            gameState.isTyping = true;
            document.getElementById('typing-indicator').classList.add('active');
            document.getElementById('typed-number').textContent = gameState.typingBuffer;
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(submitTypedAnswer, 1500);
        } else if (e.key === 'Enter' && gameState.typingBuffer) {
            submitTypedAnswer();
        } else if (e.key === 'Escape') {
            togglePause();
        }
    });
}

function submitTypedAnswer() {
    if (!gameState.typingBuffer) return;
    const answer = parseInt(gameState.typingBuffer);
    gameState.typingBuffer = '';
    gameState.isTyping = false;
    document.getElementById('typing-indicator').classList.remove('active');
    processAnswer(answer);
}

async function startGame() {
    // Очищаємо попередній запис якщо є
    await clearCurrentLeaderboardEntry();
    
    resetGame();
    gameState.isRunning = true;
    
    document.getElementById('game-container').innerHTML = '<div class="typing-indicator" id="typing-indicator">✏️ <span id="typed-number"></span></div>';
    
    intervals.spawn = setInterval(spawnBalloon, gameState.spawnInterval);
    intervals.move = setInterval(moveBalloons, 16);
    intervals.physics = setInterval(updateBalloonPhysics, 50);
    
    // Автозбереження кожні 5 секунд
    intervals.autosave = setInterval(saveToLeaderboardRealtime, 5000);

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('multiplayer-btn').classList.add('hidden');
    document.getElementById('pause-btn').classList.remove('hidden');
    document.getElementById('hint-btn').classList.remove('hidden');
    document.getElementById('exit-btn').classList.remove('hidden');
    document.getElementById('rematch-btn').classList.add('hidden');
    
    // Перше збереження одразу
    saveToLeaderboardRealtime();
    
    showNotification('Старт!', 'Лови кульки! Результати зберігаються автоматично 💾', 'success');
}

function spawnBalloon() {
    if (gameState.balloons.length >= gameState.maxBalloons) return;
    
    const num1 = Math.floor(Math.random() * 8) + 1;
    const num2 = Math.floor(Math.random() * 8) + 1;
    const answer = num1 + num2;
    
    const balloon = document.createElement('div');
    balloon.className = 'balloon balloon-normal';
    
    // Створюємо живу нитку
    balloon.innerHTML = `
        <div class="balloon-body">${num1}+${num2}</div>
        <div class="balloon-string-container">
            <div class="balloon-string"></div>
            <div class="balloon-knot"></div>
        </div>
    `;
    
    const container = document.getElementById('game-container');
    const leftPos = 10 + Math.random() * (container.offsetWidth - 70);
    
    balloon.style.left = leftPos + 'px';
    balloon.style.top = (container.offsetHeight - 80) + 'px';
    balloon.dataset.answer = answer;

    container.appendChild(balloon);

    gameState.balloons.push({
        element: balloon,
        baseSpeed: gameState.baseSpeed + Math.random() * 0.2,
        currentSpeed: gameState.baseSpeed + Math.random() * 0.2,
        sway: (Math.random() - 0.5) * 3,
        phase: Math.random() * Math.PI * 2,
        stringSway: 0,
        rotation: 0
    });

    updateAnswerButtons();
}

function updateBalloonPhysics() {
    if (gameState.isPaused || !gameState.isRunning) return;
    
    gameState.balloons.forEach((b, index) => {
        // Живе гойдання нитки
        const time = Date.now() / 300;
        b.stringSway = Math.sin(time + b.phase) * 3;
        b.rotation = Math.sin(time * 2 + b.phase) * 2;
        
        const stringContainer = b.element.querySelector('.balloon-string-container');
        if (stringContainer) {
            stringContainer.style.transform = `rotate(${b.stringSway}deg)`;
        }
        
        // Легке обертання кульки
        b.element.style.transform = `rotate(${b.rotation}deg)`;
    });
}

function moveBalloons() {
    if (gameState.isPaused) return;
    
    gameState.balloons.forEach((b, index) => {
        let top = parseFloat(b.element.style.top) - b.currentSpeed;
        
        // Природне хитання вліво-вправо
        let left = parseFloat(b.element.style.left) + Math.sin(top / 40 + b.phase) * b.sway * 0.5;

        if (top < -100) {
            b.element.remove();
            gameState.balloons.splice(index, 1);
            if (!b.element.classList.contains('balloon-heart')) {
                loseLife();
            }
        } else {
            b.element.style.top = top + 'px';
            b.element.style.left = left + 'px';
        }
    });
}

function updateAnswerButtons() {
    const answers = gameState.balloons
        .map(b => parseInt(b.element.dataset.answer))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 4);

    while (answers.length < 4) {
        const fake = Math.floor(Math.random() * 15) + 1;
        if (!answers.includes(fake)) answers.push(fake);
    }

    answers.sort(() => Math.random() - 0.5);

    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
        btn.textContent = answers[i];
        btn.dataset.answer = answers[i];
        btn.classList.remove('hint');
    });
    
    // Якщо активна підказка, підсвічуємо правильну відповідь
    if (gameState.hintActive && gameState.hintAnswer) {
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (parseInt(btn.dataset.answer) === gameState.hintAnswer) {
                btn.classList.add('hint');
            }
        });
    }
}

function checkAnswer(btn) {
    if (!gameState.isRunning || gameState.isPaused) return;
    processAnswer(parseInt(btn.dataset.answer));
}

function processAnswer(answer) {
    const matches = gameState.balloons.filter(b => 
        parseInt(b.element.dataset.answer) === answer
    );

    if (matches.length > 0) {
        matches.forEach(b => {
            // Різні типи кульок дають різні бонуси
            if (b.element.classList.contains('balloon-golden')) {
                gameState.score += 25;
            } else if (b.element.classList.contains('balloon-heart')) {
                gameState.lives = Math.min(gameState.lives + 1, 5);
                gameState.score += 10;
            } else {
                gameState.score += 10;
            }

            // Анімація вибуху
            b.element.classList.add('pop');
            setTimeout(() => {
                if (b.element.parentNode) b.element.remove();
            }, 300);
        });

        gameState.balloons = gameState.balloons.filter(b => 
            parseInt(b.element.dataset.answer) !== answer
        );

        if (!gameState.isMultiplayer && gameState.score >= gameState.level * 30) {
            levelUp();
        }
        
        if (gameState.isMultiplayer && roomRef) {
            updateMyScore();
            updateMyLives();
        }
        
        // Зберігаємо в таблицю лідерів одразу при зміні рахунку
        saveToLeaderboardRealtime();
    } else {
        gameState.score = Math.max(0, gameState.score - 2);
    }

    // Деактивуємо підказку після відповіді
    gameState.hintActive = false;
    gameState.hintAnswer = null;
    
    updateDisplay();
    updateAnswerButtons();
}

function levelUp() {
    gameState.level++;
    gameState.heartsCollected = 0;
    gameState.spawnInterval = Math.max(2000, gameState.spawnInterval - 300);
    gameState.baseSpeed += 0.1;
    
    clearInterval(intervals.spawn);
    intervals.spawn = setInterval(spawnBalloon, gameState.spawnInterval);
    
    showNotification(`Рівень ${gameState.level}!`, 'Стає складніше!', 'info');
}

function useHint() {
    if (gameState.lives > 1) {
        gameState.lives--;
        updateDisplay();
        
        // Оновлюємо життя в Firebase для мультиплеєра
        if (gameState.isMultiplayer && roomRef) {
            updateMyLives();
        }
        
        // Знаходимо правильну відповідь
        if (gameState.balloons.length > 0) {
            const correctAnswer = parseInt(gameState.balloons[0].element.dataset.answer);
            gameState.hintActive = true;
            gameState.hintAnswer = correctAnswer;
            
            // Підсвічуємо правильну кнопку
            document.querySelectorAll('.answer-btn').forEach(btn => {
                if (parseInt(btn.dataset.answer) === correctAnswer) {
                    btn.classList.add('hint');
                }
            });
            
            showNotification('Підказка', 'Правильна відповідь підсвічена!', 'info');
        }
    } else {
        showNotification('Увага!', 'Недостатньо життів!', 'warning');
    }
}

function loseLife() {
    gameState.lives--;
    updateDisplay();

    // Оновлюємо життя в Firebase для мультиплеєра
    if (gameState.isMultiplayer && roomRef) {
        updateMyLives();
    }

    if (gameState.lives <= 0) {
        if (gameState.isMultiplayer) {
            handlePlayerLost();
        } else {
            endGame();
        }
    }
}

// НОВА ФУНКЦІЯ: Обробка програшу гравця в мультиплеєрі
async function handlePlayerLost() {
    // Зупиняємо гру для цього гравця
    gameState.isRunning = false;
    clearInterval(intervals.spawn);
    clearInterval(intervals.move);
    clearInterval(intervals.physics);
    clearInterval(intervals.autosave);
    
    // Фіналізуємо запис в таблиці лідерів
    await finalizeLeaderboardEntry();
    
    // Позначаємо що цей гравець закінчив гру
    if (roomRef) {
        const finishPath = gameState.isHost ? 'host/finished' : 'guest/finished';
        const finalScorePath = gameState.isHost ? 'host/finalScore' : 'guest/finalScore';
        
        try {
            await window.firebaseRefs.update(roomRef, {
                [finishPath]: true,
                [finalScorePath]: gameState.score,
                status: 'finished'
            });
        } catch (error) {
            console.error("Error marking player as finished:", error);
        }
    }
    
    // Перевіряємо чи суперник теж закінчив
    checkBothPlayersFinished();
}

// НОВА ФУНКЦІЯ: Перевірка чи обидва гравці закінчили
function checkBothPlayersFinished() {
    // Показуємо екран очікування суперника
    showWaitingScreen();
    
    // Якщо ми знаємо що суперник вже закінчив, показуємо результат одразу
    if (gameState.opponentFinished) {
        showFinalResult();
    }
}

// НОВА ФУНКЦІЯ: Показ екрану очікування
function showWaitingScreen() {
    const winnerDiv = document.getElementById('winner-announcement');
    const winnerText = document.getElementById('winner-text');
    const winnerScore = document.getElementById('winner-score');
    const winnerStatus = document.getElementById('winner-status');
    const rematchBtn = document.getElementById('winner-rematch-btn');
    
    winnerDiv.style.display = 'flex';
    winnerText.textContent = '⏳ Очікування...';
    winnerText.style.color = '#ED8936';
    winnerScore.textContent = `Твій рахунок: ${gameState.score}`;
    winnerStatus.textContent = 'Чекаємо поки суперник закінчить гру...';
    rematchBtn.style.display = 'none';
}

// НОВА ФУНКЦІЯ: Показ фінального результату
function showFinalResult() {
    const winnerText = document.getElementById('winner-text');
    const winnerScore = document.getElementById('winner-score');
    const winnerStatus = document.getElementById('winner-status');
    const rematchBtn = document.getElementById('winner-rematch-btn');
    
    // Визначаємо переможця
    const myScore = gameState.score;
    const opponentScore = gameState.opponentScore;
    let iWon = false;
    
    if (myScore > opponentScore) {
        iWon = true;
        winnerText.textContent = '🎉 ПЕРЕМОГА!';
        winnerText.style.color = '#48BB78';
    } else if (myScore < opponentScore) {
        winnerText.textContent = '😔 ПОРАЗКА';
        winnerText.style.color = '#E53E3E';
    } else {
        winnerText.textContent = '🤝 НІЧИЯ';
        winnerText.style.color = '#ED8936';
        iWon = true; // Нічия вважається "не програшем" для збереження результату
    }
    
    winnerScore.textContent = `Ти: ${myScore} | Суперник: ${opponentScore}`;
    winnerStatus.textContent = 'Обидва гравці закінчили!';
    rematchBtn.style.display = 'block';
    
    // Оновлюємо режим в таблиці лідерів для переможця
    if (iWon && gameState.currentLeaderboardId) {
        const { update, ref } = window.firebaseRefs;
        update(ref(db, 'leaderboard/' + gameState.currentLeaderboardId), {
            mode: 'multiplayer-win'
        });
    }
}

async function endGame() {
    gameState.isRunning = false;
    clearInterval(intervals.spawn);
    clearInterval(intervals.move);
    clearInterval(intervals.physics);
    clearInterval(intervals.autosave);

    // Фіналізуємо запис в таблиці лідерів
    await finalizeLeaderboardEntry();

    showNotification('Гру завершено!', `Рахунок: ${gameState.score} збережено! 💾`, 'info');
    resetInterface();
}

async function exitGame() {
    if (gameState.isRunning) {
        gameState.isRunning = false;
        clearInterval(intervals.spawn);
        clearInterval(intervals.move);
        clearInterval(intervals.physics);
        clearInterval(intervals.autosave);
        
        // Фіналізуємо запис в таблиці лідерів
        await finalizeLeaderboardEntry();
        
        resetInterface();
        showNotification('Вихід', 'Результат збережено! 💾', 'info');
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    const btn = document.getElementById('pause-btn');
    btn.innerHTML = gameState.isPaused ? '▶️ ПРОДОВЖИТИ' : '⏸️ ПАУЗА';
    
    if (gameState.isPaused) {
        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay';
        overlay.id = 'pause-overlay';
        overlay.innerHTML = '<div class="pause-content">⏸️ ПАУЗА</div>';
        document.getElementById('game-container').appendChild(overlay);
    } else {
        document.getElementById('pause-overlay')?.remove();
    }
}

function updateDisplay() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('lives-count').textContent = gameState.lives;
}

// ==================== МУЛЬТИПЛЕЄР ====================
function openMultiplayerMenu() {
    if (!isFirebaseConnected) {
        showNotification('Помилка', 'Немає підключення до Firebase', 'error');
        return;
    }
    document.getElementById('multiplayer-modal').style.display = 'flex';
    document.getElementById('multiplayer-menu').classList.remove('hidden');
    document.getElementById('room-created').classList.add('hidden');
    document.querySelectorAll('.room-input input').forEach(input => input.value = '');
}

function closeMultiplayerMenu() {
    document.getElementById('multiplayer-modal').style.display = 'none';
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array(4).fill().map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function createRoom() {
    if (!playerName) {
        showNotification('Увага!', 'Введіть ім\'я!', 'warning');
        return;
    }

    const roomCode = generateRoomCode();
    gameState.roomId = roomCode;
    gameState.isHost = true;
    gameState.playerId = 'player1';

    roomRef = window.firebaseRefs.ref(db, 'rooms/' + roomCode);
    
    try {
        // Створюємо кімнату в Firebase
        await window.firebaseRefs.set(roomRef, {
            host: {
                name: playerName,
                score: 0,
                lives: 3,
                ready: true,
                finished: false,
                finalScore: 0
            },
            guest: null,
            status: 'waiting',
            createdAt: window.firebaseRefs.serverTimestamp()
        });

        // Автовидалення при відключенні
        window.firebaseRefs.onDisconnect(roomRef).remove();

        // Слухаємо зміни в кімнаті
        unsubscribeRoom = window.firebaseRefs.onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                showNotification('Кімнату закрито', '', 'warning');
                closeMultiplayerMenu();
                return;
            }

            // Оновлюємо статус
            const statusEl = document.getElementById('waiting-status');
            
            if (data.guest && data.status === 'waiting') {
                gameState.opponentName = data.guest.name;
                statusEl.innerHTML = `✅ ${data.guest.name} приєднався!`;
                
                // Показуємо кнопку "Почати гру"
                document.getElementById('start-game-container').innerHTML = `
                    <button class="control-btn btn-start" onclick="hostStartGame()" style="width:100%; margin:10px 0; font-size:1.3em; padding:18px;">
                        🎮 ПОЧАТИ ГРУ
                    </button>
                `;
            }

            // Запускаємо гру коли статус змінюється на 'playing'
            if (data.status === 'playing' && !gameState.gameStarted && !gameState.isRunning) {
                // Закриваємо модальне вікно для хоста
                document.getElementById('multiplayer-modal').style.display = 'none';
                startMultiplayerCountdown();
            }
            
            // Оновлюємо дані суперника під час гри
            if (data.status === 'playing' && gameState.isRunning) {
                const opponentData = gameState.isHost ? data.guest : data.host;
                if (opponentData) {
                    gameState.opponentName = opponentData.name;
                    gameState.opponentScore = opponentData.score || 0;
                    gameState.opponentLives = opponentData.lives || 3;
                    updateOpponentDisplay();
                }
            }
            
            // ОБРОБКА ЗАКІНЧЕННЯ ГРИ
            if (data.status === 'finished') {
                const opponentData = gameState.isHost ? data.guest : data.host;
                
                if (opponentData) {
                    gameState.opponentScore = opponentData.finalScore || opponentData.score || 0;
                    gameState.opponentFinished = opponentData.finished || false;
                    
                    // Якщо суперник закінчив, а ми ще граємо - зупиняємо гру
                    if (gameState.opponentFinished && gameState.isRunning) {
                        gameState.isRunning = false;
                        clearInterval(intervals.spawn);
                        clearInterval(intervals.move);
                        clearInterval(intervals.physics);
                        clearInterval(intervals.autosave);
                        
                        // Фіналізуємо наш запис
                        finalizeLeaderboardEntry();
                        
                        // Позначаємо що ми теж закінчили (якщо ще не позначили)
                        const finishPath = gameState.isHost ? 'host/finished' : 'guest/finished';
                        const finalScorePath = gameState.isHost ? 'host/finalScore' : 'guest/finalScore';
                        window.firebaseRefs.update(roomRef, {
                            [finishPath]: true,
                            [finalScorePath]: gameState.score
                        });
                        
                        showFinalResult();
                    }
                    
                    // Якщо ми вже закінчили і чекаємо суперника
                    if (!gameState.isRunning && gameState.opponentFinished) {
                        showFinalResult();
                    }
                }
            }
        });

        // Показуємо код кімнати
        document.getElementById('multiplayer-menu').classList.add('hidden');
        document.getElementById('room-created').classList.remove('hidden');
        document.getElementById('room-code-display').textContent = roomCode;
        document.getElementById('waiting-status').innerHTML = '⏳ Очікуємо суперника...';
        document.getElementById('start-game-container').innerHTML = '';

    } catch (error) {
        console.error(error);
        showNotification('Помилка', 'Не вдалося створити кімнату', 'error');
    }
}

async function joinRoom() {
    const inputs = document.querySelectorAll('.room-input input');
    let code = '';
    inputs.forEach(input => code += input.value.toUpperCase());
    
    if (code.length !== 4) {
        showNotification('Помилка', 'Введіть 4 символи', 'error');
        return;
    }

    gameState.roomId = code;
    gameState.isHost = false;
    gameState.playerId = 'player2';

    roomRef = window.firebaseRefs.ref(db, 'rooms/' + code);

    try {
        const snapshot = await window.firebaseRefs.get(roomRef);
        const data = snapshot.val();

        if (!data) {
            showNotification('Помилка', 'Кімнату не знайдено', 'error');
            return;
        }

        if (data.guest) {
            showNotification('Помилка', 'Кімната вже зайнята', 'error');
            return;
        }

        if (data.status !== 'waiting') {
            showNotification('Помилка', 'Гра вже розпочалась', 'error');
            return;
        }

        gameState.opponentName = data.host.name;

        // Приєднуємось до кімнати
        await window.firebaseRefs.update(roomRef, { 
            guest: {
                name: playerName,
                score: 0,
                lives: 3,
                ready: true,
                finished: false,
                finalScore: 0
            }
        });

        // Слухаємо зміни
        unsubscribeRoom = window.firebaseRefs.onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.status === 'playing' && !gameState.gameStarted && !gameState.isRunning) {
                // Закриваємо модальне вікно для гравця
                document.getElementById('multiplayer-modal').style.display = 'none';
                startMultiplayerCountdown();
            }
            
            if (data.status === 'playing' && gameState.isRunning) {
                const opponentData = data.host;
                if (opponentData) {
                    gameState.opponentName = opponentData.name;
                    gameState.opponentScore = opponentData.score || 0;
                    gameState.opponentLives = opponentData.lives || 3;
                    updateOpponentDisplay();
                }
            }
            
            // ОБРОБКА ЗАКІНЧЕННЯ ГРИ
            if (data.status === 'finished') {
                const opponentData = data.host;
                
                if (opponentData) {
                    gameState.opponentScore = opponentData.finalScore || opponentData.score || 0;
                    gameState.opponentFinished = opponentData.finished || false;
                    
                    // Якщо суперник закінчив, а ми ще граємо - зупиняємо гру
                    if (gameState.opponentFinished && gameState.isRunning) {
                        gameState.isRunning = false;
                        clearInterval(intervals.spawn);
                        clearInterval(intervals.move);
                        clearInterval(intervals.physics);
                        clearInterval(intervals.autosave);
                        
                        // Фіналізуємо наш запис
                        finalizeLeaderboardEntry();
                        
                        // Позначаємо що ми теж закінчили
                        window.firebaseRefs.update(roomRef, {
                            'guest/finished': true,
                            'guest/finalScore': gameState.score
                        });
                        
                        showFinalResult();
                    }
                    
                    // Якщо ми вже закінчили і чекаємо суперника
                    if (!gameState.isRunning && gameState.opponentFinished) {
                        showFinalResult();
                    }
                }
            }
        });

        // Показуємо екран очікування
        document.getElementById('multiplayer-menu').classList.add('hidden');
        document.getElementById('room-created').classList.remove('hidden');
        document.getElementById('room-code-display').textContent = code;
        document.getElementById('waiting-status').innerHTML = '✅ Приєднано! Очікуємо старту від хоста...';
        document.getElementById('start-game-container').innerHTML = '';

    } catch (error) {
        console.error(error);
        showNotification('Помилка', 'Не вдалося приєднатися', 'error');
    }
}

async function hostStartGame() {
    if (!roomRef) return;
    try {
        await window.firebaseRefs.update(roomRef, { status: 'playing' });
        // Закриваємо модальне вікно при старті гри для хоста
        document.getElementById('multiplayer-modal').style.display = 'none';
        startMultiplayerCountdown();
    } catch (error) {
        console.error(error);
        showNotification('Помилка', 'Не вдалося почати гру', 'error');
    }
}

function startMultiplayerCountdown() {
    gameState.gameStarted = true;
    const overlay = document.getElementById('countdown-overlay');
    const number = document.getElementById('countdown-number');
    
    overlay.style.display = 'flex';
    let count = 3;
    number.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            number.textContent = count;
        } else if (count === 0) {
            number.textContent = '🏁';
        } else {
            clearInterval(interval);
            overlay.style.display = 'none';
            startMultiplayerGame();
        }
    }, 1000);
}

async function startMultiplayerGame() {
    // Очищаємо попередній запис якщо є
    await clearCurrentLeaderboardEntry();
    
    gameState.isRunning = true;
    gameState.isMultiplayer = true;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.balloons = [];
    gameState.gameEnded = false;
    gameState.opponentFinished = false;
    gameState.waitingForRematch = false;

    document.getElementById('game-container').innerHTML = '<div class="typing-indicator" id="typing-indicator">✏️ <span id="typed-number"></span></div>';
    
    if (intervals.spawn) clearInterval(intervals.spawn);
    if (intervals.move) clearInterval(intervals.move);
    if (intervals.physics) clearInterval(intervals.physics);
    if (intervals.autosave) clearInterval(intervals.autosave);
    
    intervals.spawn = setInterval(spawnBalloon, 3000);
    intervals.move = setInterval(moveBalloons, 16);
    intervals.physics = setInterval(updateBalloonPhysics, 50);
    
    // Автозбереження кожні 5 секунд
    intervals.autosave = setInterval(saveToLeaderboardRealtime, 5000);

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('multiplayer-btn').classList.add('hidden');
    document.getElementById('pause-btn').classList.remove('hidden');
    document.getElementById('hint-btn').classList.remove('hidden');
    document.getElementById('exit-btn').classList.remove('hidden');
    document.getElementById('rematch-btn').classList.add('hidden');
    
    document.getElementById('opponent-panel').classList.add('active');
    document.getElementById('mode-indicator').classList.add('active');
    
    // Перше збереження одразу
    saveToLeaderboardRealtime();
    
    updateDisplay();
    updateOpponentDisplay();
    showNotification('Старт!', 'Гра до останнього життя! Результати зберігаються 💾', 'success');
}

function updateOpponentDisplay() {
    document.getElementById('opponent-name').textContent = gameState.opponentName || 'Суперник';
    document.getElementById('opponent-score').textContent = gameState.opponentScore;
    document.getElementById('opponent-lives-count').textContent = gameState.opponentLives;
    
    // Показуємо статус суперника
    const statusEl = document.getElementById('opponent-status');
    if (gameState.opponentFinished) {
        statusEl.textContent = '✅ Закінчив гру';
        statusEl.classList.remove('hidden');
        statusEl.classList.add('waiting-for-opponent');
    } else if (gameState.opponentLives <= 0) {
        statusEl.textContent = '❌ Програв';
        statusEl.classList.remove('hidden');
    } else {
        statusEl.classList.add('hidden');
    }
}

async function updateMyScore() {
    if (!roomRef || !gameState.isMultiplayer) return;
    try {
        const updatePath = gameState.isHost ? 'host/score' : 'guest/score';
        await window.firebaseRefs.update(roomRef, {
            [updatePath]: gameState.score
        });
    } catch (error) {
        console.error("Error updating score:", error);
    }
}

async function updateMyLives() {
    if (!roomRef || !gameState.isMultiplayer) return;
    try {
        const updatePath = gameState.isHost ? 'host/lives' : 'guest/lives';
        await window.firebaseRefs.update(roomRef, {
            [updatePath]: gameState.lives
        });
    } catch (error) {
        console.error("Error updating lives:", error);
    }
}

async function requestRematch() {
    if (!roomRef) return;
    
    // Показуємо що ми чекаємо на реванш
    gameState.waitingForRematch = true;
    const winnerStatus = document.getElementById('winner-status');
    winnerStatus.textContent = '⏳ Очікуємо суперника...';
    
    try {
        const updateData = gameState.isHost ? 
            { 'host/rematch': true } : 
            { 'guest/rematch': true };
        
        await window.firebaseRefs.update(roomRef, updateData);
        
        // Перевіряємо чи суперник теж хоче реванш
        const snapshot = await window.firebaseRefs.get(roomRef);
        const data = snapshot.val();
        
        const hostRematch = data.host?.rematch || false;
        const guestRematch = data.guest?.rematch || false;
        
        if (hostRematch && guestRematch) {
            // Очищаємо старі записи з таблиці лідерів перед новою грою
            await clearCurrentLeaderboardEntry();
            
            // Обидва готові - починаємо нову гру
            await window.firebaseRefs.update(roomRef, { 
                status: 'playing',
                'host/score': 0,
                'guest/score': 0,
                'host/lives': 3,
                'guest/lives': 3,
                'host/finished': false,
                'guest/finished': false,
                'host/finalScore': 0,
                'guest/finalScore': 0,
                'host/rematch': false,
                'guest/rematch': false
            });
            
            document.getElementById('winner-announcement').style.display = 'none';
            startMultiplayerCountdown();
        } else {
            // Чекаємо суперника
            winnerStatus.textContent = '✅ Ти готовий! Чекаємо суперника...';
        }
    } catch (error) {
        console.error("Error requesting rematch:", error);
        winnerStatus.textContent = '❌ Помилка. Спробуй ще раз.';
    }
}

async function closeWinnerAndLeave() {
    document.getElementById('winner-announcement').style.display = 'none';
    
    // Фіналізуємо запис перед виходом
    await finalizeLeaderboardEntry();
    
    if (roomRef) {
        window.firebaseRefs.remove(roomRef);
        if (unsubscribeRoom) {
            unsubscribeRoom();
            unsubscribeRoom = null;
        }
    }
    resetInterface();
}

function moveToNext(input, index) {
    if (input.value && index < 3) {
        document.querySelectorAll('.room-input input')[index + 1].focus();
    }
}

function copyRoomCode() {
    const code = document.getElementById('room-code-display').textContent;
    navigator.clipboard.writeText(code);
    showNotification('Скопійовано!', code, 'success');
}

async function resetInterface() {
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('multiplayer-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('hint-btn').classList.add('hidden');
    document.getElementById('exit-btn').classList.add('hidden');
    document.getElementById('rematch-btn').classList.add('hidden');
    document.getElementById('opponent-panel').classList.remove('active');
    document.getElementById('mode-indicator').classList.remove('active');
    document.getElementById('pause-overlay')?.remove();
    
    // Очищаємо запис в таблиці лідерів якщо гра не закінчена
    if (gameState.isRunning) {
        await clearCurrentLeaderboardEntry();
    }
    
    gameState.hintActive = false;
    gameState.hintAnswer = null;
    gameState.opponentFinished = false;
    gameState.waitingForRematch = false;
}

function resetGame() {
    gameState = {
        ...gameState,
        isRunning: false,
        isPaused: false,
        score: 0,
        lives: 3,
        level: 1,
        balloons: [],
        spawnInterval: 3500,
        baseSpeed: 0.6,
        heartsCollected: 0,
        isMultiplayer: false,
        gameEnded: false,
        hintActive: false,
        hintAnswer: null,
        opponentFinished: false,
        waitingForRematch: false,
        lastSavedScore: 0,
        currentLeaderboardId: null
    };
}

// Чит-код на сонце
document.getElementById('sun').addEventListener('click', () => {
    gameState.sunClicks++;
    if (gameState.sunClicks === 3 && !gameState.cheatUsed) {
        gameState.lives += 2;
        gameState.cheatUsed = true;
        updateDisplay();
        
        // Оновлюємо життя в Firebase для мультиплеєра
        if (gameState.isMultiplayer && roomRef) {
            updateMyLives();
        }
        
        showNotification('Бонус!', '+2 життя!', 'success');
        
        // Сонце радіє
        document.getElementById('sun').style.animation = 'none';
        setTimeout(() => {
            document.getElementById('sun').style.animation = 'sunGlow 4s ease-in-out infinite';
        }, 100);
    }
});

// ==================== EXPOSE TO WINDOW ====================
window.toggleLeaderboardMobile = toggleLeaderboardMobile;
window.checkAnswer = checkAnswer;
window.startGame = startGame;
window.openMultiplayerMenu = openMultiplayerMenu;
window.togglePause = togglePause;
window.useHint = useHint;
window.exitGame = exitGame;
window.requestRematch = requestRematch;
window.switchLeaderboardTab = switchLeaderboardTab;
window.savePlayerName = savePlayerName;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.closeMultiplayerMenu = closeMultiplayerMenu;
window.moveToNext = moveToNext;
window.copyRoomCode = copyRoomCode;
window.hostStartGame = hostStartGame;
