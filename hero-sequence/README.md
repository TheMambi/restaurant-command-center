# Hero sequence

Source for the landing page's scroll animation: a "Do these first" kitchen ticket lies on a dark counter, lifts toward the camera, and the report behind it (the score on its plate beside the six-part wheel, the parts table, ratings by platform and the score by month) unfolds into lit sheets. It is a three.js scene inside a [HyperFrames](https://github.com/heygen-com/hyperframes) composition, rendered to 120 frames at 30 fps.

Nothing here ships with the site except the frames it writes to `../public/hero/<id>/`.

## What it reads

- `content.json`: the figures printed on the ticket and plates, taken from Brasa Taquería's report as the app computes it. A test in `tests/landing.test.ts` recomputes them; if the profile or the scoring changes, it fails until this file is updated and the frames are re-rendered.
- `../src/styles/tokens.css`: every colour, read at render time. The plates use the sheet tokens (`--sheet*`), the ticket `--color-ticket`. The frames' edges settle to `--color-stage`, so change that token and you need a new render.
- The app's Fraunces and Onest font files.

`scripts/prepare-assets.mjs` copies these, plus three.js, into `assets/` (ignored by git) because HyperFrames only resolves files inside this folder.

## Framings

| File | Size | Used on |
|---|---|---|
| `index.html` | 3200 × 1800, encoded at 3200 and 2560 wide | screens wider than 1.45:1; the 3200 set for high-density screens |
| `tall.html` | 1080 × 1350 | squarer and portrait screens, with a narrower end layout |

`hyperframes lint` reports two root compositions. That rule guards against duplicate audio; this piece has none, and each framing is rendered on its own with `-c`.

## Re-render

Run in the repo root first (`npm ci`), then:

```sh
cd hero-sequence
npm ci
npm run snapshot   # five stills of the wide framing, to check before a full render
npm run render     # both framings to PNG, then AVIF (and an end-frame WebP) into ../public/hero/<id>/
```

The render ends with `scripts/frames-id.mjs --stamp`. It names the new frames' folder after an id made from their bytes, removes the render it replaces, and writes the id into `../src/landing/sequence.ts` and the preload links in `../index.html`. Commit those two files with the frames. Browsers keep a frame for a year, so frames must never change under an id; a test in `tests/landing.test.ts` checks that.

`scripts/render.sh` runs the copy of HyperFrames that `npm ci` installed and stops if it is missing. `scripts/encode.mjs` empties its target folder first and refuses a target outside `../public/hero/`.

## The undici override

`package.json` forces `undici` to 7.30.2 because hyperframes 0.9.23 asks for exactly 7.25.0. Dependabot does not update overrides. When hyperframes is updated, delete the override, run `npm install`, and keep it deleted if `npm ls undici` shows 7.30.2 or newer and `npm audit` is clean.

If HyperFrames can't find a browser, point it at one: `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome npm run render`.

A full render takes a few minutes per framing on a laptop (about 25 minutes in all on a machine without a GPU). Keep the terminal open until it finishes: HyperFrames stops a render whose parent process exits.

## The scene

- `assets/scene.js`: the ticket and plates (drawn with canvas 2D from the tokens and `content.json`), the counter, the lights and the poses over time. Everything on screen is a function of time.
- `assets/render.js`: the HyperFrames seek protocol and the renderer settings (Khronos PBR Neutral tone mapping keeps paper white and the ink blue close to their token values).
- Lighting: a warm soft key from the front left with soft shadows, a cool rim from behind, and a dim room environment for the highlights on the plates. The key's fall-off on the counter is the vignette; a CSS overlay settles the frame edges to the stage colour.
