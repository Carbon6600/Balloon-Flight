 let gameContainer = document.getElementById("game-container");
        let scoreDisplay = document.getElementById("score");
        let livesDisplay = document.querySelector(".lives");
        let levelDisplay = document.getElementById("level");
        let answerButtons = document.querySelectorAll(".answer-buttons button");
        let gameMessage = document.getElementById("game-message");
        let highscoresList = document.getElementById("highscores-list");
        let nameInput = document.getElementById("name-input");
        let playerNameInput = document.getElementById("player-name");
        let pauseButton = document.getElementById("pause-button");
        let startGameButton = document.getElementById("start-game-button");
        let sun = document.getElementById("sun");
        let weatherAnimation = document.getElementById("weather-animation");

        let score = 0;
        let lives = 3;
        let level = 1;
        let gameRunning = false;
        let gamePaused = false;
        let balloons = [];
        let spawnInterval = 2000; // Інтервал появи кульок
        let balloonSpeed = 1; // Базова швидкість кульок
        let currentAnswers = []; // Поточні відповіді для кнопок
        let gameInterval;
        let balloonMoveInterval;
        let playerName = localStorage.getItem("playerName") || "";
        let heartsCollected = 0; // Лічильник зібраних сердечок на рівні
        let sunClicks = 0; // Лічильник кліків на сонце
        let cheatUsed = false; // Чит-код використано
        let correctAnswersInRow = 0; // Лічильник правильних відповідей підряд
        let secretLevelActive = false; // Чи активний секретний рівень

        // Погодні умови для кожного рівня
        const weatherConditions = [
            { name: "Сонячно", speed: 1, background: "linear-gradient(to bottom, #87CEEB, #4682B4)", animation: "" },
            { name: "Дощ", speed: 0.5, background: "linear-gradient(to bottom, #6C7A89, #2C3E50)", animation: "rain" },
            { name: "Сніг", speed: 0.3, background: "linear-gradient(to bottom, #FFFFFF, #D3D3D3)", animation: "snow" },
            { name: "Туман", speed: 0.7, background: "linear-gradient(to bottom, #B0C4DE, #778899)", animation: "" },
            { name: "Вітер", speed: 1.2, background: "linear-gradient(to bottom, #A9A9A9, #696969)", animation: "" },
        ];

        // Завантаження рекордів з localStorage
        let highscores = JSON.parse(localStorage.getItem("highscores")) || [];

        // Відображення таблиці рекордів
        function updateHighscores() {
            highscoresList.innerHTML = highscores
                .sort((a, b) => b.score - a.score)
                .slice(0, 5) // Тільки топ-5
                .map((record, index) => `<li>${index + 1}. ${record.name}: ${record.score} (${record.date})</li>`)
                .join("");
        }

        // Збереження рекорду
        function saveHighscore() {
            const date = new Date().toLocaleString();
            highscores.push({ name: playerName, score: score, date: date });
            localStorage.setItem("highscores", JSON.stringify(highscores));
            updateHighscores();
        }

        // Запит імені гравця
        function askForName() {
            if (!playerName) {
                nameInput.style.display = "flex";
            } else {
                startGameButton.style.display = "inline-block"; // Показуємо кнопку "Почати гру"
            }
        }

        // Збереження імені
        function saveName() {
            playerName = playerNameInput.value.trim();
            if (playerName) {
                localStorage.setItem("playerName", playerName);
                nameInput.style.display = "none";
                startGameButton.style.display = "inline-block"; // Показуємо кнопку "Почати гру"
            }
        }

        // Показ підказки (робить кулі повільними та виділяє кнопку)
        function showHint() {
            if (lives > 0) {
                lives--;
                livesDisplay.innerHTML = "❤️".repeat(lives);

                // Робимо кулі повільними
                balloons.forEach(balloon => {
                    balloon.speed *= 0.5; // Зменшуємо швидкість кульок
                });

                // Виділяємо кнопку з правильною відповіддю
                let correctAnswer = balloons.find(balloon => balloon.element.dataset.answer);
                if (correctAnswer) {
                    answerButtons.forEach(button => {
                        if (button.dataset.answer === correctAnswer.element.dataset.answer) {
                            button.classList.add("hint");
                            setTimeout(() => button.classList.remove("hint"), 3000); // Видаляємо підсвітку через 3 секунди
                        }
                    });
                }
            }
        }

        // Початок гри
        function startGame() {
            if (gameRunning) return;
            gameRunning = true;
            gamePaused = false;
            score = 0;
            lives = 3;
            level = 1;
            heartsCollected = 0;
            correctAnswersInRow = 0;
            secretLevelActive = false;
            scoreDisplay.innerText = score;
            levelDisplay.innerText = level;
            livesDisplay.innerHTML = "❤️❤️❤️";
            gameContainer.innerHTML = "";
            currentAnswers = [];
            updateAnswerButtons();

            // Встановлюємо погодні умови для поточного рівня
            const weather = weatherConditions[level - 1];
            document.body.style.background = weather.background;
            balloonSpeed = weather.speed;

            // Оновлюємо анімацію погоди
            weatherAnimation.innerHTML = "";
            if (weather.animation) {
                let animationElement = document.createElement("div");
                animationElement.classList.add(weather.animation);
                weatherAnimation.appendChild(animationElement);
            }

            gameInterval = setInterval(spawnBalloon, spawnInterval);
            balloonMoveInterval = setInterval(moveBalloons, 50);
        }

        // Пауза гри
        function pauseGame() {
            if (!gameRunning) return;
            gamePaused = !gamePaused;
            if (gamePaused) {
                clearInterval(gameInterval);
                clearInterval(balloonMoveInterval);
                pauseButton.innerText = "Продовжити";
                showMessage("Пауза");
            } else {
                pauseButton.innerText = "Пауза";
                gameInterval = setInterval(spawnBalloon, spawnInterval);
                balloonMoveInterval = setInterval(moveBalloons, 50);
            }
        }

        // Створення кульки
        function spawnBalloon() {
            if (!gameRunning || gamePaused) return;
            
            let num1, num2, answer;
            let balloonType = Math.random();

            if (balloonType < 0.1 && heartsCollected < 2) { // 10% шанс на кульку-сердечко, але не більше 2 на рівень
                num1 = 1; // Дуже просте рівняння
                num2 = 1;
                answer = num1 + num2;
            } else if (balloonType < 0.2) { // 10% шанс на золоту кульку
                num1 = Math.floor(Math.random() * (level * 3)); // Складніше рівняння
                num2 = Math.floor(Math.random() * (level * 3));
                answer = num1 + num2;
            } else { // Звичайна кулька
                num1 = Math.floor(Math.random() * (level * 2));
                num2 = Math.floor(Math.random() * (level * 2));
                answer = num1 + num2;
            }

            let balloon = document.createElement("div");
            balloon.classList.add("balloon");

            if (balloonType < 0.1 && heartsCollected < 2) { // Кулька-сердечко
                balloon.classList.add("heart");
                balloon.innerHTML = `${num1} + ${num2}`;
                balloon.dataset.answer = answer;
                heartsCollected++;
            } else if (balloonType < 0.2) { // Золота кулька
                balloon.classList.add("golden");
                balloon.innerHTML = `${num1} + ${num2}`;
                balloon.dataset.answer = answer;
            } else { // Звичайна кулька
                balloon.innerHTML = `${num1} + ${num2}`;
                balloon.dataset.answer = answer;
            }

            balloon.style.left = `${Math.random() * 320}px`;
            balloon.style.top = "450px";

            gameContainer.appendChild(balloon);
            balloons.push({ element: balloon, speed: balloonSpeed + Math.random() * level, sway: Math.random() * 2 - 1 });

            // Оновлення відповідей на кнопках
            updateAnswerButtons();
        }

        // Рух кульок
        function moveBalloons() {
            if (!gameRunning || gamePaused) return;

            balloons.forEach((balloon, index) => {
                let top = parseFloat(balloon.element.style.top) - balloon.speed;
                let left = parseFloat(balloon.element.style.left) + balloon.sway * Math.sin(top / 50);
                
                if (top <= -50) {
                    balloon.element.remove();
                    balloons.splice(index, 1);
                    if (!balloon.element.classList.contains("heart") && !balloon.element.classList.contains("golden")) {
                        loseLife(); // Втрачаємо життя лише для звичайних кульок
                    }
                } else {
                    balloon.element.style.top = top + "px";
                    balloon.element.style.left = left + "px";
                }
            });
        }

        // Оновлення кнопок відповідей
        function updateAnswerButtons() {
            // Отримуємо всі активні відповіді з кульок
            let activeAnswers = balloons
                .filter(balloon => balloon.element.dataset.answer)
                .map(balloon => parseInt(balloon.element.dataset.answer));

            // Додаємо випадкові відповіді, якщо активних менше 4
            while (activeAnswers.length < 4) {
                let randomAnswer = Math.floor(Math.random() * (level * 4));
                if (!activeAnswers.includes(randomAnswer)) {
                    activeAnswers.push(randomAnswer);
                }
            }

            // Оновлюємо кнопки
            answerButtons.forEach((button, index) => {
                button.innerText = activeAnswers[index];
                button.dataset.answer = activeAnswers[index];
            });
        }

        // Перевірка відповіді
        function checkAnswer(button) {
            if (!gameRunning || gamePaused) return;
            let chosenAnswer = parseInt(button.dataset.answer);

            let balloonsToRemove = balloons.filter(balloon => balloon.element.dataset.answer == chosenAnswer);
            if (balloonsToRemove.length > 0) {
                balloonsToRemove.forEach(balloon => {
                    if (balloon.element.classList.contains("golden")) {
                        score += 50; // Золота кулька дає більше очок
                    } else if (balloon.element.classList.contains("heart")) {
                        lives += 2; // Кулька-сердечко додає два життя
                        livesDisplay.innerHTML = "❤️".repeat(lives);
                    } else {
                        score += 10; // Звичайна кулька
                    }
                    balloon.element.classList.add("explosion");
                    setTimeout(() => balloon.element.remove(), 500);
                });
                balloons = balloons.filter(balloon => balloon.element.dataset.answer != chosenAnswer);
                scoreDisplay.innerText = score;

                // Зменшуємо швидкість кульок, якщо відповідь правильна
                balloons.forEach(balloon => {
                    balloon.speed *= 0.9; // Зменшуємо швидкість на 10%
                });

                // Перевірка переходу на новий рівень
                if (score >= level * 100) {
                    level++;
                    heartsCollected = 0; // Скидаємо лічильник сердечок
                    levelDisplay.innerText = level;
                    showMessage(`Рівень ${level}!`);
                    spawnInterval = Math.max(1000, spawnInterval - 200); // Зменшуємо інтервал появи кульок
                    balloonSpeed = weatherConditions[level - 1].speed; // Оновлюємо швидкість кульок
                    clearInterval(gameInterval);
                    gameInterval = setInterval(spawnBalloon, spawnInterval);

                    // Зміна фону для нового рівня
                    document.body.style.background = weatherConditions[level - 1].background;

                    // Оновлюємо анімацію погоди
                    weatherAnimation.innerHTML = "";
                    if (weatherConditions[level - 1].animation) {
                        let animationElement = document.createElement("div");
                        animationElement.classList.add(weatherConditions[level - 1].animation);
                        weatherAnimation.appendChild(animationElement);
                    }
                }
            } else {
                // Якщо відповідь неправильна, знімаємо 20 очок
                score = Math.max(0, score - 20);
                scoreDisplay.innerText = score;
                correctAnswersInRow = 0; // Скидаємо лічильник правильних відповідей підряд
            }
        }

        // Втрата життя
        function loseLife() {
            lives--;
            livesDisplay.innerHTML = "❤️".repeat(lives);
            if (lives <= 0) {
                gameRunning = false;
                saveHighscore();
                showMessage(`Гру завершено! Ваш рахунок: ${score}`);
                setTimeout(() => location.reload(), 3000);
            }
        }

        // Показ повідомлення
        function showMessage(message) {
            gameMessage.innerText = message;
            gameMessage.style.display = "block";
            setTimeout(() => gameMessage.style.display = "none", 2000);
        }

        // Чит-код: три кліки на сонце
        sun.addEventListener("click", () => {
            sunClicks++;
            if (sunClicks === 3 && !cheatUsed) {
                lives = 3;
                livesDisplay.innerHTML = "❤️❤️❤️";
                cheatUsed = true;
                showMessage("Чит-код активовано! Життя поповнено.");
            }
        });

        // Запит імені при завантаженні сторінки
        askForName();
        updateHighscores();
