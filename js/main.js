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
  hoot() {
    this.tone(330, 170, .28, 'sine', .09);
    setTimeout(() => this.tone(280, 140, .32, 'sine', .07), 150);
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
let storyActive = false;
let storyToken = 0;
let nextTimer = null;

function resetPoses() {
  for (const o of allOwls) o.reset();
  Scene.releaseButterfly(Scene.butterflies[0]);
}

async function runStory(i) {
  skipStory();
  const token = ++storyToken;
  resetPoses();
  storyActive = true;
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

function scheduleNext() {
  clearTimeout(nextTimer);
  nextTimer = setTimeout(() => runStory(storyIdx++ % stories.length), rand(12000, 18000));
}

function skipStory() {
  if (storyActive && S.ctrl) S.ctrl.skipped = true;
}

function playStory(i) {
  skipStory();
  clearTimeout(nextTimer);
  runStory(i);
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
  if (e.key === '1' || e.key === '2' || e.key === '3') {
    playStory(Number(e.key) - 1);
  } else if (e.key === ' ') {
    e.preventDefault();
    skipStory();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFull();
  } else if (e.key === 'm' || e.key === 'M') {
    toggleSound();
  }
});

setInterval(() => {
  if (storyActive || Math.random() < .55) return;
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
nextTimer = setTimeout(() => runStory(0), 3500);
