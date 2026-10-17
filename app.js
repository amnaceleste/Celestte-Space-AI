/* =========================================================
   Celestte Space AI — landing experience
   ========================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Toasts ---------- */
  var toastWrap = doc.getElementById("toast-wrap");
  function toast(message, kind) {
    if (!toastWrap) return;
    var el = doc.createElement("div");
    el.className = "toast" + (kind === "warn" ? " warn" : "");
    el.innerHTML =
      '<svg class="icon-sm" aria-hidden="true"><use href="#i-' +
      (kind === "warn" ? "close" : "check") +
      '"/></svg><span></span>';
    el.querySelector("span").textContent = message;
    toastWrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "opacity 200ms ease, transform 200ms ease";
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  }
  window.celestteToast = toast;

  /* ---------- Theme ---------- */
  var themeToggle = doc.getElementById("theme-toggle");
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("celestte-theme", theme); } catch (e) {}
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      toast(next === "light" ? "Light theme on." : "Dark theme on.");
    });
  }

  /* ---------- Nav ---------- */
  var nav = doc.getElementById("site-nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 48);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var navToggle = doc.getElementById("nav-toggle");
  var mobileMenu = doc.getElementById("mobile-menu");
  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      navToggle.innerHTML =
        '<svg class="icon-sm" aria-hidden="true"><use href="#i-' +
        (open ? "close" : "menu") + '"/></svg>';
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        mobileMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = '<svg class="icon-sm" aria-hidden="true"><use href="#i-menu"/></svg>';
      }
    });
  }

  /* Active section highlight */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll("#nav-links a"));
  var sectionIds = navLinks.map(function (a) { return a.getAttribute("href"); });
  function markActive() {
    var best = null;
    sectionIds.forEach(function (id) {
      var sec = doc.querySelector(id);
      if (sec && sec.getBoundingClientRect().top <= 140) best = id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === best);
    });
  }
  window.addEventListener("scroll", markActive, { passive: true });

  /* ---------- Hero boot ---------- */
  var heroCopy = doc.getElementById("hero-copy");
  var heroOrbit = doc.getElementById("hero-orbit");
  var heroRail = doc.getElementById("hero-rail");
  function boot() {
    if (heroCopy) heroCopy.classList.add("is-ready");
    if (heroOrbit) heroOrbit.classList.add("is-ready");
    if (heroRail) heroRail.classList.add("is-ready");
  }
  if (reduceMotion) {
    boot();
    var core0 = doc.getElementById("orbit-core");
    if (core0) core0.classList.remove("is-dim");
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(boot); });
  }

  /* ---------- Celestial Scan ---------- */
  var scanPath = doc.getElementById("scan-path");
  var scanBeam = doc.getElementById("scan-beam");
  var orbitCore = doc.getElementById("orbit-core");
  var orbitNodes = Array.prototype.slice.call(doc.querySelectorAll(".orbit-node"));
  var scanBusy = false;

  function bezier(p1x, p1y, p2x, p2y) {
    // approximate cubic-bezier easing for JS-driven beam travel
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a) { return 3 * a; }
    function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
    return function (x) {
      var t = x;
      for (var i = 0; i < 6; i++) {
        var s = slope(t, p1x, p2x);
        if (s === 0) break;
        t -= (calc(t, p1x, p2x) - x) / s;
      }
      return calc(t, p1y, p2y);
    };
  }
  var easeScan = bezier(0.16, 1, 0.3, 1);

  function runScan() {
    if (!scanPath || !scanBeam || scanBusy) return;
    scanBusy = true;
    orbitNodes.forEach(function (n) { n.classList.remove("is-lit"); });

    if (reduceMotion) {
      orbitNodes.forEach(function (n) { n.classList.add("is-lit"); });
      if (orbitCore) { orbitCore.classList.remove("is-dim"); orbitCore.classList.add("is-lit"); }
      scanBusy = false;
      return;
    }

    if (orbitCore) { orbitCore.classList.add("is-dim"); orbitCore.classList.remove("is-lit"); }

    var len = scanPath.getTotalLength();
    var duration = 1400;
    var start = null;
    scanBeam.setAttribute("opacity", "1");

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = easeScan(p);
      var pt = scanPath.getPointAtLength(eased * len);
      scanBeam.setAttribute("transform", "translate(" + pt.x + "," + pt.y + ")");

      var i = Math.floor(p * 4);
      orbitNodes.forEach(function (n, idx) {
        if (idx <= i) n.classList.add("is-lit");
      });

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        scanBeam.setAttribute("opacity", "0");
        orbitNodes.forEach(function (n) { n.classList.add("is-lit"); });
        if (orbitCore) {
          orbitCore.classList.remove("is-dim");
          orbitCore.classList.add("is-lit");
        }
        scanBusy = false;
      }
    }
    requestAnimationFrame(frame);
  }

  // trigger: after boot, on pointer entry, and on demand
  if (!reduceMotion) {
    setTimeout(runScan, 700);
  } else {
    runScan();
  }
  if (heroOrbit) {
    heroOrbit.addEventListener("pointerenter", function () {
      if (!scanBusy) runScan();
    });
  }
  var seeThinks = doc.getElementById("see-thinks");
  if (seeThinks) {
    seeThinks.addEventListener("click", function () {
      runScan();
      toast("Celestte is mapping the question → evidence → answer.");
    });
  }

  /* ---------- Prompt stage ---------- */
  var PLACEHOLDERS = {
    research: "Ask about a planet, moon, orbit, star, or space mission…",
    create: "Write a space note — Earth, the Moon, black holes…",
    plan: "Plan sky watching or a space study path…",
    solve: "Pose a space problem — gravity, orbits, seasons…"
  };
  var MODE_LABEL = { research: "Research", create: "Write", plan: "Plan", solve: "Solve" };

  var segButtons = Array.prototype.slice.call(doc.querySelectorAll(".seg-btn"));
  var input = doc.getElementById("prompt-input");
  var composer = doc.getElementById("composer");
  var result = doc.getElementById("result");
  var resultBody = doc.getElementById("result-body");
  var resultStatus = doc.getElementById("result-status");
  var resultStatusText = doc.getElementById("result-status-text");
  var thinking = doc.getElementById("thinking");
  var thinkingLabel = doc.getElementById("thinking-label");
  var currentMode = "research";
  var typeTimer = null;

  function setMode(mode, opts) {
    if (!PLACEHOLDERS[mode]) mode = "research";
    currentMode = mode;
    segButtons.forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.mode === mode));
    });
    orbitNodes.forEach(function (n) {
      n.classList.toggle("is-active", n.dataset.mode === mode);
    });
    if (input) input.placeholder = PLACEHOLDERS[mode];
    if (opts && opts.focus && input) {
      doc.getElementById("capabilities").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      setTimeout(function () { input.focus({ preventScroll: true }); }, reduceMotion ? 0 : 420);
    }
    if (opts && opts.fill && input) input.value = opts.fill;
    if (opts && opts.toast) toast(MODE_LABEL[mode] + " mode selected.");
  }

  segButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      setMode(b.dataset.mode, { toast: true });
      if (input) input.focus({ preventScroll: true });
    });
    b.addEventListener("keydown", function (e) {
      var idx = segButtons.indexOf(b);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var next = segButtons[(idx + (e.key === "ArrowRight" ? 1 : segButtons.length - 1)) % segButtons.length];
        next.focus();
        setMode(next.dataset.mode);
      }
    });
  });

  orbitNodes.forEach(function (n) {
    n.addEventListener("click", function () {
      setMode(n.dataset.mode, { focus: true, toast: true });
    });
  });

  Array.prototype.slice.call(doc.querySelectorAll("[data-mode-link]")).forEach(function (link) {
    link.addEventListener("click", function () {
      setMode(link.dataset.modeLink);
    });
  });

  Array.prototype.slice.call(doc.querySelectorAll(".example-chip")).forEach(function (chip) {
    chip.addEventListener("click", function () {
      setMode(chip.dataset.mode, { fill: chip.dataset.fill, focus: true });
      if (composer) composer.requestSubmit ? composer.requestSubmit() : composer.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  });

  Array.prototype.slice.call(doc.querySelectorAll("[data-tool]")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tool = btn.dataset.tool;
      var messages = {
        attach: "Attach: drop a file here after launching the workspace.",
        web: "Web search enabled for this prompt.",
        voice: "Voice input is available in the full workspace."
      };
      btn.classList.toggle("is-on");
      toast(messages[tool], tool === "voice" ? "warn" : undefined);
    });
  });

  function typeOut(text, done) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    if (reduceMotion) {
      resultBody.textContent = text;
      if (done) done();
      return;
    }
    resultBody.textContent = "";
    var i = 0;
    var step = Math.max(2, Math.round(1200 / Math.max(text.length, 1)));
    typeTimer = setInterval(function () {
      i += 3;
      resultBody.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(typeTimer);
        typeTimer = null;
        if (done) done();
      }
    }, step);
  }

  if (composer) {
    composer.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input ? input.value.trim() : "";
      if (!value) {
        if (input) input.focus();
        toast("Type a question first — or try an example below.", "warn");
        return;
      }
      if (result) result.hidden = false;
      if (thinking) thinking.classList.add("is-on");
      if (resultStatus) resultStatus.className = "status-chip thinking";
      if (resultStatusText) resultStatusText.textContent = "Thinking";
      if (resultBody) resultBody.textContent = "";
      if (thinkingLabel) {
        thinkingLabel.textContent = reduceMotion
          ? "Composing answer…"
          : "Celestte is thinking…";
      }
      if (result) result.classList.remove("is-done");
      if (result) result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });

      window.CelestteAI.ask(value, currentMode).then(function (res) {
        if (thinking) thinking.classList.remove("is-on");
        if (resultStatus) resultStatus.className = "status-chip working";
        if (resultStatusText) resultStatusText.textContent = "Working";
        typeOut(res.text, function () {
          if (resultStatus) resultStatus.className = "status-chip ready";
          if (resultStatusText) resultStatusText.textContent = "Ready";
          if (result) result.classList.add("is-done");
          var label = (window.CelestteAI.SOURCE_LABELS && window.CelestteAI.SOURCE_LABELS[res.source]) || "Live";
          toast(
            res.live
              ? "Answer ready · " + label + " · " + MODE_LABEL[currentMode]
              : "Offline · no live source reachable right now",
            res.live ? undefined : "warn"
          );
        });
      });
    });
  }

  /* ---------- Scroll reveals ---------- */
  var revealables = Array.prototype.slice.call(doc.querySelectorAll("[data-reveal]"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Live AI connection (Gemini) ---------- */
  var apiToggle = doc.getElementById("api-toggle");
  var apiForm = doc.getElementById("api-form");
  var apiKeyInput = doc.getElementById("api-key");
  var apiModelInput = doc.getElementById("api-model");
  var apiTest = doc.getElementById("api-test");
  var apiClear = doc.getElementById("api-clear");
  var apiStatusText = doc.getElementById("api-status-text");
  var apiStatusDot = doc.getElementById("api-status-dot");

  function syncApiBadge() {
    if (!apiStatusText || !window.CelestteAI) return;
    var hasKey = !!window.CelestteAI.getKey();
    apiStatusText.textContent = hasKey
      ? "Gemini live · " + window.CelestteAI.getModel() + " · data APIs on"
      : "Live data on · Gemini optional";
    if (apiStatusDot) apiStatusDot.className = "dot dot-green";
    if (apiKeyInput && !apiKeyInput.value) apiKeyInput.value = window.CelestteAI.getKey();
    if (apiModelInput) apiModelInput.value = window.CelestteAI.getModel();
  }

  if (apiToggle && apiForm) {
    apiToggle.addEventListener("click", function () {
      apiForm.hidden = !apiForm.hidden;
      if (!apiForm.hidden) {
        syncApiBadge();
        if (apiKeyInput) apiKeyInput.focus();
      }
    });
    if (apiForm.tagName === "FORM") {
      apiForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var key = apiKeyInput ? apiKeyInput.value.trim() : "";
        if (!key) {
          toast("Paste a Gemini API key first.", "warn");
          return;
        }
        window.CelestteAI.setKey(key);
        window.CelestteAI.setModel(apiModelInput ? apiModelInput.value : "");
        syncApiBadge();
        toast("Key saved. Testing connection…");
        window.CelestteAI.test().then(function (r) {
          toast(r.message, r.ok ? undefined : "warn");
          syncApiBadge();
        });
      });
    }
    if (apiTest) {
      apiTest.addEventListener("click", function () {
        toast("Testing connection…");
        window.CelestteAI.test().then(function (r) {
          toast(r.message, r.ok ? undefined : "warn");
        });
      });
    }
    if (apiClear) {
      apiClear.addEventListener("click", function () {
        window.CelestteAI.setKey("");
        if (apiKeyInput) apiKeyInput.value = "";
        syncApiBadge();
        toast("API key removed from this browser.");
      });
    }
    syncApiBadge();
  }

  /* fill model datalist with live, key-accepted models */
  if (window.CelestteAI && window.CelestteAI.getKey()) {
    window.CelestteAI.listModels().then(function (models) {
      var dl = doc.getElementById("model-options");
      if (!dl || !models.length) return;
      dl.innerHTML = "";
      models.forEach(function (m) {
        var opt = doc.createElement("option");
        opt.value = m.id;
        dl.appendChild(opt);
      });
    });
  }

  /* initial state */
  setMode("research");
  markActive();
})();
