# Aetherkin

A mobile-first, installable egg-hatching game prototype. Mix elemental essences, awaken an egg, and collect a companion that breathes through a deformable 2D mesh.

## Run locally

Requires Node.js 22 and npm.

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. The four illustrated demo companions work immediately without API credentials. Desktop and portrait mobile layouts are included.

## Enable live AI hatching

Copy `.env.example` to `.env.local` and set:

```dotenv
OPENROUTER_API_KEY=your_openrouter_key
GAME_ACCESS_CODE=your_private_hatchery_code
IMAGE_MODEL=openai/gpt-image-2.5-flare
VISION_MODEL=openai/gpt-5.6-luna
```

Restart the dev server. In the game's settings, enable **Live AI hatching** and enter your **hatchery access code**. Never paste your OpenRouter key into the game. Keys stay on the server; the access code stays only in browser memory for the session.

Live calls spend your OpenRouter credits. No paid API calls were made during initial implementation because no key was configured. The integration is covered by mocked-provider tests; the first real hatch still needs to be verified with a funded key.

The originally requested DeepSeek V4 Flash 0731 model advertises text input only. The user selected GPT-5.6 Luna instead; image input was verified in OpenRouter's model catalog on September 9, 2026. The server checks the selected vision model before paying for an image. It never silently substitutes a model.

## Deploy on Vercel

1. Import `jpcpais01/novo_mega_game` into Vercel.
2. Keep the **Vite** preset, `npm run build` command and `dist` output directory. `vercel.json` configures the server functions.
3. Add the four environment variables above in Vercel's project settings. Without credentials, the deployed app remains a playable demo.
4. Deploy. Open the HTTPS URL on your phone and install from the browser menu (Android) or Share → Add to Home Screen (iPhone).

Alternatively, run `npx vercel` from this directory to create a preview deployment. This repository is prepared for deployment; a public deployment has not been created automatically.

Server generation has a 300-second function budget and analysis a 120-second budget. Use a Vercel configuration that supports those durations. Generation and analysis are separate requests, so analysis failures can be retried without buying another image. This prototype keeps the pending image in the current page; closing during generation does not resume the job. A public, multi-user release should add durable jobs, account-based quotas and shared rate limiting. The current private access code protects paid endpoints for prototype testing.

## The image-to-motion pipeline

1. `POST /api/generate` validates egg essences and builds a consistent full-body, approximately 20° front-view prompt. Flare runs through OpenRouter's dedicated `/api/v1/images` endpoint.
2. The server resizes the image to at most 768×768, preserving aspect ratio. Real alpha is kept. Flare currently advertises `auto` / `opaque`, not transparent as an API option: the prompt requests a cutout, and a uniform edge-connected backdrop is removed if needed. Complex backgrounds are rejected rather than pretending they are transparent. Pale details enclosed inside the creature are preserved, though edge cleanup can need refinement.
3. `POST /api/analyze` sends the actual cleaned PNG to Luna. Structured JSON specifies 3–5 points and 1–4 foot anchors in **actual image pixels**, with a top-left origin. Dimensions and coordinates are validated, radii and strength are bounded. A signed expiring ticket binds analysis to an image this server generated.
4. PixiJS maps the PNG to a 25×25-vertex mesh. Influence weights are computed once per rig change. Slow sine waves with smooth amplitude modulation deform the mesh around its original positions. Anchors suppress movement near the feet. No AI calls occur during animation.
5. The image, seed, essences, name and rig are saved in IndexedDB. Reopening a companion reuses its original artwork and movement settings. Cached assets, local fonts and saved companions work offline; new AI generation requires internet.

Open **Explore idle movement** after a hatch to drag the lavender points, adjust motion strength, pause or export the JSON. Mint squares are fixed anchors. Saved coordinates persist; the strength slider is a temporary preview control.

## Controls and scope

- Select up to two essences, then awaken the egg.
- **Companions** opens the device's collection; **Essence journal** explains each element and starts a matching egg.
- Settings control live generation, gentle motion and synthesized sound. Device reduced-motion preferences are respected on initial load.
- `F` toggles browser fullscreen; `Esc` closes dialogs or exits fullscreen.
- The app pauses rendering when hidden. GPU rendering is capped at 60 FPS and device pixel ratio at 1.75. Actual performance and battery usage still need testing on physical phones.
- Demo art is original generated-by-code vector artwork rasterized to PNG, explicitly labelled demo. Demo essence combinations share the primary element's sample illustration; live combinations feed both essences into Flare.
- Collection data is local to the device. Clearing site data removes it. Accounts, cloud synchronization, battles, monetization and multiple view angles are outside this first prototype.

## Validation

```sh
npm run build
npm test
npm audit
npx playwright install chromium
node scripts/verify-browser.mjs
```

The browser script expects the dev server running. `PLAYWRIGHT_EXECUTABLE_PATH` optionally chooses an installed Chromium executable. For service-worker/offline checks, build and run `npm run preview`, then run with `QA_URL=http://localhost:4173 QA_OFFLINE=1`. The verification script uses no paid APIs.

`window.render_game_to_text()` exposes observable game state. `window.advanceTime(ms)` supports deterministic animation tests. Browser screenshots and results go to ignored `output/qa/`; the web-game skill's action script writes `output/web-game/`.

## Project map

- `src/main.ts`: interaction, hatch state machine, collection and dialogs.
- `src/scene.ts`, `src/mesh.ts`: GPU scene, hatch effects, deformation and point editor.
- `src/shared.ts`: essence definitions, rig schemas and validation.
- `server/`, `api/`: shared OpenRouter integration and Vercel handlers.
- `scripts/create-assets.ts`: reproducible original demo assets and PWA icons.
- `vite.config.ts`: offline precache and web app manifest.

API references: [OpenRouter image generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), [Flare](https://openrouter.ai/openai/gpt-image-2.5-flare), [Luna](https://openrouter.ai/openai/gpt-5.6-luna).
