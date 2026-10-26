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
- [x] Visual fix: log no longer sits on the mushroom (moved to (1100, 888), smoke test guards the overlap)
- [x] More stories: Bath Time (babies splash in the shallows, Olive supervises)
- [x] More stories: The New Friend (shy hedgehog visits, owls share a berry)
- [x] More stories: Lost & Found (Pip drops a shiny pebble, Puff finds it)
- [x] More stories: Constellation Lesson (night story: stars form an owl, plays once per night)
- [x] More stories: Band Practice (the owls hoot a little melody, pitch-aware hoots)
- [x] Alignment tooling: single-source geometry (`Scene.pond` + `pondEdgeY`/`inPond`/`pondShallow`, `OWL_FEET` + `owl.feetY()`, `Scene.keepClear`), `G` debug overlay, smoke-test geometry contract
- [x] Visual fix: bath owls stand IN the pond (feet 12px inside the near edge; spots derived via `Scene.pondShallow`, splashes at the feet)

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
4. **Bath Time** (~11 s): Olive "Splash time!" → Pip and Puff fly to the
   shallows → hop-splash, "Whee!", big splash, "Again!" → Olive "Careful
   now!" → both splash → fly home → wiggles + hearts.
5. **The New Friend** (~13 s): hedgehog waddles in along the shoreline →
   owls watch → Olive "Hello?" → Pip flies down "Hi!" → Puff "For you!"
   tosses a berry → hedgehog peeks, eats it (glint + heart) → Olive "Share
   nicely." → happy bounce → owls flap-wave "Bye!" → hedgehog turns around
   and waddles off → Pip flies home.
6. **Lost & Found** (~11 s): Pip holds a shiny pebble "?" → drops it (gravity
   fall + bounce + glint) → "Oh no…" → Puff flies down, hops searching →
   glint, "!" → picks it up → flies to the branch, gives it to Pip → hearts
   → Olive "Good eyes, Puff!" → pebble put away → Puff flies home.
7. **Constellation Lesson** (~9 s, night story, once per night): owls look up →
   Olive "Look up…" → stars draw an owl in the sky, twinkle → "See? An owl."
   → babies "Ooo!" → "Hoo hoo." → heart → owls tuck back in.
8. **Band Practice** (~7 s): Olive/Pip/Puff hoot low/mid/high ("♪") → all
   three hoot a chord ("Hoo hoo!"/"Hoo!"/"Hoo!") with floating notes → wing
   bows → hearts → Olive "Bravo!" → Pip wiggles.

Day stories auto-rotate forever with a 12–18 s idle gap; first story starts
3.5 s after load. The night story plays once per night. Keys 1–8 jump, Space
skips.

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
| Pip bath (shallows) | 310 | 813 | derived: feet 12px inside the pond's near edge |
| Puff bath (shallows) | 370 | 818 | derived: feet 12px inside the pond's near edge |
| Hedgehog stop | 620 | 884 | shoreline, faces right |
| Pip visit (greeting) | 520 | 874 | near hedgehog |
| Pebble spot | 958 | 858 | grass, below branch |
| Puff find (search) | 905 | 852 | left of pebble |
| Puff give (branch) | 1005 | 421 | handoff to Pip |
| Constellation center | 430 | 185 | sky, night story |

Owl anchors are body centers — feet sit at `y + OWL_FEET·scale` (`owl.feetY()`).
Bath spots are `Scene.pondShallow(x, scale)`: feet 12px inside the pond's near
edge. The smoke test enforces the feet-based pond/keep-clear contract.
