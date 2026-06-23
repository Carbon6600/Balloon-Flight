export class WeatherManager {
    constructor() {
        this.overlay = document.getElementById('weather-overlay');
        this.celestialBody = document.getElementById('sun');
        this.starsContainer = document.getElementById('stars-container');
        this.bgContainer = document.getElementById('weather-bg-container');
        this.currentWeather = null;
        this.particles = [];
        this.particleInterval = null;
        this.flashInterval = null;
    }

    setWeather(type) {
        if (this.currentWeather === type) return;
        console.log(`🌤️ Weather changing to: ${type}`);
        
        const prevWeather = this.currentWeather;
        this.currentWeather = type;

        // 1. Плавна зміна фону через шари
        this.transitionBackground(prevWeather, type);

        // 2. Оновлення класів body для інших елементів (хмари тощо)
        const weatherClass = `weather-${type.toLowerCase()}`;
        document.body.className = '';
        document.body.classList.add(weatherClass);

        // 3. Оновлення оверлею
        if (this.overlay) {
            this.overlay.className = '';
            if (type !== 'CLEAR') {
                this.overlay.classList.add(`weather-${type.toLowerCase()}`);
            }
        
        }

        // 4. Очищення попередніх ефектів та запуск нових
        this.clearParticles();
        
        if (type === 'RAINY' || type === 'STORMY') {
            this.startParticles('rain');
        } else if (type === 'SNOWY') {
            this.startParticles('snow');
        }

        if (type === 'STORMY') {
            this.startLightning();
        }
    }

    transitionBackground(oldType, newType) {
        if (!this.bgContainer) return;

        // Створюємо новий шар
        const newLayer = document.createElement('div');
        newLayer.className = `weather-bg-layer weather-bg-${newType.toLowerCase()}`;
        newLayer.style.opacity = '0';
        this.bgContainer.appendChild(newLayer);

        // Запускаємо проявлення нового шару
        requestAnimationFrame(() => {
            newLayer.style.opacity = '1';
        });

        // Прибираємо старий шар
        const oldLayer = oldType ? this.bgContainer.querySelector(`.weather-bg-${oldType.toLowerCase()}`) : null;
        if (oldLayer) {
            oldLayer.style.opacity = '0';
            setTimeout(() => oldLayer.remove(), 2000);
        }
    }

    clearWeather() {
        this.setWeather('CLEAR');
        this.clearParticles();
        
        if (this.starsContainer) {
            this.starsContainer.innerHTML = '';
        }
    }

    clearParticles() {
        if (this.particles) {
            this.particles.forEach(p => p.remove());
            this.particles = [];
        }
        clearInterval(this.particleInterval);
        clearInterval(this.flashInterval);
    }

    startParticles(type) {
        this.particleInterval = setInterval(() => {
            const particle = document.createElement('div');
            particle.className = type === 'rain' ? 'rain-drop' : 'snow-flake';
            
            const startX = Math.random() * window.innerWidth;
            const size = type === 'rain' ? 2 : Math.random() * 4 + 2;
            
            particle.style.left = `${startX}px`;
            particle.style.top = `-20px`;
            if (type === 'snow') {
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
            }
            
            // Випадкова швидкість та затримка
            const duration = type === 'rain' ? (Math.random() * 0.5 + 0.5) : (Math.random() * 3 + 2);
            particle.style.animationDuration = `${duration}s`;
            
            this.overlay.appendChild(particle);
            this.particles.push(particle);
            
            // Видаляємо частинку після завершення анімації
            setTimeout(() => {
                particle.remove();
                this.particles = this.particles.filter(p => p !== particle);
            }, duration * 1000);
        }, type === 'rain' ? 20 : 100);
    }

    updateCelestialBody(type) {
        if (!this.celestialBody) return;

        if (type === 'NIGHT') {
            // Анімація заходу сонця
            this.celestialBody.style.top = '120%';
            this.celestialBody.style.opacity = '0';
            
            setTimeout(() => {
                this.celestialBody.className = 'moon';
                this.celestialBody.style.top = '50px';
                this.celestialBody.style.opacity = '1';
            }, 1500);
        } else {
            // Анімація сходу сонця
            this.celestialBody.style.top = '120%';
            this.celestialBody.style.opacity = '0';
            
            setTimeout(() => {
                this.celestialBody.className = 'sun';
                this.celestialBody.style.top = '50px';
                this.celestialBody.style.opacity = '1';
            }, 1500);
        }
    }

    manageStars(type) {
        if (!this.starsContainer) return;
        
        this.starsContainer.innerHTML = '';
        
        if (type === 'NIGHT') {
            // Кількість зірок залежить від хмарності
            let starCount = 100;
            if (this.currentWeather === 'CLOUDY' || this.currentWeather === 'STORMY' || this.currentWeather === 'RAINY') {
                starCount = Math.floor(Math.random() * 30); // Мало зірок, якщо хмарно
            }

            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                
                const size = Math.random() * 3;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 70}%`;
                
                const duration = 2 + Math.random() * 3;
                star.style.setProperty('--duration', `${duration}s`);
                
                this.starsContainer.appendChild(star);
                
                // Плавна поява
                setTimeout(() => {
                    star.style.opacity = '1';
                }, Math.random() * 2000);
            }
        }
    }

    startLightning() {
        this.flashInterval = setInterval(() => {
            if (Math.random() > 0.95) {
                const flash = document.createElement('div');
                flash.className = 'lightning-flash';
                flash.style.animation = 'flash 0.4s ease-out';
                this.overlay.appendChild(flash);
                setTimeout(() => flash.remove(), 400);
            }
        }, 2000);
    }
}
