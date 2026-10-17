# Celestte Space AI

A beautifully designed AI assistant web app specialized in **space** — planets, orbits,
moons, the solar system, stars, and missions. Works like a real product: marketing
landing page + full workspace app with sign up / login, live answers, light/dark themes,
and smooth animations. Pure HTML/CSS/JS — no build step, no framework.

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | Landing page — hero orbit animation, live prompt stage, model gallery, pricing, CTA |
| `app.html` | Workspace app — dashboard, new task, projects, history, model gallery, settings |
| `styles.css` | Full design system (dark + light themes, responsive, reduced-motion support) |
| `app.js` | Landing behavior — theme, scan animation, prompt stage, reveals |
| `workspace.js` | Workspace behavior — routing, tasks, search, auth UI |
| `auth.js` | Sign up / login / guest accounts (browser-local demo auth) |
| `ai.js` | Answer engine: Gemini (optional) → NASA catalog data → Wikipedia → honest offline |
| `images/` | Generated brand artwork (hero core, background, CTA glow) |

## Run it locally

Just open `index.html` in a browser — everything works, including live answers.

Or serve it (recommended, matches production):

```bash
python -m http.server 4173
# then open http://localhost:4173
```

Any static server works (`npx serve`, `live-server`, etc.).

## Answer sources 

1. **Gemini API** — optional. Get a free key at https://aistudio.google.com/apikey
   and paste it in *Settings → AI connection* (or "Connect Gemini" on the landing page).
   The app auto-discovers which Gemini models your key can use.
2. **Solar-system catalog** — real NASA planetary fact-sheet values (orbits, gravity, moons…).
3. **Wikipedia REST API** — live, keyless explanations for every space topic.


## Make it yours

- **Name / copyright:** search `Celestte Space AI` in `index.html` and `app.html` to rebrand.
- **Colors & fonts:** edit the CSS variables at the top of `styles.css`.
- **Assistant behavior:** edit the prompts in `ai.js` (`MODE_INSTRUCTIONS`).
- **Accounts:** demo auth stores users in the browser (localStorage). For production,
  replace `auth.js` with a real provider (Firebase Auth, Supabase, Auth0, Clerk).
- **API keys:** keys live only in each visitor's browser. If you want a shared key,
  put Gemini behind a small server proxy — never ship a private key in public code.

## Notes

- Responsive: desktop, tablet, and mobile layouts.
- Accessibility: semantic landmarks, focus states, keyboard support, reduced-motion mode.
- Works without JavaScript for core reading; JS adds the interactive experience.

© 2026 Celestte Space AI. All rights reserved.
## 🎬 Project Demo

[Watch the Celestte Space AI Demo](demo/celeste-ai-demo.webm)
