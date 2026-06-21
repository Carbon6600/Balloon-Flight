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

let grassCanvas, grassCtx;
let grassWidth, grassHeight, grassDpr;
let grassClumps = [];
let currentGrassWeather = 'CLEAR';

const GRASS_STYLES = {
    'CLEAR': {
        layers: [
            { color: '#2D4A2D', heightRange: [10, 20], count: 40, scale: 0.6, opacity: 0.7 },
            { color: '#3B5B32', heightRange: [15, 30], count: 60, scale: 0.8, opacity: 0.9 },
            { color: '#5A8A5A', heightRange: [20, 45], count: 50, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0.2,
        windStrength: 5
    },
    'CLOUDY': {
        layers: [
            { color: '#3D5A3D', heightRange: [10, 20], count: 40, scale: 0.6, opacity: 0.7 },
            { color: '#4B6B42', heightRange: [15, 30], count: 60, scale: 0.8, opacity: 0.9 },
            { color: '#6A8A6A', heightRange: [20, 45], count: 50, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0.4,
        windStrength: 7
    },
    'RAINY': {
        layers: [
            { color: '#1D3A1D', heightRange: [8, 15], count: 50, scale: 0.6, opacity: 0.7 },
            { color: '#2B4B22', heightRange: [12, 25], count: 70, scale: 0.8, opacity: 0.9 },
            { color: '#3A5A3A', heightRange: [15, 35], count: 60, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0,
        windStrength: 10
    },
    'STORMY': {
        layers: [
            { color: '#0D2A0D', heightRange: [5, 15], count: 30, scale: 0.6, opacity: 0.7 },
            { color: '#1B3B12', heightRange: [10, 20], count: 40, scale: 0.8, opacity: 0.9 },
            { color: '#2A4A2A', heightRange: [15, 30], count: 40, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0,
        windStrength: 25
    },
    'SNOWY': {
        layers: [
            { color: '#A0B0A0', heightRange: [5, 10], count: 30, scale: 0.6, opacity: 0.7 },
            { color: '#B0C0B0', heightRange: [8, 15], count: 40, scale: 0.8, opacity: 0.9 },
            { color: '#C0D0C0', heightRange: [10, 20], count: 30, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0,
        windStrength: 3
    },
    'NIGHT': {
        layers: [
            { color: '#0D1A0D', heightRange: [10, 20], count: 40, scale: 0.6, opacity: 0.7 },
            { color: '#1B2B12', heightRange: [15, 30], count: 60, scale: 0.8, opacity: 0.9 },
            { color: '#2A3A2A', heightRange: [20, 45], count: 50, scale: 1.0, opacity: 1.0 },
        ],
        seedChance: 0,
        windStrength: 4
    }
};

function init2DGrass() {
    console.log("🌿 Initializing 2D Canvas Environment...");
    const container = document.getElementById('three-grass-container');
    if (!container) return;

    grassCanvas = document.createElement('canvas');
    grassCanvas.style.display = 'block';
    grassCanvas.style.width = '100%';
    grassCanvas.style.height = '100%';
    grassCtx = grassCanvas.getContext('2d');
    container.appendChild(grassCanvas);

    const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        grassDpr = window.devicePixelRatio || 1;
        grassWidth = rect.width;
        grassHeight = rect.height;
        grassCanvas.width = grassWidth * grassDpr;
        grassCanvas.height = grassHeight * grassDpr;
        grassCtx.scale(grassDpr, grassDpr);
        initGrass();
    };

    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(resizeCanvas);
    });
    resizeObserver.observe(container);

    resizeCanvas();
    requestAnimationFrame(animateGrass);
}

function initGrass() {
    grassClumps = [];
    const style = GRASS_STYLES[currentGrassWeather] || GRASS_STYLES['CLEAR'];
    const isMobile = grassWidth < 768;
    const densityMultiplier = isMobile ? 0.6 : 1.0;
    const sizeScale = isMobile ? 0.7 : 1.0;

    style.layers.forEach((layer, layerIdx) => {
        const count = Math.floor(layer.count * densityMultiplier);
        for (let i = 0; i < count; i++) {
            const centerX = Math.random() * grassWidth;
            const centerY = grassHeight;
            const bladesCount = 3 + Math.floor(Math.random() * 5);
            const blades = [];

            for (let j = 0; j < bladesCount; j++) {
                blades.push({
                    offsetX: (Math.random() - 0.5) * 10 * layer.scale * sizeScale,
                    height: (layer.heightRange[0] + Math.random() * (layer.heightRange[1] - layer.heightRange[0])) * sizeScale,
                    lean: (Math.random() - 0.5) * 10 * sizeScale,
                    width: (2 + Math.random() * 2) * sizeScale,
                    phase: Math.random() * Math.PI * 2,
                    hasSeed: Math.random() < style.seedChance
                });
            }
            grassClumps.push({ layerIdx, centerX, centerY, blades });
        }
    });
}

function drawBlade(ctx, x, y, blade, time, color) {
    const style = GRASS_STYLES[currentGrassWeather] || GRASS_STYLES['CLEAR'];
    const wind = Math.sin(time + x * 0.01) * style.windStrength;
    const tipX = x + blade.lean + wind;
    const tipY = y - blade.height;
    const baseW = blade.width;

    ctx.beginPath();
    ctx.moveTo(x - baseW / 2, y);
    ctx.quadraticCurveTo(x - baseW, y - blade.height / 2, tipX, tipY);
    ctx.quadraticCurveTo(x + baseW, y - blade.height / 2, x + baseW / 2, y);
    ctx.closePath();
    ctx.fill();

    if (blade.hasSeed) {
        ctx.fillStyle = '#C5E1A5';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animateGrass(time) {
    if (!grassCtx) return;
    grassCtx.clearRect(0, 0, grassWidth, grassHeight);
    const t = time * 0.002;

    const style = GRASS_STYLES[currentGrassWeather] || GRASS_STYLES['CLEAR'];
    style.layers.forEach((layer, layerIdx) => {
        grassCtx.fillStyle = layer.color;
        grassCtx.globalAlpha = layer.opacity;
        
        grassClumps.filter(c => c.layerIdx === layerIdx).forEach(clump => {
            clump.blades.forEach(blade => {
                drawBlade(grassCtx, clump.centerX + blade.offsetX, clump.centerY, blade, t, layer.color);
            });
        });
    });

    requestAnimationFrame(animateGrass);
}

export function updateGrassWeather(weatherType) {
    currentGrassWeather = weatherType;
    initGrass();
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

        const isMobile = window.innerWidth < 768;
        const treeCount = isMobile ? (1 + Math.floor(Math.random() * 2)) : (3 + Math.floor(Math.random() * 3));
        for (let i = 0; i < treeCount; i++) {
            const tree = document.createElement('div');
            tree.className = 'tree';
            
            // Визначаємо позицію X (від 10% до 90%, щоб не вилазили за краї)
            const leftPercent = 10 + Math.random() * 80;
            const scale = isMobile ? (0.4 + Math.random() * 0.4) : (0.6 + Math.random() * 0.6);
            
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

const BIRD_TYPES = {
    stork: {
        svg: `
            <svg viewBox="0 0 120 60" width="100%" height="100%" class="bird-svg">
                <path d="M30,35 L10,40" stroke="#FF4500" stroke-width="1.5" fill="none" />
                <path d="M30,38 L10,45" stroke="#FF4500" stroke-width="1.5" fill="none" />
                <g class="bird-wing far">
                    <path d="M45,32 Q60,0 90,30 Z" fill="#DDD" />
                </g>
                <path class="bird-body" d="M30,35 Q50,30 65,30 Q75,30 80,20 L82,20 L82,24 Q75,35 65,35 L30,35" fill="#FFFFFF" />
                <path class="bird-beak" d="M82,22 L110,24 L82,26 Z" fill="#FF0000" />
                <g class="bird-wing near">
                    <path d="M45,32 Q60,-10 90,30 Z" fill="#FFFFFF" />
                </g>
            </svg>
        `,
        speedRange: [0.5, 2.0],
        amplitudeRange: [10, 40]
    },
    parrot: {
        svg: `
            <svg viewBox="0 0 120 60" width="100%" height="100%" class="bird-svg">
                <path d="M30,35 L10,45 L15,50 L30,40" fill="#0000FF" />
                <g class="bird-wing far">
                    <path d="M45,32 Q60,0 90,30 Z" fill="#0000CC" />
                    <path d="M60,10 L70,15 L60,20 Z" fill="#FFFF00" />
                </g>
                <path class="bird-body" d="M30,35 Q50,30 60,35 Q65,30 65,25 Q60,20 55,20 Q50,20 45,25 L30,35" fill="#FF0000" />
                <path class="bird-beak" d="M65,25 Q68,25 68,30 Q65,32 63,30 Z" fill="#EEDD82" />
                <g class="bird-wing near">
                    <path d="M45,32 Q60,-10 90,30 Z" fill="#0000FF" />
                    <path d="M60,-10 L70,0 L60,10 Z" fill="#FFFF00" />
                </g>
            </svg>
        `,
        speedRange: [0.8, 2.5],
        amplitudeRange: [15, 50]
    }
};

export function spawnBird(gameState) {
    const container = document.getElementById('birds-container');
    if (!container) return;
    
    const types = Object.keys(BIRD_TYPES);
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const birdType = BIRD_TYPES[typeKey];
    
    const birdEl = document.createElement('div');
    birdEl.className = `bird-alive bird-${typeKey}`;
    birdEl.innerHTML = birdType.svg;
    
    const size = 18 + Math.random() * 12;
    birdEl.style.width = size + 'px';
    birdEl.style.height = size + 'px';
    
    const startY = 5 + Math.random() * 30;
    const speed = birdType.speedRange[0] + Math.random() * (birdType.speedRange[1] - birdType.speedRange[0]);
    const amplitude = birdType.amplitudeRange[0] + Math.random() * (birdType.amplitudeRange[1] - birdType.amplitudeRange[0]);
    const frequency = 0.02 + Math.random() * 0.03;
    
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
