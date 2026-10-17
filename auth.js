/* =========================================================
   Celestte Space AI — accounts (demo auth, browser-local)
   Signup / login with passwords. The name you enter is the
   name shown on the dashboard. Stored only in this browser.
   ========================================================= */
(function () {
  "use strict";

  var LS_USERS = "celestte-users";
  var LS_SESSION = "celestte-session";

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* Non-cryptographic digest — this is a browser demo, not production auth. */
  function digest(str) {
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < str.length; i++) {
      h1 = (h1 ^ str.charCodeAt(i)) >>> 0;
      h1 = (h1 * 16777619) >>> 0;
      h2 = (h2 + str.charCodeAt(i) * (i + 7)) >>> 0;
    }
    return "d1$" + h1.toString(16) + "$" + h2.toString(16) + "$" + str.length;
  }

  function users() { return readJSON(LS_USERS, {}); }
  function session() {
    try { return localStorage.getItem(LS_SESSION) || ""; } catch (e) { return ""; }
  }

  function currentUser() {
    var id = session();
    if (!id) return null;
    if (id === "guest") return { id: "guest", name: "Explorer", email: "guest@celestte.local", guest: true };
    return users()[id] || null;
  }

  function signUp(input) {
    var name = (input.name || "").trim();
    var email = (input.email || "").trim().toLowerCase();
    var password = input.password || "";
    if (!name) return { ok: false, message: "Please enter a name — it shows on your dashboard." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Please enter a valid email." };
    if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };
    if (password !== (input.confirm || "")) return { ok: false, message: "Passwords do not match." };

    var all = users();
    var id = email;
    if (all[id]) return { ok: false, message: "An account with this email already exists — sign in instead." };

    all[id] = {
      id: id,
      name: name,
      email: email,
      pass: digest(password),
      created: Date.now()
    };
    writeJSON(LS_USERS, all);
    try { localStorage.setItem(LS_SESSION, id); } catch (e) {}
    return { ok: true, message: "Welcome, " + name + "! Your workspace is ready.", user: all[id] };
  }

  function signIn(input) {
    var id = (input.id || "").trim().toLowerCase();
    var password = input.password || "";
    if (!id || !password) return { ok: false, message: "Enter your email/username and password." };

    if (id === "guest") {
      try { localStorage.setItem(LS_SESSION, "guest"); } catch (e) {}
      return { ok: true, message: "Continuing as Explorer (guest).", user: currentUser() };
    }

    var all = users();
    var found = all[id];
    if (!found) {
      // allow sign-in with the display name too
      var keys = Object.keys(all);
      for (var i = 0; i < keys.length; i++) {
        if ((all[keys[i]].name || "").trim().toLowerCase() === id) { found = all[keys[i]]; break; }
      }
    }
    if (!found || found.pass !== digest(password)) {
      return { ok: false, message: "Wrong email/username or password." };
    }
    try { localStorage.setItem(LS_SESSION, found.id); } catch (e) {}
    return { ok: true, message: "Welcome back, " + found.name + "!", user: found };
  }

  function signOut() {
    try { localStorage.removeItem(LS_SESSION); } catch (e) {}
    return { ok: true, message: "Signed out." };
  }

  /* Simple password strength for the sign-up meter: 0–4 */
  function passwordStrength(password) {
    var score = 0;
    if (!password) return { score: 0, label: "Too short" };
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    var labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
    return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
  }

  window.CelestteAuth = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    currentUser: currentUser,
    passwordStrength: passwordStrength,
    session: session
  };
})();
