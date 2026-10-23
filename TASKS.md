# Task List — Baby Owl Hollow

- [x] Brainstorm implementation approach
- [x] Write DESIGN.md
- [x] Write BACKLOG.md
- [x] `index.html` + `css/style.css` skeleton (stage, defs, UI overlay)
- [x] `js/scene.js` — helpers + background world (sky/sun/clouds/hills/tree/pond/grass/critters)
- [x] `js/owls.js` — `Owl` class (build, update, blink, gaze, flap, hop, say)
- [x] `js/stories.js` — story context `S` + fx (splash, fish, zzz, hearts) + 3 stories
- [x] `js/main.js` — boot, rAF loop, input, scheduler, sound, UI wiring
- [x] Verify: `node --check` all JS, jsdom smoke test (all stories, skip, clicks), auto-story test, HTTP serve check
- [x] Owl eyes rework: facial discs + amber irises + centered pupils (user feedback)
- [x] Independent review-agent audit; fixed H1 (pupils), M1 (boot story race), M2 (fx click-through), M3 (yawn beak), L1/L2/L4-L13, L17 (crouch squash)
- [x] Final polish + summary to user
- [x] Atmosphere: day/night cycle (sky palettes, sun/moon, stars, fireflies, tint, sleeping owls, scheduler nap guard)
- [x] Atmosphere: weather (rain + pond ripples, rainbow, snow, huddle under a leaf)
- [x] Atmosphere: seasons (foliage/grass recolor, blossom, falling leaves, snow ground)

## Story beats (as implemented)

1. **First Flight** (~11 s): Pip looks at Olive, "?" → 3 hops → excited flapping →
   Olive watches → fly branch→stub (arc up) → land bounce → Olive "Hoo hoo!" →
   Pip "!" → fly back → hop + wiggle + heart.
2. **Fishing Lesson** (~16 s): Puff watches the water, "?" → Olive flies to pond
   edge → crouches/waits → ripple+splash → fish arcs into beak → fly back →
   "Yum!" (fish eaten) → Puff flies to pond edge → crouches, big splash, no fish →
   "..." → fly back, wiggle → Olive "Next time!" → hearts.
3. **Nap Time** (~15 s): Olive yawns "Ahh…" → babies yawn → eyes droop → zzz +
   butterfly lands on Olive's head → wake: lids up, blink, wing stretch →
   "Sweet dreams" → babies wiggle.

Stories auto-rotate forever with a 12–18 s idle gap; first story starts 3.5 s
after load. Keys 1/2/3 jump, Space skips.

## Key coordinates (viewBox 1600x900)

| Spot | x | y (body center) | Notes |
|---|---|---|---|
| Olive home (branch) | 1120 | 393 | scale 1.05, groundY 462 |
| Pip home (branch) | 950 | 419 | scale 0.62, groundY 460 |
| Puff home (mushroom) | 800 | 682 | scale 0.60, groundY 722 |
| Flight landing stub | 1400 | 513 | groundY 554 |
| Pond edge (Olive) | 700 | 703 | groundY 772 |
| Pond edge (Puff) | 655 | 708 | groundY 748 |
| Fish water point | 505 | 786 | splash here |
| Puff splash point | 545 | 782 | |
