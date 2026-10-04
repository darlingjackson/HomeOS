/* ============================================================
   HOMEOS // SPRING BLOOM

   Interactive spring background used by Seasonal Care and Calendar.
============================================================ */
(() => {
    "use strict";
    const HomeOS = window.HomeOS = window.HomeOS || {};
    HomeOS.components = HomeOS.components || {};
    const instances = new WeakMap();
    const PALETTES = [
        { petals: ["#f6c9d9", "#efa8c1", "#df7faa"], centre: "#fff1a8", stem: "#85b89f" },
        { petals: ["#eee7f5", "#d7c4ea", "#b99fd8"], centre: "#fff4bd", stem: "#97b99a" },
        { petals: ["#b9dedf", "#8fd0d0", "#68bfc1"], centre: "#fff3b0", stem: "#8fb69b" },
        { petals: ["#f8d9e5", "#f2b4cc", "#e78eb3"], centre: "#fff8cf", stem: "#80b8a7" },
        { petals: ["#dce8c8", "#bdd4a8", "#9cbd8c"], centre: "#fff0a0", stem: "#72a58d" },
        { petals: ["#fffaf4", "#f5e5df", "#eeced7"], centre: "#e5bb67", stem: "#98baa3" },
        { petals: ["#e5d5f1", "#c9b2e2", "#ac91d1"], centre: "#fff2aa", stem: "#8ab5a0" }
    ];
    const random = (min, max) => Math.random() * (max - min) + min;
    const choose = list => list[Math.floor(Math.random() * list.length)];
    const hexToRgba = (hex, alpha) => {
        const value = String(hex || "#ffffff").replace("#", "");
        const expanded = value.length === 3
            ? value.split("").map(char => char + char).join("")
            : value;
        const number = Number.parseInt(expanded, 16);
        return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
    };
    function createInstance(host, options = {}) {
        if (!host)
            return null;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const mode = options.mode || "season";
        const maxFlowers = options.maxFlowers || (mode === "calendar" ? 54 : 72);
        const maxPetals = options.maxPetals || (mode === "calendar" ? 210 : 280);
        const canvas = document.createElement("canvas");
        canvas.className = `spring-bloom-canvas spring-bloom-canvas--${mode}`;
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
            canvas.remove();
            return null;
        }
        const flowers = [];
        const petals = [];
        let width = 1;
        let height = 1;
        let dpr = 1;
        let localX = window.innerWidth / 2;
        let localY = window.innerHeight / 2;
        let ringX = localX;
        let ringY = localY;
        let lastSpawnAt = 0;
        let lastSpawnX = localX;
        let lastSpawnY = localY;
        let frameId = 0;
        let destroyed = false;
        // --- Petals ---
        class Petal {
            constructor(x, y, color, burst = 1) {
                this.x = x + random(-18, 18);
                this.y = y + random(-12, 12);
                this.vx = random(-0.75, 0.75) * burst;
                this.vy = random(0.28, 0.82) * burst;
                this.rotation = random(0, Math.PI * 2);
                this.rotationVelocity = random(-0.06, 0.06);
                this.size = random(3.2, 7.7);
                this.color = color;
                this.alpha = random(0.58, 0.9);
                this.life = random(150, 245);
                this.age = 0;
                this.phase = random(0, Math.PI * 2);
            }
            draw() {
                this.age += 1;
                this.x += this.vx + Math.sin(this.age * 0.035 + this.phase) * 0.4;
                this.y += this.vy;
                this.rotation += this.rotationVelocity;
                this.vy *= 1.004;
                const alpha = Math.max(0, this.alpha * (1 - this.age / this.life));
                if (alpha <= 0)
                    return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.47, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            isDead() {
                return this.age >= this.life;
            }
        }
        // --- Flowers ---
        class Flower {
            constructor(x, y, radius) {
                this.x = x;
                this.y = y;
                this.age = 0;
                this.life = random(300, 500);
                this.petalCount = 5 + Math.floor(Math.random() * 6);
                this.maxRadius = radius || random(mode === "calendar" ? 15 : 18, mode === "calendar" ? 32 : 40);
                this.innerRadius = this.maxRadius * random(0.27, 0.41);
                this.rotation = random(0, Math.PI * 2);
                this.swayAmplitude = random(0.035, 0.08);
                this.swaySpeed = random(0.014, 0.027);
                this.swayOffset = random(0, Math.PI * 2);
                this.floatY = random(0.02, 0.06);
                this.petalWidth = random(0.34, 0.56);
                this.petalBulge = random(0.56, 0.84);
                this.doubleLayer = Math.random() < 0.36;
                this.innerScale = random(0.56, 0.72);
                this.innerRotationOffset = Math.PI / this.petalCount;
                this.breakStarted = false;
                const palette = choose(PALETTES);
                const second = choose(PALETTES);
                this.petalColor = choose(palette.petals);
                this.petalColorTwo = choose(second.petals);
                this.centreColor = palette.centre;
                this.stemColor = palette.stem;
            }
            easeOutElastic(t) {
                const c4 = (2 * Math.PI) / 3;
                if (t === 0 || t === 1)
                    return t;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
            release(count = 3, burst = 1) {
                for (let index = 0; index < count && petals.length < maxPetals; index += 1) {
                    petals.push(new Petal(this.x, this.y, index % 2 ? this.petalColorTwo : this.petalColor, burst));
                }
            }
            drawPetalLayer(radius, innerRadius, rotation, color, alphaScale) {
                const step = (Math.PI * 2) / this.petalCount;
                const petalWidth = radius * this.petalWidth;
                for (let index = 0; index < this.petalCount; index += 1) {
                    const angle = rotation + index * step;
                    const axisX = Math.cos(angle);
                    const axisY = Math.sin(angle);
                    const perpendicularX = -axisY;
                    const perpendicularY = axisX;
                    const tipX = axisX * radius;
                    const tipY = axisY * radius;
                    const c1x = axisX * innerRadius + perpendicularX * petalWidth + axisX * (radius - innerRadius) * this.petalBulge;
                    const c1y = axisY * innerRadius + perpendicularY * petalWidth + axisY * (radius - innerRadius) * this.petalBulge;
                    const c2x = axisX * innerRadius - perpendicularX * petalWidth + axisX * (radius - innerRadius) * this.petalBulge;
                    const c2y = axisY * innerRadius - perpendicularY * petalWidth + axisY * (radius - innerRadius) * this.petalBulge;
                    const gradient = ctx.createRadialGradient(0, innerRadius * 0.45, 0, 0, innerRadius * 0.45, radius);
                    gradient.addColorStop(0, hexToRgba(color, 0.98));
                    gradient.addColorStop(0.55, hexToRgba(color, 0.88));
                    gradient.addColorStop(1, hexToRgba(color, 0.22));
                    ctx.save();
                    ctx.globalAlpha *= alphaScale;
                    ctx.beginPath();
                    ctx.moveTo(axisX * innerRadius, axisY * innerRadius);
                    ctx.bezierCurveTo(c1x, c1y, tipX + perpendicularX * petalWidth * 0.48, tipY + perpendicularY * petalWidth * 0.48, tipX, tipY);
                    ctx.bezierCurveTo(tipX - perpendicularX * petalWidth * 0.48, tipY - perpendicularY * petalWidth * 0.48, c2x, c2y, axisX * innerRadius, axisY * innerRadius);
                    ctx.closePath();
                    ctx.fillStyle = gradient;
                    ctx.shadowColor = "rgba(101,72,91,.10)";
                    ctx.shadowBlur = 4;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }
            draw() {
                this.age += 1;
                this.y += this.floatY;
                const bloomIn = 34;
                const fadeOut = 64;
                let scale = 1;
                let alpha = 1;
                if (this.age < bloomIn) {
                    scale = this.easeOutElastic(this.age / bloomIn);
                    alpha = Math.min(1, this.age / bloomIn);
                }
                else if (this.age > this.life - fadeOut) {
                    const t = (this.age - (this.life - fadeOut)) / fadeOut;
                    alpha = 1 - t * t;
                    if (!this.breakStarted && t > 0.12) {
                        this.breakStarted = true;
                        this.release(Math.min(this.petalCount + 2, 10), 1.05);
                    }
                    else if (Math.random() < 0.055) {
                        this.release(1, 0.8);
                    }
                }
                if (alpha <= 0)
                    return;
                const sway = Math.sin(this.age * this.swaySpeed + this.swayOffset) * this.swayAmplitude;
                const rotation = this.rotation + sway;
                const radius = this.maxRadius * scale;
                const innerRadius = this.innerRadius * scale;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = hexToRgba(this.stemColor, 0.6);
                ctx.lineWidth = Math.max(1, radius * 0.048);
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(0, innerRadius * 0.5);
                ctx.quadraticCurveTo(radius * 0.22, innerRadius + radius * 0.45, radius * 0.08, innerRadius + radius * 0.84);
                ctx.stroke();
                this.drawPetalLayer(radius, innerRadius, rotation, this.petalColor, 1);
                if (this.doubleLayer) {
                    this.drawPetalLayer(radius * this.innerScale, innerRadius * 0.9, rotation + this.innerRotationOffset, this.petalColorTwo, 0.88);
                }
                const centre = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
                centre.addColorStop(0, this.centreColor);
                centre.addColorStop(0.65, hexToRgba(this.centreColor, 0.84));
                centre.addColorStop(1, "rgba(120,86,60,.14)");
                ctx.beginPath();
                ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
                ctx.fillStyle = centre;
                ctx.fill();
                ctx.restore();
            }
            isDead() {
                return this.age >= this.life;
            }
        }
        // --- Canvas + interaction ---
        const toLocal = (clientX, clientY) => {
            const rect = host.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(rect.width || width, clientX - rect.left)),
                y: Math.max(0, Math.min(rect.height || height, clientY - rect.top))
            };
        };
        const resize = () => {
            const rect = host.getBoundingClientRect();
            width = Math.max(1, Math.round(rect.width || window.innerWidth));
            height = Math.max(1, Math.round(rect.height || window.innerHeight));
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        const spawnFlower = (x, y, radius) => {
            if (flowers.length >= maxFlowers)
                flowers.shift();
            flowers.push(new Flower(x, y, radius));
        };
        const maybeSpawn = (x, y) => {
            const now = performance.now();
            const distance = Math.hypot(x - lastSpawnX, y - lastSpawnY);
            if (now - lastSpawnAt < (mode === "calendar" ? 135 : 110) || distance < 16)
                return;
            spawnFlower(x, y);
            lastSpawnAt = now;
            lastSpawnX = x;
            lastSpawnY = y;
        };
        const drawReducedMotion = () => {
            ctx.clearRect(0, 0, width, height);
            flowers.forEach(flower => {
                flower.age = Math.max(flower.age, 34);
                flower.draw();
            });
        };
        const onPointerMove = event => {
            const local = toLocal(event.clientX, event.clientY);
            localX = local.x;
            localY = local.y;
            if (!reducedMotion)
                maybeSpawn(localX, localY);
        };
        const onPointerDown = event => {
            if (event.pointerType === "mouse" && event.button !== 0)
                return;
            const local = toLocal(event.clientX, event.clientY);
            const count = reducedMotion ? 2 : 5;
            if (reducedMotion) {
                for (let index = 0; index < count; index += 1) {
                    const angle = (index / count) * Math.PI * 2;
                    const distance = 16 + random(0, 26);
                    spawnFlower(local.x + Math.cos(angle) * distance, local.y + Math.sin(angle) * distance, random(16, 30));
                }
                drawReducedMotion();
                return;
            }
            for (let index = 0; index < count; index += 1) {
                const angle = (index / count) * Math.PI * 2;
                const distance = 16 + random(0, 26);
                window.setTimeout(() => {
                    if (!destroyed) {
                        spawnFlower(local.x + Math.cos(angle) * distance, local.y + Math.sin(angle) * distance, random(16, 30));
                    }
                }, index * 55);
            }
        };
        const render = () => {
            if (destroyed)
                return;
            ctx.clearRect(0, 0, width, height);
            for (let index = petals.length - 1; index >= 0; index -= 1) {
                petals[index].draw();
                if (petals[index].isDead())
                    petals.splice(index, 1);
            }
            for (let index = flowers.length - 1; index >= 0; index -= 1) {
                flowers[index].draw();
                if (flowers[index].isDead()) {
                    flowers[index].release(5, 1.05);
                    flowers.splice(index, 1);
                }
            }
            if (!reducedMotion && mode !== "calendar") {
                ringX += (localX - ringX) * 0.12;
                ringY += (localY - ringY) * 0.12;
                ctx.save();
                ctx.beginPath();
                ctx.arc(ringX, ringY, 20, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(212,138,168,.20)";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.restore();
            }
            frameId = requestAnimationFrame(render);
        };
        const seed = (stagger = true) => {
            const cx = width / 2;
            const cy = height * (mode === "calendar" ? 0.26 : 0.42);
            const starts = mode === "calendar"
                ? [[cx - 180, cy + 20], [cx + 150, cy - 15], [cx - 25, cy + 90]]
                : [[cx, cy], [cx - 120, cy + 60], [cx + 120, cy + 40], [cx - 60, cy - 80], [cx + 80, cy - 90]];
            starts.forEach(([x, y], index) => {
                if (!stagger) {
                    spawnFlower(x, y, random(17, 32));
                    return;
                }
                window.setTimeout(() => {
                    if (!destroyed)
                        spawnFlower(x, y, random(17, 32));
                }, index * 180);
            });
        };
        resize();
        host.classList.add("spring-bloom-host");
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        if (reducedMotion) {
            seed(false);
            drawReducedMotion();
        }
        else {
            frameId = requestAnimationFrame(render);
            window.setTimeout(seed, 220);
        }
        return {
            host,
            destroy() {
                if (destroyed)
                    return;
                destroyed = true;
                cancelAnimationFrame(frameId);
                window.removeEventListener("resize", resize);
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerdown", onPointerDown);
                host.classList.remove("spring-bloom-host");
                canvas.remove();
                instances.delete(host);
            }
        };
    }
    // --- Public component ---
    const API = {
        mount(host, options = {}) {
            if (!host)
                return null;
            API.destroy(host);
            const instance = createInstance(host, options);
            if (instance)
                instances.set(host, instance);
            return instance;
        },
        destroy(host) {
            const instance = host ? instances.get(host) : null;
            instance?.destroy();
        }
    };
    HomeOS.components.springBloom = API;
    const autoMountSpringSeason = () => {
        if (document.body.dataset.season === "spring" &&
            document.body.dataset.seasonalView === "detail") {
            const field = document.getElementById("springBloomField");
            if (field)
                API.mount(field, { mode: "season" });
        }
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoMountSpringSeason, { once: true });
    }
    else {
        autoMountSpringSeason();
    }
})();
