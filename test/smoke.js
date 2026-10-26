// Smoke test: boots the real index.html + all four scripts in jsdom and checks
// structure, interactions, and the story skip/reset machinery.
// Run from this directory: npm test   (~30 s)

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log('ok - ' + msg);
  else { failures++; console.error('FAIL - ' + msg); }
}

async function main() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://baby-owl.test/', runScripts: 'outside-only' });
  const { window } = dom;
  const { document } = window;

  // Stub the browser APIs jsdom lacks; drive frames manually for determinism.
  const rafQ = [];
  window.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
  window.cancelAnimationFrame = () => {};
  const stage = document.getElementById('stage');
  stage.createSVGPoint = () => ({ x: 0, y: 0 });
  stage.getScreenCTM = () => null;

  // One bundle, one eval: the scripts share top-level const/class bindings.
  const bundle = ['scene.js', 'owls.js', 'stories.js', 'main.js']
    .map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8'))
    .join('\n;\n');
  window.eval(bundle + `
 ;window.__test = {
    olive, pip, puff, Scene, stories, S, POS, OWL_FEET,
    runStory, skipStory, playStory, tryStart,
    get storyActive() { return storyActive; },
    get storyNow() { return storyNow; },
    get nextTimerSet() { return !!nextTimer; },
    clearNext() { clearTimeout(nextTimer); }
  };`);
  const T = window.__test;
  const { olive, pip, puff } = T;

  let now = window.performance.now();
  function pump(frames = 1, stepMs = 16) {
    for (let i = 0; i < frames; i++) {
      now += stepMs;
      for (const cb of rafQ.splice(0)) cb(now);
    }
  }

  // --- structure ---
  assert(document.getElementById('owls').children.length === 3, 'three owls on stage');
  assert([olive.name, pip.name, puff.name].join(',') === 'Olive,Pip,Puff', 'owl names');
  assert(T.stories.map(s => s.name).join('|') === 'First Flight|Fishing Lesson|Nap Time|Bath Time|The New Friend|Lost & Found|Constellation Lesson|Band Practice', 'eight stories');
  assert(T.stories.filter(s => s.night).map(s => s.name).join('|') === 'Constellation Lesson', 'constellation lesson is the night story');

  for (const o of [olive, pip, puff]) {
    const discs = [...o.bob.querySelectorAll('circle')].filter(c => c.getAttribute('r') === '31');
    assert(discs.length === 2, o.name + ': two facial discs');
    for (const [eye, cx] of [[o.eyeL, '-25'], [o.eyeR, '25']]) {
      const circles = eye.querySelectorAll('circle');
      assert(circles[0].getAttribute('r') === '24' && circles[0].getAttribute('fill') === '#fffdf5', o.name + ': eye white r24');
      assert(circles[1].getAttribute('r') === '15.5' && circles[1].getAttribute('fill') === 'url(#irisG)', o.name + ': amber iris r15.5');
      const pc = eye.querySelector('g').querySelector('circle');
      assert(pc.getAttribute('cx') === cx && pc.getAttribute('cy') === '-24' && pc.getAttribute('r') === '9', o.name + ': pupil centered at (' + cx + ',-24)');
    }
    assert(!!o.beakG.querySelector('path'), o.name + ': beak');
    assert(!!o.feet.querySelector('path'), o.name + ': feet');
  }

  // --- layers ---
  assert(document.getElementById('critters').getAttribute('pointer-events') === 'none', 'critters layer is click-through');
  assert(document.getElementById('fx').getAttribute('pointer-events') === 'none', 'fx layer is click-through');

  // --- hint ---
  const hintText = document.getElementById('hint').textContent;
  assert(hintText.includes('1-8') && !hintText.includes('1/2/3'), 'hint shows the 1-8 story keys');

  // --- no fg props inside a keep-clear zone (Scene.keepClear) ---
  const trunkZone = [];
  const inZone = (x, y) => T.Scene.keepClear.some(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
  for (const g of document.querySelectorAll('#fg > g')) {
    const m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)/);
    if (m && inZone(+m[1], +m[2])) trunkZone.push('g@' + m[1] + ',' + m[2]);
  }
  for (const e of document.querySelectorAll('#fg > ellipse')) {
    const x = +e.getAttribute('cx'), y = +e.getAttribute('cy');
    if (inZone(x, y)) trunkZone.push('ellipse@' + x + ',' + y);
  }
  assert(trunkZone.length === 0, 'no grass/flowers/mushrooms inside a keep-clear zone ' + JSON.stringify(trunkZone));

  // --- hedgehog critter (hidden until its story) ---
  assert(!!T.Scene.hedgehog && T.Scene.hedgehog.g.parentNode === document.getElementById('critters'), 'hedgehog lives in the critters layer');
  assert(+T.Scene.hedgehog.g.getAttribute('opacity') === 0, 'hedgehog hides until its story');

  // --- props must not overlap: the log must not sit on a mushroom ---
  function boxOf(g, x0, x1, y0, y1) {
    const m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: scale\(([\d.]+)\))?/);
    const x = +m[1], y = +m[2], s = m[3] ? +m[3] : 1;
    return { x0: x + x0 * s, x1: x + x1 * s, y0: y + y0 * s, y1: y + y1 * s };
  }
  const logBox = boxOf(T.Scene.logG, -83, 83, -26, 26);
  const shroomOverlap = T.Scene.mushrooms.some(g => {
    const b = boxOf(g, -58, 58, -72, 2);
    return b.x0 < logBox.x1 && b.x1 > logBox.x0 && b.y0 < logBox.y1 && b.y1 > logBox.y0;
  });
  assert(!shroomOverlap, 'log does not sit on a mushroom');

  // --- geometry: Scene.pond is the single source of truth ---
  const pm = T.Scene.pondG.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)/);
  const water = T.Scene.pondG.querySelector('ellipse');
  assert(+pm[1] === T.Scene.pond.cx && +pm[2] === T.Scene.pond.cy, 'drawn pond sits at Scene.pond center');
  assert(+water.getAttribute('rx') === T.Scene.pond.rx && +water.getAttribute('ry') === T.Scene.pond.ry, 'drawn pond matches Scene.pond size');
  assert(T.Scene.inPond(400, 795) && !T.Scene.inPond(60, 60), 'Scene.inPond sanity');
  assert(Math.abs(T.Scene.pondEdgeY(400) - 875) < .01 && Math.abs(T.Scene.pondEdgeY(400, false) - 715) < .01, 'pondEdgeY near/far edges at center');

  // --- bath spots: the owls stand IN the shallows (feet in the water, near the edge) ---
  for (const [key, owl] of [['pipBath', pip], ['puffBath', puff]]) {
    const p = T.POS[key];
    const fy = p.y + T.OWL_FEET * owl.scale;
    const edge = T.Scene.pondEdgeY(p.x);
    assert(T.Scene.inPond(p.x, p.y) && T.Scene.inPond(p.x, fy), key + ' anchor and feet are in the pond');
    assert(edge - fy > 0 && edge - fy < 30, key + ' feet in the shallows (' + (edge - fy).toFixed(1) + 'px inside the near edge)');
  }

  // --- water spots are inside the pond, every other spot stays out ---
  for (const k of ['fishPoint', 'puffSplash'])
    assert(T.Scene.inPond(T.POS[k].x, T.POS[k].y), k + ' is a water spot inside the pond');
  for (const k of Object.keys(T.POS)) {
    if (['fishPoint', 'puffSplash', 'pipBath', 'puffBath'].includes(k)) continue;
    assert(!T.Scene.inPond(T.POS[k].x, T.POS[k].y), k + ' stays out of the pond');
  }

  // --- owl spots on land: the FEET stay on dry ground ---
  for (const [k, o] of [['olive', olive], ['land', olive], ['pondOlive', olive], ['pip', pip], ['pipVisit', pip], ['puff', puff], ['pondPuff', puff], ['puffFind', puff], ['puffGive', puff]]) {
    const p = T.POS[k];
    assert(!T.Scene.inPond(p.x, p.y + T.OWL_FEET * o.scale), k + ' feet stay out of the water');
  }

  // --- no story spot inside a keep-clear zone ---
  for (const k of Object.keys(T.POS)) {
    const p = T.POS[k];
    const z = T.Scene.keepClear.find(z => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1);
    assert(!z, k + ' is not in a keep-clear zone' + (z ? ' (' + z.name + ')' : ''));
  }

  // Stop the boot story timer so it cannot race the tests.
  T.clearNext();

  // --- debug overlay (G) ---
  const debugLayer = document.getElementById('debug');
  assert(!!debugLayer && debugLayer.getAttribute('pointer-events') === 'none', 'debug layer is click-through');
  assert(debugLayer.children.length === 0, 'debug overlay starts hidden');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'g' }));
  assert(T.Scene.debug === true && debugLayer.children.length > 0, 'G shows the debug overlay');
  const dLabels = [...debugLayer.querySelectorAll('text')].map(t => t.textContent);
  assert(dLabels.includes('pond') && dLabels.includes('pipBath') && dLabels.includes('trunk'), 'overlay labels the pond, keep-clear zones and POS spots');
  assert(dLabels.includes('Olive') && dLabels.includes('Puff'), 'overlay labels the owls');
  const dm = debugLayer.querySelector('[data-owl="Olive"]');
  const dfm = debugLayer.querySelector('[data-owl-feet="Olive"]');
  const dy0 = +dm.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)/)[2];
  const df0 = +dfm.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)/)[2];
  olive.hop(22);
  pump(8);
  const dy1 = +dm.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)/)[2];
  const df1 = +dfm.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)/)[2];
  assert(dy1 < dy0 && df1 < df0, 'overlay tracks an owl while it hops');
  assert(Math.abs(df1 - (dy1 + T.OWL_FEET * olive.scale)) < 1, 'overlay feet marker sits at the feet line');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'G' }));
  assert(T.Scene.debug === false && debugLayer.children.length === 0, 'G again hides the overlay');
  pump(40);

  // --- hop moves the owl up ---
  olive.hop(22);
  pump(10);
  const tm = olive.g.getAttribute('transform').match(/translate\(([-\d.]+) ([\d.-]+)/);
  const hopY = parseFloat(tm[2]);
  assert(hopY < olive.home.y, 'hop moves owl UP (y ' + olive.home.y + ' -> ' + hopY.toFixed(1) + ')');
  pump(40);

  // --- clicks ---
  const fx = document.getElementById('fx');
  let n = fx.children.length;
  olive.g.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(fx.children.length > n, 'owl click spawns fx (bubble + hearts)');
  n = fx.children.length;
  T.Scene.pondG.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: 400, clientY: 795 }));
  assert(fx.children.length >= n + 6, 'pond click spawns splash (ripple + 5 drops)');

  // --- stories: skip all eight ---
  for (let i = 0; i < T.stories.length; i++) {
    const p = T.runStory(i);
    await sleep(150);
    assert(T.storyActive === true, 'story ' + i + ' (' + T.stories[i].name + ') is active');
    T.skipStory();
    await p;
    assert(T.storyActive === false, 'story ' + i + ' ends after skip');
    assert(olive.x === olive.home.x && olive.y === olive.home.y &&
           pip.x === pip.home.x && pip.y === pip.home.y &&
           puff.x === puff.home.x && puff.y === puff.home.y, 'story ' + i + ': owls back home');
    assert(olive.lid === 0 && pip.lid === 0 && puff.lid === 0 && !olive.fish && !olive.pebble && !pip.fish && !pip.pebble && !puff.fish && !puff.pebble, 'story ' + i + ': poses reset');
    assert(+T.Scene.hedgehog.g.getAttribute('opacity') === 0, 'story ' + i + ': hedgehog hidden after skip');
    T.clearNext();
  }

  // --- one story runs to natural completion and reschedules ---
  const t0 = Date.now();
  await T.runStory(3);
  const dur = Date.now() - t0;
  assert(dur > 8000, 'story 3 (Bath Time) runs to completion without skip (~11 s, took ' + (dur / 1000).toFixed(1) + 's)');
  assert(T.storyActive === false, 'story 3 finished');
  assert(T.nextTimerSet, 'next story scheduled');
  assert(olive.x === olive.home.x && pip.x === pip.home.x && puff.x === puff.home.x, 'owls home after natural finish');
  T.clearNext();

  // --- atmosphere: day/night cycle ---
  const skyStop = document.querySelector('#sky stop');
  T.Scene.dayT = .2;
  pump(3);
  const daySky = skyStop.getAttribute('stop-color');
  assert(T.Scene.night === 0 && !T.Scene.isNight(), 'midday: night factor 0');
  assert(+T.Scene.sun.getAttribute('opacity') > .9, 'sun is up at midday');
  T.Scene.dayT = .72;
  pump(3);
  assert(T.Scene.night === 1 && T.Scene.isNight(), 'night: night factor 1');
  assert(skyStop.getAttribute('stop-color') !== daySky, 'sky color changes day -> night');
  assert(+T.Scene.tint.getAttribute('opacity') > .3, 'night tint darkens the scene');
  assert(+T.Scene.starsG.getAttribute('opacity') === 1, 'stars out at night');
  assert(+T.Scene.moon.getAttribute('opacity') === 1, 'moon out at night');
  assert(+T.Scene.sun.getAttribute('opacity') < .05, 'sun hidden at night');

  pump(240);
  assert(olive.lid > .9 && pip.lid > .9 && puff.lid > .9, 'owls fall asleep at night');

  T.Scene.dayT = .72;
  T.clearNext();
  T.tryStart();
  assert(T.storyActive === true, 'night story starts at night');
  assert(T.stories[T.storyNow].night === true, 'only the night story plays at night');
  let guard = 0;
  while (T.storyActive && guard++ < 100) await sleep(200);
  assert(T.storyActive === false, 'night story runs to completion');
  assert(T.stories[T.storyNow].name === 'Constellation Lesson', 'the night story is the constellation lesson');
  assert(olive.x === olive.home.x && pip.x === pip.home.x && puff.x === puff.home.x, 'owls home after the night story');
  T.clearNext();
  T.tryStart();
  assert(T.storyActive === false, 'night story plays only once per night');
  assert(T.nextTimerSet, 'scheduler re-checks after the night story');
  T.clearNext();
  pump(240);
  assert(olive.lid > .9, 'owls tuck back in after the night lesson');
  T.Scene.dayT = .2;
  pump(240);
  assert(olive.lid < .1 && pip.lid < .1 && puff.lid < .1, 'owls wake up in the morning');

  T.Scene.dayT = .2;
  T.tryStart();
  await sleep(150);
  assert(T.storyActive === true, 'story starts in the daytime');
  T.skipStory();
  await sleep(120);
  T.clearNext();

  // --- weather: rain, huddle under a leaf, rainbow ---
  T.Scene.weather = 'rain';
  T.Scene.weatherTimer = 999;
  pump(120);
  assert(+T.Scene.rainLayer.getAttribute('opacity') > .8, 'rain falls');
  assert(T.Scene.rainDrops.length === 90, 'rain has drops');
  assert(T.Scene.rainRipples.length > 0, 'rain ripples the pond');
  pump(200);
  assert(T.Scene.huddle > .9, 'owls huddle in the rain');
  assert(pip.x > pip.home.x + 20, 'Pip moves toward Olive in the rain');
  assert(+T.Scene.leafG.getAttribute('opacity') > .8, 'leaf umbrella over the huddle');
  assert(olive.lid > .3 && pip.lid > .3, 'owls squint in the rain');
  T.Scene.weather = 'clear';
  T.Scene.weatherTimer = 999;
  pump(60);
  assert(+T.Scene.rainLayer.getAttribute('opacity') < .2, 'rain fades out');
  pump(240);
  assert(T.Scene.huddle < .1, 'owls stop huddling when the rain ends');
  assert(Math.abs(pip.x - pip.home.x) < 2, 'Pip back home after the rain');
  assert(olive.lid < .1, 'owls stop squinting');
  T.Scene.weather = 'rain';
  T.Scene.weatherTimer = .01;
  pump(2);
  assert(T.Scene.weather === 'rainbow', 'rainbow follows the rain');
  pump(120);
  assert(+T.Scene.rainbowG.getAttribute('opacity') > .8, 'rainbow appears after the rain');
  T.Scene.weatherTimer = .01;
  pump(2);
  assert(T.Scene.weather === 'clear', 'rainbow ends into clear weather');
  pump(120);
  assert(+T.Scene.rainbowG.getAttribute('opacity') < .2, 'rainbow fades away');
  T.Scene.weather = 'clear';
  T.Scene.weatherTimer = 999;

  // --- seasons ---
  const leaf0 = T.Scene.foliage.main[0].el;
  T.Scene.dayCount = 1;
  pump(2);
  const summerFill = leaf0.getAttribute('fill');
  T.Scene.dayCount = 2;
  pump(2);
  assert(leaf0.getAttribute('fill') !== summerFill, 'foliage changes color with the seasons');
  T.Scene.dayCount = 3;
  pump(2);
  assert(+T.Scene.canopyG.getAttribute('opacity') < .5, 'canopy thins out in winter');
  assert(+T.Scene.snowGround.getAttribute('opacity') > .2, 'snow blankets the ground in winter');
  T.Scene.dayCount = 0;
  pump(90);
  assert(+T.Scene.blossomG.getAttribute('opacity') > .8, 'blossom in spring');
  T.Scene.dayCount = 3;
  pump(2);
  T.Scene.weather = 'clear';
  T.Scene.weatherTimer = .01;
  pump(2);
  assert(T.Scene.weather === 'snow', 'winter precipitation is snow');
  pump(120);
  assert(+T.Scene.snowLayer.getAttribute('opacity') > .8, 'snow falls in winter');
  assert(+T.Scene.rainLayer.getAttribute('opacity') < .05, 'no rain in winter');
  T.Scene.weather = 'clear';
  T.Scene.weatherTimer = 999;
  T.Scene.dayCount = 1;
  pump(2);

  console.log(failures ? '\nSMOKE TEST FAILED (' + failures + ')' : '\nSMOKE TEST PASSED');
  process.exit(failures ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
