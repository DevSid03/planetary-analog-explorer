/* ============================================
   TRINITY INTRO SCREEN
   Rising planets, then a one-by-one slide to
   the centre before the main app is revealed.
============================================ */

(function () {

    const intro = document.getElementById("intro");

    if (!intro) return;

    const enterButton = document.getElementById("intro-enter");
    const canvas = document.getElementById("intro-stars");
    const orbs = Array.from(intro.querySelectorAll(".orb"));

    const reducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Optional real photographs. Drop files with these names into
    // frontend/img/ and they replace the drawn planets automatically.
    const PLANET_PHOTOS = {
        earth: "/static/img/earth.png",
        mars: "/static/img/mars.png",
        moon: "/static/img/moon.png"
    };

    // Timing (ms)
    const FADE_CHROME = 550;
    const SLIDE = 1000;
    const STAGGER = 750;      // gap between one planet starting and the next
    const FINAL_ZOOM = 1100;

    let leaving = false;
    let finishNow = null;


    // ============================================
    // DRAWN PLANETS (used until photos are added)
    // ============================================

    const SHADE = id => `
        <radialGradient id="shade-${id}" cx="34%" cy="30%" r="78%">
            <stop offset=".5" stop-color="#000" stop-opacity="0"/>
            <stop offset="1" stop-color="#000" stop-opacity=".82"/>
        </radialGradient>`;

    function patchDef(id, seed, freq, octaves, color, k, t) {

        const [r, g, b] = color;

        return `
            <filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}"/>
                <feColorMatrix type="matrix" values="
                    0 0 0 0 ${r}
                    0 0 0 0 ${g}
                    0 0 0 0 ${b}
                    ${k} 0 0 0 ${-t}"/>
            </filter>`;
    }

    function patchUse(id, opacity) {
        return `<rect width="200" height="200" filter="url(#${id})" opacity="${opacity}"/>`;
    }

    function planetSVG(type) {

        if (type === "earth") {
            return `
            <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                    <clipPath id="clip-earth"><circle cx="100" cy="100" r="99"/></clipPath>
                    <radialGradient id="ocean-earth" cx="38%" cy="34%" r="78%">
                        <stop offset="0" stop-color="#4a8be0"/>
                        <stop offset=".55" stop-color="#1d52a6"/>
                        <stop offset="1" stop-color="#08224f"/>
                    </radialGradient>
                    ${patchDef("land-earth", 7, "0.017 0.026", 5, [.3, .48, .22], 24, 13.2)}
                    ${patchDef("desert-earth", 21, "0.03 0.04", 4, [.72, .62, .38], 22, 12.6)}
                    ${patchDef("cloud-earth", 3, "0.011 0.05", 5, [1, 1, 1], 9, 5.1)}
                    ${SHADE("earth")}
                </defs>
                <g clip-path="url(#clip-earth)">
                    <circle cx="100" cy="100" r="100" fill="url(#ocean-earth)"/>
                    ${patchUse("land-earth", 1)}
                    ${patchUse("desert-earth", .5)}
                    ${patchUse("cloud-earth", .6)}
                    <ellipse cx="100" cy="6" rx="38" ry="9" fill="#fff" opacity=".55"/>
                    <ellipse cx="100" cy="196" rx="34" ry="8" fill="#fff" opacity=".5"/>
                    <circle cx="100" cy="100" r="100" fill="url(#shade-earth)"/>
                </g>
            </svg>`;
        }

        if (type === "mars") {
            return `
            <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                    <clipPath id="clip-mars"><circle cx="100" cy="100" r="99"/></clipPath>
                    <radialGradient id="base-mars" cx="38%" cy="34%" r="78%">
                        <stop offset="0" stop-color="#f08a45"/>
                        <stop offset=".6" stop-color="#cf6a30"/>
                        <stop offset="1" stop-color="#7a3519"/>
                    </radialGradient>
                    ${patchDef("dark-mars", 11, "0.016 0.026", 5, [.36, .18, .11], 16, 8.9)}
                    ${patchDef("light-mars", 29, "0.02 0.03", 4, [.96, .72, .5], 12, 6.4)}
                    <filter id="blur-mars"><feGaussianBlur stdDeviation="2.2"/></filter>
                    ${SHADE("mars")}
                </defs>
                <g clip-path="url(#clip-mars)">
                    <circle cx="100" cy="100" r="100" fill="url(#base-mars)"/>
                    ${patchUse("light-mars", .4)}
                    ${patchUse("dark-mars", .6)}
                    <ellipse cx="100" cy="5" rx="30" ry="8" fill="#fff" opacity=".8" filter="url(#blur-mars)"/>
                    <circle cx="100" cy="100" r="100" fill="url(#shade-mars)"/>
                </g>
            </svg>`;
        }

        // moon
        return `
        <svg viewBox="0 0 200 200" aria-hidden="true">
            <defs>
                <clipPath id="clip-moon"><circle cx="100" cy="100" r="99"/></clipPath>
                <filter id="relief-moon" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="4" result="t"/>
                    <feDiffuseLighting in="t" lighting-color="#e2e2e2" surfaceScale="4" diffuseConstant="1.05">
                        <feDistantLight azimuth="225" elevation="52"/>
                    </feDiffuseLighting>
                </filter>
                ${patchDef("maria-moon", 17, "0.009 0.012", 4, [.2, .22, .26], 9, 4.5)}
                ${patchDef("craters-moon", 40, "0.11", 2, [.75, .76, .78], 14, 7.6)}
                ${SHADE("moon")}
            </defs>
            <g clip-path="url(#clip-moon)">
                <rect width="200" height="200" fill="#999" filter="url(#relief-moon)"/>
                ${patchUse("maria-moon", .55)}
                ${patchUse("craters-moon", .45)}
                <circle cx="100" cy="100" r="100" fill="url(#shade-moon)"/>
            </g>
        </svg>`;
    }

    function mountPlanets() {

        intro.querySelectorAll(".orb-visual").forEach(visual => {

            const type = visual.dataset.planet;

            visual.innerHTML = planetSVG(type);

            // Swap in a real photo if one has been supplied
            const photo = new Image();

            photo.className = "orb-photo";
            photo.alt = "";
            photo.onload = () => {
                visual.innerHTML = "";
                visual.classList.add("has-photo");
                visual.appendChild(photo);
            };
            photo.src = PLANET_PHOTOS[type];
        });
    }


    // ============================================
    // STARFIELD
    // ============================================

    function drawStars() {

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = intro.clientWidth;
        const h = intro.clientHeight;

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        const ctx = canvas.getContext("2d");

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const count = Math.round((w * h) / 1800);

        for (let i = 0; i < count; i++) {

            const x = Math.random() * w;
            const y = Math.random() * h;
            const big = Math.random() > 0.97;
            const radius = big ? Math.random() * 1.1 + 0.8 : Math.random() * 0.75 + 0.2;
            const alpha = Math.random() * 0.7 + 0.25;
            const tint = Math.random();

            ctx.fillStyle =
                tint > 0.8 ? `rgba(170,200,255,${alpha})` :
                tint > 0.65 ? `rgba(255,230,200,${alpha})` :
                `rgba(255,255,255,${alpha})`;

            if (big) {
                ctx.shadowColor = "rgba(160,200,255,.9)";
                ctx.shadowBlur = 6;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }


    // ============================================
    // ENTER SEQUENCE
    // ============================================

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    function slideTo(orb, dx, dy, scale, duration) {

        return orb.animate(
            [
                { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1 }
            ],
            {
                duration,
                easing: "cubic-bezier(.22, 1, .36, 1)",
                fill: "forwards"
            }
        );
    }

    function closeIntro() {

        intro.classList.add("is-hidden");
        document.body.classList.remove("intro-open");

        // the map was laid out while covered; make sure it is the right size
        if (typeof map !== "undefined" && map && map.invalidateSize) {
            map.invalidateSize();
        }

        // reset for a possible replay
        orbs.forEach(orb => orb.getAnimations().forEach(a => a.cancel()));
        intro.classList.remove("leaving", "fade-out");
        leaving = false;
        finishNow = null;
    }

    async function enter() {

        if (leaving) {
            // second click while animating = skip
            if (finishNow) finishNow();
            return;
        }

        leaving = true;
        intro.classList.add("leaving");

        if (reducedMotion) {
            await wait(300);
            intro.classList.add("fade-out");
            await wait(600);
            closeIntro();
            return;
        }

        let skipped = false;

        finishNow = () => {
            skipped = true;
            intro.classList.add("fade-out");
            setTimeout(closeIntro, 900);
        };

        await wait(FADE_CHROME);

        // Where every planet is heading: the middle of the screen
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const targets = orbs.map(orb => {
            const r = orb.getBoundingClientRect();
            return {
                dx: cx - (r.left + r.width / 2),
                dy: cy - (r.top + r.height / 2)
            };
        });

        // Earth, then Mars, then the Moon: each slides up to the middle
        // while the previous one steps back and fades.
        for (let i = 0; i < orbs.length; i++) {

            if (skipped) return;

            orbs[i].style.zIndex = String(10 + i);

            slideTo(orbs[i], targets[i].dx, targets[i].dy, 1.15, SLIDE);

            if (i > 0) {
                const prev = orbs[i - 1];
                const prevT = targets[i - 1];

                prev.animate(
                    [
                        { transform: `translate(${prevT.dx}px, ${prevT.dy}px) scale(1.15)`, opacity: 1 },
                        { transform: `translate(${prevT.dx}px, ${prevT.dy}px) scale(.6)`, opacity: 0 }
                    ],
                    { duration: SLIDE * 0.9, easing: "ease-in", fill: "forwards" }
                );
            }

            await wait(STAGGER);
        }

        if (skipped) return;

        // The last planet fills the screen as the app is revealed
        await wait(SLIDE - STAGGER + 250);

        if (skipped) return;

        const last = orbs[orbs.length - 1];
        const lastT = targets[targets.length - 1];

        last.animate(
            [
                { transform: `translate(${lastT.dx}px, ${lastT.dy}px) scale(1.15)`, opacity: 1 },
                { transform: `translate(${lastT.dx}px, ${lastT.dy}px) scale(9)`, opacity: 0 }
            ],
            { duration: FINAL_ZOOM, easing: "cubic-bezier(.6, 0, .9, .4)", fill: "forwards" }
        );

        intro.classList.add("fade-out");

        await wait(FINAL_ZOOM);

        if (!skipped) closeIntro();
    }


    // ============================================
    // SHOW / REPLAY
    // ============================================

    function showIntro() {

        document.documentElement.classList.remove("skip-intro");
        intro.classList.remove("is-hidden", "leaving", "fade-out");
        document.body.classList.add("intro-open");

        // restart the rising animations
        intro.querySelectorAll(".world, .intro-header, .intro-footer").forEach(el => {
            el.style.animation = "none";
            void el.offsetWidth;
            el.style.animation = "";
        });

        drawStars();

        if (enterButton) enterButton.focus({ preventScroll: true });
    }


    // ============================================
    // STARTUP
    // ============================================

    const skip = document.documentElement.classList.contains("skip-intro");

    mountPlanets();

    if (!skip) {
        document.body.classList.add("intro-open");
        drawStars();
        if (enterButton) enterButton.focus({ preventScroll: true });
    }

    window.addEventListener("resize", () => {
        if (!leaving && !intro.classList.contains("is-hidden")) drawStars();
    });

    if (enterButton) {
        enterButton.addEventListener("click", enter);
    }

    // Clicking the sidebar brand replays the intro
    document.querySelectorAll(".brand").forEach(brand => {
        brand.addEventListener("click", event => {
            event.preventDefault();
            showIntro();
        });
    });

})();
