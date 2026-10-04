/* Cosmos layer — scroll-driven starfield & celestial bodies, HUD progress,
   discovery toasts and a procedural WebAudio sound engine. */
(function () {
  "use strict";

  /* ---------------- discoveries (scroll milestones) ---------------- */
  var BODIES = [
    { at: 0.08, name: "LUNA", side: 1, kind: "moon" },
    { at: 0.22, name: "MARS", side: -1, kind: "planet", color: "#c1440e" },
    { at: 0.38, name: "SATURN", side: 1, kind: "saturn", color: "#e3c78a" },
    { at: 0.52, name: "COMET", side: -1, kind: "comet" },
    { at: 0.66, name: "ORION NEBULA", side: 1, kind: "nebula", color: "#a78bfa" },
    { at: 0.80, name: "PULSAR", side: -1, kind: "pulsar", color: "#22d3ee" },
    { at: 0.93, name: "EVENT HORIZON", side: 1, kind: "hole" }
  ];
  var found = 0;
  var achieved = {};

  /* ---------------- sound engine (gesture-gated) ---------------- */
  var AC = null, master = null, ambientNodes = [], enabled = false;
  function ensureCtx() {
    if (AC) return AC;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    master = AC.createGain();
    master.gain.value = 0.6;
    master.connect(AC.destination);
    return AC;
  }
  function startAmbient() {
    if (!ensureCtx() || ambientNodes.length) return;
    var pad = AC.createGain(); pad.gain.value = 0.0;
    var filt = AC.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 520; filt.Q.value = 0.6;
    pad.connect(filt); filt.connect(master);
    [110, 164.81, 220, 329.63].forEach(function (f, i) {
      var o = AC.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      var g = AC.createGain(); g.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(g); g.connect(pad);
      o.start();
      ambientNodes.push(o);
    });
    var lfo = AC.createOscillator(); lfo.frequency.value = 0.05;
    var lfoG = AC.createGain(); lfoG.gain.value = 220;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();
    ambientNodes.push(lfo);
    var delay = AC.createDelay(1.2); delay.delayTime.value = 0.42;
    var fb = AC.createGain(); fb.gain.value = 0.34;
    filt.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
    pad.gain.setTargetAtTime(0.06, AC.currentTime, 2.2);
    ambientNodes.push(pad);
  }
  function stopAmbient() {
    if (!AC) return;
    ambientNodes.forEach(function (n) { try { if (n.stop) n.stop(); } catch (e) { } try { n.disconnect(); } catch (e) { } });
    ambientNodes = [];
  }
  function tone(freq, dur, vol, type, when) {
    if (!enabled || !ensureCtx()) return;
    var t = AC.currentTime + (when || 0);
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.07, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + (dur || 0.25) + 0.05);
  }
  var _noise = null;
  function noiseBuffer() {
    if (!AC) return null;
    if (_noise) return _noise;
    var len = Math.floor(AC.sampleRate * 0.6);
    _noise = AC.createBuffer(1, len, AC.sampleRate);
    var d = _noise.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return _noise;
  }

  /* ===== the 5 sounds (all procedural) ===== */
  /* 1) hover — soft sparkle when touching interactive elements */
  function sndHover() {
    if (!enabled || !ensureCtx()) return;
    try {
      var t = AC.currentTime;
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(1760, t);
      o.frequency.exponentialRampToValueAtTime(2350, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.14);
    } catch (e) { }
  }
  /* 2) click — crisp tick + micro noise snap */
  function sndClick() {
    if (!enabled || !ensureCtx()) return;
    try {
      var t = AC.currentTime;
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(1320, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.12);
      var s = AC.createBufferSource(); s.buffer = noiseBuffer();
      var hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2200;
      var ng = AC.createGain();
      ng.gain.setValueAtTime(0.045, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(hp); hp.connect(ng); ng.connect(master);
      s.start(t); s.stop(t + 0.06);
    } catch (e) { }
  }
  /* 3) whoosh — filtered noise sweep (menu / palette / tabs) */
  function sndWhoosh(up) {
    if (!enabled || !ensureCtx()) return;
    try {
      var dur = 0.55, t = AC.currentTime;
      var src = AC.createBufferSource(); src.buffer = noiseBuffer();
      var bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(up === false ? 1900 : 420, t);
      bp.frequency.exponentialRampToValueAtTime(up === false ? 420 : 2400, t + dur);
      var g = AC.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.085, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.05);
    } catch (e) { }
  }
  /* 4) discovery chime — rising triad (celestial discoveries) */
  function sndChime() {
    tone(523.25, 0.3, 0.07, "sine", 0);
    tone(659.25, 0.3, 0.07, "sine", 0.11);
    tone(783.99, 0.45, 0.08, "sine", 0.22);
  }
  /* 5) fanfare — mission-complete flourish */
  function sndFanfare() {
    [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.5, 0.08, "triangle", i * 0.13); });
    tone(130.81, 0.9, 0.06, "sine", 0.05); /* low root for weight */
  }

  var SFX = {
    get enabled() { return enabled; },
    toggle: function () {
      enabled = !enabled;
      if (enabled) { ensureCtx(); if (AC && AC.state === "suspended") AC.resume(); startAmbient(); }
      else stopAmbient();
      try { localStorage.setItem("kia-sound", enabled ? "1" : "0"); } catch (e) { }
      var b = document.getElementById("sound-toggle");
      if (b) b.textContent = enabled ? "🔊" : "🔇";
      return enabled;
    },
    /* the 5 */
    hover: sndHover,
    click: sndClick,
    whoosh: function (up) { sndWhoosh(up); },
    chime: sndChime,
    fanfare: sndFanfare,
    /* backwards-compatible aliases used across the site */
    blip: sndClick,
    discover: sndChime,
    complete: sndFanfare
  };
  window.KIA_SFX = SFX;

  /* wire hover + click sounds (only when sound is enabled) */
  var lastHover = 0;
  document.addEventListener("pointerover", function (e) {
    if (!enabled) return;
    var t = e.target && e.target.closest ? e.target.closest("a, button, .chip, .pill, .card, .skill-card, .c-card, .rm-card, .tab") : null;
    if (!t) return;
    var now = (window.performance && performance.now()) || Date.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    sndHover();
  }, { passive: true });
  document.addEventListener("click", function (e) {
    if (!enabled) return;
    var el = e.target && e.target.closest;
    if (!el) return;
    if (e.target.closest("#mobile-menu a")) return; /* menu plays its own blip */
    if (e.target.closest("#sound-toggle")) return;   /* no self-noise on toggle */
    sndClick();
  });
  try {
    if (localStorage.getItem("kia-sound") === "1") {
      /* cannot start audio without gesture — arm on first interaction */
      var arm = function () { SFX.toggle(); SFX.toggle(); SFX.toggle(); document.removeEventListener("pointerdown", arm); };
      document.addEventListener("pointerdown", arm);
    }
  } catch (e) { }

  /* ---------------- toasts ---------------- */
  function toast(title, sub, color) {
    var host = document.getElementById("toasts");
    if (!host) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.style.setProperty("--tc", color || "#fbbf24");
    el.innerHTML = '<span class="t-ico">⟡</span><span><b>' + title + "</b><small>" + sub + "</small></span>";
    host.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 3200);
    setTimeout(function () { try { host.removeChild(el); } catch (e) { } }, 3700);
  }

  /* ---------------- canvas: stars + scroll bodies ---------------- */
  var canvas = document.getElementById("cosmos");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var W = 0, H = 0, stars = [], dpr = 1;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mouseX = 0, mouseY = 0, tMouseX = 0, tMouseY = 0;
  window.addEventListener("pointermove", function (e) {
    tMouseX = (e.clientX / Math.max(1, window.innerWidth)) - 0.5;
    tMouseY = (e.clientY / Math.max(1, window.innerHeight)) - 0.5;
  }, { passive: true });

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx && ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(W < 600 ? 110 : 260, Math.floor((W * H) / (W < 600 ? 8000 : 5200)));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.3 + 0.3,
        tw: Math.random() * Math.PI * 2,
        c: Math.random() < 0.14 ? "#22d3ee" : (Math.random() < 0.12 ? "#fbbf24" : "#e2e8f0")
      });
    }
  }

  function drawStarfield(t, scrollPx) {
    mouseX += (tMouseX - mouseX) * 0.05;
    mouseY += (tMouseY - mouseY) * 0.05;
    ctx.fillStyle = "#06060e";
    ctx.fillRect(0, 0, W, H);
    /* nebula glows drift with page progress + mouse */
    var p = progress();
    var g1 = ctx.createRadialGradient(W * (0.2 + 0.5 * p) + mouseX * 120, H * 0.25 + mouseY * 80, 40, W * (0.2 + 0.5 * p) + mouseX * 120, H * 0.25 + mouseY * 80, W * 0.55);
    g1.addColorStop(0, "rgba(167,139,250,0.10)");
    g1.addColorStop(1, "rgba(167,139,250,0)");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(W * (0.85 - 0.55 * p) + mouseX * -90, H * 0.75 + mouseY * 60, 30, W * (0.85 - 0.55 * p) + mouseX * -90, H * 0.75 + mouseY * 60, W * 0.5);
    g2.addColorStop(0, "rgba(34,211,238,0.08)");
    g2.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = (s.y - scrollPx * 0.08 * s.z + H * 4) % H;
      var a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw + t * 0.0012 * (0.4 + s.z)));
      ctx.globalAlpha = a * (0.4 + s.z * 0.6);
      ctx.beginPath();
      ctx.arc(s.x + mouseX * 40 * s.z, y + mouseY * 26 * s.z, s.r, 0, 6.2832);
      ctx.fillStyle = s.c;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBody(b, k) {
    /* k: 0..1 visibility/entrance across the body window */
    var win = (progress() - (b.at - 0.05)) / 0.14;
    if (win < 0 || win > 1.6) return;
    var entry = Math.min(1, win * 3);
    var exit = win > 1 ? Math.max(0, 1 - (win - 1) * 2.2) : 1;
    var vis = entry * exit;
    if (vis <= 0.01) return;
    var sideX = b.side > 0 ? W * 0.82 : W * 0.18;
    var y = H * (0.85 - win * 0.55);
    var r = Math.min(W, H) * 0.075;
    ctx.save();
    ctx.globalAlpha = vis * 0.92;
    ctx.translate(sideX + mouseX * 70, y + mouseY * 46);
    ctx.translate(Math.sin(performance.now() * 0.0006 + b.at * 9) * 6, Math.cos(performance.now() * 0.0005 + b.at * 7) * 5);

    if (b.kind === "moon") {
      ctx.fillStyle = "#cfd3dc";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgba(90,95,110,.55)";
      [[-0.35, -0.2, 0.22], [0.3, 0.15, 0.18], [0.05, -0.45, 0.13], [-0.1, 0.4, 0.16]].forEach(function (c) {
        ctx.beginPath(); ctx.arc(c[0] * r, c[1] * r, c[2] * r, 0, 6.2832); ctx.fill();
      });
      ctx.fillStyle = "rgba(6,6,14,.55)";
      ctx.beginPath(); ctx.arc(r * 0.4, r * 0.15, r * 0.96, 0, 6.2832); ctx.fill();
    } else if (b.kind === "planet") {
      var pg = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
      pg.addColorStop(0, "#f07a4a"); pg.addColorStop(0.6, b.color); pg.addColorStop(1, "#5e1c06");
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      [0.3, 0.55, 0.8].forEach(function (k) { ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.ellipse(0, (k - 0.55) * r * 0.8, r * 0.95, r * 0.2, 0, 0, 6.2832); ctx.stroke(); });
    } else if (b.kind === "saturn") {
      var sg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      sg.addColorStop(0, "#f4e3b8"); sg.addColorStop(1, "#9c7c3c");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = "rgba(227,199,138,.85)";
      ctx.lineWidth = r * 0.14;
      ctx.save(); ctx.rotate(-0.45);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.42, 0, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = "rgba(227,199,138,.35)";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, 0, 6.2832); ctx.stroke();
      ctx.restore();
    } else if (b.kind === "comet") {
      var grd = ctx.createLinearGradient(r * 3, 0, 0, 0);
      grd.addColorStop(0, "rgba(125,211,252,0)");
      grd.addColorStop(1, "rgba(226,232,240,.85)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(r * 3.4, -r * 0.16);
      ctx.lineTo(0, -r * 0.5);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(r * 3.4, r * 0.16);
      ctx.closePath(); ctx.fill();
      var cg = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.8);
      cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.4, "#bae6fd"); cg.addColorStop(1, "rgba(125,211,252,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.2832); ctx.fill();
    } else if (b.kind === "nebula") {
      for (var i = 0; i < 5; i++) {
        var ang = i * 1.35;
        var rr = r * (0.7 + i * 0.22);
        var ng = ctx.createRadialGradient(Math.cos(ang) * r * 0.4, Math.sin(ang) * r * 0.4, 2, Math.cos(ang) * r * 0.4, Math.sin(ang) * r * 0.4, rr);
        ng.addColorStop(0, i % 2 ? "rgba(34,211,238,.30)" : "rgba(167,139,250,.34)");
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(Math.cos(ang) * r * 0.4, Math.sin(ang) * r * 0.4, rr, 0, 6.2832); ctx.fill();
      }
    } else if (b.kind === "pulsar") {
      var t = performance.now() * 0.004;
      ctx.rotate(t);
      var bg = ctx.createLinearGradient(-r * 3, 0, r * 3, 0);
      bg.addColorStop(0, "rgba(34,211,238,0)"); bg.addColorStop(0.5, "rgba(34,211,238,.8)"); bg.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(-r * 3, -r * 0.09, r * 6, r * 0.18);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = bg;
      ctx.fillRect(-r * 3, -r * 0.09, r * 6, r * 0.18);
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, 6.2832); ctx.fill();
    } else if (b.kind === "hole") {
      var hg = ctx.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 1.9);
      hg.addColorStop(0, "rgba(0,0,0,1)");
      hg.addColorStop(0.42, "rgba(251,191,36,.85)");
      hg.addColorStop(0.6, "rgba(251,113,133,.35)");
      hg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- progress + HUD ---------------- */
  function progress() {
    var h = document.documentElement;
    var max = Math.max(1, h.scrollHeight - window.innerHeight);
    return Math.min(1, Math.max(0, (h.scrollTop || document.body.scrollTop) / max));
  }
  var shownPct = 0;
  function updateHUD(p) {
    var pctEl = document.getElementById("hud-pct");
    var arc = document.getElementById("hud-arc");
    var foundEl = document.getElementById("hud-found");
    if (!pctEl) return;
    shownPct += (p * 100 - shownPct) * 0.16;
    if (Math.abs(shownPct - p * 100) < 0.05) shownPct = p * 100;
    pctEl.textContent = Math.round(shownPct) + "%";
    if (arc) {
      var C = 2 * Math.PI * 26;
      arc.style.strokeDasharray = C;
      arc.style.strokeDashoffset = C * (1 - shownPct / 100);
    }
    if (foundEl) foundEl.textContent = found + "/" + BODIES.length;
    document.documentElement.style.setProperty("--scroll-p", (p * 100).toFixed(1) + "%");
  }

  function checkMilestones(p) {
    for (var i = 0; i < BODIES.length; i++) {
      var b = BODIES[i];
      if (!achieved[b.id || b.name] && p >= b.at) {
        achieved[b.name] = true;
        found++;
        toast("DISCOVERY — " + b.name, Math.round(p * 100) + "% traversed · " + found + "/" + BODIES.length + " bodies", b.color || "#fbbf24");
        SFX.discover();
      }
    }
    if (!achieved.__complete && p >= 0.985) {
      achieved.__complete = true;
      toast("MISSION COMPLETE — 100%", "You saw the whole system. Nice.", "#34d399");
      SFX.complete();
    }
  }

  /* ---------------- loop ---------------- */
  var scrollPx = 0;
  var started = false;
  function frame(t) {
    if (!ctx) return;
    scrollPx = window.scrollY || 0;
    var p = progress();
    drawStarfield(t, scrollPx);
    for (var i = 0; i < BODIES.length; i++) drawBody(BODIES[i]);
    updateHUD(p);
    if (!reduce) requestAnimationFrame(frame);
  }
  function start() {
    if (started || !canvas || !ctx) return;
    started = true;
    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      var upd = function () { drawStarfield(0, window.scrollY || 0); var p = progress(); for (var i = 0; i < BODIES.length; i++) drawBody(BODIES[i]); updateHUD(p); };
      window.addEventListener("scroll", upd, { passive: true });
      upd();
    } else {
      requestAnimationFrame(frame);
    }
    window.addEventListener("scroll", function () { checkMilestones(progress()); }, { passive: true });
    setTimeout(function () { checkMilestones(progress()); }, 600);
  }

  /* sound toggle */
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("sound-toggle");
    if (btn) {
      try { if (localStorage.getItem("kia-sound") === "1") { btn.textContent = "🔇"; } } catch (e) { }
      btn.addEventListener("click", function () { SFX.toggle(); });
    }
    start();
  });
  /* also handle already-parsed DOM (scripts at end of body) */
  if (document.readyState !== "loading") {
    var btn0 = document.getElementById("sound-toggle");
    if (btn0 && !btn0.dataset.bound) {
      btn0.dataset.bound = "1";
      btn0.addEventListener("click", function () { SFX.toggle(); });
    }
    /* start the starfield off the critical path */
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1200 });
    else setTimeout(start, 80);
  }
})();
