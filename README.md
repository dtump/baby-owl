# Baby Owl Hollow

A single-page, screensaver-style animated scene in the spirit of Sierra's *Johnny Castaway*: a cute owl family — **Olive** the parent with baby owls **Pip** and **Puff** — living in a bright forest clearing. The family idles, hops and chases butterflies on its own, and auto-plays small looping stories: a first flight, a fishing lesson, and nap time.

> **This project is a test of the Mistral Large 4 model**, which is still in its preview phase. It was designed and built end-to-end by an AI coding agent ([opencode](https://opencode.ai)) from a single natural-language prompt.

## Play it

- **Live:** <https://dtump.github.io/baby-owl/> (GitHub Pages, auto-deploys from `main`)
- **Locally:** open `index.html` in a browser, or serve the folder with any static file server, e.g. `python3 -m http.server`

No build step, no dependencies, no network requests — plain HTML, CSS and JavaScript.

## Controls

| Input | Action |
| --- | --- |
| `1` / `2` / `3` | Jump to a story |
| `Space` | Skip the current story |
| `F` | Toggle fullscreen |
| `M` | Toggle sound (off by default) |
| Click an owl | Hoot + hearts |
| Click the pond | Splash |
| Click the background | Skip the current story |

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page, SVG gradients, layer groups |
| `css/style.css` | Page styling |
| `js/scene.js` | World building (sky, pond, tree, grass), ambient animation, shared helpers |
| `js/owls.js` | The `Owl` class: anatomy, blinking, gaze, hopping, flapping |
| `js/stories.js` | The three story scripts, shared coordinates (`POS`), stage helpers (`S`) |
| `js/main.js` | Boot, animation loop, input, story scheduler, sound |
| `test/smoke.js` | jsdom smoke test that boots the real page and checks structure, stories and interactions |
| `DESIGN.md` | Design document |
| `TASKS.md` | Task list, story beats and coordinate table |
| `BACKLOG.md` | Ideas for a v2 |
| `PROMPTS.md` | Verbatim history of the prompts that shaped the page |
| `AGENTS.md` | Instructions for coding agents working on this repo |

## Development

```bash
# syntax check
for f in js/*.js; do node --check "$f"; done

# smoke test (boots the page in jsdom, ~15 s)
cd test && npm install   # first time only
npm test
```

See `AGENTS.md` for architecture rules and conventions.
