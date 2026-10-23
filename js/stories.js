const SKIP = Symbol('skip');

const POS = {
  olive: { x: 1120, y: 393 },
  pip: { x: 950, y: 419 },
  puff: { x: 800, y: 682 },
  land: { x: 1400, y: 513 },
  pondOlive: { x: 700, y: 703 },
  pondPuff: { x: 655, y: 708 },
  fishPoint: { x: 505, y: 786 },
  puffSplash: { x: 545, y: 782 }
};

const FONT = "'Trebuchet MS','Segoe UI',sans-serif";

const S = {
  ctrl: null,

  wait(ms) {
    const c = this.ctrl;
    return new Promise((res, rej) => {
      const t0 = performance.now();
      const iv = setInterval(() => {
        if (c.skipped) {
          clearInterval(iv);
          rej(SKIP);
        } else if (performance.now() - t0 >= ms) {
          clearInterval(iv);
          res();
        }
      }, 25);
    });
  },

  async say(owl, text, dur = 1300) {
    owl.say(text, dur);
    await S.wait(dur);
  },

  async bounce(owl, n = 3, perMs = 480) {
    for (let i = 0; i < n; i++) {
      owl.hop(16);
      await S.wait(perMs);
    }
  },

  async wiggle(owl, dur = 700, amp = 10) {
    owl.lockRot = true;
    const t0 = performance.now();
    for (;;) {
      await S.wait(16);
      const p = clamp((performance.now() - t0) / dur, 0, 1);
      owl.rot = Math.sin(p * Math.PI * 2) * amp * (1 - p * .5);
      if (p >= 1) break;
    }
    owl.rot = 0;
    owl.lockRot = false;
  },

  async setLid(owl, v, dur = 600) {
    const from = owl.lid;
    const t0 = performance.now();
    for (;;) {
      await S.wait(16);
      const p = clamp((performance.now() - t0) / dur, 0, 1);
      owl.lid = lerp(from, v, easeIO(p));
      if (p >= 1) break;
    }
    owl.lid = v;
  },

  async yawn(owl, dur = 800) {
    owl.beakOpen = 1;
    await S.wait(dur);
    owl.beakOpen = 0;
  },

  async flyPath(owl, from, c1, c2, to, dur) {
    Audio.wing();
    owl.lockRot = true;
    owl.flying = true;
    owl.flap(15, 38);
    owl.bobAmp = 5;
    const t0 = performance.now();
    for (;;) {
      await S.wait(16);
      const p = clamp((performance.now() - t0) / dur, 0, 1);
      const pt = cubic(from, c1, c2, to, easeIO(p));
      const pt2 = cubic(from, c1, c2, to, easeIO(clamp(p + .02, 0, 1)));
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
  },

  splash(x, y, big = false) {
    Audio.splash();
    const layer = document.getElementById('fx');
    const rip = svgEl('ellipse', { rx: 26, ry: 8, fill: 'none', stroke: '#eafcff', 'stroke-width': 3.5 }, layer);
    const drops = [];
    const n = big ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const c = svgEl('circle', { r: rand(2.5, 4.5), fill: '#bfeaff' }, layer);
      drops.push({ g: c, x: 0, y: 0, vx: rand(-110, 110) * (big ? 1.3 : 1), vy: rand(-190, -70), life: rand(.6, .95), t: 0 });
    }
    const born = performance.now();
    pushFx({
      update: (dt) => {
        const age = (performance.now() - born) / 1000;
        const p = clamp(age / .8, 0, 1);
        rip.setAttribute('transform', `translate(${x} ${y}) scale(${.4 + p * 2.6})`);
        rip.setAttribute('opacity', .8 * (1 - p));
        for (const d of drops) {
          d.t += dt;
          d.vy += 620 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.g.setAttribute('cx', x + d.x);
          d.g.setAttribute('cy', y + d.y);
          d.g.setAttribute('opacity', clamp(1 - d.t / d.life, 0, 1));
        }
        return age > .95;
      },
      kill: () => {
        rip.remove();
        for (const d of drops) d.g.remove();
      }
    });
  },

  async fishArc(from, to, dur) {
    Audio.splash();
    const layer = document.getElementById('fx');
    const g = svgEl('g', {}, layer);
    svgEl('path', { d: 'M-18,0 L-34,-11 L-34,11 Z', fill: '#ff9f68', stroke: '#e08b3e', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
    svgEl('ellipse', { rx: 20, ry: 10.5, fill: '#ffb26b', stroke: '#e08b3e', 'stroke-width': 2.5 }, g);
    svgEl('circle', { cx: 10, cy: -2.5, r: 2.6, fill: '#333333' }, g);
    svgEl('path', { d: 'M-2,-9 q6,-6 12,-2', stroke: '#e08b3e', 'stroke-width': 2, fill: 'none' }, g);
    const c1 = { x: lerp(from.x, to.x, .3), y: Math.min(from.y, to.y) - 150 };
    const c2 = { x: lerp(from.x, to.x, .7), y: Math.min(from.y, to.y) - 120 };
    const t0 = performance.now();
    try {
      for (;;) {
        await S.wait(16);
        const p = clamp((performance.now() - t0) / dur, 0, 1);
        const pt = cubic(from, c1, c2, to, easeIO(p));
        const pt2 = cubic(from, c1, c2, to, easeIO(clamp(p + .02, 0, 1)));
        g.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${clamp((pt2.y - pt.y) * 30, -40, 40) + Math.sin(p * 10) * 8})`);
        if (p >= 1) break;
      }
    } catch (err) {
      g.remove();
      throw err;
    }
    return g;
  },

  holdFish(owl, fish) {
    owl.bob.appendChild(fish);
    fish.setAttribute('transform', 'translate(0 12) scale(.85)');
    owl.fish = fish;
  },

  eatFish(owl, dur = 450) {
    const fish = owl.fish;
    if (!fish) return;
    owl.fish = null;
    const born = performance.now();
    pushFx({
      update: () => {
        const p = clamp((performance.now() - born) / dur, 0, 1);
        fish.setAttribute('transform', `translate(0 12) scale(${1 - p * .95})`);
        fish.setAttribute('opacity', 1 - p);
        return p >= 1;
      },
      kill: () => fish.remove()
    });
  },

  zzz(owl, dur) {
    const layer = document.getElementById('fx');
    const born = performance.now();
    pushFx({
      update: (dt) => {
        const age = (performance.now() - born) / 1000;
        if (owl.lid > .3 && age < dur / 1000 && Math.random() < dt * 1.6) {
          const z = svgEl('text', {
            x: owl.x + rand(-14, 14),
            y: owl.y - 100 * owl.scale,
            'text-anchor': 'middle',
            'font-family': FONT,
            'font-size': rand(20, 30),
            'font-weight': 800,
            fill: '#8fb3d9',
            stroke: '#ffffff',
            'stroke-width': 4,
            'paint-order': 'stroke'
          }, layer);
          z.textContent = 'z';
          const zb = performance.now();
          pushFx({
            update: () => {
              const a = (performance.now() - zb) / 1600;
              if (a >= 1) return true;
              z.setAttribute('y', owl.y - 100 * owl.scale - a * 55);
              z.setAttribute('x', owl.x + Math.sin(a * 4) * 10);
              z.setAttribute('opacity', 1 - a);
              z.setAttribute('font-size', 20 + a * 12);
              return false;
            },
            kill: () => z.remove()
          });
        }
        return age >= dur / 1000;
      },
      kill: () => {}
    });
  },

  heart(x, y, s = 1) {
    const layer = document.getElementById('fx');
    const g = svgEl('g', { transform: `translate(${x} ${y}) scale(${s})` }, layer);
    svgEl('path', { d: 'M0,4 C0,-2 -10,-4 -10,3 C-10,9 0,14 0,18 C0,14 10,9 10,3 C10,-4 0,-2 0,4 Z', fill: '#ff6b8a' }, g);
    const born = performance.now();
    pushFx({
      update: () => {
        const a = (performance.now() - born) / 1200;
        if (a >= 1) return true;
        g.setAttribute('transform', `translate(${x} ${y - a * 46}) scale(${s})`);
        g.setAttribute('opacity', 1 - a);
        return false;
      },
      kill: () => g.remove()
    });
  },

  hearts(owl) {
    S.heart(owl.x - 16, owl.y - 90 * owl.scale, .8);
    setTimeout(() => S.heart(owl.x + 18, owl.y - 100 * owl.scale, .6), 180);
  }
};

const stories = [
  {
    name: 'First Flight',
    run: async (S, o) => {
      const { olive, pip } = o;
      pip.lookLock = true;
      pip.lookWorld = POS.olive;
      await S.wait(500);
      pip.lookWorld = null;
      pip.lookLock = false;
      await S.say(pip, '?', 1100);
      await S.bounce(pip, 3);
      pip.flap(9, 26);
      await S.wait(800);
      pip.flap(0, 0);
      pip.flapBase = 15;
      olive.lookLock = true;
      olive.lookWorld = { x: 1180, y: 360 };
      await S.flyPath(pip, POS.pip, { x: 1000, y: 280 }, { x: 1300, y: 300 }, POS.land, 1700);
      olive.lookWorld = POS.land;
      pip.hop(10);
      await S.wait(400);
      await S.say(olive, 'Hoo hoo!', 1500);
      await S.say(pip, '!', 900);
      olive.lookWorld = POS.pip;
      await S.flyPath(pip, POS.land, { x: 1300, y: 300 }, { x: 1000, y: 280 }, POS.pip, 1500);
      olive.lookLock = false;
      olive.lookWorld = null;
      pip.hop(10);
      await S.wiggle(pip, 700);
      S.heart(pip.x + 10, pip.y - 80 * pip.scale);
    }
  },
  {
    name: 'Fishing Lesson',
    run: async (S, o) => {
      const { olive, puff } = o;
      puff.lookLock = true;
      puff.lookWorld = POS.fishPoint;
      await S.wait(400);
      puff.lookLock = false;
      await S.say(puff, '?', 1000);
      await S.flyPath(olive, POS.olive, { x: 1000, y: 560 }, { x: 830, y: 650 }, POS.pondOlive, 1500);
      olive.lookLock = true;
      olive.lookWorld = POS.fishPoint;
      olive.squash = .93;
      await S.wait(1100);
      olive.squash = 1;
      S.splash(POS.fishPoint.x, POS.fishPoint.y);
      await S.wait(550);
      const fish = await S.fishArc(POS.fishPoint, { x: POS.pondOlive.x, y: POS.pondOlive.y - 6 }, 750);
      S.holdFish(olive, fish);
      await S.flyPath(olive, POS.pondOlive, { x: 830, y: 650 }, { x: 1020, y: 540 }, POS.olive, 1400);
      olive.lookLock = false;
      olive.lookWorld = null;
      await S.say(olive, 'Yum!', 1100);
      S.eatFish(olive);
      await S.wait(800);
      await S.flyPath(puff, POS.puff, { x: 770, y: 590 }, { x: 710, y: 640 }, POS.pondPuff, 1100);
      puff.lookLock = true;
      puff.lookWorld = POS.puffSplash;
      puff.squash = .93;
      await S.wait(1100);
      puff.squash = 1;
      S.splash(POS.puffSplash.x, POS.puffSplash.y, true);
      await S.wait(700);
      puff.lookLock = false;
      puff.lookWorld = null;
      await S.say(puff, '...', 1000);
      await S.flyPath(puff, POS.pondPuff, { x: 710, y: 640 }, { x: 770, y: 590 }, POS.puff, 1100);
      await S.wiggle(puff, 800, 7);
      await S.say(olive, 'Next time!', 1300);
      S.hearts(puff);
    }
  },
  {
    name: 'Nap Time',
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      await S.yawn(olive, 900);
      await S.say(olive, 'Ahh…', 1100);
      await S.yawn(pip, 700);
      await S.yawn(puff, 700);
      await S.setLid(pip, 1, 900);
      await S.setLid(puff, 1, 900);
      await S.setLid(olive, .45, 900);
      olive.bobAmp = 4;
      pip.bobAmp = 4;
      puff.bobAmp = 4;
      S.zzz(olive, 4200);
      S.zzz(pip, 4200);
      S.zzz(puff, 4200);
      Scene.landButterfly(Scene.butterflies[0], olive.x, olive.y - 96 * olive.scale);
      await S.wait(4600);
      Scene.releaseButterfly(Scene.butterflies[0]);
      await S.setLid(pip, 0, 500);
      await S.setLid(puff, 0, 500);
      await S.setLid(olive, 0, 500);
      olive.bobAmp = 2.5;
      pip.bobAmp = 2.5;
      puff.bobAmp = 2.5;
      olive.blinkPhase = 1;
      olive.flapBase = 68;
      await S.wait(500);
      olive.flapBase = 15;
      await S.say(olive, 'Sweet dreams', 1400);
      await S.wiggle(pip, 600, 8);
      await S.wiggle(puff, 600, 8);
    }
  }
];
