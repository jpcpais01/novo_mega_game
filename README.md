# Aetherkin

A mobile-first egg-hatching PWA. Every hatch generates a new creature through OpenRouter, then animates it with a deformable mesh. There is no demo mode, access code, or live-mode toggle.

## Run locally

Use Node.js 22. Copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY`, then run:

```sh
npm install
npm run dev
```

Open `http://localhost:5173` and hatch directly. Missing configuration or provider errors are shown as errors; no sample creature is substituted.

## Vercel

Import `jpcpais01/novo_mega_game`, keep the Vite preset, and set:

```dotenv
OPENROUTER_API_KEY=your_openrouter_key
```

The model defaults are already configured. Optional overrides:

```dotenv
IMAGE_MODEL=openai/gpt-image-2.5-flare
VISION_MODEL=openai/gpt-5.6-luna
```

Deploy with `npm run build` and the `dist` output directory. `vercel.json` configures the Node API routes. `GAME_ACCESS_CODE` is no longer used and can be deleted. API keys stay on the server; hatching is immediately available to visitors without an unlock step.

## How it works

1. `/api/generate` sends the selected essences and egg stats to Flare's OpenRouter Image API. The prompt requests a full-body creature facing forward at approximately 20 degrees.
2. The server scales the image to at most 768×768. It preserves real transparency or removes a uniform edge-connected backdrop. Complex backgrounds produce an error.
3. `/api/analyze` sends that image to Luna for 3–5 movement points and foot anchors, expressed in actual image pixels. Invalid coordinates are rejected, and movement strength is bounded.
4. PixiJS animates a 25×25 mesh with precomputed falloff weights and smooth waves. Idle animation needs no additional AI calls.
5. Images and rigs are saved in IndexedDB. Saved companions can be reopened offline. New hatches always require internet and the live API.

The movement editor supports dragging points, previewing strength, pausing and exporting JSON. Settings control sound and gentle motion. Old demo entries are hidden from the collection; only real generated companions are displayed.

Generation and analysis are separate requests, allowing analysis retries without generating another image. Generation has a 300-second Vercel function budget; analysis has 120 seconds. Pending work is held in the current page and does not resume after closing. Physical-phone performance and funded provider calls still require verification.

## Tests

```sh
npm test
npm run build
npx playwright install chromium
node scripts/verify-browser.mjs
```

The browser test requires the dev server. It intercepts API requests with test-only fixtures, never a runtime demo mode, and does not spend credits. `PLAYWRIGHT_EXECUTABLE_PATH` can point to an installed Chromium browser. For offline tests, run `npm run preview` and set `QA_URL=http://localhost:4173` and `QA_OFFLINE=1` for the test process.

`window.render_game_to_text()` exposes game state, and `window.advanceTime(ms)` supports animation testing. QA output is in the ignored `output/` directory. Sample artwork is confined to `tests/fixtures/`, excluded from the deployed app. `npm run assets` rebuilds the egg, icons and test fixtures.

The originally suggested DeepSeek model is text-only. The user selected GPT-5.6 Luna for image analysis instead. No paid provider calls have been verified locally because no API key was provided here.
