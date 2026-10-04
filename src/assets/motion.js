/* motion.js — cinematic scroll (GSAP + ScrollTrigger + Lenis) & mouse interactions.
   Everything is guarded: reduced-motion and missing libs fall back to CSS behavior. */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var isJsdom = /jsdom/.test(navigator.userAgent || "");
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var hasGsap = !!(gsap && ST);
  var lenis = null;

  /* ================= Lenis smooth scroll ================= */
  try {
    if (hasGsap && !reduce && !isJsdom && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.095, smoothWheel: true });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);

      document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href*="#"]') : null;
        if (!a) return;
        var url;
        try { url = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
        if (url.pathname !== location.pathname || !url.hash) return;
        var el;
        try { el = document.querySelector(url.hash); } catch (err) { return; }
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -70, duration: 1.15 });
        history.pushState(null, "", url.hash);
      });
    }
  } catch (err) { lenis = null; }

  /* ================= GSAP scene ================= */
  function countUp(el) {
    var raw = el.textContent;
    var num = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!num) return;
    var pre = raw.indexOf("$") === 0 ? "$" : "";
    var obj = { v: 0 };
    gsap.to(obj, {
      v: num, duration: 1.5, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 94%", once: true },
      onUpdate: function () { el.textContent = pre + Math.round(obj.v).toLocaleString("en-US"); },
      onComplete: function () { el.textContent = raw; }
    });
  }

  function phase(fn, t) {
    if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: t || 1000 });
    else setTimeout(fn, 30);
  }

  function scene() {
    gsap.registerPlugin(ST);
    html.classList.add("motion-on");

    if (reduce) return; /* class added so tests see the layer; no movement for a11y */

    /* phase 1 — hero (above the fold) */
    phase(function () {
    /* ---- cinematic hero exit (scrub) ---- */
    if (document.querySelector(".hero-inner")) {
      gsap.to(".hero-inner", {
        y: -110, opacity: 0.12, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true }
      });
      gsap.to(".hero-grid", {
        y: -70, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
      gsap.to(".hero-bg", {
        y: -40, scale: 1.07, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
    }

    /* ---- section heads: slide + line draw ---- */
    gsap.utils.toArray(".sec-head, .docs-head").forEach(function (head) {
      gsap.from(head.children, {
        y: 28, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: head, start: "top 92%" }
      });
      var line = head.querySelector(".sec-line");
      if (line) {
        gsap.from(line, {
          scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: head, start: "top 92%" }
        });
      }
    });
    });

    /* phase 2 — content blocks */
    phase(function () {
    /* ---- card entrances (batched stagger) ---- */
    ["#grid .card", "#docs-grid .card", ".skill-card", ".rm-card", ".cap-card", ".c-card"].forEach(function (sel) {
      var els = gsap.utils.toArray(sel);
      if (!els.length) return;
      ST.batch(els, {
        start: "top 93%", once: true,
        onEnter: function (batch) {
          gsap.from(batch, { y: 46, opacity: 0, duration: 0.75, stagger: 0.07, ease: "power3.out", overwrite: true });
        }
      });
    });

    /* ---- feature + flagship stories ---- */
    if (document.querySelector(".card.feature")) {
      gsap.from(".card.feature", {
        y: 70, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: ".card.feature", start: "top 88%" }
      });
    }
    gsap.utils.toArray(".story").forEach(function (story) {
      var img = story.querySelector(".story-media img");
      if (img) {
        gsap.fromTo(img, { scale: 1.2, yPercent: -7 }, {
          scale: 1, yPercent: 7, ease: "none",
          scrollTrigger: { trigger: story, start: "top bottom", end: "bottom top", scrub: true }
        });
      }
      var body = story.querySelector(".story-body");
      if (body) {
        gsap.from(body.children, {
          y: 40, opacity: 0, stagger: 0.09, duration: 0.85, ease: "power3.out",
          scrollTrigger: { trigger: story, start: "top 78%" }
        });
      }
    });
    });

    /* phase 3 — data visualisations */
    phase(function () {
    /* ---- capability / language bars grow on enter (scaleX = composited, no reflow) ---- */
    gsap.utils.toArray(".cap-bar i, .lb-fill").forEach(function (bar) {
      gsap.fromTo(bar, { scaleX: 0 }, {
        scaleX: 1, transformOrigin: "left center", duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: bar, start: "top 95%" }
      });
    });

    /* ---- count-up on data facts ---- */
    gsap.utils.toArray(".fact .fv").forEach(countUp);

    /* ---- notes & panels ---- */
    gsap.utils.toArray(".skills-note, .universe-grid .panel-card").forEach(function (el) {
      gsap.from(el, {
        y: 34, opacity: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" }
      });
    });
    /* ---- project page intro ---- */
    if (document.querySelector(".phead")) {
      gsap.from(".phead h1, .phead .tag, .pmeta, .p-banner", {
        y: 34, opacity: 0, duration: 0.8, stagger: 0.09, ease: "power3.out",
        scrollTrigger: { trigger: ".phead", start: "top 88%" }
      });
    }
    });

    /* phase 4 — deep-scroll effects */
    phase(function () {
    /* ---- hero video fades out as you leave the hero ---- */
    if (document.getElementById("hero-video")) {
      gsap.to("#hero-video", {
        opacity: 0, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "65% top", scrub: true }
      });
    }

    /* ---- showreel marquee: rows drift opposite with scroll ---- */
    if (document.getElementById("mq-row1")) {
      gsap.fromTo("#mq-row1", { x: -520 }, {
        x: 340, ease: "none",
        scrollTrigger: { trigger: ".showreel", start: "top bottom", end: "bottom top", scrub: 0.6 }
      });
      gsap.fromTo("#mq-row2", { x: 340 }, {
        x: -520, ease: "none",
        scrollTrigger: { trigger: ".showreel", start: "top bottom", end: "bottom top", scrub: 0.6 }
      });
      gsap.from(".showreel", {
        y: 60, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: ".showreel", start: "top 92%" }
      });
    }

    /* ---- flagship stories: sticky stack with scale-down (desktop) ---- */
    if (window.innerWidth >= 900) {
      var stories = gsap.utils.toArray(".story");
      stories.forEach(function (st, i) {
        if (i === stories.length - 1) return;
        gsap.to(st, {
          scale: 0.95, transformOrigin: "top center", ease: "none",
          scrollTrigger: { trigger: stories[i + 1], start: "top bottom", end: "top top+=140", scrub: true }
        });
      });
    }

    /* ---- manifesto: character-by-character scroll reveal ---- */
    gsap.utils.toArray(".char-reveal").forEach(function (el) {
      var text = el.textContent;
      el.setAttribute("aria-label", text);
      el.style.whiteSpace = "pre-wrap";
      el.textContent = "";
      var chars = [];
      for (var i = 0; i < text.length; i++) {
        var s = document.createElement("span");
        s.className = "ch";
        s.textContent = text.charAt(i);
        el.appendChild(s);
        chars.push(s);
      }
      gsap.fromTo(chars, { opacity: 0.14 }, {
        opacity: 1, stagger: 1, ease: "none",
        scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 45%", scrub: true }
      });
    });

    /* refresh after assets/fonts settle */
    window.addEventListener("load", function () { ST.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    });
  }

  try {
    if (hasGsap) scene();
  } catch (err) { html.classList.remove("motion-on"); }

  window.KIA_MOTION = {
    lenis: lenis,
    refresh: function () { try { if (hasGsap) ST.refresh(); } catch (e) { } },
    scrollToTop: function () { try { if (lenis) lenis.scrollTo(0); else window.scrollTo(0, 0); } catch (e) { } }
  };

  /* ================= custom cursor ================= */
  function createCursor() {
    var dot = document.createElement("div");
    dot.id = "cursor-dot";
    var ring = document.createElement("div");
    ring.id = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    html.classList.add("cursor-on");

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var dx = mx, dy = my, rx = mx, ry = my;
    var shown = false;

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; dot.style.opacity = 1; ring.style.opacity = 1; }
    }, { passive: true });
    window.addEventListener("pointerdown", function () { ring.classList.add("down"); });
    window.addEventListener("pointerup", function () { ring.classList.remove("down"); });
    document.addEventListener("mouseover", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("a, button, .chip, .card, .skill-card, .rm-card, .c-card, .cap-card, .story, select, input") : null;
      ring.classList.toggle("hot", !!t);
    });

    (function loop() {
      dx += (mx - dx) * 0.4; dy += (my - dy) * 0.4;
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = "translate3d(" + dx + "px," + dy + "px,0) translate(-50%,-50%)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
  }

  /* ================= magnetic buttons ================= */
  function bindMagnetic(el, power) {
    el.classList.add("magnetic");
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - (r.left + r.width / 2);
      var y = e.clientY - (r.top + r.height / 2);
      el.style.transform = "translate(" + (x * power).toFixed(1) + "px," + (y * power).toFixed(1) + "px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }

  /* ================= 3D tilt on cards ================= */
  function bindTilt(el, strength) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        "perspective(760px) rotateX(" + (-py * strength).toFixed(2) + "deg) rotateY(" +
        (px * strength).toFixed(2) + "deg) translateY(-5px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }

  /* ================= hero mouse parallax ================= */
  function bindHeroParallax() {
    var hero = document.querySelector(".hero");
    if (!hero || !hasGsap) return;
    var bg = hero.querySelector(".hero-bg");
    var grid = hero.querySelector(".hero-grid");
    var parts = [hero.querySelector("h1"), hero.querySelector(".lead"), hero.querySelector(".hero-cta"), hero.querySelector(".eyebrow")].filter(Boolean);

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (bg) gsap.to(bg, { x: px * 40, duration: 1, ease: "power2.out", overwrite: "auto" });
      if (grid) gsap.to(grid, { x: px * -26, duration: 1.1, ease: "power2.out", overwrite: "auto" });
      parts.forEach(function (el, i) {
        gsap.to(el, { x: px * (10 + i * 3), y: py * (6 + i * 2), duration: 1, ease: "power2.out", overwrite: "auto" });
      });
    });
    hero.addEventListener("pointerleave", function () {
      if (bg) gsap.to(bg, { x: 0, duration: 1.2, ease: "power3.out" });
      if (grid) gsap.to(grid, { x: 0, duration: 1.2, ease: "power3.out" });
      parts.forEach(function (el) { gsap.to(el, { x: 0, y: 0, duration: 1.2, ease: "power3.out" }); });
    });
  }

  /* ================= hero video: mouse-X scrub (Mainframe-style) ================= */
  function bindVideoScrub() {
    var v = document.getElementById("hero-video");
    if (!v || reduce) return;
    var SENSITIVITY = 0.8;
    var prevX = null;
    var targetTime = 0;
    var seeking = false;

    function queueSeek(t) {
      if (!v.duration || !isFinite(v.duration)) return;
      targetTime = Math.max(0, Math.min(v.duration, t));
      if (!seeking) {
        seeking = true;
        try { v.currentTime = targetTime; } catch (e) { seeking = false; }
      }
    }
    v.addEventListener("seeked", function () {
      v.classList.add("ready");
      seeking = false;
      if (Math.abs(v.currentTime - targetTime) > 0.03) {
        seeking = true;
        try { v.currentTime = targetTime; } catch (e) { seeking = false; }
      }
    });
    v.addEventListener("loadeddata", function () { v.classList.add("ready"); });
    v.addEventListener("loadedmetadata", function () {
      targetTime = v.currentTime || 0;
      /* start paused at a dramatic frame */
      try { v.currentTime = Math.min(1.2, (v.duration || 2) * 0.15); } catch (e) { }
    });
    v.addEventListener("error", function () { v.style.display = "none"; });

    window.addEventListener("pointermove", function (e) {
      if (prevX === null) { prevX = e.clientX; return; }
      var delta = e.clientX - prevX;
      prevX = e.clientX;
      if (!v.duration || !isFinite(v.duration)) return;
      queueSeek(targetTime + (delta / window.innerWidth) * SENSITIVITY * v.duration);
    }, { passive: true });
  }

  /* ================= bind interactions ================= */
  function bindAll() {
    if (!fine || reduce) return;

    createCursor();

    bindVideoScrub();

    document.querySelectorAll(".nav-cta, .hero-cta .btn, .skills-cta .btn, .foot-cta .btn, .learn, .btn.primary").forEach(function (el) {
      bindMagnetic(el, 0.28);
    });

    var tilts = document.querySelectorAll(
      "#grid .card:not(.feature), #docs-grid .card, .skill-card, .c-card, .rm-card"
    );
    tilts.forEach(function (el) { bindTilt(el, 9); });

    bindHeroParallax();
  }

  try { bindAll(); } catch (err) { }
})();
