# AGENTS.md — coding agent instructions for Baby Owl Hollow

## What this is

A single-page, screensaver-style HTML scene (Sierra's *Johnny Castaway* vibe): owl parent Olive and babies Pip & Puff in a bright forest clearing, auto-playing small looping stories with idle animations in between. Pure HTML/CSS/JS — **no build step, no dependencies, no frameworks**. This repo is a Mistral Large 4 (preview) model test; the page was built by an agent (opencode) from natural-language prompts — see `PROMPTS.md`.

## Hard rules

- **Classic scripts only.** Never add `type="module"` — ES modules break when the page is opened via `file://`.
- **Script load order is load-bearing** (shared globals, see `index.html`): `js/scene.js` → `js/owls.js` → `js/stories.js` → `js/main.js`. Never reorder or add scripts without updating all four.
- **SVG layer order is deliberate:** `bg` → `mid` (pond, tree) → `fg` (grass details) → `owls` → `critters` → `fx` → `tint` (day/night overlay) → vignette → `debug` (G-key overlay). `critters`, `fx`, `tint` and `debug` must keep `pointer-events="none"`.
- **Keep `fg` clear of the tree trunk** — the zone lives in `Scene.keepClear` (x 1150–1375, y > 640): `fg` draws above `mid`, so anything placed there paints over the trunk. The smoke test enforces this.
- **Keep owl FEET out of the pond** — `Scene.pond` is the single source (center (400, 795), rx 285, ry 80; `buildMid` draws the pond from it). An owl's `POS` anchor is its body center; feet are at `owl.feetY()` (`OWL_FEET` = 74 local). Bath spots are `Scene.pondShallow(x, scale)` (feet 12px inside the near edge); every other owl spot must have its feet outside the pond. The smoke test enforces all of this — validate feet, never anchors.
- Keep it cute and small: eight small stories is the scope (the three originals plus the five backlog stories). Prefer a small charming change over a clever refactor.

## Architecture cheat sheet

- Stage: one SVG, `viewBox="0 0 1600 900"`, `preserveAspectRatio="xMidYMid slice"`.
- `scene.js` globals: `svgEl`, `cubic`, `rand`, `lerp`, `clamp`, `easeIO`, `ramp01`, `mixHex`, and the `Scene` object (world build + ambient update: clouds, birds, ripples, reeds, tufts, flowers, butterflies, falling leaves, sparkles, fireflies, the shy hedgehog `Scene.hedgehog`, mouse parallax, plus the atmosphere clock: `Scene.dayT`/`dayMs` day-night cycle with sun/moon/stars, `Scene.weather` rain/snow/rainbow, `Scene.season` foliage palettes). Geometry: `Scene.pond` (single source — the pond is drawn from it), `Scene.pondEdgeY(x, near)`, `Scene.inPond(x, y)`, `Scene.pondShallow(x, scale, inset)`, `Scene.keepClear`, `Scene.safeArea` + `Scene.uiZones` (visibility contract), `Scene.hedgehogGroundY(y)` (`HEDGEHOG_FEET`/`HEDGEHOG_SCALE`), and the `G` debug overlay (`Scene.toggleDebug({pos, owls})`). Sleep/huddle posing lives in `updateRest` in `main.js`.
- `owls.js`: `OWL_FEET` (74, local y of the feet/shadow line) and `owl.feetY()` (world y of the ground contact). `Owl` class. Eye stack per eye: facial disc (r31, palette `face`) → white (r24) → amber iris (`url(#irisG)`, r15.5) → pupil group with pupil (r9) at local (±25, −24) plus highlight. Hop is positive-up: root transform is `translate(x, y - hopY)`; the shadow counter-translates `hopY / scale`. Squash/bob pivots at y=70. Key methods: `hop(h)`, `flap(speed, amp)`, `say(text, dur)`, `feetY()`, `reset()`.
- `stories.js`: `POS` holds every shared coordinate — **change coordinates there, not inline**. `S.wait(ms)` rejects with the `SKIP` symbol when the user skips; stories must tolerate skip at any `await` (the scheduler calls `skipStory()` first and guards re-entry in `finally`). Helpers: `S.say/bounce/wiggle/setLid/yawn/flyPath/splash/fishArc/holdFish/eatFish/zzz/heart(s)/slide/berryToss/makePebble/holdPebble/unholdPebble/dropPebble/glint/constellation/notes/nom`.
- `main.js`: `pushFx(item)` for one-shot effects — contract: `update(dt, t)` returns `true` when done, optional `onDone()`, `kill()`. Scheduler: `runStory(i)` / `skipStory()` / `playStory(i)` / `scheduleNext()`. Day stories auto-rotate: the first starts 3.5 s after load, then every 12–18 s. A story flagged `night: true` (Constellation Lesson) plays once per night instead; keys 1–8 jump to any story.
- Sound: WebAudio only (`Audio` in `main.js`), off by default, resumes on first user gesture. Never add external audio files.

## Coordinates (keep `TASKS.md` in sync)

- Olive home (1120, 393) s1.05 · Pip (950, 419) s0.62 · Puff (800, 682) s0.60
- Landing stub (1400, 513) · Olive at pond (700, 703) · Puff at pond (655, 708)
- Fish point (505, 786) · Puff splash (545, 782)
- Pip bath (310, 813) · Puff bath (370, 818) — derived via `Scene.pondShallow`, feet 12px inside the pond's near edge
- Hedgehog stop (760, 800, scale 1.3) · Pip visit (660, 792) · Pebble spot (958, 800)
- Puff find (900, 780) · Puff give (1005, 421, branch) · Constellation center (430, 185)
- Tree trunk: x ≈ 1160–1365 at y 640–900 (root flares at (1190, 882) and (1332, 886))

## Testing

No headless browser is available — verify with jsdom and coordinate reasoning:

```bash
for f in js/*.js; do node --check "$f"; done   # syntax
cd test && npm install                          # first time only
npm test                                        # smoke test, ~30 s
```

`test/smoke.js` boots the real `index.html` plus all four scripts in jsdom (stubbing `requestAnimationFrame`, `createSVGPoint`, `getScreenCTM`) and asserts: owl/eye structure, click-through layers, no-`fg`-on-trunk, no prop overlap (log vs mushrooms), pond-safe story spots, hop direction, owl/pond click effects, skip + reset for all eight stories, the once-per-night night story, and full natural runs of Bath Time and the Constellation Lesson. Keep it green; extend it when you add features.

## Docs & process

- Keep `DESIGN.md`, `TASKS.md` (including the coordinate table) and `BACKLOG.md` in sync with code changes.
- **Prompt history:** append the user's prompts to `PROMPTS.md` verbatim, dated, but only prompts that iterate on the page itself. Skip repo/admin chatter (git setup, Pages, visibility, docs requests, etc.).
- **Workflow:** always work via pull requests — create a feature branch, push it, open a PR, merge it. Never push directly to `main`.
- **Deploy:** GitHub Pages auto-deploys from `main` to <https://dtump.github.io/baby-owl/> within about a minute after a PR is merged.
- **Commit only when the user asks.**
