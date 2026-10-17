/* =========================================================
   Celestte Space AI — live answer engine
   Answer sources, in order:
     1. Gemini API          (when a free key is connected)
     2. Solar-system catalog (real NASA fact-sheet values)
     3. Wikipedia REST API  (live, keyless, every space topic)
     4. Honest offline draft (never invented facts)
   ========================================================= */
(function () {
  "use strict";

  var LS_KEY = "celestte-gemini-key";
  var LS_MODEL = "celestte-gemini-model";
  var DEFAULT_MODEL = "gemini-2.5-flash";
  var MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite"
  ];
  var GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
  var WIKI_SEARCH = "https://en.wikipedia.org/w/rest.php/v1/search/page?q=";
  var WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";

  function getKey() {
    try { return localStorage.getItem(LS_KEY) || ""; } catch (e) { return ""; }
  }
  function setKey(k) {
    try {
      if (k) localStorage.setItem(LS_KEY, k);
      else localStorage.removeItem(LS_KEY);
    } catch (e) {}
  }
  function getModel() {
    try { return localStorage.getItem(LS_MODEL) || DEFAULT_MODEL; } catch (e) { return DEFAULT_MODEL; }
  }
  function setModel(m) {
    try { localStorage.setItem(LS_MODEL, (m || "").trim() || DEFAULT_MODEL); } catch (e) {}
  }

  /* ---------- Real solar-system catalog (NASA planetary fact sheets) ----------
     semimajorAxis in million km, orbitalPeriod in Earth days, gravity in m/s²,
     radius in km (mean), temp in K (mean), escape in km/s. */
  var CATALOG = [
    { key: "sun", names: ["sun", "sol", "soleil"], title: "the Sun",
      type: "star", distanceMkm: 0, yearDays: 0, gravity: 274, radius: 696340,
      temp: 5772, escape: 617.7, ecc: 0, moons: 0,
      note: "The Sun holds 99.86% of the solar system's mass and fuses 600 million tonnes of hydrogen every second." },
    { key: "mercury", names: ["mercury"], title: "Mercury",
      type: "planet", distanceMkm: 57.9, yearDays: 88, gravity: 3.7, radius: 2440,
      temp: 440, escape: 4.3, ecc: 0.206, moons: 0,
      note: "Mercury has the most eccentric orbit of the eight planets and swings from scorching days to frozen nights." },
    { key: "venus", names: ["venus"], title: "Venus",
      type: "planet", distanceMkm: 108.2, yearDays: 224.7, gravity: 8.87, radius: 6052,
      temp: 737, escape: 10.36, ecc: 0.007, moons: 0,
      note: "Venus is the hottest planet — a runaway greenhouse effect keeps it at about 464°C." },
    { key: "earth", names: ["earth", "our planet", "world", "terra"], title: "Earth",
      type: "planet", distanceMkm: 149.6, yearDays: 365.25, gravity: 9.81, radius: 6371,
      temp: 288, escape: 11.19, ecc: 0.017, moons: 1,
      note: "Earth is the only known world with life — an ocean planet with a protective magnetic field." },
    { key: "moon", names: ["moon", "luna", "the lunar"], title: "the Moon",
      type: "moon", distanceMkm: 0.384, yearDays: 27.3, gravity: 1.62, radius: 1737,
      temp: 250, escape: 2.38, ecc: 0.055, moons: 0,
      note: "The Moon orbits Earth at about 384,400 km, raises our tides, and is slowly drifting away ~3.8 cm per year." },
    { key: "mars", names: ["mars", "the red planet"], title: "Mars",
      type: "planet", distanceMkm: 227.9, yearDays: 687, gravity: 3.72, radius: 3390,
      temp: 210, escape: 5.03, ecc: 0.093, moons: 2,
      note: "Mars hosts Olympus Mons, the tallest volcano in the solar system, and two small moons: Phobos and Deimos." },
    { key: "jupiter", names: ["jupiter"], title: "Jupiter",
      type: "planet", distanceMkm: 778.5, yearDays: 4332.6, gravity: 24.79, radius: 69911,
      temp: 165, escape: 59.5, ecc: 0.049, moons: 95,
      note: "Jupiter is the largest planet — its Great Red Spot is a storm wider than Earth, and it shepherds the asteroid belt." },
    { key: "saturn", names: ["saturn"], title: "Saturn",
      type: "planet", distanceMkm: 1432, yearDays: 10759, gravity: 10.44, radius: 58232,
      temp: 134, escape: 35.5, ecc: 0.057, moons: 146,
      note: "Saturn's rings are mostly water ice, and its moon Titan has rivers and lakes of liquid methane." },
    { key: "uranus", names: ["uranus"], title: "Uranus",
      type: "planet", distanceMkm: 2867, yearDays: 30687, gravity: 8.87, radius: 25362,
      temp: 76, escape: 21.3, ecc: 0.046, moons: 28,
      note: "Uranus rolls around the Sun on its side — its axis is tilted about 98°." },
    { key: "neptune", names: ["neptune"], title: "Neptune",
      type: "planet", distanceMkm: 4515, yearDays: 60190, gravity: 11.15, radius: 24622,
      temp: 72, escape: 23.5, ecc: 0.010, moons: 16,
      note: "Neptune has the fastest winds in the solar system — up to about 2,100 km/h." }
  ];

  var SPACE_RE = /\b(space|planet|orbit|moon|star|sun|solar|galaxy|comet|asteroid|meteor|telescope|nasa|astronaut|eclipse|tide|gravity|atmosphere|cosmos|nebula|black hole|satellite|universe|mars|venus|jupiter|saturn|uranus|neptune|mercury|earth|lunar|milky way|iss|space station|rocket|mission|observatory|constellation|zodiac|light year|aphelion|perihelion|equinox|solstice|aurora|meteorite|exoplanet|dwarf planet|kuiper|oort)\b/i;

  function findBodies(question) {
    var q = " " + (question || "").toLowerCase() + " ";
    /* ignore bodies mentioned only as a reference point ("around the sun", "from earth") */
    q = q.replace(/\b(around|round|from|than|toward|towards|as seen from|compared to|away from)\s+(the\s+)?(sun|earth|moon|mars|venus|mercury|jupiter|saturn|uranus|neptune|sol|luna|terra)\b/gi, " ");
    return CATALOG.filter(function (b) {
      return b.names.some(function (n) {
        return q.indexOf(" " + n + " ") !== -1 || q.indexOf(" " + n) !== -1 ||
               q.indexOf(n + " ") !== -1 || q.indexOf(n + "'") !== -1 || q.indexOf(n + ",") !== -1 ||
               q.indexOf(n + "?") !== -1 || q.indexOf(n + ".") !== -1;
      });
    });
  }

  function cleanQuery(q) {
    return (q || "")
      .replace(/^(why|how|what|which|when|where|who|is|are|was|were|do|does|did|can|could|would|should|the|a|an|of|in|on|at|to|for|and|or|about|please|tell me|explain|describe|write|make|give|create|note|plan|solve|compare)\b/gi, "")
      .replace(/[?.,!]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 6)
      .join(" ");
  }

  function conceptTitle(prompt) {
    var p = (prompt || "").toLowerCase();
    if (/\b(orbit|revolve|revolves|revolution)\b/.test(p) && /\b(why|how)\b/.test(p)) return "Orbital mechanics";
    if (/\btide/.test(p)) return "Tide";
    if (/\beclipse/.test(p)) return "Eclipse";
    if (/\bseason/.test(p)) return "Season";
    if (/\bgravity/.test(p)) return "Gravity";
    if (/\bblack hole/.test(p)) return "Black hole";
    if (/\b(milky way|galaxy)\b/.test(p)) return "Milky Way";
    if (/\basteroid/.test(p)) return "Asteroid";
    if (/\bcomet/.test(p)) return "Comet";
    return null;
  }

  function wikiSearch(query) {
    if (!query) return Promise.resolve(null);
    return fetch(WIKI_SEARCH + encodeURIComponent(query) + "&limit=3")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var pages = (d && d.pages) || [];
        var p = pages.filter(function (x) {
          return x.title && !/^List of/i.test(x.title);
        })[0] || pages[0];
        return p && p.title ? { title: p.title, description: p.description || "" } : null;
      })
      .catch(function () { return null; });
  }

  function wikiSummary(title) {
    if (!title) return Promise.resolve(null);
    return fetch(WIKI_SUMMARY + encodeURIComponent(title))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.extract) return null;
        return {
          title: d.title || title,
          description: d.description || "",
          extract: d.extract || "",
          url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
               "https://en.wikipedia.org/wiki/" + encodeURIComponent(title)
        };
      })
      .catch(function () { return null; });
  }

  /* ---------- Answer composers ---------- */
  function fmt(n) {
    if (n === undefined || n === null) return "—";
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function au(mkm) { return mkm === 0 ? "—" : (mkm / 149.6).toFixed(3) + " AU"; }
  function lightMinutes(mkm) {
    if (!mkm) return "—";
    var mins = (mkm * 1e6) / 299792.458 / 60;
    return mins >= 1 ? mins.toFixed(1) + " light-minutes" : (mins * 60).toFixed(0) + " light-seconds";
  }

  function bodyBlock(b) {
    var lines = [];
    if (b.type === "moon") {
      lines.push("  01  Distance     " + fmt(b.distanceMkm * 1e6 / 1e3) + " thousand km from Earth (" + b.distanceMkm + " M km)");
      lines.push("  02  Orbit        once every " + b.yearDays + " Earth days");
    } else if (b.type === "star") {
      lines.push("  01  Radius       " + fmt(b.radius) + " km (109 × Earth)");
      lines.push("  02  Gravity      " + b.gravity + " m/s² (28 × Earth)");
      lines.push("  03  Surface temp " + b.temp + " K (" + Math.round(b.temp - 273.15) + "°C)");
    } else {
      lines.push("  01  Orbit        " + au(b.distanceMkm) + " · " + fmt(b.distanceMkm * 1e6) + " km from the Sun · " + lightMinutes(b.distanceMkm));
      lines.push("  02  Year         " + fmt(b.yearDays) + " Earth days (" + (b.yearDays / 365.25).toFixed(2) + " Earth years) · eccentricity " + b.ecc);
      lines.push("  03  Gravity      " + b.gravity + " m/s² · escape velocity " + b.escape + " km/s");
      lines.push("  04  Size         mean radius " + fmt(b.radius) + " km (" + (b.radius / 6371).toFixed(2) + " × Earth)");
      lines.push("  05  Temperature  " + b.temp + " K (" + Math.round(b.temp - 273.15) + "°C average)");
      lines.push("  06  Moons        " + b.moons);
    }
    return lines.join("\n");
  }

  function catalogAnswer(bodies, mode, question, wiki) {
    var q = (question || "").trim().replace(/\s+/g, " ");
    if (q.length > 110) q = q.slice(0, 107) + "…";
    var head =
      "CELESTTE SPACE AI — LIVE CATALOG DATA (NASA fact-sheet values)\n" +
      "──────────────────────────────\n" +
      "Q: " + q + "\n\n";
    var wikiText = wiki
      ? "\nFROM WIKIPEDIA — " + wiki.title + "\n  " + wiki.extract.replace(/\n+/g, " ").slice(0, 420) + "\n"
      : "";

    if (bodies.length >= 2 && /compar|vs\.?|versus|difference|between/i.test(question || "")) {
      var a = bodies[0], b = bodies[1];
      return head +
        "COMPARISON — " + a.title + " vs " + b.title + "\n" +
        "              " + a.title.padEnd(14).slice(0, 14) + "  " + b.title + "\n" +
        "  Distance    " + String(au(a.distanceMkm)).padEnd(14) + "  " + au(b.distanceMkm) + "\n" +
        "  Year        " + String(a.yearDays + " d").padEnd(14) + "  " + b.yearDays + " d\n" +
        "  Gravity     " + String(a.gravity + " m/s²").padEnd(14) + "  " + b.gravity + " m/s²\n" +
        "  Radius      " + String(fmt(a.radius) + " km").padEnd(14) + "  " + fmt(b.radius) + " km\n" +
        "  Temp        " + String(a.temp + " K").padEnd(14) + "  " + b.temp + " K\n" +
        "  Moons       " + String(a.moons).padEnd(14) + "  " + b.moons + "\n\n" +
        "BOTTOM LINE  " + a.note + " " + b.note +
        wikiText +
        "\nSOURCE · Solar-system catalog + Wikipedia";
    }

    var body = bodies[0];
    if (mode === "create") {
      return head +
        "A short note on " + body.title + "\n\n" +
        body.note + " " +
        "It sits " + (body.type === "planet" ? au(body.distanceMkm) + " from the Sun" :
          body.type === "moon" ? body.distanceMkm + " million km from Earth" : "at the center of the solar system") +
        ", with a surface gravity of " + body.gravity + " m/s²" +
        (body.type === "planet" ? " and a year lasting " + fmt(body.yearDays) + " Earth days" : "") +
        ". " + (body.moons ? "It has " + body.moons + (body.moons === 1 ? " known moon" : " known moons") + ". " : "") +
        (wiki ? "\n\n" + wiki.extract.slice(0, 400) : "") +
        "\n\nSOURCE · Solar-system catalog + Wikipedia";
    }
    if (mode === "plan") {
      return head +
        "OBSERVATION / STUDY PLAN — " + body.title + "\n" +
        "  01  Tonight      Find " + body.title + " with a sky app; note its position among the stars\n" +
        "  02  This week    Watch it move night to night — that motion is its orbit\n" +
        "  03  Study        Orbit: " + au(body.distanceMkm) + " · year " + fmt(body.yearDays) + " d · gravity " + body.gravity + " m/s²\n" +
        "  04  Go deeper    " + body.note + "\n\n" +
        "CRITICAL PATH  Clear sky → find it → track it → read its numbers\n" +
        "RISK           Clouds / light pollution → try again at dusk\n" +
        "NEXT ACTION    Look for " + body.title + " tonight and log its position" +
        wikiText +
        "\nSOURCE · Solar-system catalog + Wikipedia";
    }
    if (mode === "solve") {
      var working =
        body.type === "planet" ?
          "  · Distance from the Sun:  " + fmt(body.distanceMkm * 1e6) + " km (" + au(body.distanceMkm) + ")\n" +
          "  · Light travel time:      " + lightMinutes(body.distanceMkm) + "\n" +
          "  · Year length vs Earth:   " + (body.yearDays / 365.25).toFixed(2) + " ×\n" +
          "  · Surface gravity vs Earth: " + (body.gravity / 9.81).toFixed(2) + " ×\n" +
          "  · Orbital eccentricity:   " + body.ecc + (body.ecc > 0.1 ? "  (noticeably oval orbit)" : "  (nearly circular orbit)") + "\n"
        : body.type === "moon" ?
          "  · Distance from Earth:    " + fmt(body.distanceMkm * 1e6) + " km\n" +
          "  · Light travel time:      " + lightMinutes(body.distanceMkm) + "\n" +
          "  · Orbit period:           " + body.yearDays + " Earth days\n" +
          "  · Surface gravity vs Earth: " + (body.gravity / 9.81).toFixed(2) + " ×\n"
        :
          "  · Radius vs Earth:        " + (body.radius / 6371).toFixed(0) + " ×\n" +
          "  · Surface gravity vs Earth: " + (body.gravity / 9.81).toFixed(1) + " ×\n" +
          "  · Surface temperature:    " + body.temp + " K (" + Math.round(body.temp - 273.15) + "°C)\n" +
          "  · Escape velocity:        " + body.escape + " km/s\n";
      return head +
        "WORKING\n" + working + "\n" +
        "ANSWER\n" +
        "  " + body.note +
        wikiText +
        "\nSOURCE · Solar-system catalog + Wikipedia";
    }
    /* research (default) */
    return head +
      "BOTTOM LINE  " + body.note + "\n\n" +
      "KEY POINTS\n" + bodyBlock(body) + "\n\n" +
      "CONCLUSION\n" +
      "  " + body.title + " follows " +
      (body.type === "planet" ? "Kepler's laws like the rest of the planets — farther out means slower and longer years"
        : body.type === "moon" ? "its own orbit around Earth while Earth races around the Sun"
        : "the center of every planet's orbit in the solar system") + "." +
      wikiText +
      "\nSOURCE · Solar-system catalog + Wikipedia";
  }

  function wikiAnswer(wiki, mode, question) {
    var q = (question || "").trim().replace(/\s+/g, " ");
    if (q.length > 110) q = q.slice(0, 107) + "…";
    var extract = wiki.extract.replace(/\n+/g, " ");
    var sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
    var head =
      "CELESTTE SPACE AI — LIVE WIKIPEDIA DATA\n" +
      "──────────────────────────────\n" +
      "Q: " + q + "\n" +
      "TOPIC  " + wiki.title + (wiki.description ? " — " + wiki.description : "") + "\n\n";

    if (mode === "create") {
      return head +
        "A short note on " + wiki.title + "\n\n" +
        extract.slice(0, 560) + "\n\n" +
        "SOURCE · " + wiki.url;
    }
    if (mode === "plan") {
      return head +
        "STUDY PLAN — " + wiki.title + "\n" +
        "  01  Read        " + sentences[0].trim().slice(0, 120) + "\n" +
        "  02  Note        Key terms and numbers from the topic\n" +
        "  03  Connect     Link it to orbits, gravity, or missions you know\n" +
        "  04  Observe     If it is visible, go see it in the night sky\n\n" +
        "NEXT ACTION  Start with the summary above, then read the full page\n" +
        "SOURCE · " + wiki.url;
    }
    return head +
      "BOTTOM LINE  " + (sentences[0] || extract).trim().slice(0, 160) + "\n\n" +
      "KEY POINTS\n" +
      sentences.slice(0, 4).map(function (s, i) {
        return "  0" + (i + 1) + "  " + s.trim().slice(0, 130);
      }).join("\n") + "\n\n" +
      "CONCLUSION  " + (sentences[sentences.length - 1] || "").trim().slice(0, 140) + "\n\n" +
      "SOURCE · " + wiki.url;
  }

  /* ---------- Gemini (optional, when key connected) ---------- */
  var BASE =
    "You are Celestte — a space and solar-system expert AI. Your domain is everything about space: " +
    "the Sun, the eight planets, dwarf planets, moons, asteroids, comets, orbits and gravity, atmospheres, " +
    "seasons, tides, eclipses, stars, galaxies, telescopes, space missions, astronauts, and astronomy history. " +
    "Answer EVERY space question accurately, with real facts, numbers, and units. " +
    "Never invent statistics; if you are unsure, say so. ";

  var MODE_INSTRUCTIONS = {
    research: BASE + "Format: BOTTOM LINE first, then numbered KEY POINTS, then a short CONCLUSION. Plain text only — no markdown asterisks or backticks.",
    create: BASE + "Write the finished piece asked for, in a clear, vivid voice, starting with a title line. Plain text only — no markdown asterisks or backticks.",
    plan: BASE + "Produce a concrete plan: numbered steps, a CRITICAL PATH line, top RISKS, and one NEXT ACTION. Plain text only — no markdown asterisks or backticks.",
    solve: BASE + "Work through the problem step by step, then give a clear ANSWER and WHY. Factual question → correct answer first. Plain text only — no markdown asterisks or backticks."
  };

  function callApi(model, prompt, mode) {
    var url = GEMINI_ENDPOINT + "/" + encodeURIComponent(model) + ":generateContent";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": getKey() },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "[" + (mode || "research").toUpperCase() + " MODE]\n\n" + (prompt || "").trim() }] }],
        systemInstruction: { parts: [{ text: MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.research }] },
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var err = new Error((body && body.error && body.error.message) || ("HTTP " + res.status));
          err.status = res.status;
          throw err;
        }
        var cand = body.candidates && body.candidates[0];
        var parts = cand && cand.content && cand.content.parts;
        var text = parts ? parts.map(function (p) { return p.text || ""; }).join("").trim() : "";
        if (!text) throw new Error("Model returned an empty answer.");
        return text;
      });
    });
  }

  function isModelProblem(err) {
    if (!err) return false;
    if (/api key/i.test(err.message || "")) return false;
    return err.status === 404 ||
      (err.status === 400 && /model|not found|unsupported|does not exist|deprecated/i.test(err.message || ""));
  }

  function geminiAnswer(prompt, mode) {
    if (!getKey()) return Promise.reject({ skip: true });
    var preferred = getModel();
    var chain = [preferred].concat(MODEL_CHAIN.filter(function (m) { return m !== preferred; }));
    function tryModel(i, lastErr) {
      if (i >= chain.length) return Promise.reject(lastErr || new Error("no model"));
      return callApi(chain[i], prompt, mode).then(function (text) {
        setModel(chain[i]);
        return text;
      }).catch(function (err) {
        if (isModelProblem(err)) return tryModel(i + 1, err);
        return Promise.reject(err);
      });
    }
    return tryModel(0, null);
  }

  function listModels() {
    if (!getKey()) return Promise.resolve([]);
    return fetch(GEMINI_ENDPOINT, { headers: { "x-goog-api-key": getKey() } })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (body) {
        if (!body || !body.models) return [];
        return body.models
          .map(function (m) {
            return { id: String(m.name || "").replace(/^models\//, ""), methods: m.supportedGenerationMethods || [] };
          })
          .filter(function (m) { return m.id && m.methods.indexOf("generateContent") !== -1; });
      })
      .catch(function () { return []; });
  }

  function pickBest(models) {
    var ids = models.map(function (m) { return m.id; });
    for (var i = 0; i < MODEL_CHAIN.length; i++) {
      if (ids.indexOf(MODEL_CHAIN[i]) !== -1) return MODEL_CHAIN[i];
    }
    var flash = ids.filter(function (id) { return /flash/i.test(id) && !/vision|embedding|lite/i.test(id); });
    return flash.length ? flash.sort().reverse()[0] : (ids[0] || null);
  }

  /* ---------- Fallbacks ---------- */
  function offlineDraft(prompt, mode) {
    var q = (prompt || "").trim().replace(/\s+/g, " ");
    if (q.length > 120) q = q.slice(0, 117) + "…";
    return (
      "CELESTTE SPACE AI — OFFLINE (no network, no key)\n" +
      "──────────────────────────────\n" +
      "Q: " + q + "\n\n" +
      "Live sources are unreachable right now. Nothing is invented in offline mode.\n" +
      "Reconnect to get answers from the solar-system catalog + Wikipedia,\n" +
      "or add a free Gemini key for full conversational answers:\n" +
      "  https://aistudio.google.com/apikey\n" +
      "LOCAL FRAME (" + (mode || "research").toUpperCase() + ") · your question is queued, no fake facts shown."
    );
  }

  function specialtyNote(prompt) {
    var q = (prompt || "").trim().replace(/\s+/g, " ");
    if (q.length > 110) q = q.slice(0, 107) + "…";
    return (
      "CELESTTE SPACE AI — SPACE SPECIALIST\n" +
      "──────────────────────────────\n" +
      "Q: " + q + "\n\n" +
      "My specialty is space: planets, orbits, moons, the solar system, stars,\n" +
      "galaxies, telescopes, and missions. Ask me anything from that sky —\n" +
      "each and every space question gets a real, sourced answer.\n\n" +
      "Try for example:\n" +
      "  · Why do planets stay in orbit around the Sun?\n" +
      "  · Compare Mars and Earth\n" +
      "  · Write a note on the Moon\n" +
      "  · Plan a stargazing night to see the planets"
    );
  }

  /* ---------- Main ask pipeline ---------- */
  function ask(prompt, mode) {
    var bodies = findBodies(prompt);
    var isSpace = SPACE_RE.test(prompt || "") || bodies.length > 0;

    function fromData() {
      /* 2) catalog + Wikipedia for planets/moons/sun */
      if (bodies.length) {
        var wikiQ = bodies[0].title.replace(/^(the )/, "");
        return wikiSearch(wikiQ).then(wikiSummary).then(function (wiki) {
          return {
            text: catalogAnswer(bodies, mode, prompt, wiki),
            live: true,
            source: "catalog"
          };
        }).catch(function () {
          return { text: catalogAnswer(bodies, mode, prompt, null), live: true, source: "catalog" };
        });
      }
      /* 3) Wikipedia for any other space topic */
      if (isSpace) {
        var direct = conceptTitle(prompt);
        var search = direct
          ? Promise.resolve({ title: direct, description: "" })
          : wikiSearch(cleanQuery(prompt) || prompt);
        return search.then(function (hit) {
          if (!hit) return null;
          return wikiSummary(hit.title);
        }).then(function (wiki) {
          if (wiki) return { text: wikiAnswer(wiki, mode, prompt), live: true, source: "wikipedia" };
          return null;
        }).catch(function () { return null; });
      }
      return Promise.resolve(null);
    }

    /* 1) Gemini when connected */
    var gem = geminiAnswer(prompt, mode)
      .then(function (text) {
        return { text: text, live: true, source: "gemini", model: getModel() };
      })
      .catch(function () { return null; });

    return gem.then(function (gemRes) {
      if (gemRes) return gemRes;
      return fromData().then(function (dataRes) {
        if (dataRes) return dataRes;
        if (!isSpace) return { text: specialtyNote(prompt), live: true, source: "specialty" };
        return { text: offlineDraft(prompt, mode), live: false, source: "offline" };
      });
    });
  }

  function test() {
    var wikiOk = wikiSummary("Earth").then(function (r) { return !!r; }).catch(function () { return false; });
    return wikiOk.then(function (w) {
      if (!getKey()) {
        return {
          ok: w,
          message: w
            ? "Live data ready · Solar-system catalog + Wikipedia (Gemini key optional)"
            : "No network to the live data APIs and no Gemini key."
        };
      }
      return listModels().then(function (models) {
        if (!models.length) {
          return { ok: w, message: w ? "Live data ready · Gemini key could not list models — check it." : "Nothing reachable." };
        }
        var best = pickBest(models);
        if (best) setModel(best);
        return geminiAnswer("Reply with exactly this one line and nothing else: CELESTE OK", "solve").then(function () {
          return { ok: true, message: "Connected · " + getModel() + " accepted your key · live data ready" };
        }).catch(function (err) {
          return { ok: w, message: (err && err.message) || "Gemini failed, but catalog + Wikipedia are live." };
        });
      });
    });
  }

  var SOURCE_LABELS = {
    gemini: "Gemini (live)",
    catalog: "Solar-system catalog (live)",
    wikipedia: "Wikipedia (live)",
    specialty: "Space specialist",
    offline: "Offline"
  };

  window.CelestteAI = {
    ask: ask,
    test: test,
    listModels: listModels,
    pickBest: pickBest,
    getKey: getKey,
    setKey: setKey,
    getModel: getModel,
    setModel: setModel,
    DEFAULT_MODEL: DEFAULT_MODEL,
    MODELS: MODEL_CHAIN.slice(),
    SOURCE_LABELS: SOURCE_LABELS
  };
})();
