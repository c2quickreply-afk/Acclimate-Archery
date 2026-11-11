/* ============================================================
   ACCLIMATE ARCHERY — interaction engine
   Vanilla JS. No dependencies.
   Modules: preloader · cursor · magnetic · header · reveals ·
   split titles · hero scene (stars/mist/snow/parallax) ·
   marquee · tilt · counters · WebGL terrain · embers ·
   progress rail · mobile menu · footer
   ============================================================ */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ============================================================
     PRELOADER — counts to 100, then lifts the curtains
     ============================================================ */
  const preloader = document.getElementById("preloader");
  const hero = document.getElementById("hero");

  function finishPreload() {
    if (!preloader) return;
    preloader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    // fire hero title reveal just as curtains lift
    setTimeout(() => hero && hero.classList.add("is-ready"), 450);
  }

  if (preloader && !prefersReduced) {
    document.body.classList.add("is-loading");
    const countEl = document.getElementById("preloaderCount");
    const t0 = performance.now();
    const DUR = 1700;
    (function tick(now) {
      const p = clamp((now - t0) / DUR, 0, 1);
      // ease the count so it hesitates like an altimeter settling
      const eased = 1 - Math.pow(1 - p, 3);
      if (countEl) countEl.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (p < 1) requestAnimationFrame(tick);
      else finishPreload();
    })(t0);
  } else {
    if (preloader) preloader.style.display = "none";
    hero && hero.classList.add("is-ready");
  }

  /* ============================================================
     CUSTOM CURSOR — precision reticle
     ============================================================ */
  const cursor = document.getElementById("cursor");
  if (cursor && finePointer && !prefersReduced) {
    document.body.classList.add("has-cursor");
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;

    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    addEventListener("mousedown", () => cursor.classList.add("is-down"));
    addEventListener("mouseup", () => cursor.classList.remove("is-down"));

    // flip reticle to light on dark sections — checked every frame (not just
    // on mousemove) so scrolling a dark/light section under a stationary
    // cursor updates the color immediately instead of waiting for the next
    // mouse move
    const darkSections = document.querySelectorAll(".section--dark, .section--void, .hero, .marquee, .quote, .site-footer, .site-header");
    // elements that go dark locally on hover (or always are), regardless of
    // the section they sit in — e.g. a service card on the light "What We
    // Do" grid turns solid coal on :hover, which otherwise leaves the coal
    // ring invisible against it. Containment here is checked at the live
    // cursor position, so it's only ever true while actually over the
    // element, i.e. exactly when the dark fill is showing. Solid ember
    // buttons (.btn--solid) are deliberately NOT in this list — the ring is
    // much bigger than those buttons and mostly overlaps whatever's around
    // them, which is often still a light section, so the ring should keep
    // reading off the section, not the
    // button; only the dot (see FILL_SELECTOR below) needs to react to it.
    const LOCAL_DARK_SELECTOR = ".service-card, .brand-row, .service-card__cta--btn";
    // a couple of specific spots where the section-based light/dark read
    // gets it wrong against the photo behind them — force the ring dark
    // regardless of what section they're in
    const FORCE_DARK_SELECTOR = ".hero__actions .btn--line, .site-header .btn--ghost";
    (function loop() {
      cx = lerp(cx, mx, 0.22);
      cy = lerp(cy, my, 0.22);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;

      const el = document.elementFromPoint(mx, my);
      let isDark = false;
      if (el && !el.closest(FORCE_DARK_SELECTOR)) {
        for (const s of darkSections) { if (s.contains(el)) { isDark = true; break; } }
        if (!isDark && el.closest(LOCAL_DARK_SELECTOR)) isDark = true;
      }
      cursor.classList.toggle("is-light", isDark);

      requestAnimationFrame(loop);
    })();

    // hover states via delegation
    // targets that fill solid ember/orange on hover (or already are ember)
    // need the cursor's own dot to swap off orange too, or it disappears
    // into the button behind it
    const FILL_SELECTOR = ".btn--solid, .service-card__cta--btn";
    function applyHover(t) {
      cursor.classList.add("is-hover");
      cursor.classList.toggle("is-fill", t.matches(FILL_SELECTOR));
    }
    function clearHover() { cursor.classList.remove("is-hover", "is-fill"); }

    let hoveredEl = null;
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor], a, button");
      if (!t) return;
      hoveredEl = t;
      applyHover(t);
    });
    document.addEventListener("mouseout", (e) => {
      const t = e.target.closest("[data-cursor], a, button");
      if (!t) return;
      hoveredEl = null;
      clearHover();
    });

    // resync hover state once scrolling settles — mouseover/mouseout only
    // fire on real pointer movement, so a link or button that scrolls in
    // under a stationary cursor otherwise leaves the reticle showing no
    // hover state until the next physical mouse move
    let hoverResyncTimer;
    addEventListener("scroll", () => {
      clearTimeout(hoverResyncTimer);
      hoverResyncTimer = setTimeout(() => {
        const el = document.elementFromPoint(mx, my);
        const next = el ? el.closest("[data-cursor], a, button") : null;
        if (next === hoveredEl) return;
        clearHover();
        hoveredEl = next;
        if (next) applyHover(next);
      }, 160);
    }, { passive: true });
  }

  /* ============================================================
     MAGNETIC BUTTONS
     ============================================================ */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.32;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform 0.55s cubic-bezier(0.19,1,0.22,1)";
        el.style.transform = "translate(0,0)";
        setTimeout(() => (el.style.transition = ""), 550);
      });
    });
  }

  /* ============================================================
     HEADER — stays put always; just darkens/shrinks once scrolled.
     (Previously hid itself on scroll-down — that toggle firing on
     every scroll frame was itself a source of visible stutter.)
     ============================================================ */
  const header = document.getElementById("siteHeader");
  function onHeaderScroll() {
    const y = Math.max(0, scrollY);
    header.classList.toggle("is-scrolled", y > 40);
  }
  addEventListener("scroll", onHeaderScroll, { passive: true });

  /* ============================================================
     SCROLL GUARD — suspends :hover flips on tilt cards while the
     page is actively scrolling, so content passing under a
     stationary cursor doesn't flash its hover state
     ============================================================ */
  let scrollGuardTimer;
  addEventListener("scroll", () => {
    document.body.classList.add("is-scrolling");
    clearTimeout(scrollGuardTimer);
    scrollGuardTimer = setTimeout(() => document.body.classList.remove("is-scrolling"), 140);
  }, { passive: true });

  /* ============================================================
     PROGRESS RAIL — the arrow descends the mountain as you scroll
     ============================================================ */
  const progressArrow = document.getElementById("progressArrow");
  function onProgress() {
    if (!progressArrow) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    const railH = progressArrow.parentElement.offsetHeight - 26;
    progressArrow.style.top = `${p * railH}px`;
  }
  addEventListener("scroll", onProgress, { passive: true });
  onProgress();

  // rail renders pure white (no blend-mode mixing) while the hero is in view,
  // so it never dulls to gray against the ridge/mist layers; difference-blend
  // resumes for contrast against the light/dark sections further down
  const progressRailEl = document.querySelector(".progress-rail");
  const heroForRail = document.getElementById("hero");
  if (progressRailEl && heroForRail) {
    new IntersectionObserver(
      ([en]) => progressRailEl.classList.toggle("is-hero", en.isIntersecting),
      { threshold: 0.4 }
    ).observe(heroForRail);
  }

  /* ============================================================
     SPLIT TITLES — wrap words for staggered mask reveals
     ============================================================ */
  document.querySelectorAll("[data-split-title]").forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((piece) => {
            if (!piece) return;
            if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "word";
            const inner = document.createElement("span");
            inner.textContent = piece;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    // stagger
    el.querySelectorAll(".word > span").forEach((s, i) => {
      s.style.transitionDelay = `${i * 0.045}s`;
    });
  });

  /* ============================================================
     REVEAL OBSERVER — replays every time an element crosses into
     view, in either scroll direction, not just on first load
     ============================================================ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      en.target.classList.toggle("is-in", en.isIntersecting);
      if (en.isIntersecting) {
        if (en.target.matches(".craft__facts, .territory__elev") || en.target.querySelector("[data-count]")) {
          en.target.querySelectorAll("[data-count]").forEach(runCounter);
        }
        if (en.target.matches("[data-count]")) runCounter(en.target);
      }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

  document.querySelectorAll("[data-reveal], [data-split-title], .craft__sig").forEach((el) => io.observe(el));

  // stagger sibling reveals inside grids
  document.querySelectorAll(".services__grid, .testimonials__rail").forEach((grid) => {
    [...grid.children].forEach((c, i) => { c.style.transitionDelay = `${i * 0.12}s`; });
  });
  document.querySelectorAll(".craft__copy").forEach((wrap) => {
    [...wrap.querySelectorAll(".craft__para")].forEach((p, i) => { p.style.transitionDelay = `${i * 0.14}s`; });
  });

  /* ============================================================
     COUNTERS
     ============================================================ */
  // replays from 0 every time the element re-enters view; a run token
  // guards against two overlapping animations if it enters/leaves quickly
  const counterRuns = new WeakMap();
  function runCounter(el) {
    const runId = Symbol();
    counterRuns.set(el, runId);
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const format = el.dataset.format;
    if (prefersReduced) {
      // no count-up animation for reduced-motion users: show the final value
      el.textContent = (format === "comma" ? target.toLocaleString("en-US") : String(target)) + suffix;
      return;
    }
    const DUR = 1800;
    const t0 = performance.now();
    (function step(now) {
      if (counterRuns.get(el) !== runId) return;
      const p = clamp((now - t0) / DUR, 0, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      let val = Math.round(target * eased);
      let txt = format === "comma" ? val.toLocaleString("en-US") : String(val);
      el.textContent = txt + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ============================================================
     HERO SCENE — stars, mist, snow, ridge parallax
     (skipped entirely when a real hero photo is present — the photo's own
     Ken Burns pan, defined in CSS, is all the motion that section needs)
     ============================================================ */
  const heroScene = document.getElementById("heroScene");
  const heroHasPhoto = !!(heroScene && heroScene.querySelector(".hero__photo"));
  if (heroScene && !prefersReduced && !heroHasPhoto) {
    // ---- stars ----
    const starField = document.getElementById("heroStars");
    if (starField) {
      // built with the DOM style API rather than innerHTML style="" strings,
      // so it works under a Content-Security-Policy without 'unsafe-inline'
      const n = 70;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const x = Math.random() * 100, y = Math.random() * 100;
        const tw = (2.5 + Math.random() * 5).toFixed(1);
        const s = Math.random() < 0.15 ? 2.5 : 1.4;
        const star = document.createElement("i");
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = star.style.height = `${s}px`;
        star.style.setProperty("--tw", `${tw}s`);
        star.style.animationDelay = `${(Math.random() * 5).toFixed(1)}s`;
        frag.appendChild(star);
      }
      starField.appendChild(frag);
    }

    // ---- pointer + scroll parallax on ridges ----
    const ridges = heroScene.querySelectorAll(".hero__ridge");
    let pmx = 0, pmy = 0, smx = 0, smy = 0;
    addEventListener("mousemove", (e) => {
      pmx = (e.clientX / innerWidth - 0.5) * 2;
      pmy = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    // ---- mist canvas ----
    // puff gradients are pre-rendered to small offscreen sprites so the main
    // loop only does cheap drawImage calls — createRadialGradient per-puff
    // per-frame was heavy enough to drop frames and read as stutter.
    function makePuffSprite(r, o) {
      const size = Math.max(2, Math.ceil(r * 2));
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const cx = c.getContext("2d");
      const g = cx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, `rgba(226, 224, 218, ${o})`);
      g.addColorStop(1, "rgba(226, 224, 218, 0)");
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(r, r, r, 0, Math.PI * 2);
      cx.fill();
      return c;
    }
    const mistC = document.getElementById("heroMist");
    const mistCtx = mistC.getContext("2d");
    let mistW, mistH, puffs = [];
    function mistResize() {
      mistW = mistC.width = heroScene.offsetWidth;
      mistH = mistC.height = heroScene.offsetHeight;
      puffs = Array.from({ length: 14 }, () => {
        const r = mistW * (0.12 + Math.random() * 0.2);
        const o = 0.05 + Math.random() * 0.1;
        return {
          x: Math.random() * mistW,
          y: mistH * (0.55 + Math.random() * 0.4),
          r, o,
          v: 0.08 + Math.random() * 0.22,
          ph: Math.random() * Math.PI * 2,
          sprite: makePuffSprite(r, o),
        };
      });
    }
    mistResize();

    // ---- meteor streaks (loosed arrows across the night sky) ----
    let meteors = [];
    let nextMeteor = performance.now() + 3500;
    function maybeSpawnMeteor(now) {
      if (now < nextMeteor) return;
      nextMeteor = now + 6000 + Math.random() * 9000;
      const fromLeft = Math.random() < 0.5;
      meteors.push({
        x: fromLeft ? -60 : snowW * (0.3 + Math.random() * 0.7),
        y: snowH * (0.04 + Math.random() * 0.22),
        vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 5),
        vy: 1.6 + Math.random() * 1.4,
        life: 1,
      });
    }

    // ---- snow canvas ----
    const snowC = document.getElementById("heroSnow");
    const snowCtx = snowC.getContext("2d");
    let snowW, snowH, flakes = [];
    function snowResize() {
      snowW = snowC.width = heroScene.offsetWidth;
      snowH = snowC.height = heroScene.offsetHeight;
      const n = Math.min(140, Math.round(snowW / 12));
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * snowW,
        y: Math.random() * snowH,
        r: 0.6 + Math.random() * 1.8,
        vy: 0.25 + Math.random() * 0.7,
        vx: -0.15 - Math.random() * 0.45,
        ph: Math.random() * Math.PI * 2,
        o: 0.25 + Math.random() * 0.55,
      }));
    }
    snowResize();
    addEventListener("resize", () => { mistResize(); snowResize(); });

    let heroVisible = true;
    new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe(heroScene);

    // all motion below is scaled by dt (real elapsed seconds since last frame,
    // clamped) rather than a fixed per-frame assumption — this keeps speed
    // constant in wall-clock time even when the browser drops a frame, instead
    // of visibly pausing and then jumping to catch up.
    let t = 0;
    let heroLastTime = performance.now();
    (function heroLoop(now) {
      requestAnimationFrame(heroLoop);
      const dt = Math.min((now - heroLastTime) / 1000, 0.05);
      heroLastTime = now;
      if (!heroVisible) return;
      t += dt;
      const step = dt * 60; // multiplier so existing per-frame-at-60fps tuning still reads the same

      // ridges parallax (mouse + scroll)
      const parallaxLerp = 1 - Math.pow(1 - 0.04, step);
      smx = lerp(smx, pmx, parallaxLerp);
      smy = lerp(smy, pmy, parallaxLerp);
      const sy = scrollY;
      ridges.forEach((r) => {
        const d = parseFloat(r.dataset.depth);
        r.style.transform = `translate(${smx * d * -46}px, ${smy * d * -18 + sy * d * 0.34}px) scale(1.07)`;
      });

      // mist
      mistCtx.clearRect(0, 0, mistW, mistH);
      puffs.forEach((p) => {
        p.x += p.v * step;
        if (p.x - p.r > mistW) p.x = -p.r;
        const wob = Math.sin(t * 0.4 + p.ph) * 14;
        mistCtx.drawImage(p.sprite, p.x - p.r, p.y + wob - p.r);
      });

      // snow
      snowCtx.clearRect(0, 0, snowW, snowH);
      snowCtx.fillStyle = "#ece9e2";
      flakes.forEach((f) => {
        f.y += f.vy * step;
        f.x += (f.vx + Math.sin(t * 0.8 + f.ph) * 0.3) * step;
        if (f.y > snowH + 4) { f.y = -4; f.x = Math.random() * snowW; }
        if (f.x < -4) f.x = snowW + 4;
        snowCtx.globalAlpha = f.o;
        snowCtx.beginPath();
        snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        snowCtx.fill();
      });
      // meteors
      maybeSpawnMeteor(now);
      meteors = meteors.filter((m) => m.life > 0 && m.x > -160 && m.x < snowW + 160);
      meteors.forEach((m) => {
        m.x += m.vx * step; m.y += m.vy * step; m.life -= 0.008 * step;
        const tail = 14;
        const grad = snowCtx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
        grad.addColorStop(0, `rgba(236,233,226,${0.8 * m.life})`);
        grad.addColorStop(1, "rgba(236,233,226,0)");
        snowCtx.strokeStyle = grad;
        snowCtx.lineWidth = 1.4;
        snowCtx.beginPath();
        snowCtx.moveTo(m.x, m.y);
        snowCtx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
        snowCtx.stroke();
      });
      snowCtx.globalAlpha = 1;
    })(performance.now());
  }

  /* ============================================================
     TILT CARDS — 3D perspective + sheen tracking
     ============================================================ */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let raf = null;
      card.addEventListener("mousemove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          const rx = (0.5 - py) * 7;
          const ry = (px - 0.5) * 7;
          card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
          card.style.setProperty("--sx", `${px * 100}%`);
          card.style.setProperty("--sy", `${py * 100}%`);
          raf = null;
        });
      });
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.7s cubic-bezier(0.19,1,0.22,1), background 0.5s, border-color 0.5s, box-shadow 0.5s";
        card.style.transform = "rotateX(0) rotateY(0)";
        setTimeout(() => (card.style.transition = ""), 700);
      });
    });
  }

  /* ============================================================
     PORTRAIT PARALLAX
     ============================================================ */
  const parallaxImgs = document.querySelectorAll("[data-parallax-img]");
  if (parallaxImgs.length && !prefersReduced) {
    addEventListener("scroll", () => {
      parallaxImgs.forEach((wrap) => {
        const r = wrap.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        const inner = wrap.querySelector("img, .craft__portrait-ph");
        if (inner) inner.style.setProperty("--py", `${p * -34}px`);
      });
    }, { passive: true });
  }

  /* ============================================================
     WEBGL TERRAIN — flowing wireframe ridge (vanilla WebGL)
     ============================================================ */
  const glCanvas = document.getElementById("terrainCanvas");
  if (glCanvas && !prefersReduced) {
    const gl = glCanvas.getContext("webgl", { antialias: true, alpha: true });
    if (gl) {
      const vsSrc = `
        attribute vec2 aPos;
        uniform float uTime;
        uniform mat4 uProj;
        uniform mat4 uView;
        varying float vH;
        varying float vDist;

        // pseudo-noise via layered sines — cheap, organic
        float ridge(vec2 p, float t) {
          float h = 0.0;
          h += sin(p.x * 1.3 + t * 0.30) * 0.42;
          h += sin(p.y * 1.7 - t * 0.22) * 0.30;
          h += sin((p.x + p.y) * 2.3 + t * 0.16) * 0.18;
          h += sin(p.x * 4.1 - p.y * 3.3 + t * 0.42) * 0.09;
          h += sin(p.y * 6.7 + p.x * 5.1) * 0.045;
          return h;
        }

        void main() {
          vec2 p = aPos;
          float h = ridge(p, uTime);
          // amplify a central spine of peaks
          float spine = exp(-abs(p.x) * 0.55) * 0.9;
          h *= (0.55 + spine);
          vec4 world = vec4(p.x, h, p.y, 1.0);
          vec4 mv = uView * world;
          vDist = -mv.z;
          vH = h;
          gl_Position = uProj * mv;
        }
      `;
      const fsSrc = `
        precision mediump float;
        varying float vH;
        varying float vDist;
        void main() {
          // bone lines, ember glow on the peaks, fog with distance
          vec3 bone = vec3(0.925, 0.914, 0.886);
          vec3 ember = vec3(0.894, 0.341, 0.180);
          float peak = smoothstep(0.30, 0.85, vH);
          vec3 col = mix(bone, ember, peak * 0.9);
          float fog = smoothstep(15.0, 3.0, vDist);
          float alpha = fog * 0.38 + peak * fog * 0.28;
          gl_FragColor = vec4(col, alpha);
        }
      `;
      function makeShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      // grid of lines (as line strips along x and z)
      const COLS = 90, ROWS = 42, W = 16, D = 11;
      const verts = [];
      // lines along x
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 1; c++) {
          const x0 = (c / (COLS - 1) - 0.5) * W, z0 = (r / (ROWS - 1) - 0.5) * D;
          const x1 = ((c + 1) / (COLS - 1) - 0.5) * W;
          verts.push(x0, z0, x1, z0);
        }
      }
      // lines along z
      for (let c = 0; c < COLS; c += 2) {
        for (let r = 0; r < ROWS - 1; r++) {
          const x0 = (c / (COLS - 1) - 0.5) * W;
          const z0 = (r / (ROWS - 1) - 0.5) * D, z1 = ((r + 1) / (ROWS - 1) - 0.5) * D;
          verts.push(x0, z0, x0, z1);
        }
      }
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(prog, "uTime");
      const uProj = gl.getUniformLocation(prog, "uProj");
      const uView = gl.getUniformLocation(prog, "uView");

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      function perspective(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
        return new Float32Array([
          f / aspect, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (far + near) * nf, -1,
          0, 0, 2 * far * near * nf, 0,
        ]);
      }
      // camera: slightly above, looking down the valley
      function view(t, drift) {
        const cy = 2.0, cz = 5.6;
        const pitch = 0.34 + drift * 0.03;
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        return new Float32Array([
          1, 0, 0, 0,
          0, cp, sp, 0,
          0, -sp, cp, 0,
          0, -cy * cp + cz * sp, -cy * sp - cz * cp, 1,
        ]);
      }

      let glW, glH;
      function glResize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        glW = glCanvas.width = glCanvas.offsetWidth * dpr;
        glH = glCanvas.height = glCanvas.offsetHeight * dpr;
        gl.viewport(0, 0, glW, glH);
      }
      glResize();
      addEventListener("resize", glResize);

      let glVisible = false;
      new IntersectionObserver(([en]) => { glVisible = en.isIntersecting; }).observe(glCanvas);

      let gt = 0;
      let driftTarget = 0, drift = 0;
      addEventListener("mousemove", (e) => {
        driftTarget = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });

      // dt-scaled so the ridge motion holds a constant real-time speed
      // instead of visibly slowing/surging when a frame is dropped
      let glLastTime = performance.now();
      (function glLoop(now) {
        requestAnimationFrame(glLoop);
        const dt = Math.min((now - glLastTime) / 1000, 0.05);
        glLastTime = now;
        if (!glVisible) return;
        gt += dt;
        drift = lerp(drift, driftTarget, 1 - Math.pow(1 - 0.03, dt * 60));
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, gt);
        gl.uniformMatrix4fv(uProj, false, perspective(0.9, glW / glH, 0.1, 100));
        gl.uniformMatrix4fv(uView, false, view(gt, drift));
        gl.drawArrays(gl.LINES, 0, verts.length / 2);
      })(performance.now());
    }
  }

  /* ============================================================
     QUOTE EMBERS — slow rising sparks
     ============================================================ */
  const emberC = document.getElementById("quoteEmbers");
  const quoteHasPhoto = !!document.querySelector(".quote--photo");
  if (emberC && !prefersReduced && !quoteHasPhoto) {
    const ctx = emberC.getContext("2d");
    let ew, eh, embers = [];
    const quoteSection = emberC.parentElement;
    function emberResize() {
      ew = emberC.width = quoteSection.offsetWidth;
      eh = emberC.height = quoteSection.offsetHeight;
      embers = Array.from({ length: 34 }, () => spawnEmber(true));
    }
    function spawnEmber(anyY) {
      return {
        x: Math.random() * ew,
        y: anyY ? Math.random() * eh : eh + 6,
        r: 0.8 + Math.random() * 1.8,
        vy: 0.18 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
        o: 0.25 + Math.random() * 0.55,
        hot: Math.random() < 0.35,
      };
    }
    emberResize();
    addEventListener("resize", emberResize);
    let visible = false;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(emberC);
    let et = 0;
    let emberLastTime = performance.now();
    (function eLoop(now) {
      requestAnimationFrame(eLoop);
      const dt = Math.min((now - emberLastTime) / 1000, 0.05);
      emberLastTime = now;
      if (!visible) return;
      et += dt;
      const step = dt * 60;
      ctx.clearRect(0, 0, ew, eh);
      embers.forEach((p, i) => {
        p.y -= p.vy * step;
        p.x += Math.sin(et * 0.7 + p.ph) * 0.35 * step;
        if (p.y < -8) embers[i] = spawnEmber(false);
        const flicker = 0.7 + Math.sin(et * 3 + p.ph) * 0.3;
        ctx.globalAlpha = p.o * flicker;
        ctx.fillStyle = p.hot ? "#e4572e" : "#a39e94";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    })(performance.now());
  }

  /* ============================================================
     MOBILE MENU
     ============================================================ */
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    const menuLinks = [...mobileMenu.querySelectorAll("a")];
    const isOpen = () => navToggle.classList.contains("is-open");
    const setOpen = (open, { returnFocus = false } = {}) => {
      navToggle.classList.toggle("is-open", open);
      mobileMenu.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileMenu.setAttribute("aria-hidden", String(!open));
      document.body.style.overflow = open ? "hidden" : "";
      // move keyboard focus into the menu when it opens (after the
      // visibility flip so the link is focusable), back to the toggle on Esc
      if (open && menuLinks[0]) requestAnimationFrame(() => menuLinks[0].focus());
      if (!open && returnFocus) navToggle.focus();
    };
    navToggle.addEventListener("click", () => setOpen(!isOpen()));
    menuLinks.forEach((a) => a.addEventListener("click", () => setOpen(false)));
    // while open: Esc closes, Tab cycles between the toggle and the menu links
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") { e.preventDefault(); setOpen(false, { returnFocus: true }); return; }
      if (e.key !== "Tab") return;
      const order = [navToggle, ...menuLinks];
      const i = order.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? order.length - 1 : i - 1) : (i === -1 || i === order.length - 1 ? 0 : i + 1);
      e.preventDefault();
      order[next].focus();
    });
    // if the viewport grows past the mobile breakpoint, don't leave the
    // page scroll-locked behind a menu that's no longer reachable
    matchMedia("(min-width: 901px)").addEventListener("change", (mq) => { if (mq.matches && isOpen()) setOpen(false); });
  }

  /* ============================================================
     SCROLLSPY — underline the nav link for the section in view
     ============================================================ */
  const spyLinks = [...document.querySelectorAll(".site-nav--left .site-nav__link")];
  const spyTargets = spyLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (spyTargets.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        spyLinks.forEach((a) =>
          a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`)
        );
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    spyTargets.forEach((t) => spy.observe(t));
  }

  /* ============================================================
     SPECIALTIES SCAN — step a highlight through the list; pause
     while the user is hovering to explore on their own
     ============================================================ */
  // (auto-advancing highlight is motion — skipped for reduced-motion users;
  // hovering still highlights each item via CSS)
  const specList = document.getElementById("specialtiesList");
  if (specList && !prefersReduced) {
    const items = [...specList.children];
    let hot = 0;
    let paused = false;
    specList.addEventListener("mouseenter", () => {
      paused = true;
      items.forEach((li) => li.classList.remove("is-hot"));
    });
    specList.addEventListener("mouseleave", () => { paused = false; });
    setInterval(() => {
      if (paused || document.hidden) return;
      items.forEach((li) => li.classList.remove("is-hot"));
      items[hot % items.length].classList.add("is-hot");
      hot++;
    }, 2200);
  }

  /* ============================================================
     MISC
     ============================================================ */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
