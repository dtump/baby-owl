const SKIP = Symbol('skip');

const POS = {
  olive: { x: 1120, y: 393 },
  pip: { x: 950, y: 419 },
  puff: { x: 800, y: 682 },
  land: { x: 1400, y: 513 },
  pondOlive: { x: 700, y: 703 },
  pondPuff: { x: 655, y: 708 },
  fishPoint: { x: 505, y: 786 },
  puffSplash: { x: 545, y: 782 },
  pipBath: Scene.pondShallow(310, .62),
  puffBath: Scene.pondShallow(370, .60),
  hedgehog: { x: 620, y: 884 },
  pipVisit: { x: 520, y: 874 },
  pebble: { x: 958, y: 858 },
  puffFind: { x: 905, y: 852 },
  puffGive: { x: 1005, y: 421 },
  skyOwl: { x: 430, y: 185 }
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
  },

  async slide(g, x, y, dur) {
    const m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)/);
    const fx = m ? +m[1] : x;
    const fy = m ? +m[2] : y;
    const t0 = performance.now();
    for (;;) {
      await S.wait(16);
      const p = clamp((performance.now() - t0) / dur, 0, 1);
      g.setAttribute('transform', `translate(${lerp(fx, x, easeIO(p))} ${lerp(fy, y, easeIO(p))})`);
      if (p >= 1) break;
    }
  },

  async berryToss(from, to, dur) {
    Audio.pop();
    const layer = document.getElementById('fx');
    const g = svgEl('g', {}, layer);
    svgEl('circle', { r: 9, fill: '#e4572e', stroke: '#c23e1d', 'stroke-width': 2.5 }, g);
    svgEl('circle', { cx: -3, cy: -3, r: 2.6, fill: '#ffb3a0', opacity: .9 }, g);
    svgEl('path', { d: 'M0,-9 Q6,-18 12,-16 Q6,-10 0,-9 Z', fill: '#5da65a' }, g);
    const c1 = { x: lerp(from.x, to.x, .3), y: Math.min(from.y, to.y) - 130 };
    const c2 = { x: lerp(from.x, to.x, .7), y: Math.min(from.y, to.y) - 90 };
    const t0 = performance.now();
    try {
      for (;;) {
        await S.wait(16);
        const p = clamp((performance.now() - t0) / dur, 0, 1);
        const pt = cubic(from, c1, c2, to, easeIO(p));
        const pt2 = cubic(from, c1, c2, to, easeIO(clamp(p + .02, 0, 1)));
        g.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${(pt2.x - pt.x) * 2})`);
        if (p >= 1) break;
      }
    } catch (err) {
      g.remove();
      throw err;
    }
    return g;
  },

  makePebble() {
    const g = svgEl('g', {}, document.getElementById('fx'));
    svgEl('circle', { r: 10, fill: '#9fb2c8', stroke: '#6e8296', 'stroke-width': 2.5 }, g);
    svgEl('circle', { cx: -3, cy: -3.5, r: 3, fill: '#e8f0f8', opacity: .9 }, g);
    return g;
  },

  holdPebble(owl, g) {
    owl.bob.appendChild(g);
    g.setAttribute('transform', 'translate(0 14) scale(.8)');
    owl.pebble = g;
  },

  unholdPebble(owl) {
    const g = owl.pebble;
    if (!g) return;
    owl.pebble = null;
    document.getElementById('fx').appendChild(g);
    g.setAttribute('transform', `translate(${owl.x - 4} ${owl.y - 40 * owl.scale})`);
  },

  async dropPebble(g, to, dur) {
    Audio.pop();
    const m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)/);
    const from = { x: m ? +m[1] : to.x, y: m ? +m[2] : to.y - 200 };
    const t0 = performance.now();
    try {
      for (;;) {
        await S.wait(16);
        const p = clamp((performance.now() - t0) / dur, 0, 1);
        g.setAttribute('transform', `translate(${lerp(from.x, to.x, p)} ${lerp(from.y, to.y, Math.pow(p, 1.6))})`);
        if (p >= 1) break;
      }
      const t1 = performance.now();
      for (;;) {
        await S.wait(16);
        const p = clamp((performance.now() - t1) / 220, 0, 1);
        g.setAttribute('transform', `translate(${to.x} ${to.y - Math.sin(p * Math.PI) * 12})`);
        if (p >= 1) break;
      }
      g.setAttribute('transform', `translate(${to.x} ${to.y})`);
    } catch (err) {
      g.remove();
      throw err;
    }
  },

  glint(x, y, s = 1) {
    const layer = document.getElementById('fx');
    const g = svgEl('g', { transform: `translate(${x} ${y}) scale(${s})` }, layer);
    svgEl('path', { d: 'M0,-12 L2.6,-2.6 L12,0 L2.6,2.6 L0,12 L-2.6,2.6 L-12,0 L-2.6,-2.6 Z', fill: '#fff6c8', stroke: '#e8c84a', 'stroke-width': 1.5, 'paint-order': 'stroke' }, g);
    const born = performance.now();
    pushFx({
      update: () => {
        const a = (performance.now() - born) / 700;
        if (a >= 1) return true;
        g.setAttribute('transform', `translate(${x} ${y}) scale(${s * (1 + .3 * Math.sin(a * Math.PI * 3))}) rotate(${a * 120})`);
        g.setAttribute('opacity', 1 - a);
        return false;
      },
      kill: () => g.remove()
    });
  },

  constellation(cx, cy, dur) {
    const layer = document.getElementById('fx');
    const g = svgEl('g', { transform: `translate(${cx} ${cy})`, opacity: 0 }, layer);
    const P = [[-34, -52], [34, -52], [-48, -28], [48, -28], [-20, -22], [20, -22], [0, -10], [-52, 6], [52, 6], [-62, 26], [62, 26], [0, 44], [-14, 54], [14, 54]];
    const segs = [[0, 2], [2, 4], [4, 6], [6, 5], [5, 3], [3, 1], [2, 7], [7, 9], [9, 11], [11, 10], [10, 8], [8, 3], [11, 12], [11, 13]];
    let d = '';
    for (const [a, b] of segs) d += `M${P[a][0]},${P[a][1]} L${P[b][0]},${P[b][1]}`;
    svgEl('path', { d, stroke: '#cfe4ff', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', opacity: .85 }, g);
    const stars = P.map(([x, y]) => svgEl('path', {
      d: 'M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z',
      transform: `translate(${x} ${y})`,
      fill: '#ffffff', stroke: '#33456b', 'stroke-width': 1.6, 'paint-order': 'stroke'
    }, g));
    const born = performance.now();
    let dieT = -1;
    pushFx({
      update: (dt, t) => {
        const age = (performance.now() - born) / 1000;
        if (S.ctrl && S.ctrl.skipped && dieT < 0) dieT = age;
        const fadeIn = clamp(age / .4, 0, 1);
        const fadeOut = dieT >= 0
          ? clamp(1 - (age - dieT) / .35, 0, 1)
          : clamp(1 - Math.max(0, age - (dur / 1000 - .8)) / .8, 0, 1);
        g.setAttribute('opacity', (fadeIn * fadeOut).toFixed(3));
        const reveal = age / (dur / 1000) * (P.length + 3);
        for (let i = 0; i < stars.length; i++) {
          const pop = clamp(reveal - i, 0, 1);
          const tw = .72 + .28 * Math.sin(t * 2.6 + i * 1.9);
          stars[i].setAttribute('transform', `translate(${P[i][0]} ${P[i][1]}) scale(${.4 + .6 * pop})`);
          stars[i].setAttribute('opacity', (pop * tw).toFixed(3));
        }
        return dieT >= 0 ? age - dieT > .35 : age > dur / 1000;
      },
      kill: () => g.remove()
    });
  },

  notes(owl, dur) {
    const layer = document.getElementById('fx');
    const born = performance.now();
    pushFx({
      update: (dt) => {
        const age = (performance.now() - born) / 1000;
        if (age < dur / 1000 && Math.random() < dt * 1.4) {
          const z = svgEl('text', {
            x: owl.x + rand(-16, 16),
            y: owl.y - 100 * owl.scale,
            'text-anchor': 'middle',
            'font-family': FONT,
            'font-size': rand(18, 26),
            'font-weight': 800,
            fill: '#e8a04c',
            stroke: '#ffffff',
            'stroke-width': 4,
            'paint-order': 'stroke'
          }, layer);
          z.textContent = '♪';
          const zb = performance.now();
          pushFx({
            update: () => {
              const a = (performance.now() - zb) / 1400;
              if (a >= 1) return true;
              z.setAttribute('y', owl.y - 100 * owl.scale - a * 50);
              z.setAttribute('x', owl.x + Math.sin(a * 3) * 12);
              z.setAttribute('opacity', 1 - a);
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

  nom(g, dur = 450) {
    const base = g.getAttribute('transform') || '';
    const born = performance.now();
    pushFx({
      update: () => {
        const p = clamp((performance.now() - born) / dur, 0, 1);
        g.setAttribute('transform', `${base} scale(${1 - p * .9})`);
        g.setAttribute('opacity', 1 - p);
        return p >= 1;
      },
      kill: () => g.remove()
    });
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
  },
  {
    name: 'Bath Time',
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      olive.lookLock = true;
      olive.lookWorld = POS.pipBath;
      await S.say(olive, 'Splash time!', 1400);
      await S.flyPath(pip, POS.pip, { x: 800, y: 560 }, { x: 420, y: 720 }, POS.pipBath, 1500);
      await S.flyPath(puff, POS.puff, { x: 700, y: 600 }, { x: 480, y: 740 }, POS.puffBath, 1300);
      olive.lookWorld = POS.puffBath;
      pip.hop(14);
      S.splash(POS.pipBath.x, pip.feetY());
      await S.say(pip, 'Whee!', 1100);
      await S.wait(300);
      puff.hop(16);
      S.splash(POS.puffBath.x, puff.feetY(), true);
      await S.say(puff, 'Again!', 1200);
      olive.lookWorld = POS.pipBath;
      await S.say(olive, 'Careful now!', 1400);
      await S.wait(250);
      pip.hop(14);
      S.splash(POS.pipBath.x, pip.feetY());
      puff.hop(14);
      S.splash(POS.puffBath.x, puff.feetY());
      await S.wait(600);
      await S.flyPath(pip, POS.pipBath, { x: 420, y: 700 }, { x: 780, y: 540 }, POS.pip, 1400);
      await S.flyPath(puff, POS.puffBath, { x: 500, y: 720 }, { x: 720, y: 580 }, POS.puff, 1300);
      olive.lookLock = false;
      olive.lookWorld = null;
      await S.wiggle(pip, 700);
      await S.wiggle(puff, 700);
      S.hearts(puff);
    }
  },
  {
    name: 'The New Friend',
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      const hg = Scene.hedgehog;
      Scene.hedgehogShow(-140, 884);
      for (const ow of [olive, pip, puff]) {
        ow.lookLock = true;
        ow.lookWorld = POS.hedgehog;
      }
      await S.slide(hg.g, POS.hedgehog.x, POS.hedgehog.y, 2600);
      await S.wait(400);
      await S.say(olive, 'Hello?', 1200);
      await S.flyPath(pip, POS.pip, { x: 760, y: 560 }, { x: 640, y: 720 }, POS.pipVisit, 1300);
      pip.lookWorld = { x: 648, y: 860 };
      await S.say(pip, 'Hi!', 1000);
      pip.hop(12);
      await S.wait(500);
      await S.say(pip, '…', 900);
      await S.say(puff, 'For you!', 1100);
      const berry = await S.berryToss({ x: POS.puff.x, y: POS.puff.y - 40 }, { x: 648, y: 872 }, 900);
      Scene.hedgehogPeek(false);
      S.glint(648, 872, .9);
      await S.wait(500);
      S.nom(berry);
      S.heart(640, 850, .8);
      await S.wait(400);
      await S.say(olive, 'Share nicely.', 1300);
      await S.slide(hg.g, POS.hedgehog.x, POS.hedgehog.y - 12, 180);
      await S.slide(hg.g, POS.hedgehog.x, POS.hedgehog.y, 220);
      pip.flap(9, 26);
      puff.flap(9, 26);
      await S.wait(700);
      pip.flap(0, 0);
      pip.flapBase = 15;
      puff.flap(0, 0);
      puff.flapBase = 15;
      await S.say(pip, 'Bye!', 900);
      await S.say(puff, 'Bye!', 900);
      Scene.hedgehogFlip(-1);
      await S.slide(hg.g, -160, 884, 2200);
      Scene.hedgehogHide();
      await S.flyPath(pip, POS.pipVisit, { x: 660, y: 700 }, { x: 800, y: 540 }, POS.pip, 1300);
      for (const ow of [olive, pip, puff]) {
        ow.lookLock = false;
        ow.lookWorld = null;
      }
      S.hearts(pip);
    }
  },
  {
    name: 'Lost & Found',
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      const pebble = S.makePebble();
      S.holdPebble(pip, pebble);
      pip.lookLock = true;
      pip.lookWorld = POS.pebble;
      olive.lookLock = true;
      olive.lookWorld = POS.pebble;
      await S.say(pip, '?', 1000);
      S.unholdPebble(pip);
      await S.dropPebble(pebble, POS.pebble, 1100);
      S.glint(POS.pebble.x, POS.pebble.y - 6, 1.1);
      await S.wait(400);
      await S.say(pip, 'Oh no…', 1200);
      await S.flyPath(puff, POS.puff, { x: 760, y: 590 }, { x: 860, y: 720 }, POS.puffFind, 1200);
      puff.lookLock = true;
      puff.lookWorld = POS.pebble;
      await S.bounce(puff, 2, 420);
      await S.wait(300);
      S.glint(POS.pebble.x, POS.pebble.y - 6, 1.2);
      await S.say(puff, '!', 900);
      S.holdPebble(puff, pebble);
      await S.flyPath(puff, POS.puffFind, { x: 880, y: 700 }, { x: 950, y: 560 }, POS.puffGive, 1200);
      S.unholdPebble(puff);
      S.holdPebble(pip, pebble);
      puff.lookWorld = POS.pip;
      S.heart(POS.pip.x + 10, POS.pip.y - 90, .8);
      await S.say(pip, '!', 900);
      S.hearts(pip);
      await S.say(olive, 'Good eyes, Puff!', 1400);
      S.nom(pebble, 500);
      pip.pebble = null;
      await S.flyPath(puff, POS.puffGive, { x: 950, y: 580 }, { x: 860, y: 650 }, POS.puff, 1200);
      olive.lookLock = false;
      olive.lookWorld = null;
      pip.lookLock = false;
      pip.lookWorld = null;
      puff.lookLock = false;
      puff.lookWorld = null;
    }
  },
  {
    name: 'Constellation Lesson',
    night: true,
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      const c = POS.skyOwl;
      for (const ow of [olive, pip, puff]) {
        ow.lookLock = true;
        ow.lookWorld = c;
      }
      await S.say(olive, 'Look up…', 1500);
      S.constellation(c.x, c.y, 6500);
      await S.wait(1200);
      await S.say(olive, 'See? An owl.', 1600);
      await S.wait(1800);
      pip.lookWorld = { x: c.x - 30, y: c.y - 40 };
      puff.lookWorld = { x: c.x + 30, y: c.y - 40 };
      await S.say(pip, 'Ooo!', 1000);
      await S.say(puff, 'Ooo!', 1000);
      await S.wait(1600);
      await S.say(olive, 'Hoo hoo.', 1300);
      for (const ow of [olive, pip, puff]) {
        ow.lookLock = false;
        ow.lookWorld = null;
      }
      S.heart(c.x, c.y - 80, .9);
    }
  },
  {
    name: 'Band Practice',
    run: async (S, o) => {
      const { olive, pip, puff } = o;
      Audio.hoot(.75);
      await S.say(olive, '♪', 950);
      Audio.hoot(1);
      await S.say(pip, '♪', 950);
      Audio.hoot(1.3);
      await S.say(puff, '♪', 950);
      S.notes(olive, 1600);
      S.notes(pip, 1600);
      S.notes(puff, 1600);
      Audio.hoot(.75);
      Audio.hoot(1);
      Audio.hoot(1.35);
      await Promise.all([
        S.say(olive, 'Hoo hoo!', 1500),
        S.say(pip, 'Hoo!', 1500),
        S.say(puff, 'Hoo!', 1500)
      ]);
      olive.flapBase = 62;
      pip.flapBase = 62;
      puff.flapBase = 62;
      await S.wait(500);
      olive.flapBase = 15;
      pip.flapBase = 15;
      puff.flapBase = 15;
      S.hearts(olive);
      S.hearts(pip);
      S.hearts(puff);
      await S.say(olive, 'Bravo!', 1200);
      await S.wiggle(pip, 600, 8);
    }
  }
];
