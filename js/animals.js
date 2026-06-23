class Animal {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.x = Math.random() * window.innerWidth;
        this.y = 0; // Bottom position is handled by CSS
        this.speed = 1 + Math.random();
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.element = null;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'animal';
        return this.element;
    }

    updatePosition() {
        this.x += this.speed * this.direction;
        if (this.x > window.innerWidth) {
            this.direction = -1;
        } else if (this.x < 0) {
            this.direction = 1;
        }
        this.element.style.left = `${this.x}px`;
        this.element.style.transform = `scaleX(${this.direction})`;
    }
}

class Giraffe extends Animal {
    constructor(name) {
        super(name, '#f4d03f');
        this.state = 'walking'; // 'walking', 'looking', 'idle'
        this.stateTimer = 0;
        this.herd = null;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = 'giraffe';
        
        const body = document.createElement('div');
        body.className = 'giraffe-body';
        
        const neck = document.createElement('div');
        neck.className = 'giraffe-neck';
        
        const head = document.createElement('div');
        head.className = 'giraffe-head';
        
        const eyeL = document.createElement('div');
        eyeL.className = 'giraffe-eye eye-l';
        
        const eyeR = document.createElement('div');
        eyeR.className = 'giraffe-eye eye-r';
        
        const mouth = document.createElement('div');
        mouth.className = 'giraffe-mouth';
        
        head.appendChild(eyeL);
        head.appendChild(eyeR);
        head.appendChild(mouth);

        const legs = document.createElement('div');
        legs.className = 'giraffe-legs';
        for(let i=0; i<4; i++) {
            const leg = document.createElement('div');
            leg.className = 'leg';
            legs.appendChild(leg);
        }

        neck.appendChild(head);
        container.appendChild(neck);
        container.appendChild(body);
        container.appendChild(legs);
        
        this.element = container;
        return this.element;
    }

    update(herd = []) {
        this.stateTimer--;

        if (this.stateTimer <= 0) {
            this.changeState();
        }

        if (this.state === 'walking') {
            this.element.classList.add('walking');
            this.element.classList.remove('looking-left', 'looking-right');
            this.updatePosition();
        } else if (this.state === 'looking') {
            this.element.classList.remove('walking');
            const lookingDir = Math.random() > 0.5 ? 'looking-left' : 'looking-right';
            this.element.classList.add(lookingDir);
        } else {
            this.element.classList.remove('walking', 'looking-left', 'looking-right');
        }

        // Herd behavior: try to stay close to other giraffes
        if (herd.length > 0) {
            const leader = herd[0] === this ? herd[1] : herd[0];
            if (leader) {
                const dist = this.x - leader.x;
                if (Math.abs(dist) > 150) {
                    this.direction = dist > 0 ? -1 : 1;
                }
            }
        }
    }

    changeState() {
        const rand = Math.random();
        if (rand < 0.7) {
            this.state = 'walking';
            this.stateTimer = 100 + Math.random() * 200;
        } else if (rand < 0.9) {
            this.state = 'looking';
            this.stateTimer = 50 + Math.random() * 100;
        } else {
            this.state = 'idle';
            this.stateTimer = 30 + Math.random() * 50;
        }
    }
}

class GiraffeHerd {
    constructor(size = 3) {
        this.giraffes = [];
        this.container = document.createElement('div');
        this.container.className = 'animal-container';
        document.body.appendChild(this.container);

        for (let i = 0; i < size; i++) {
            const giraffe = new Giraffe(`Giraffe ${i + 1}`);
            this.giraffes.push(giraffe);
            this.container.appendChild(giraffe.createElement());
        }
    }

    update() {
        this.giraffes.forEach(g => g.update(this.giraffes));
    }

    start() {
        const animate = () => {
            this.update();
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Export for use in main.js
window.GiraffeHerd = GiraffeHerd;
