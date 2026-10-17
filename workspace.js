/* =========================================================
   Celestte Space AI — workspace shell
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

  /* ---------- Theme ---------- */
  var themeToggle = doc.getElementById("ws-theme-toggle");
  var themeLabel = doc.getElementById("ws-theme-label");
  var settingsTheme = doc.getElementById("settings-theme");

  function syncThemeUI() {
    var isLight = root.getAttribute("data-theme") === "light";
    if (themeLabel) themeLabel.textContent = isLight ? "Dark mode" : "Light mode";
    if (settingsTheme) settingsTheme.setAttribute("aria-checked", String(isLight));
  }
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("celestte-theme", theme); } catch (e) {}
    syncThemeUI();
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
  }
  if (settingsTheme) {
    settingsTheme.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
  }
  syncThemeUI();

  /* ---------- Switches ---------- */
  Array.prototype.slice.call(doc.querySelectorAll(".switch")).forEach(function (sw) {
    if (sw === settingsTheme) return;
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-checked") === "true";
      sw.setAttribute("aria-checked", String(!on));
    });
  });

  /* ---------- Sidebar (mobile) ---------- */
  var sidebar = doc.getElementById("app-sidebar");
  var backdrop = doc.getElementById("side-backdrop");
  var sidebarToggle = doc.getElementById("sidebar-toggle");

  function openSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-open", open);
  }
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      openSidebar(!sidebar.classList.contains("is-open"));
    });
  }
  if (backdrop) backdrop.addEventListener("click", function () { openSidebar(false); });

  /* ---------- Routing / view titles ---------- */
  var TITLES = {
    "view-dashboard": "Dashboard",
    "view-newtask": "New Task",
    "view-task": "Task",
    "view-projects": "Saved Projects",
    "view-history": "History",
    "view-models": "Model Gallery",
    "view-settings": "Settings",
    "view-signin": "Sign in"
  };
  var pageTitle = doc.getElementById("page-title");
  var sideItems = Array.prototype.slice.call(doc.querySelectorAll(".side-item[data-view]"));

  function currentViewId() {
    var hash = (location.hash || "").replace("#", "");
    return TITLES[hash] ? hash : "view-dashboard";
  }

  function onRoute() {
    var id = currentViewId();
    /* auth gate: if there is no session, show sign in / sign up first */
    var user = window.CelestteAuth ? window.CelestteAuth.currentUser() : null;
    if (!user && id !== "view-signin") {
      location.hash = "view-signin";
      id = "view-signin";
    }
    refreshUserUI();
    Array.prototype.slice.call(doc.querySelectorAll(".view")).forEach(function (v) {
      v.style.display = v.id === id ? "grid" : "none";
    });
    if (pageTitle) pageTitle.textContent = TITLES[id];
    sideItems.forEach(function (a) {
      a.classList.toggle("is-active", a.dataset.view === id);
    });
    doc.title = TITLES[id] + " — Celestte Space AI";
    openSidebar(false);
    if (id === "view-task") runTaskSequence();
  }
  window.addEventListener("hashchange", onRoute);

  /* ---------- Model selector ---------- */
  var modelSelect = doc.getElementById("model-select");
  var modelMenu = doc.getElementById("model-menu");
  var modelName = doc.getElementById("model-name");
  if (modelSelect && modelMenu) {
    modelSelect.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-model]");
      if (btn) {
        if (modelName) modelName.textContent = btn.dataset.model;
        Array.prototype.slice.call(modelMenu.children).forEach(function (c) {
          c.classList.toggle("is-sel", c === btn);
        });
        modelMenu.classList.remove("is-open");
        toast("Model switched to " + btn.dataset.model + ".");
        var tm = doc.getElementById("task-model");
        if (tm) tm.textContent = btn.dataset.model;
        return;
      }
      modelMenu.classList.toggle("is-open");
    });
    doc.addEventListener("click", function (e) {
      if (!modelSelect.contains(e.target)) modelMenu.classList.remove("is-open");
    });
  }

  /* ---------- Search filter ---------- */
  var search = doc.getElementById("ws-search");
  if (search) {
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var rows = doc.querySelectorAll(".view .list-row");
      Array.prototype.slice.call(rows).forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = !q || text.indexOf(q) !== -1 ? "" : "none";
      });
    });
  }

  /* ---------- Clickable rows ---------- */
  Array.prototype.slice.call(doc.querySelectorAll("[data-href]")).forEach(function (row) {
    function go() { location.hash = row.dataset.href.replace("#", ""); }
    row.addEventListener("click", go);
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });

  /* ---------- New task composer ---------- */
  var PLACEHOLDERS = {
    research: "Ask about a planet, moon, orbit, star, or space mission…",
    create: "Write a space note — Earth, the Moon, black holes…",
    plan: "Plan sky watching or a space study path…",
    solve: "Pose a space problem — gravity, orbits, seasons…"
  };
  var MODE_LABEL = { research: "Research", create: "Write", plan: "Plan", solve: "Solve" };
  var wsSeg = doc.getElementById("ws-segmented");
  var wsInput = doc.getElementById("ws-task-input");
  var wsComposer = doc.getElementById("ws-composer");
  var currentMode = "plan";

  if (wsSeg) {
    Array.prototype.slice.call(wsSeg.querySelectorAll(".seg-btn")).forEach(function (b) {
      b.addEventListener("click", function () {
        currentMode = b.dataset.mode;
        Array.prototype.slice.call(wsSeg.querySelectorAll(".seg-btn")).forEach(function (x) {
          x.setAttribute("aria-selected", String(x === b));
        });
        if (wsInput) wsInput.placeholder = PLACEHOLDERS[currentMode];
      });
    });
  }

  Array.prototype.slice.call(doc.querySelectorAll("[data-tool]")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tool = btn.dataset.tool;
      var messages = {
        attach: "Attachment added to the task context.",
        web: "Web context enabled for this task.",
        voice: "Voice input is not available in this demo."
      };
      toast(messages[tool], tool === "voice" ? "warn" : undefined);
    });
  });

  /* ---------- Task run sequence ---------- */
  var taskSteps = Array.prototype.slice.call(doc.querySelectorAll(".task-step"));
  var progressBar = doc.getElementById("progress-bar");
  var progressLabel = doc.getElementById("progress-label");
  var taskStatus = doc.getElementById("task-status");
  var taskStatusText = doc.getElementById("task-status-text");
  var taskBrief = doc.getElementById("task-brief");
  var taskTitle = doc.getElementById("task-title");
  var taskMode = doc.getElementById("task-mode");
  var taskModel = doc.getElementById("task-model");
  var taskOutput = doc.getElementById("task-output");
  var seqTimers = [];
  var seqRunning = false;

  function clearSeq() {
    seqTimers.forEach(clearTimeout);
    seqTimers = [];
  }

  function runTaskSequence() {
    clearSeq();
    seqRunning = true;

    // fill brief from composer when provided
    if (pendingBrief && taskBrief) {
      taskBrief.textContent = pendingBrief;
      pendingBrief = null;
    }
    if (taskOutput) taskOutput.textContent = "";
    taskSteps.forEach(function (s) { s.classList.remove("is-active", "is-done"); });
    if (progressBar) progressBar.style.width = "0%";
    if (progressLabel) progressLabel.textContent = "0%";
    if (taskStatus) taskStatus.className = "status-chip thinking";
    if (taskStatusText) taskStatusText.textContent = "Thinking";

    var stepMs = reduceMotion ? 60 : 700;
    taskSteps.forEach(function (step, i) {
      seqTimers.push(setTimeout(function () {
        taskSteps.forEach(function (s, j) {
          s.classList.toggle("is-active", j === i);
          s.classList.toggle("is-done", j < i);
        });
        if (progressBar) progressBar.style.width = Math.round(((i + 1) / 4) * 88) + "%";
        if (progressLabel) progressLabel.textContent = Math.round(((i + 1) / 4) * 88) + "%";
        if (i === 1) {
          if (taskStatus) taskStatus.className = "status-chip working";
          if (taskStatusText) taskStatusText.textContent = "Working";
        }
      }, stepMs * (i + 1)));
    });

    seqTimers.push(setTimeout(function () {
      taskSteps.forEach(function (s) {
        s.classList.remove("is-active");
        s.classList.add("is-done");
      });
      if (progressBar) progressBar.style.width = "100%";
      if (progressLabel) progressLabel.textContent = "100%";
      if (taskStatus) taskStatus.className = "status-chip complete";
      if (taskStatusText) taskStatusText.textContent = "Complete";
      if (taskOutput) taskOutput.textContent = "Asking the live model…";
      seqRunning = false;
      var briefText = taskBrief ? taskBrief.textContent : "";
      window.CelestteAI.ask(briefText, currentMode).then(function (res) {
        if (taskOutput) taskOutput.textContent = res.text;
        var label = (window.CelestteAI.SOURCE_LABELS && window.CelestteAI.SOURCE_LABELS[res.source]) || "Live";
        toast(
          res.live ? "Answer ready · " + label : "Offline · no live source reachable right now",
          res.live ? undefined : "warn"
        );
      });
    }, stepMs * 4 + 400));
  }

  var pendingBrief = null;
  if (wsComposer) {
    wsComposer.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = wsInput ? wsInput.value.trim() : "";
      if (!value) {
        if (wsInput) wsInput.focus();
        toast("Describe the task first — or pick an example.", "warn");
        return;
      }
      pendingBrief = value;
      if (taskTitle) taskTitle.textContent = value.split("\n")[0].slice(0, 48);
      if (taskMode) taskMode.textContent = MODE_LABEL[currentMode];
      if (taskModel && modelName) taskModel.textContent = modelName.textContent;
      location.hash = "view-task";
      if (currentViewId() === "view-task") runTaskSequence();
      toast("Task started · " + MODE_LABEL[currentMode]);
    });
  }

  /* ---------- Task actions ---------- */
  var actionMessages = {
    "save-project": "Saved to project · Q4 Launch Narrative",
    "export-answer": "Exported as Markdown · research-answer.md",
    "share-answer": "Share link copied to clipboard",
    "share-btn": "Workspace link copied to clipboard",
    "export-data": "Data export queued · you'll get an email shortly",
    "contact-sales": "Thanks — sales will reach out within one business day."
  };
  Object.keys(actionMessages).forEach(function (id) {
    var el = doc.getElementById(id);
    if (el) el.addEventListener("click", function () { toast(actionMessages[id]); });
  });

  /* ---------- Model gallery "use model" ---------- */
  Array.prototype.slice.call(doc.querySelectorAll(".use-model")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest("[data-model]");
      var name = card ? card.dataset.model : "Model";
      if (modelName) modelName.textContent = name;
      if (taskModel) taskModel.textContent = name;
      toast(name + " is now active.");
    });
  });

  /* ---------- Accounts: sign up / login / guest ---------- */
  function refreshUserUI() {
    var u = window.CelestteAuth ? window.CelestteAuth.currentUser() : null;
    var name = u ? u.name : "Explorer";
    var initial = (name || "E").trim().charAt(0).toUpperCase();
    var hour = new Date().getHours();
    var greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    function setText(id, text) { var el = doc.getElementById(id); if (el) el.textContent = text; }
    setText("greet-line", greet);
    setText("greet-name", name);
    setText("signed-in-as", name);
    setText("side-user-name", name);
    setText("side-user-meta", u ? (u.guest ? "guest session" : "pro · synced") : "not signed in");
    var sideAv = doc.getElementById("side-avatar");
    if (sideAv) sideAv.textContent = initial;
    var topAv = doc.getElementById("top-avatar");
    if (topAv) topAv.textContent = initial;
    var authTitle = doc.getElementById("auth-title");
    if (authTitle && u) authTitle.textContent = "Welcome back, " + name;
  }

  var tabSignin = doc.getElementById("tab-signin");
  var tabSignup = doc.getElementById("tab-signup");
  var signinForm = doc.getElementById("signin-form");
  var signupForm = doc.getElementById("signup-form");

  function showAuthTab(which) {
    var isSignup = which === "signup";
    if (tabSignin) tabSignin.setAttribute("aria-selected", String(!isSignup));
    if (tabSignup) tabSignup.setAttribute("aria-selected", String(isSignup));
    if (signinForm) signinForm.hidden = isSignup;
    if (signupForm) signupForm.hidden = !isSignup;
    var authTitle = doc.getElementById("auth-title");
    if (authTitle) authTitle.textContent = isSignup ? "Create your free account" : "Welcome back, stargazer";
  }
  if (tabSignin) tabSignin.addEventListener("click", function () { showAuthTab("signin"); });
  if (tabSignup) tabSignup.addEventListener("click", function () { showAuthTab("signup"); });
  var toSignin = doc.getElementById("to-signin");
  if (toSignin) toSignin.addEventListener("click", function () { showAuthTab("signin"); });
  if (/tab=signup/.test(location.search || "")) showAuthTab("signup");

  /* password show/hide toggles */
  Array.prototype.slice.call(doc.querySelectorAll("[data-pw-target]")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var field = doc.getElementById(btn.dataset.pwTarget);
      if (!field) return;
      var showing = field.type === "text";
      field.type = showing ? "password" : "text";
      btn.textContent = showing ? "Show" : "Hide";
    });
  });

  /* password strength meter */
  var strengthFill = doc.getElementById("strength-fill");
  var strengthLabel = doc.getElementById("strength-label");
  var signupPass = doc.getElementById("signup-pass");
  if (signupPass && strengthFill) {
    signupPass.addEventListener("input", function () {
      var r = window.CelestteAuth.passwordStrength(signupPass.value);
      var colors = ["var(--danger)", "var(--danger)", "#E8B84B", "var(--blue)", "var(--green)"];
      strengthFill.style.width = (r.score / 4) * 100 + "%";
      strengthFill.style.background = colors[r.score];
      if (strengthLabel) strengthLabel.textContent = r.label;
    });
  }

  if (signinForm) {
    signinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var res = window.CelestteAuth.signIn({
        id: doc.getElementById("signin-id") ? doc.getElementById("signin-id").value : "",
        password: doc.getElementById("signin-pass") ? doc.getElementById("signin-pass").value : ""
      });
      toast(res.message, res.ok ? undefined : "warn");
      if (res.ok) {
        refreshUserUI();
        location.hash = "view-dashboard";
      }
    });
  }
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var res = window.CelestteAuth.signUp({
        name: doc.getElementById("signup-name") ? doc.getElementById("signup-name").value : "",
        email: doc.getElementById("signup-email") ? doc.getElementById("signup-email").value : "",
        password: doc.getElementById("signup-pass") ? doc.getElementById("signup-pass").value : "",
        confirm: doc.getElementById("signup-pass2") ? doc.getElementById("signup-pass2").value : ""
      });
      toast(res.message, res.ok ? undefined : "warn");
      if (res.ok) {
        refreshUserUI();
        location.hash = "view-dashboard";
      }
    });
  }
  var guestBtn = doc.getElementById("guest-continue");
  if (guestBtn) {
    guestBtn.addEventListener("click", function () {
      window.CelestteAuth.signIn({ id: "guest", password: "guest" });
      toast("Continuing as Explorer (guest).");
      refreshUserUI();
      location.hash = "view-dashboard";
    });
  }
  var signOutBtn = doc.getElementById("sign-out");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () {
      window.CelestteAuth.signOut();
      refreshUserUI();
      showAuthTab("signin");
      location.hash = "view-signin";
      toast("Signed out. See you among the stars.");
    });
  }

  /* ---------- Run task (top bar) ---------- */
  var runTop = doc.getElementById("run-task-top");
  if (runTop) {
    runTop.addEventListener("click", function () {
      setTimeout(function () {
        if (wsInput) wsInput.focus({ preventScroll: true });
      }, 60);
    });
  }

  /* ---------- AI connection settings ---------- */
  var wsApiKey = doc.getElementById("ws-api-key");
  var wsApiModel = doc.getElementById("ws-api-model");
  var wsApiSave = doc.getElementById("ws-api-save");
  var wsApiTest = doc.getElementById("ws-api-test");
  var wsApiClear = doc.getElementById("ws-api-clear");
  var wsApiStatusText = doc.getElementById("ws-api-status-text");
  var wsApiDot = doc.getElementById("ws-api-dot");

  function syncWsApi() {
    if (!window.CelestteAI) return;
    var hasKey = !!window.CelestteAI.getKey();
    if (wsApiStatusText) {
      wsApiStatusText.textContent = hasKey
        ? "Gemini live · " + window.CelestteAI.getModel() + " · data APIs on"
        : "Live data on · Gemini optional";
    }
    if (wsApiDot) wsApiDot.className = "dot dot-green";
    if (wsApiKey && document.activeElement !== wsApiKey) wsApiKey.value = window.CelestteAI.getKey();
    if (wsApiModel && document.activeElement !== wsApiModel) wsApiModel.value = window.CelestteAI.getModel();
  }
  if (wsApiSave) {
    wsApiSave.addEventListener("click", function () {
      var key = wsApiKey ? wsApiKey.value.trim() : "";
      if (!key) {
        toast("Paste a Gemini API key first.", "warn");
        return;
      }
      window.CelestteAI.setKey(key);
      window.CelestteAI.setModel(wsApiModel ? wsApiModel.value : "");
      syncWsApi();
      toast("Key saved. Testing connection…");
      window.CelestteAI.test().then(function (r) {
        toast(r.message, r.ok ? undefined : "warn");
        syncWsApi();
      });
    });
  }
  if (wsApiTest) {
    wsApiTest.addEventListener("click", function () {
      toast("Testing connection…");
      window.CelestteAI.test().then(function (r) {
        toast(r.message, r.ok ? undefined : "warn");
        syncWsApi();
      });
    });
  }
  if (wsApiClear) {
    wsApiClear.addEventListener("click", function () {
      window.CelestteAI.setKey("");
      if (wsApiKey) wsApiKey.value = "";
      syncWsApi();
      toast("API key removed from this browser.");
    });
  }
  syncWsApi();

  /* fill model datalist with live, key-accepted models */
  if (window.CelestteAI && window.CelestteAI.getKey()) {
    window.CelestteAI.listModels().then(function (models) {
      var dl = doc.getElementById("ws-model-options");
      if (!dl || !models.length) return;
      dl.innerHTML = "";
      models.forEach(function (m) {
        var opt = doc.createElement("option");
        opt.value = m.id;
        dl.appendChild(opt);
      });
    });
  }

  /* initial route */
  onRoute();
})();
