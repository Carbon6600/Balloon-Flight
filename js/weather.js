export class WeatherManager {
    constructor() {
        this.overlay = document.getElementById('weather-overlay');
        this.currentWeather = 'CLEAR';
        this.particles = [];
        this.particleInterval = null;
        this.flashInterval = null;
    }

    setWeather(type) {
        console.log(`🌤️ Weather changing to: ${type}`);
        this.clearWeather();
        this.currentWeather = type;

        // Додаємо відповідний клас до оверлею
        if (type !== 'CLEAR') {
            this.overlay.classList.add(`weather-${type.toLowerCase()}`);
        }

        // Запускаємо генерацію частинок
        if (type === 'RAINY' || type === 'STORMY') {
            this.startParticles('rain');
        } else if (type === 'SNOWY') {
            this.startParticles('snow');
        }

        // Спеціальні ефекти для грози
        if (type === 'STORMY') {
            this.startLightning();
        }
    }

    clearWeather() {
        this.currentWeather = 'CLEAR';
        this.overlay.className = '';
        
        // Видаляємо всі частинки
        this.particles.forEach(p => p.remove());
        this.particles = [];
        
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
