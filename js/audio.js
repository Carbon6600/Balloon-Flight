export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicOsc = null;
        this.musicGain = null;
        this.isMusicPlaying = false;
        this.initialized = false;
    }

    // Ініціалізація AudioContext (має бути викликана після жесту користувача)
    init() {
        if (this.initialized) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            console.log("🔊 AudioManager ініціалізовано");
        } catch (e) {
            console.error("Помилка ініціалізації AudioContext:", e);
        }
    }

    // Допоміжний метод для створення простого звуку
    _playSound(freqStart, freqEnd, duration, type = 'sine', volume = 0.2) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Звук лопання кульки
    playPop() {
        this._playSound(600, 100, 0.1, 'sine', 0.3);
    }

    // Звук помилки
    playError() {
        this._playSound(150, 50, 0.3, 'sawtooth', 0.2);
    }

    // Звук успіху / нового рівня
    playLevelUp() {
        const now = this.ctx.currentTime;
        const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            
            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
    }

    // Звук кліку по кнопці
    playClick() {
        this._playSound(1000, 800, 0.05, 'sine', 0.1);
    }

    // Проста процедурна фонова музика (мінімалістичний біт)
    toggleMusic() {
        if (!this.ctx) return;

        if (this.isMusicPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }

    startMusic() {
        if (!this.ctx || this.isMusicPlaying) return;

        this.isMusicPlaying = true;
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.05; // Дуже тиха музика
        this.musicGain.connect(this.masterGain);

        // Простий цикл мелодії
        const playNote = (freq, time, duration) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            g.gain.setValueAtTime(0.1, time);
            g.gain.exponentialRampToValueAtTime(0.01, time + duration);
            osc.connect(g);
            g.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + duration);
        };

        const sequence = [
            { f: 261.63, d: 0.2 }, // C4
            { f: 0, d: 0.2 },      // pause
            { f: 329.63, d: 0.2 }, // E4
            { f: 0, d: 0.2 },
            { f: 392.00, d: 0.2 }, // G4
            { f: 0, d: 0.2 },
            { f: 349.23, d: 0.4 }, // F4
        ];

        let nextNoteTime = this.ctx.currentTime;
        
        const scheduler = () => {
            while (nextNoteTime < this.ctx.currentTime + 0.1) {
                sequence.forEach((note, i) => {
                    if (note.f !== 0) {
                        // offset for each note in the sequence
                        // This is a simplified loop
                    }
                });
                // Fixed loop for simplicity
                const currentNote = sequence[Math.floor(Math.random() * sequence.length)];
                if (currentNote.f !== 0) {
                    playNote(currentNote.f, nextNoteTime, currentNote.d);
                }
                nextNoteTime += 0.4;
            }
            if (this.isMusicPlaying) {
                setTimeout(scheduler, 100);
            }
        };
        
        scheduler();
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicGain) {
            this.musicGain.disconnect();
        }
    }
}
