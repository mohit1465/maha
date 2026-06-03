document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return;
    }

    const assets = [
        { src: 'assets/Particles/1 al.png', type: 'almond', crop: { x: 14, y: 27, width: 230, height: 469 } },
        { src: 'assets/Particles/2 al.png', type: 'almond', crop: { x: 19, y: 23, width: 220, height: 480 } },
        { src: 'assets/Particles/3 al.png', type: 'almond', crop: { x: 19, y: 17, width: 329, height: 248 } },
        { src: 'assets/Particles/4 al.png', type: 'almond', crop: { x: 28, y: 33, width: 393, height: 258 } },
        { src: 'assets/Particles/1 kesar.png', type: 'saffron', crop: { x: 23, y: 29, width: 148, height: 481 } },
        { src: 'assets/Particles/2 kesar.png', type: 'saffron', crop: { x: 54, y: 25, width: 170, height: 495 } },
        { src: 'assets/Particles/3 kesar.png', type: 'saffron', crop: { x: 32, y: 19, width: 116, height: 494 } },
        { src: 'assets/Particles/4 kesar.png', type: 'saffron', crop: { x: 36, y: 30, width: 103, height: 446 } },
        { src: 'assets/Particles/5 kesar.png', type: 'saffron', crop: { x: 11, y: 19, width: 149, height: 469 } },
        { src: 'assets/Particles/6 kesar.png', type: 'saffron', crop: { x: 29, y: 30, width: 115, height: 442 } }
    ].map((asset) => {
        const img = new Image();
        const loadedAsset = { ...asset, img, ready: false };

        img.onload = () => {
            loadedAsset.ready = true;
        };
        img.src = asset.src;

        return loadedAsset;
    });

    const particles = [];
    const maxParticles = prefersReducedMotion ? 10 : 30;
    const spawnDelay = prefersReducedMotion ? 110 : 68;
    const selectionStyles = {
        bodyUserSelect: '',
        htmlUserSelect: '',
        bodyWebkitUserSelect: '',
        htmlWebkitUserSelect: ''
    };
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
        || window.matchMedia('(hover: none) and (pointer: coarse)').matches
        || navigator.maxTouchPoints > 0
        || 'ontouchstart' in window
        || window.innerWidth <= 768;

    let cursorImg = null;

    if (!isMobileDevice) {
        cursorImg = document.createElement('img');
        cursorImg.id = 'customCursor';
        cursorImg.src = '../assets/Particles/Almond.png';
        cursorImg.alt = '';
        cursorImg.draggable = false;
        cursorImg.style.position = 'fixed';
        cursorImg.style.top = '0';
        cursorImg.style.left = '0';
        cursorImg.style.pointerEvents = 'none';
        cursorImg.style.zIndex = '2147483647';
        cursorImg.style.transform = 'translate(calc(-50% + 15px), calc(-50% + 15px))';
        cursorImg.style.display = 'none';
        document.body.appendChild(cursorImg);
        document.body.classList.add('custom-cursor-active');
    }

    const pointer = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        lastX: window.innerWidth / 2,
        lastY: window.innerHeight / 2,
        down: false,
        lastSpawn: 0
    };

    let animationFrame = null;
    let lastFrameTime = 0;
    let selectionLocked = false;

    canvas.id = 'effectCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position: fixed',
        'inset: 0',
        'width: 100%',
        'height: 100%',
        'pointer-events: none',
        'z-index: 99999'
    ].join(';');
    document.body.appendChild(canvas);

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function getReadyAsset(type) {
        const readyAssets = assets.filter((asset) => asset.type === type && asset.ready);

        if (!readyAssets.length) {
            return null;
        }

        return readyAssets[Math.floor(Math.random() * readyAssets.length)];
    }

    function easeOut(value) {
        return 1 - Math.pow(1 - value, 3);
    }

    class ImageParticle {
        constructor(x, y, options = {}) {
            const type = options.type || (Math.random() < 0.15 ? 'almond' : 'saffron');
            const asset = getReadyAsset(type);

            if (!asset) {
                this.dead = true;
                return;
            }

            const direction = options.direction ?? randomBetween(0, Math.PI * 2);
            const speed = randomBetween(0.006, type === 'almond' ? 0.018 : 0.022) + (options.burst || 0);

            this.asset = asset;
            this.dead = false;
            this.type = type;
            this.x = x + randomBetween(-4, 4);
            this.y = y + randomBetween(-4, 4);
            this.vx = Math.cos(direction) * speed + randomBetween(-0.05, 0.05);
            this.vy = Math.sin(direction) * speed - randomBetween(0.006, 0.014);
            this.longSide = type === 'almond' ? randomBetween(20, 30) : randomBetween(20, 31);
            this.age = 0;
            this.duration = type === 'almond' ? randomBetween(1250, 1650) : randomBetween(1150, 1550);
            this.rotation = randomBetween(0, Math.PI * 2);
            this.rotationSpeed = randomBetween(-0.0016, 0.0016);
            this.wobble = randomBetween(0.018, 0.045);
            this.seed = randomBetween(0, Math.PI * 2);
            this.alpha = type === 'almond' ? 0.88 : 0.78;
        }

        update(deltaMs) {
            if (this.dead) {
                return;
            }

            const step = Math.min(deltaMs, 32);

            this.age += step;
            this.x += this.vx * step + Math.sin(this.age * 0.004 + this.seed) * this.wobble * step;
            this.y += this.vy * step;
            this.vx *= Math.pow(0.998, step);
            this.vy += 0.000025 * step;
            this.rotation += this.rotationSpeed * step;
        }

        draw() {
            if (this.dead || !this.asset.ready) {
                return;
            }

            const progress = Math.min(this.age / this.duration, 1);
            const fadeIn = Math.min(1, progress / 0.18);
            const fadeOut = progress < 0.62 ? 1 : 1 - easeOut((progress - 0.62) / 0.38);
            const alpha = this.alpha * fadeIn * fadeOut;

            if (alpha < 0.015) {
                return;
            }

            const { img, crop } = this.asset;
            const scale = 0.88 + easeOut(Math.min(progress, 0.8) / 0.8) * 0.12;
            const ratio = crop.width / crop.height;
            const width = ratio >= 1 ? this.longSide * scale : this.longSide * ratio * scale;
            const height = ratio >= 1 ? this.longSide / ratio * scale : this.longSide * scale;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(Math.round(this.x * 10) / 10, Math.round(this.y * 10) / 10);
            ctx.rotate(this.rotation);
            ctx.drawImage(
                img,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                -width / 2,
                -height / 2,
                width,
                height
            );
            ctx.restore();
        }

        get isDead() {
            return this.dead || this.age >= this.duration;
        }
    }

    function addParticle(x, y, options = {}) {
        if (particles.length >= maxParticles) {
            return;
        }

        const particle = new ImageParticle(x, y, options);

        if (!particle.dead) {
            particles.push(particle);
        }
    }

    function spawnTrail(x, y, speed) {
        const now = performance.now();

        if (now - pointer.lastSpawn < spawnDelay) {
            return;
        }

        pointer.lastSpawn = now;

        const driftDirection = Math.atan2(pointer.lastY - y, pointer.lastX - x);
        addParticle(x, y, {
            direction: driftDirection + randomBetween(-0.38, 0.38),
            type: Math.random() < 0.12 ? 'almond' : 'saffron',
            burst: Math.min(speed * 0.000035, 0.006)
        });

        startAnimation();
    }

    function spawnBloom(x, y) {
        const count = prefersReducedMotion ? 2 : 5;

        for (let i = 0; i < count; i += 1) {
            addParticle(x, y, {
                burst: randomBetween(0.006, 0.018),
                direction: (Math.PI * 2 * i) / count + randomBetween(-0.18, 0.18),
                type: i === 0 && Math.random() < 0.3 ? 'almond' : 'saffron'
            });
        }

        startAnimation();
    }

    function normalizeEvent(event) {
        if (event.touches && event.touches.length) {
            return event.touches[0];
        }

        return event;
    }

    function updatePointer(event) {
        const normalizedEvent = normalizeEvent(event);
        const speed = Math.hypot(normalizedEvent.clientX - pointer.x, normalizedEvent.clientY - pointer.y);

        pointer.lastX = pointer.x;
        pointer.lastY = pointer.y;
        pointer.x = normalizedEvent.clientX;
        pointer.y = normalizedEvent.clientY;

        return speed;
    }

    function updateCursor(event) {
        if (!cursorImg) {
            return;
        }

        const normalizedEvent = normalizeEvent(event);
        cursorImg.style.display = 'block';
        cursorImg.style.left = `${normalizedEvent.clientX}px`;
        cursorImg.style.top = `${normalizedEvent.clientY}px`;
    }

    function movePointer(event) {
        updateCursor(event);

        if (!pointer.down) {
            return;
        }

        clearTextSelection();
        spawnTrail(pointer.x, pointer.y, updatePointer(event));
    }

    function hideCursor() {
        if (cursorImg) {
            cursorImg.style.display = 'none';
        }
    }

    function isEditableTarget(target) {
        return target instanceof Element
            && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    }

    function isInteractiveTarget(target) {
        return target instanceof Element
            && Boolean(target.closest('a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]'));
    }

    function clearTextSelection() {
        const selection = window.getSelection && window.getSelection();

        if (selection && selection.rangeCount) {
            selection.removeAllRanges();
        }
    }

    function lockTextSelection() {
        if (selectionLocked) {
            return;
        }

        selectionStyles.bodyUserSelect = document.body.style.userSelect;
        selectionStyles.htmlUserSelect = document.documentElement.style.userSelect;
        selectionStyles.bodyWebkitUserSelect = document.body.style.webkitUserSelect;
        selectionStyles.htmlWebkitUserSelect = document.documentElement.style.webkitUserSelect;

        document.body.style.userSelect = 'none';
        document.documentElement.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.documentElement.style.webkitUserSelect = 'none';
        selectionLocked = true;
    }

    function unlockTextSelection() {
        if (!selectionLocked) {
            clearTextSelection();
            return;
        }

        document.body.style.userSelect = selectionStyles.bodyUserSelect;
        document.documentElement.style.userSelect = selectionStyles.htmlUserSelect;
        document.body.style.webkitUserSelect = selectionStyles.bodyWebkitUserSelect;
        document.documentElement.style.webkitUserSelect = selectionStyles.htmlWebkitUserSelect;
        selectionLocked = false;
        clearTextSelection();
    }

    function animate(now) {
        animationFrame = null;
        const deltaMs = lastFrameTime ? now - lastFrameTime : 16;
        lastFrameTime = now;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = particles.length - 1; i >= 0; i -= 1) {
            particles[i].update(deltaMs);

            if (particles[i].isDead) {
                particles.splice(i, 1);
                continue;
            }

            particles[i].draw();
        }

        if (particles.length) {
            startAnimation();
        } else {
            lastFrameTime = 0;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    function startAnimation() {
        if (animationFrame === null) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    window.addEventListener('resize', resizeCanvas);

    if (isMobileDevice) {
        window.addEventListener('touchmove', movePointer, { passive: true });
        window.addEventListener('touchstart', (event) => {
            pointer.down = true;
            updatePointer(event);
            updateCursor(event);
            const point = normalizeEvent(event);
            spawnBloom(point.clientX, point.clientY);
            clearTextSelection();

            if (!isEditableTarget(event.target)) {
                lockTextSelection();
            }

            if (!isInteractiveTarget(event.target)) {
                event.preventDefault();
            }
        }, { passive: false });
        window.addEventListener('touchend', () => {
            pointer.down = false;
            unlockTextSelection();
            hideCursor();
        });
        window.addEventListener('touchcancel', () => {
            pointer.down = false;
            unlockTextSelection();
            hideCursor();
        });
    } else {
        window.addEventListener('pointermove', movePointer, { passive: true });
        window.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) {
                return;
            }

            pointer.down = true;
            updatePointer(event);
            updateCursor(event);
            spawnBloom(event.clientX, event.clientY);
            clearTextSelection();

            if (!isEditableTarget(event.target)) {
                lockTextSelection();
            }

            if (!isInteractiveTarget(event.target)) {
                event.preventDefault();
            }
        });
        window.addEventListener('pointerup', () => {
            pointer.down = false;
            unlockTextSelection();
        });
        window.addEventListener('pointercancel', () => {
            pointer.down = false;
            unlockTextSelection();
        });
        window.addEventListener('pointerleave', hideCursor);
    }

    window.addEventListener('blur', () => {
        pointer.down = false;
        unlockTextSelection();
        hideCursor();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            particles.length = 0;
            pointer.down = false;
            lastFrameTime = 0;
            unlockTextSelection();
            hideCursor();
        }
    });

    resizeCanvas();
});
