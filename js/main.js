const fxItems = [];
function pushFx(item) {
  fxItems.push(item);
}

const Audio = {
  ctx: null,
  on: false,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      const r = this.ctx.resume();
      if (r && r.catch) r.catch(() => {});
    }
  },
  tone(f0, f1, dur, type, vol) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + .05);
  },
  hoot(pitch = 1) {
    this.tone(330 * pitch, 170 * pitch, .28, 'sine', .09);
    setTimeout(() => this.tone(280 * pitch, 140 * pitch, .32, 'sine', .07), 150);
  },
  pop() {
    this.tone(520, 880, .07, 'triangle', .05);
  },
  splash() {
    this.tone(620, 140, .16, 'square', .04);
    this.tone(300, 90, .22, 'sine', .045);
  },
  wing() {
    this.tone(220, 90, .14, 'sine', .035);
  },
  croak() {
    this.tone(150, 90, .16, 'sawtooth', .05);
    setTimeout(() => this.tone(120, 75, .22, 'sawtooth', .04), 90);
  },
  buzz() {
    this.tone(240, 200, .1, 'square', .018);
    setTimeout(() => this.tone(260, 220, .1, 'square', .018), 60);
  },
  chatter() {
    for (let i = 0; i < 3; i++)
      setTimeout(() => this.tone(700 + i * 60, 950 + i * 60, .05, 'square', .028), i * 70);
  }
};

const stage = document.getElementById('stage');

Scene.build();

const owlsG = document.getElementById('owls');
const olive = new Owl(owlsG, { name: 'Olive', x: 1120, y: 393, scale: 1.05, pal: { grad: 'owlBrown', wing: '#7a4a28', stroke: '#6b4222', face: '#f7e8cf' } });
const pip = new Owl(owlsG, { name: 'Pip', x: 950, y: 419, scale: .62, baby: true, pal: { grad: 'owlTan', wing: '#b98d5f', stroke: '#a37c50', face: '#fbf0dc' } });
const puff = new Owl(owlsG, { name: 'Puff', x: 800, y: 682, scale: .6, baby: true, pal: { grad: 'owlGrey', wing: '#7e93a9', stroke: '#6e8296', face: '#eef2f7' } });
const allOwls = [olive, pip, puff];

let storyIdx = 0;
let storyNow = -1;
let storyActive = false;
let storyToken = 0;
let nextTimer = null;
let nightPlayed = false;
const dayIdxs = [];
const nightIdxs = [];
stories.forEach((s, i) => (s.night ? nightIdxs : dayIdxs).push(i));

function resetPoses() {
  for (const o of allOwls) o.reset();
  Scene.releaseButterfly(Scene.butterflies[0]);
  Scene.hedgehogReset();
}

const HUDDLE_SPOTS = { Pip: { x: 1040, y: 417 }, Puff: { x: 1005, y: 419 } };

function updateRest(dt, t) {
  const night = Scene.isNight();
  const precip = Scene.weather === 'rain' || Scene.weather === 'snow';
  const huddling = precip && !night && !storyActive;
  Scene.huddle += ((huddling ? 1 : 0) - Scene.huddle) * (1 - Math.exp(-dt * 1.8));
  if (Scene.leafG) {
    const on = Scene.weather === 'rain' && !night ? Scene.huddle : 0;
    Scene.leafG.setAttribute('opacity', on.toFixed(2));
    Scene.leafG.setAttribute('transform', `translate(1060 272) rotate(${(Math.sin(t * 1.3) * 4).toFixed(2)})`);
  }
  if (storyActive) return;
  for (const o of allOwls) {
    if (o.pinned) continue;
    const spot = HUDDLE_SPOTS[o.name];
    const tx = spot && huddling ? lerp(o.home.x, spot.x, Scene.huddle) : o.home.x;
    const ty = spot && huddling ? lerp(o.home.y, spot.y, Scene.huddle) : o.home.y;
    const k = 1 - Math.exp(-dt * 2.5);
    o.x += (tx - o.x) * k;
    o.y += (ty - o.y) * k;
    const lidT = night ? 1 : huddling ? .5 : 0;
    o.lid += (lidT - o.lid) * (1 - Math.exp(-dt * 2));
    o.bobAmp += ((night ? 3.6 : 2.5) - o.bobAmp) * (1 - Math.exp(-dt * 2));
    if (night) {
      o.zzzTimer -= dt;
      if (o.zzzTimer <= 0) {
        S.zzz(o, 2400);
        o.zzzTimer = rand(2.6, 5);
      }
    }
  }
}

async function runStory(i) {
  skipStory();
  abortSwing();
  const token = ++storyToken;
  resetPoses();
  storyActive = true;
  storyNow = i;
  S.ctrl = { skipped: false };
  try {
    await stories[i].run(S, { olive, pip, puff });
  } catch (err) {
    if (err !== SKIP) console.error(err);
  } finally {
    if (token === storyToken) {
      storyActive = false;
      resetPoses();
      scheduleNext();
    }
  }
}

function tryStart() {
  if (Scene.isNight()) {
    if (!nightPlayed && nightIdxs.length) {
      nightPlayed = true;
      runStory(nightIdxs[Math.floor(Math.random() * nightIdxs.length)]);
      return;
    }
    nextTimer = setTimeout(tryStart, 8000);
    return;
  }
  nightPlayed = false;
  runStory(dayIdxs[storyIdx++ % dayIdxs.length]);
}

function scheduleNext() {
  clearTimeout(nextTimer);
  nextTimer = setTimeout(tryStart, rand(12000, 18000));
}

function skipStory() {
  if (storyActive && S.ctrl) S.ctrl.skipped = true;
}

function playStory(i) {
  skipStory();
  clearTimeout(nextTimer);
  runStory(i);
}

// --- the swing: Pip learns to use it (a little daytime ride) ---
let swingToken = 0;
const swingRide = { active: false, timer: rand(28, 48) };

function abortSwing() {
  if (!swingRide.active && !Scene.swing.rider) return;
  swingToken++;
  swingRide.active = false;
  Scene.swing.rider = null;
  Scene.swing.rideAmp = 0;
  pip.reset();
}

async function swingFly(owl, from, c1, c2, to, dur, aborted) {
  Audio.wing();
  owl.lockRot = true;
  owl.flying = true;
  owl.flap(15, 38);
  owl.bobAmp = 5;
  const t0 = performance.now();
  for (;;) {
    await S.wait(16);
    if (aborted()) break;
    const p = clamp((performance.now() - t0) / dur, 0, 1);
    const pt = cubic(from, c1, c2, to(), easeIO(p));
    const pt2 = cubic(from, c1, c2, to(), easeIO(clamp(p + .02, 0, 1)));
    owl.x = pt.x;
    owl.y = pt.y;
    owl.rot = clamp((pt2.x - pt.x) * 1.2, -14, 14);
    if (p >= 1) break;
  }
  owl.lockRot = false;
  owl.flying = false;
  owl.flap(0, 0);
  owl.flapBase = 15;
  owl.bobAmp = 2.5;
  owl.rot = 0;
}

async function swingRideGo() {
  const token = ++swingToken;
  const aborted = () => token !== swingToken;
  swingRide.active = true;
  Scene.swing.rider = pip;
  pip.pinned = true;
  const prevCtrl = S.ctrl;
  const myCtrl = { skipped: false };
  S.ctrl = myCtrl;
  try {
    await swingFly(pip, POS.pip, { x: 940, y: 560 }, { x: 930, y: 515 }, () => Scene.swingSeat(), 1300, aborted);
    if (aborted()) return;
    Scene.swing.rideAmp = 1;
    pip.lockRot = true;
    pip.rot = 0;
    pip.bobAmp = 4;
    await S.wait(4200);
    if (aborted()) return;
    Scene.swing.rideAmp = 0;
    const seat = Scene.swingSeat();
    await swingFly(pip, seat, { x: 950, y: 520 }, { x: 990, y: 460 }, () => ({ x: POS.pip.x, y: POS.pip.y }), 1300, aborted);
  } finally {
    Scene.swing.rider = null;
    Scene.swing.rideAmp = 0;
    pip.pinned = false;
    pip.lockRot = false;
    pip.bobAmp = 2.5;
    if (S.ctrl === myCtrl) S.ctrl = prevCtrl;
    swingRide.active = false;
    if (!aborted()) swingRide.timer = rand(30, 55);
  }
}

function updateSwing(dt, t) {
  const sw = Scene.swing;
  if (sw.rider) {
    const s = Scene.swingSeat();
    sw.rider.x = s.x;
    sw.rider.y = s.y - OWL_FEET * sw.rider.scale;
    sw.rider.rot = 0;
  }
  if (storyActive || Scene.isNight()) {
    if (swingRide.active || sw.rider) abortSwing();
    return;
  }
  if (!swingRide.active) {
    swingRide.timer -= dt;
    if (swingRide.timer <= 0) swingRideGo().catch(() => {});
  }
}

function toSvg(cx, cy) {
  const pt = stage.createSVGPoint();
  pt.x = cx;
  pt.y = cy;
  const m = stage.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : { x: cx, y: cy };
}

let idleTimer = null;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 3000);
}

function onPoint(cx, cy) {
  wake();
  const p = toSvg(cx, cy);
  for (const o of allOwls) if (!o.lookLock) o.lookWorld = p;
  Scene.parallax.tx = (cx / window.innerWidth - .5) * 2;
  Scene.parallax.ty = (cy / window.innerHeight - .5) * 2;
}

window.addEventListener('mousemove', e => onPoint(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (t) onPoint(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('touchstart', e => {
  const t = e.touches[0];
  if (t) onPoint(t.clientX, t.clientY);
}, { passive: true });

for (const o of allOwls) {
  o.g.addEventListener('click', e => {
    e.stopPropagation();
    if (storyActive) return;
    o.hop(22);
    o.say('Hoo!', 1200);
    Audio.hoot();
    S.hearts(o);
  });
}

Scene.pondG.addEventListener('click', e => {
  e.stopPropagation();
  const p = toSvg(e.clientX, e.clientY);
  S.splash(p.x, p.y, false);
});

stage.addEventListener('click', () => {
  if (storyActive) skipStory();
});

function toggleFull() {
  const el = document.documentElement;
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  if (isFull) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  } else {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      const r = req.call(el);
      if (r && r.catch) r.catch(() => {});
    }
  }
}

const btnSound = document.getElementById('btnSound');
function toggleSound() {
  Audio.on = !Audio.on;
  if (Audio.on) Audio.ensure();
  btnSound.textContent = 'Sound: ' + (Audio.on ? 'on' : 'off');
  if (Audio.on) Audio.hoot();
}
btnSound.addEventListener('click', toggleSound);
document.getElementById('btnFull').addEventListener('click', toggleFull);
stage.addEventListener('dblclick', toggleFull);

window.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '8') {
    playStory(Number(e.key) - 1);
  } else if (e.key === ' ') {
    e.preventDefault();
    skipStory();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFull();
  } else if (e.key === 'm' || e.key === 'M') {
    toggleSound();
  } else if (e.key === 'g' || e.key === 'G') {
    Scene.toggleDebug({ pos: POS, owls: allOwls });
  }
});

setInterval(() => {
  if (storyActive || Scene.isNight() || Scene.huddle > .3 || swingRide.active || Math.random() < .55) return;
  const o = allOwls[Math.floor(Math.random() * allOwls.length)];
  const act = Math.random();
  if (act < .35) {
    o.hop(o.baby ? 14 : 10);
  } else if (act < .55) {
    o.flapBase = 62;
    setTimeout(() => { if (!storyActive) o.flapBase = 15; }, 550);
  } else if (act < .7) {
    o.blinkPhase = 1;
  } else if (act < .85) {
    o.rotTarget = 8;
    setTimeout(() => { if (!storyActive) o.rotTarget = -8; }, 280);
    setTimeout(() => { if (!storyActive) o.rotTarget = 0; }, 560);
  } else {
    o.say(['Hoo', 'Hoo?', '…'][Math.floor(Math.random() * 3)], 1100);
    Audio.hoot();
  }
}, 4500);

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  Scene.update(dt, t);
  updateRest(dt, t);
  updateSwing(dt, t);
  for (const o of allOwls) o.update(dt, t);
  for (let i = fxItems.length - 1; i >= 0; i--) {
    const it = fxItems[i];
    let done = false;
    try {
      done = it.update(dt, t);
    } catch (err) {
      console.error(err);
      done = true;
    }
    if (done) {
      fxItems.splice(i, 1);
      try {
        if (it.onDone) it.onDone();
      } catch (err) {
        console.error(err);
      }
      if (it.kill) it.kill();
    }
  }
  requestAnimationFrame(frame);
}

wake();
requestAnimationFrame(frame);
nextTimer = setTimeout(tryStart, 3500);
