# Backlog — ideas for later (not in v1)

## Atmosphere
- [x] Day/night cycle: warm day → golden dusk → starry night with fireflies, moon,
      owls wake/sleep on schedule. (Stories pause at night — the owls nap.)
- [x] Weather: gentle rain (raindrops, puddle ripples, owls huddle under a leaf),
      rainbow after rain, light snow in winter.
- [x] Seasons: swap palette + foliage (blossom in spring, red leaves in autumn,
      bare tree + snow on the ground in winter).

## More stories
- [x] "Bath time" — babies splash in the shallows, Olive supervises.
- [x] "The new friend" — a shy hedgehog/squirrel visits; owls share berries.
- [x] "Lost & found" — Pip drops a shiny pebble, Puff "helps" find it.
- [x] "Constellation lesson" — night story where stars form an owl shape.
- [x] "Band practice" — the three owls hoot a little melody (with sound on).

## Interaction
- [ ] Pet an owl (drag) → it nuzzles, eyes go to happy arcs `^‿^`.
- [ ] Click flowers → they bloom/pop; click mushrooms → they bounce.
- [ ] Feed the owls: click to toss a berry/worm, nearest owl catches it.
- [ ] Photo mode: hide UI, take a screenshot (canvas snapshot of the SVG).
- [ ] Story picker UI (little owl icons instead of keys 1-8).
- [ ] Shuffle story order; "story of the day" seeded by date.

## Critters & world
- [x] Frog in the pond that croaks (bubble "ribbit") and jumps between lily pads.
- [x] Squirrel that runs along the branch and chatters at Pip.
- [x] Beehive in the tree with bees looping around; honey drizzle.
- [x] Fireflies at dusk (already in the atmosphere work); shooting star occasionally.
- [x] A tiny swing hanging from the branch that Pip learns to use (daytime idle ride).

## Sound & feel
- [ ] Soft generative ambient music (WebAudio, pentatonic plucks) with mute.
- [ ] Volume slider; per-sound toggles (hoots / splashes / music).
- [ ] Slight screen "breathing" zoom (very slow scale 1.00→1.02) for coziness.

## Tech
- [x] Alignment tooling: single-source geometry (`Scene.pond`, `OWL_FEET`/`feetY`, `Scene.keepClear`), `G` debug overlay, smoke-test geometry contract; bath owls now stand in the shallows.
- [x] Safe-area contract: `Scene.safeArea` + `Scene.uiZones` (hint pill), debug overlay shows both, smoke test keeps owl-spot feet + pebble/hedgehog ground visible; hedgehog fixed (barely visible + cut off — now bigger, shadowed, at the pond's right shore).
- [ ] Touch support polish (tap = click, two-finger tap = fullscreen).
- [ ] prefers-reduced-motion: slow everything down / static scene.
- [ ] Pause when tab hidden (rAF does this naturally, but timers don't).
- [ ] PWA manifest so it can be "installed" as a screensaver-ish app.

## Easter eggs
- [ ] Konami code → party hats on all owls + music.
- [ ] Click the sun → it winks.
- [ ] Type "hoo" → all owls hoot together.
- [ ] Triple-click Olive → she tells a joke (bubble).
