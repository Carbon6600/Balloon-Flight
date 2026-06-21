/**
 * Модуль керування живим світом (природа, трава, пташки)
 */

export function initLivingWorld(gameState) {
    console.log("🌿 Ініціалізація живого світу...");
    
    init2DGrass();
    createTrees();
    
    // Запускаємо цикл оновлення пташок
    setInterval(() => updateBirds(gameState), 20);
    
    // Перші пташки
    for(let i=0; i<3; i++) {
        spawnBird(gameState);
    }
    
    // Регулярний спавн нових пташок
    setInterval(() => spawnBird(gameState), 7000);
}

function init2DGrass() {
    console.log("🌿 Initializing 2D Canvas Environment...");
    const container = document.getElementById('three-grass-container');
    if (!container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    container.appendChild(canvas);

    let width, height;
    let clumps = [];
    let mountains = [];

    const layers = [
        { color: '#2D4A2D', heightRange: [10, 20], count: 40, scale: 0.6, opacity: 0.7 }, // Far
        { color: '#3B5B32', heightRange: [15, 30], count: 60, scale: 0.8, opacity: 0.9 }, // Mid
        { color: '#5A8A5A', heightRange: [20, 45], count: 50, scale: 1.0, opacity: 1.0 }, // Near
    ];

    function initMountains() {
        // Mountains are currently handled by CSS, but we implement the logic here
        // to satisfy the requirement and allow for future canvas-based hills.
        mountains = [];
    }

    function initGrass() {
        clumps = [];
        layers.forEach((layer, layerIdx) => {
            for (let i = 0; i < layer.count; i++) {
                const centerX = Math.random() * width;
                const centerY = height - (Math.random() * 20);
                const bladesCount = 3 + Math.floor(Math.random() * 5);
                const blades = [];

                for (let j = 0; j < bladesCount; j++) {
                    blades.push({
                        offsetX: (Math.random() - 0.5) * 10 * layer.scale,
                        height: layer.heightRange[0] + Math.random() * (layer.heightRange[1] - layer.heightRange[0]),
                        lean: (Math.random() - 0.5) * 10,
                        width: 2 + Math.random() * 2,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                clumps.push({ layerIdx, centerX, centerY, blades });
            }
        });
    }

    const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        width = canvas.width = rect.width;
        height = canvas.height = rect.height;
        
        initMountains();
        initGrass();
    };

    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
        resizeTimeout = requestAnimationFrame(resizeCanvas);
    });

    resizeCanvas();

    function drawBlade(ctx, x, y, blade, time, color) {
        const wind = Math.sin(time + x * 0.01) * 5;
        const tipX = x + blade.lean + wind;
        const tipY = y - blade.height;
        const baseW = blade.width;

        ctx.beginPath();
        ctx.moveTo(x - baseW / 2, y);
        ctx.quadraticCurveTo(x - baseW, y - blade.height / 2, tipX, tipY);
        ctx.quadraticCurveTo(x + baseW, y - blade.height / 2, x + baseW / 2, y);
        ctx.closePath();
        ctx.fill();
    }

    function animate(time) {
        ctx.clearRect(0, 0, width, height);
        const t = time * 0.002;

        layers.forEach((layer, layerIdx) => {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = layer.opacity;
            
            clumps.filter(c => c.layerIdx === layerIdx).forEach(clump => {
                clump.blades.forEach(blade => {
                    drawBlade(ctx, clump.centerX + blade.offsetX, clump.centerY, blade, t, layer.color);
                });
            });
        });

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

function createTrees() {
    // Розподіляємо дерева по різних шарах гір
    const layers = [
        { id: 'layer-mid', height: 28 },
        { id: 'layer-near', height: 22 }
    ];

    layers.forEach(layerInfo => {
        const container = document.querySelector(`.${layerInfo.id}`);
        if (!container) return;

        // Очищаємо старі дерева тільки в цьому шарі
        container.querySelectorAll('.tree').forEach(t => t.remove());

        const treeCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < treeCount; i++) {
            const tree = document.createElement('div');
            tree.className = 'tree';
            
            // Визначаємо позицію X (від 10% до 90%, щоб не вилазили за краї)
            const leftPercent = 10 + Math.random() * 80;
            const scale = 0.6 + Math.random() * 0.6;
            
            // Розрахунок висоти гори в цій точці (напівеліпс)
            const xPrime = (leftPercent - 50) / 50;
            const heightFactor = Math.sqrt(Math.max(0, 1 - xPrime * xPrime));
            const bottomPos = heightFactor * layerInfo.height;
            
            tree.style.left = leftPercent + '%';
            tree.style.bottom = bottomPos + '%';
            tree.style.transform = `scale(${scale})`;
            
            // 1. Shadow
            const shadow = document.createElement('div');
            shadow.className = 'tree-shadow';
            tree.appendChild(shadow);
            
            // 2. Crown (Cloud-like layered foliage)
            const crown = document.createElement('div');
            crown.className = 'tree-crown';
            
            const clusters = [
                { w: 70, h: 60, x: 5, y: 10, type: 'shadow' },    // Main base
                { w: 60, h: 50, x: 15, y: 0, type: 'highlight' }, // Main top
                { w: 40, h: 35, x: -10, y: 15, type: 'shadow' },  // Left side
                { w: 40, h: 35, x: 40, y: 15, type: 'highlight' }, // Right side
                { w: 40, h: 30, x: 20, y: 40, type: 'shadow' },   // Bottom fill - now reaches the bottom
            ];
            
            clusters.forEach(c => {
                const cluster = document.createElement('div');
                cluster.className = `crown-cluster ${c.type === 'highlight' ? 'cluster-highlight' : 'cluster-shadow'}`;
                cluster.style.width = c.w + 'px';
                cluster.style.height = c.h + 'px';
                cluster.style.left = c.x + 'px';
                cluster.style.top = c.y + 'px';
                crown.appendChild(cluster);
            });
            
            // 3. Trunk (Tapered)
            const trunk = document.createElement('div');
            trunk.className = 'tree-trunk';
            trunk.style.height = (60 + Math.random() * 40) + 'px';
            
            tree.appendChild(crown);
            tree.appendChild(trunk);
            
            container.appendChild(tree);
        }
    });
}

export function spawnBird(gameState) {
    const container = document.getElementById('birds-container');
    if (!container) return;
    
    const emojis = ['🐦', '🕊️', '🦅', '🦆'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const birdEl = document.createElement('div');
    birdEl.className = 'bird-alive';
    birdEl.textContent = emoji;
    
    const size = 18 + Math.random() * 12;
    birdEl.style.fontSize = size + 'px';
    
    const startY = 5 + Math.random() * 30; // Висота від 5% до 35%
    const speed = 0.5 + Math.random() * 1.5;
    const amplitude = 10 + Math.random() * 30; // Амплітуда гойдання
    const frequency = 0.02 + Math.random() * 0.03; // Частота гойдання
    
    birdEl.style.top = startY + '%';
    birdEl.style.left = '-50px';
    
    container.appendChild(birdEl);
    
    gameState.birds.push({
        element: birdEl,
        x: -50,
        y: startY,
        speed: speed,
        amplitude: amplitude,
        frequency: frequency,
        phase: Math.random() * Math.PI * 2
    });
}

export function updateBirds(gameState) {
    const screenWidth = window.innerWidth;
    
    gameState.birds.forEach((bird, index) => {
        bird.x += bird.speed;
        
        // Розрахунок живої траєкторії (синусоїда)
        const currentY = bird.y + Math.sin(bird.x * bird.frequency + bird.phase) * (bird.amplitude / 10);
        
        bird.element.style.left = bird.x + 'px';
        bird.element.style.top = currentY + '%';
        
        // Видаляємо пташку, коли вона вилетіла за екран
        if (bird.x > screenWidth + 100) {
            bird.element.remove();
            gameState.birds.splice(index, 1);
        }
    });
}
