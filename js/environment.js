/**
 * Модуль керування живим світом (природа, трава, пташки)
 */

export function initLivingWorld(gameState) {
    console.log("🌿 Ініціалізація живого світу...");
    
    init3DGrass();
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

function init3DGrass() {
    console.log("Initializing 3D Grass...");
    const container = document.getElementById('three-grass-container');
    if (!container) {
        console.error("Three-grass-container not found!");
        return;
    }

    // 1. Сцена та Камера
    const scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight * 0.3);
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    

    // 2. Освітлення
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.0);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#ffffff', 1.0);
    sunLight.position.set(10, 30, 20);
    scene.add(sunLight);

    // 3. Геометрія травинки
    const bladeWidth = 0.2;
    const bladeHeight = 3.0;
    const joints = 4;
    const baseGeometry = new THREE.ConeGeometry(bladeWidth, bladeHeight, 3, joints);
    baseGeometry.translate(0, bladeHeight / 2, 0);

    // Use BasicMaterial for debugging to rule out lighting issues
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#3B5B32'),
    });

    // 4. Генерація трави (InstancedMesh)
    const count = 15000;
    const instanceMesh = new THREE.InstancedMesh(baseGeometry, material, count);
    const dummy = new THREE.Object3D();
    const positions = [];
    const rotates = [];
    const radius = 50;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r;
        const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;

        dummy.position.set(x, y, z);
        dummy.rotation.set(
            (Math.random() - 0.5) * 0.4,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.4
        );
        const scaleY = 0.7 + Math.random() * 0.6;
        dummy.scale.set(1, scaleY, 1);
        dummy.updateMatrix();
        instanceMesh.setMatrixAt(i, dummy.matrix);

        positions.push(dummy.position.clone());
        rotates.push(dummy.rotation.clone());
    }
    scene.add(instanceMesh);

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();


        for (let i = 0; i < count; i++) {
            instanceMesh.getMatrixAt(i, dummy.matrix);
            const pos = positions[i];
            const rot = rotates[i];

            const windX = Math.sin(elapsedTime * 2 + pos.x * 0.2 + pos.z * 0.1) * 0.12;
            const windZ = Math.cos(elapsedTime * 1.5 + pos.z * 0.2) * 0.12;

            dummy.position.copy(pos);
            dummy.rotation.set(rot.x + windX, rot.y, rot.z + windZ);
            dummy.scale.set(1, 0.7 + (Math.sin(elapsedTime + i) * 0.05 + 0.5), 1);
            dummy.updateMatrix();
            instanceMesh.setMatrixAt(i, dummy.matrix);
        }
        instanceMesh.instanceMatrix.needsUpdate = true;
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || (window.innerHeight * 0.3);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    animate();
}

function createTrees() {
    const container = document.getElementById('trees-container');
    if (!container) return;

    container.innerHTML = ''; // Clear existing
    const treeCount = 5;
    for (let i = 0; i < treeCount; i++) {
        const tree = document.createElement('div');
        tree.className = 'tree';
        
        const left = 10 + Math.random() * 80;
        const scale = 0.7 + Math.random() * 0.5;
        
        tree.style.left = left + '%';
        tree.style.transform = `scale(${scale})`;
        
        // 1. Shadow
        const shadow = document.createElement('div');
        shadow.className = 'tree-shadow';
        tree.appendChild(shadow);
        
        // 2. Crown (Cloud-like layered foliage)
        const crown = document.createElement('div');
        crown.className = 'tree-crown';
        
        // Create multiple clusters for a "cloud" look
        const clusters = [
            { w: 60, h: 50, x: 10, y: 10, type: 'shadow' },
            { w: 50, h: 40, x: 20, y: 0, type: 'highlight' },
            { w: 40, h: 40, x: 0, y: 20, type: 'shadow' },
            { w: 45, h: 35, x: 30, y: 15, type: 'highlight' },
            { w: 30, h: 30, x: 25, y: 30, type: 'shadow' },
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
        trunk.style.height = (40 + Math.random() * 20) + 'px';
        
        tree.appendChild(crown);
        tree.appendChild(trunk);
        
        container.appendChild(tree);
    }
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
