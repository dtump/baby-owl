const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const ramp01 = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a, b, t) => {
  const A = hexRGB(a), B = hexRGB(b);
  return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',') + ')';
};
const SKY = {
  day: ['#7ec8ff', '#bfe9ff', '#eafcff'],
  dusk: ['#ff9e6d', '#ffc9a0', '#ffe9d2'],
  night: ['#1b2447', '#2b3a6b', '#46548c'],
  dawn: ['#f2a2b8', '#ffc7b0', '#ffe4d6']
};
function skyPalette(dayT) {
  if (dayT < .42) return SKY.day;
  if (dayT < .55) return SKY.day.map((c, i) => mixHex(c, SKY.dusk[i], ramp01(dayT, .42, .55)));
  if (dayT < .70) return SKY.dusk.map((c, i) => mixHex(c, SKY.night[i], ramp01(dayT, .55, .70)));
  if (dayT < .88) return SKY.night;
  if (dayT < .94) return SKY.night.map((c, i) => mixHex(c, SKY.dawn[i], ramp01(dayT, .88, .94)));
  return SKY.dawn.map((c, i) => mixHex(c, SKY.day[i], ramp01(dayT, .94, 1)));
}

function svgEl(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function cubic(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y
  };
}

const Scene = {
  clouds: [], birds: [], ripples: [], tufts: [], flowers: [], reeds: [],
  butterflies: [], leaves: [], sparkles: [], fireflies: [], stars: [],
  parallax: { x: 0, y: 0 },
  leafTimer: 3,
  dayMs: 180000,
  dayT: .15,
  night: 0,
  weather: 'clear',
  weatherTimer: 90,
  rainFade: 0, snowFade: 0, rainbowFade: 0,
  rainRipTimer: 0,
  huddle: 0,
  seasonDays: 1,
  dayCount: 1,
  season: 1,
  blossomOp: 0,
  foliage: { main: [], light: [], berries: [] },

  // Single source of truth for world geometry. The pond is DRAWN from
  // `Scene.pond` (buildMid), story spots are derived from it (stories.js),
  // the smoke test reads it, and the G debug overlay draws it.
  pond: { cx: 400, cy: 795, rx: 285, ry: 80 },
  keepClear: [{ name: 'trunk', x0: 1150, y0: 640, x1: 1375, y1: 900 }],
  debug: false,

  pondEdgeY(x, near = true) {
    const k = clamp(1 - ((x - this.pond.cx) / this.pond.rx) ** 2, 0, 1);
    return this.pond.cy + (near ? 1 : -1) * this.pond.ry * Math.sqrt(k);
  },

  inPond(x, y) {
    const p = this.pond;
    return ((x - p.cx) / p.rx) ** 2 + ((y - p.cy) / p.ry) ** 2 <= 1;
  },

  // Anchor (body center) for an owl of `scale` standing in the shallows:
  // its feet land `inset` px inside the pond's near edge at x.
  pondShallow(x, scale, inset = 12) {
    return { x, y: this.pondEdgeY(x) - inset - OWL_FEET * scale };
  },

  build() {
    const bg = document.getElementById('bg');
    svgEl('rect', { x: 0, y: 0, width: 1600, height: 900, fill: 'url(#sky)' }, bg);

    const sun = svgEl('g', { transform: 'translate(215 155)' }, bg);
    this.sunRays = svgEl('g', {}, sun);
    for (let i = 0; i < 12; i++)
      svgEl('line', { x1: 0, y1: -92, x2: 0, y2: -124, stroke: '#ffd34d', 'stroke-width': 11, 'stroke-linecap': 'round', opacity: .75, transform: `rotate(${i * 30})` }, this.sunRays);
    svgEl('circle', { r: 72, fill: 'url(#sunG)' }, sun);
    svgEl('circle', { r: 72, fill: 'none', stroke: '#ffca3a', 'stroke-width': 5, opacity: .5 }, sun);
    this.sun = sun;

    const moon = svgEl('g', { transform: 'translate(1380 150)', opacity: 0 }, bg);
    svgEl('circle', { r: 54, fill: '#fdf6d8', opacity: .25 }, moon);
    svgEl('circle', { r: 38, fill: '#f7efd0' }, moon);
    svgEl('circle', { cx: -10, cy: -8, r: 7, fill: '#e8dfb8', opacity: .6 }, moon);
    svgEl('circle', { cx: 12, cy: 10, r: 5, fill: '#e8dfb8', opacity: .5 }, moon);
    this.moon = moon;

    this.starsG = svgEl('g', { opacity: 0 }, bg);
    for (let i = 0; i < 36; i++) {
      const g = svgEl('circle', { cx: rand(30, 1570), cy: rand(15, 380), r: rand(1, 2.2), fill: '#ffffff' }, this.starsG);
      this.stars.push({ g, ph: rand(0, 6) });
    }

    this.cloudsG = svgEl('g', {}, bg);
    for (const c of [
      { x: 320, y: 130, s: 1.15, sp: 16 },
      { x: 880, y: 85, s: .85, sp: 11 },
      { x: 1330, y: 200, s: 1, sp: 20 },
      { x: 620, y: 245, s: .65, sp: 9 }
    ]) this.clouds.push(this.makeCloud(c));

    this.birdsG = svgEl('g', {}, bg);
    for (const b of [{ x: 700, y: 140, sp: 22 }, { x: 790, y: 178, sp: 15 }]) {
      const g = svgEl('g', { transform: `translate(${b.x} ${b.y})` }, this.birdsG);
      svgEl('path', { d: 'M0,0 Q7,-8 14,0 Q21,-8 28,0', fill: 'none', stroke: '#5b7a99', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
      this.birds.push({ g, x: b.x, y: b.y, sp: b.sp, ph: rand(0, 6) });
    }

    this.hillsG = svgEl('g', {}, bg);
    this.hillEls = [
      svgEl('path', { d: 'M-30,560 C250,470 450,520 700,500 C950,480 1150,540 1400,500 C1500,485 1560,495 1630,490 L1630,900 L-30,900 Z', fill: '#a9dd7f' }, this.hillsG),
      svgEl('path', { d: 'M-30,620 C200,560 420,600 650,585 C900,568 1100,620 1350,590 C1450,578 1540,585 1630,580 L1630,900 L-30,900 Z', fill: '#8ccf63' }, this.hillsG)
    ];

    this.rainbowG = svgEl('g', { opacity: 0 }, bg);
    for (const [r, c] of [[335, '#ff8a80'], [317, '#ffcc80'], [299, '#fff59d'], [281, '#a5d6a7']])
      svgEl('path', { d: `M${800 - r},655 A${r},${r} 0 0 1 ${800 + r},655`, fill: 'none', stroke: c, 'stroke-width': 15, 'stroke-linecap': 'round', opacity: .8 }, this.rainbowG);

    const grassD = 'M0,662 C300,632 600,657 900,647 C1200,637 1400,657 1600,647 L1600,900 L0,900 Z';
    svgEl('path', { d: grassD, fill: 'url(#grass)' }, bg);
    this.snowGround = svgEl('path', { d: grassD, fill: '#ffffff', opacity: 0 }, bg);

    this.skyStops = [...document.querySelectorAll('#sky stop')];
    this.grassStops = [...document.querySelectorAll('#grass stop')];
    this.tint = document.getElementById('tint');
    this.debugG = document.getElementById('debug');

    this.buildMid();
    this.buildFg();
    this.buildCritters();
    this.buildWeather();
  },

  buildWeather() {
    const fx = document.getElementById('fx');
    this.rainLayer = svgEl('g', { opacity: 0 }, fx);
    this.rainDrops = [];
    for (let i = 0; i < 90; i++) {
      const g = svgEl('line', { x1: 0, y1: 0, x2: -7, y2: 24, stroke: '#cfe6f5', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: .55 }, this.rainLayer);
      this.rainDrops.push({ g, x: rand(-100, 1700), y: rand(-900, 0), sp: rand(520, 760) });
    }
    this.snowLayer = svgEl('g', { opacity: 0 }, fx);
    this.snowFlakes = [];
    for (let i = 0; i < 70; i++) {
      const g = svgEl('circle', { r: rand(2, 4.2), fill: '#ffffff', opacity: .85 }, this.snowLayer);
      this.snowFlakes.push({ g, bx: rand(0, 1600), y: rand(-900, 0), sp: rand(55, 120), ph: rand(0, 6) });
    }
    const leaf = svgEl('g', { transform: 'translate(1060 272)', opacity: 0 }, fx);
    svgEl('line', { x1: 0, y1: -40, x2: 0, y2: 0, stroke: '#6e4423', 'stroke-width': 4, 'stroke-linecap': 'round' }, leaf);
    svgEl('path', { d: 'M0,0 C-36,12 -42,58 0,88 C42,58 36,12 0,0 Z', fill: '#5da65a', stroke: '#3f7d3f', 'stroke-width': 3 }, leaf);
    svgEl('path', { d: 'M0,8 L0,80 M0,26 L-16,38 M0,26 L16,38 M0,48 L-13,58 M0,48 L13,58', stroke: '#3f7d3f', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', opacity: .7 }, leaf);
    this.leafG = leaf;
    this.rainRipples = [];
    this.weatherTimer = rand(60, 120);
  },

  makeCloud(c) {
    const g = svgEl('g', { transform: `translate(${c.x} ${c.y}) scale(${c.s})` }, this.cloudsG);
    svgEl('ellipse', { cx: 0, cy: 24, rx: 98, ry: 18, fill: '#e3f4ff' }, g);
    const puff = (x, y, r) => svgEl('circle', { cx: x, cy: y, r, fill: '#ffffff' }, g);
    puff(-58, 10, 32); puff(0, -10, 44); puff(60, 10, 34); puff(-28, 20, 27); puff(32, 20, 27);
    return { g, x: c.x, y: c.y, s: c.s, sp: c.sp, w: 300 * c.s };
  },

  buildMid() {
    const mid = document.getElementById('mid');
    const P = this.pond;

    const pond = svgEl('g', { transform: `translate(${P.cx} ${P.cy})` }, mid);
    this.pondG = pond;
    svgEl('ellipse', { rx: P.rx, ry: P.ry, fill: 'url(#pond)' }, pond);
    svgEl('ellipse', { rx: P.rx, ry: P.ry, fill: 'none', stroke: '#2b8fb0', 'stroke-width': 4, opacity: .3 }, pond);
    svgEl('ellipse', { cx: -70, cy: -22, rx: 130, ry: 26, fill: '#d9f6ff', opacity: .45 }, pond);
    for (let i = 0; i < 3; i++) {
      const r = svgEl('ellipse', { rx: 40, ry: 12, fill: 'none', stroke: '#eafcff', 'stroke-width': 3, opacity: 0 }, pond);
      this.ripples.push({ el: r, t: i / 3, x: [-40, -140, 100][i], y: [4, 20, 28][i] });
    }
    const pad = (x, y, rx) => {
      const g = svgEl('g', { transform: `translate(${x} ${y})` }, pond);
      svgEl('ellipse', { rx, ry: rx * .42, fill: '#3f9d4e' }, g);
      svgEl('path', { d: `M${rx * .2},0 L${rx},${-rx * .1} L${rx},${rx * .18} Z`, fill: '#4fb6d4' }, g);
      svgEl('path', { d: `M${-rx * .8},0 L0,0 M${-rx * .4},${-rx * .3} L0,0 M${-rx * .4},${rx * .3} L0,0`, stroke: '#2f7d3c', 'stroke-width': 2, fill: 'none', opacity: .6 }, g);
      return g;
    };
    pad(150, 20, 46);
    pad(-170, 34, 36);
    const pad3 = pad(40, 44, 30);
    const fl = svgEl('g', { transform: 'translate(40 30)' }, pond);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      svgEl('circle', { cx: Math.cos(a) * 7, cy: Math.sin(a) * 7 - 6, r: 5, fill: '#ffb7d5' }, fl);
    }
    svgEl('circle', { cx: 0, cy: -6, r: 4, fill: '#ffe066' }, fl);
    this.reedsG = svgEl('g', {}, pond);
    for (const r of [[-260, -35], [-292, -8], [-228, -55]]) {
      const g = svgEl('g', { transform: `translate(${r[0]} ${r[1]})` }, this.reedsG);
      svgEl('path', { d: `M0,28 C-4,8 -4,-8 0,-26`, stroke: '#3f8f4f', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, g);
      svgEl('ellipse', { cx: 0, cy: -34, rx: 6, ry: 16, fill: '#8a5a33' }, g);
      svgEl('path', { d: 'M0,10 C-14,4 -20,-6 -22,-16', stroke: '#3f8f4f', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
      this.reeds.push({ g, x: r[0], y: r[1], ph: rand(0, 6) });
    }

    const tree = svgEl('g', {}, mid);
    this.treeG = tree;
    svgEl('path', { d: 'M1180,900 C1170,760 1160,640 1175,520 C1180,470 1200,430 1230,405 L1310,405 C1335,440 1345,480 1350,530 C1362,650 1355,770 1345,900 Z', fill: 'url(#trunk)' }, tree);
    svgEl('path', { d: 'M1186,700 C1200,640 1205,560 1200,500 M1330,720 C1322,660 1320,580 1326,520', stroke: '#5f3d22', 'stroke-width': 5, fill: 'none', opacity: .3, 'stroke-linecap': 'round' }, tree);
    svgEl('path', { d: 'M1195,470 C1100,455 980,455 880,470 L880,492 C980,478 1100,478 1198,492 Z', fill: 'url(#trunk)' }, tree);
    svgEl('path', { d: 'M1300,560 C1345,552 1385,552 1415,560 L1415,578 C1385,570 1345,570 1302,578 Z', fill: 'url(#trunk)' }, tree);
    svgEl('ellipse', { cx: 1190, cy: 882, rx: 62, ry: 22, fill: '#6e4423' }, tree);
    svgEl('ellipse', { cx: 1332, cy: 886, rx: 56, ry: 20, fill: '#6e4423' }, tree);

    const bh = svgEl('g', { transform: 'translate(1362 470)' }, tree);
    svgEl('line', { x1: 0, y1: -38, x2: 0, y2: -14, stroke: '#5f3d22', 'stroke-width': 4 }, bh);
    svgEl('rect', { x: -23, y: -14, width: 46, height: 40, rx: 4, fill: '#b5793f', stroke: '#8a5a33', 'stroke-width': 3 }, bh);
    svgEl('path', { d: 'M-29,-12 L0,-34 L29,-12 Z', fill: '#8a5a33' }, bh);
    svgEl('circle', { cy: 2, r: 7.5, fill: '#4a2f1a' }, bh);
    svgEl('line', { x1: 0, y1: 9, x2: 0, y2: 17, stroke: '#5f3d22', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, bh);

    const canopy = svgEl('g', {}, tree);
    this.canopyG = canopy;
    this.foliage = { main: [], light: [], berries: [] };
    const blob = (x, y, r, f) => {
      const c = svgEl('circle', { cx: x, cy: y, r, fill: f }, canopy);
      this.foliage.main.push({ el: c, base: f });
    };
    blob(1265, 295, 155, '#4fae5f');
    blob(1115, 350, 100, '#58b96a');
    blob(1410, 345, 105, '#58b96a');
    blob(1175, 235, 95, '#63c273');
    blob(1355, 230, 90, '#63c273');
    blob(1265, 195, 85, '#6fc97e');
    for (const [cx, cy, r, op] of [[1210, 250, 40, .55], [1330, 290, 34, .45], [1150, 320, 26, .45]]) {
      const c = svgEl('circle', { cx, cy, r, fill: '#8ad694', opacity: op }, canopy);
      this.foliage.light.push({ el: c, base: '#8ad694' });
    }
    for (const a of [[1180, 300], [1330, 330], [1265, 240]]) {
      const c = svgEl('circle', { cx: a[0], cy: a[1], r: 9, fill: '#ff5d5d' }, canopy);
      this.foliage.berries.push({ el: c, base: '#ff5d5d' });
      svgEl('path', { d: `M${a[0] + 2},${a[1] - 9} q8,-8 14,-4`, stroke: '#2f7d3c', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, canopy);
    }
    this.blossomG = svgEl('g', { opacity: 0 }, canopy);
    for (let i = 0; i < 16; i++)
      svgEl('circle', { cx: rand(1100, 1430), cy: rand(160, 360), r: rand(4, 7), fill: Math.random() > .5 ? '#ffd1e8' : '#ffb7d5' }, this.blossomG);
  },

  buildFg() {
    const fg = document.getElementById('fg');
    this.fgG = fg;

    const tuft = (x, y, s, c) => {
      const g = svgEl('g', { transform: `translate(${x} ${y}) scale(${s})` }, fg);
      svgEl('path', { d: 'M0,0 L-8,-24 L-3,-6 L0,-30 L4,-7 L9,-22 L12,0 Z', fill: c || '#4ea24b' }, g);
      this.tufts.push({ g, x, y, s, ph: rand(0, 6) });
    };
    for (const t of [[30, 865, 1.3], [180, 692, 1], [720, 722, 1.2], [905, 882, 1.5], [1085, 842, 1.1], [1145, 708, 1], [1425, 882, 1.4], [1560, 762, 1.1], [345, 692, .9], [640, 888, 1.2], [520, 690, .9], [1430, 692, 1]]) {
      tuft(t[0], t[1], t[2], t[2] > 1.2 ? '#63b95c' : '#4ea24b');
    }

    const flower = (x, y, petal) => {
      const g = svgEl('g', { transform: `translate(${x} ${y})` }, fg);
      svgEl('path', { d: 'M0,0 C-2,-10 2,-18 0,-28', stroke: '#3f8f4f', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU - Math.PI / 2;
        svgEl('circle', { cx: Math.cos(a) * 8, cy: -34 + Math.sin(a) * 8, r: 7, fill: petal }, g);
      }
      svgEl('circle', { cx: 0, cy: -34, r: 6, fill: '#ffb347' }, g);
      this.flowers.push({ g, x, y, ph: rand(0, 6) });
    };
    flower(90, 705, '#ffffff'); flower(45, 795, '#ffd1e8'); flower(720, 850, '#ffe066');
    flower(985, 695, '#ffd1e8'); flower(1125, 772, '#ffffff'); flower(1440, 822, '#ffe066');
    flower(1475, 732, '#ffffff'); flower(880, 855, '#ffd1e8'); flower(1545, 825, '#ffe066');
    flower(700, 865, '#ffffff');

    const mushroom = (x, y, s) => {
      const g = svgEl('g', { transform: `translate(${x} ${y}) scale(${s})` }, fg);
      svgEl('rect', { x: -15, y: -38, width: 30, height: 40, rx: 9, fill: '#ffe8c8', stroke: '#e8cfa4', 'stroke-width': 2 }, g);
      svgEl('path', { d: 'M-58,-34 C-58,-72 58,-72 58,-34 Z', fill: '#e4572e', stroke: '#c23e1d', 'stroke-width': 3 }, g);
      svgEl('circle', { cx: -28, cy: -50, r: 7, fill: '#fff', opacity: .9 }, g);
      svgEl('circle', { cx: 8, cy: -58, r: 8, fill: '#fff', opacity: .9 }, g);
      svgEl('circle', { cx: 34, cy: -44, r: 6, fill: '#fff', opacity: .9 }, g);
      return g;
    };
    this.mushrooms = [mushroom(800, 780, 1), mushroom(1100, 888, .55), mushroom(185, 868, .5)];

    const log = this.logG = svgEl('g', { transform: 'translate(1050 818) rotate(-5)' }, fg);
    svgEl('rect', { x: -75, y: -18, width: 150, height: 36, rx: 18, fill: '#8a5a33', stroke: '#6e4423', 'stroke-width': 3 }, log);
    svgEl('ellipse', { cx: -72, cy: 0, rx: 11, ry: 16, fill: '#d9b98a', stroke: '#b5906a', 'stroke-width': 2 }, log);
    svgEl('ellipse', { cx: -72, cy: 0, rx: 5, ry: 8, fill: 'none', stroke: '#b5906a', 'stroke-width': 2 }, log);
    svgEl('path', { d: 'M-40,-14 C-20,-6 20,-6 45,-13 M-45,10 C-15,16 25,15 48,8', stroke: '#6e4423', 'stroke-width': 3, fill: 'none', opacity: .5, 'stroke-linecap': 'round' }, log);

    svgEl('ellipse', { cx: 880, cy: 795, rx: 26, ry: 12, fill: '#b8c0c8' }, fg);
    svgEl('ellipse', { cx: 1395, cy: 775, rx: 20, ry: 9, fill: '#a8b2ba' }, fg);
    svgEl('ellipse', { cx: 1470, cy: 850, rx: 24, ry: 11, fill: '#b8c0c8' }, fg);
  },

  buildCritters() {
    const crit = document.getElementById('critters');
    this.crittersG = crit;
    for (const b of [{ x: 350, y: 300, rx: 150, ry: 70, sp: .55, c: '#ff8fab' }, { x: 1000, y: 150, rx: 130, ry: 60, sp: .45, c: '#ffd166' }]) {
      this.butterflies.push(this.makeButterfly(b));
    }
    for (let i = 0; i < 9; i++) {
      const g = svgEl('circle', { cx: rand(60, 1540), cy: rand(120, 700), r: rand(1.8, 3), fill: '#ffffff', opacity: .55 }, crit);
      this.sparkles.push({ g, x: 0, y: 0, vy: rand(-14, -5), ph: rand(0, 6), baseX: 0, baseY: 0 });
      const s = this.sparkles[this.sparkles.length - 1];
      s.baseX = parseFloat(g.getAttribute('cx'));
      s.baseY = parseFloat(g.getAttribute('cy'));
    }
    for (let i = 0; i < 9; i++) {
      const g = svgEl('g', { opacity: 0 }, crit);
      svgEl('circle', { r: 7, fill: '#eaff9e', opacity: .22 }, g);
      svgEl('circle', { r: 2.6, fill: '#f4ffb0' }, g);
      this.fireflies.push({ g, bx: rand(80, 1520), by: rand(470, 820), rx: rand(50, 130), ry: rand(25, 60), sp: rand(.25, .6), ph: rand(0, 6), x: 0, y: 0 });
    }

    const hg = svgEl('g', { transform: 'translate(-140 884)', opacity: 0 }, crit);
    const flip = svgEl('g', {}, hg);
    const hgb = svgEl('g', {}, flip);
    svgEl('ellipse', { cx: -18, cy: 27, rx: 9, ry: 5.5, fill: '#8a5a3a' }, hgb);
    svgEl('ellipse', { cx: 14, cy: 27, rx: 9, ry: 5.5, fill: '#8a5a3a' }, hgb);
    svgEl('path', { d: 'M-46,-4 L-38,-24 L-30,-7 L-20,-28 L-10,-9 L0,-30 L10,-9 L20,-28 L30,-7 L38,-24 L46,-4', fill: 'none', stroke: '#7a4a2e', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, hgb);
    svgEl('ellipse', { rx: 46, ry: 30, fill: '#a5714b', stroke: '#7a4a2e', 'stroke-width': 3 }, hgb);
    svgEl('ellipse', { cx: 30, cy: 4, rx: 22, ry: 17, fill: '#e8c39a' }, hgb);
    const hgE1 = svgEl('circle', { cx: 24, cy: -2, r: 3.2, fill: '#2d1a0e' }, hgb);
    const hgE2 = svgEl('circle', { cx: 38, cy: -4, r: 3.2, fill: '#2d1a0e' }, hgb);
    svgEl('circle', { cx: 48, cy: 1, r: 5, fill: '#4a2c17' }, hgb);
    this.hedgehog = { g: hg, flip, body: hgb, eyes: [hgE1, hgE2], shy: true };
    this.hedgehogDraw();
  },

  hedgehogDraw() {
    const h = this.hedgehog;
    h.body.setAttribute('transform', `translate(0 28) scale(1 ${h.shy ? .85 : 1}) translate(0 -28)`);
    for (const e of h.eyes) e.setAttribute('opacity', h.shy ? 0 : 1);
  },

  hedgehogPeek(shy) {
    this.hedgehog.shy = shy;
    this.hedgehogDraw();
  },

  hedgehogShow(x, y) {
    const h = this.hedgehog;
    h.g.setAttribute('transform', `translate(${x} ${y})`);
    h.g.setAttribute('opacity', 1);
  },

  hedgehogHide() {
    this.hedgehog.g.setAttribute('opacity', 0);
  },

  hedgehogFlip(dir) {
    this.hedgehog.flip.setAttribute('transform', dir < 0 ? 'scale(-1 1)' : '');
  },

  hedgehogReset() {
    this.hedgehog.g.setAttribute('opacity', 0);
    this.hedgehog.g.setAttribute('transform', 'translate(-140 884)');
    this.hedgehogFlip(1);
    this.hedgehogPeek(true);
  },

  // --- debug overlay (G key): draws the geometry the smoke test enforces ---
  toggleDebug(refs) {
    this.debug = !this.debug;
    if (this.debug) {
      if (refs) this.debugRefs = refs;
      this.drawDebug();
    } else {
      this.debugG.textContent = '';
      this.debugOwlMarkers = [];
    }
  },

  drawDebug() {
    const g = this.debugG;
    g.textContent = '';
    this.debugOwlMarkers = [];
    const P = this.pond;
    const cross = (x, y, c, r = 7) => svgEl('path', {
      d: `M${x - r},${y - r} L${x + r},${y + r} M${x - r},${y + r} L${x + r},${y - r}`,
      stroke: c, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none'
    }, g);
    const label = (x, y, txt, c = '#ffffff') => {
      const t = svgEl('text', { x, y, 'font-size': 15, 'font-family': 'sans-serif', 'font-weight': 700, fill: c, stroke: '#1c3a2a', 'stroke-width': 3, 'paint-order': 'stroke' }, g);
      t.textContent = txt;
      return t;
    };
    svgEl('ellipse', { cx: P.cx, cy: P.cy, rx: P.rx, ry: P.ry, fill: 'none', stroke: '#ff5d5d', 'stroke-width': 2.5, 'stroke-dasharray': '10 8' }, g);
    cross(P.cx, P.cy, '#ff5d5d');
    label(P.cx + 10, P.cy - 10, 'pond', '#ffb3b3');
    for (const z of this.keepClear) {
      svgEl('rect', { x: z.x0, y: z.y0, width: z.x1 - z.x0, height: z.y1 - z.y0, fill: 'none', stroke: '#ff5d5d', 'stroke-width': 2, 'stroke-dasharray': '4 6', opacity: .8 }, g);
      label(z.x0 + 8, z.y0 + 20, z.name, '#ffb3b3');
    }
    const pos = (this.debugRefs && this.debugRefs.pos) || {};
    for (const k in pos) {
      cross(pos[k].x, pos[k].y, '#ffd166');
      label(pos[k].x + 9, pos[k].y - 9, k, '#ffe6a3');
    }
    for (const o of (this.debugRefs && this.debugRefs.owls) || []) {
      const ay = o.y - o.hopY;
      const a = cross(0, 0, '#7ec8ff');
      a.setAttribute('data-owl', o.name);
      a.setAttribute('transform', `translate(${o.x} ${ay})`);
      const f = svgEl('circle', { r: 5, fill: '#7ec8ff', 'data-owl-feet': o.name, transform: `translate(${o.x} ${o.feetY()})` }, g);
      const t = label(10, -10, o.name, '#bde3ff');
      t.setAttribute('data-owl-label', o.name);
      t.setAttribute('transform', `translate(${o.x} ${ay})`);
      this.debugOwlMarkers.push({ o, a, f, t });
    }
  },

  updateDebug() {
    for (const m of this.debugOwlMarkers || []) {
      const ay = m.o.y - m.o.hopY;
      m.a.setAttribute('transform', `translate(${m.o.x} ${ay})`);
      m.f.setAttribute('transform', `translate(${m.o.x} ${m.o.feetY()})`);
      m.t.setAttribute('transform', `translate(${m.o.x} ${ay})`);
    }
  },

  makeButterfly(b) {
    const g = svgEl('g', {}, this.crittersG);
    const wl = svgEl('g', {}, g);
    const wr = svgEl('g', {}, g);
    svgEl('ellipse', { cx: -8, cy: -3, rx: 8, ry: 13, fill: b.c, opacity: .92 }, wl);
    svgEl('ellipse', { cx: 8, cy: -3, rx: 8, ry: 13, fill: b.c, opacity: .92 }, wr);
    svgEl('ellipse', { cx: -6, cy: 8, rx: 5, ry: 8, fill: b.c, opacity: .75 }, wl);
    svgEl('ellipse', { cx: 6, cy: 8, rx: 5, ry: 8, fill: b.c, opacity: .75 }, wr);
    svgEl('line', { x1: 0, y1: -9, x2: 0, y2: 9, stroke: '#5b4a3a', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
    svgEl('path', { d: 'M-2,-9 L-7,-15 M2,-9 L7,-15', stroke: '#5b4a3a', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, g);
    return {
      g, wl, wr, cx: b.x, cy: b.y, rx: b.rx, ry: b.ry, sp: b.sp, ph: rand(0, 6),
      landed: false, landX: 0, landY: 0, x: b.x, y: b.y
    };
  },

  landButterfly(bf, x, y) {
    bf.landed = true;
    bf.landX = x;
    bf.landY = y;
  },

  releaseButterfly(bf) {
    if (bf.landed) {
      bf.landed = false;
      bf.releasing = true;
      bf.releaseT = 0;
      bf.rx0 = bf.landX;
      bf.ry0 = bf.landY;
    }
  },

  spawnLeaf(kind = 'autumn') {
    const bx = rand(1130, 1390), by = rand(250, 340);
    const g = svgEl('g', { transform: `translate(${bx} ${by})` }, this.crittersG);
    const K = {
      autumn: { fill: ['#e8a13d', '#d97f2e', '#c96a2a'][Math.floor(rand(0, 3))], vy: [45, 75], grav: 30, rx: 10, ry: 4.5 },
      spring: { fill: Math.random() > .5 ? '#ffb7d5' : '#ffd1e8', vy: [22, 40], grav: 12, rx: 7, ry: 5 },
      summer: { fill: '#7cb95c', vy: [40, 60], grav: 25, rx: 9, ry: 4 }
    }[kind];
    svgEl('ellipse', { rx: K.rx, ry: K.ry, fill: K.fill }, g);
    svgEl('line', { x1: -K.rx * .8, y1: 0, x2: K.rx * .8, y2: 0, stroke: '#b3641f', 'stroke-width': 1.5, opacity: .6 }, g);
    this.leaves.push({ g, bx, by, x: 0, y: 0, vx: rand(-30, 30), vy: rand(K.vy[0], K.vy[1]), grav: K.grav, rot: rand(0, 360), vr: rand(-160, 160), ph: rand(0, 6) });
  },

  isNight() {
    return this.dayT >= .56 && this.dayT < .86;
  },

  updateSky(t) {
    const pal = skyPalette(this.dayT);
    for (let i = 0; i < 3; i++) this.skyStops[i].setAttribute('stop-color', pal[i]);
    const sunT = clamp(((this.dayT - .88 + 1) % 1) / .67, 0, 1);
    const sunA = Math.sin(sunT * Math.PI);
    this.sun.setAttribute('transform', `translate(${lerp(120, 1480, sunT).toFixed(1)} ${(215 - sunA * 150).toFixed(1)})`);
    this.sun.setAttribute('opacity', (sunA * (1 - this.night * .85)).toFixed(3));
    const mp = clamp((this.dayT - .55) / .33, 0, 1);
    this.moon.setAttribute('transform', `translate(${lerp(1380, 220, mp).toFixed(1)} ${(150 - Math.sin(mp * Math.PI) * 85).toFixed(1)})`);
    this.moon.setAttribute('opacity', this.night.toFixed(3));
    this.starsG.setAttribute('opacity', this.night.toFixed(3));
    for (const s of this.stars) s.g.setAttribute('opacity', (.35 + .65 * Math.abs(Math.sin(t * 1.7 + s.ph))).toFixed(2));
    for (const f of this.fireflies) {
      f.x = f.bx + Math.sin(t * f.sp + f.ph) * f.rx;
      f.y = f.by + Math.sin(t * f.sp * 1.4 + f.ph * 2) * f.ry;
      f.g.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`);
      f.g.setAttribute('opacity', (this.night * (.25 + .75 * Math.abs(Math.sin(t * 2.4 + f.ph)))).toFixed(2));
    }
    const duskWarm = ramp01(this.dayT, .40, .52) * (1 - ramp01(this.dayT, .55, .65));
    this.tint.setAttribute('fill', mixHex('#ffb46d', '#141d3d', this.night));
    this.tint.setAttribute('opacity', (duskWarm * .14 + this.night * .45).toFixed(3));
  },

  nextWeather() {
    if (this.weather === 'clear') {
      this.weather = this.season === 3 ? 'snow' : 'rain';
      this.weatherTimer = rand(25, 40);
    } else if (this.weather === 'rain') {
      this.weather = 'rainbow';
      this.weatherTimer = rand(16, 22);
    } else {
      this.weather = 'clear';
      this.weatherTimer = rand(90, 150);
    }
  },

  updateWeather(dt, t) {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) this.nextWeather();
    this.rainFade += ((this.weather === 'rain' ? 1 : 0) - this.rainFade) * (1 - Math.exp(-dt * 2.5));
    this.snowFade += ((this.weather === 'snow' ? 1 : 0) - this.snowFade) * (1 - Math.exp(-dt * 2.5));
    this.rainbowFade += ((this.weather === 'rainbow' ? 1 : 0) - this.rainbowFade) * (1 - Math.exp(-dt * 1.2));
    this.rainLayer.setAttribute('opacity', this.rainFade.toFixed(3));
    this.snowLayer.setAttribute('opacity', this.snowFade.toFixed(3));
    this.rainbowG.setAttribute('opacity', this.rainbowFade.toFixed(3));
    if (this.rainFade > .02) {
      for (const d of this.rainDrops) {
        d.y += d.sp * dt;
        d.x -= 70 * dt;
        if (d.y > 920) {
          d.y = -30;
          d.x = rand(-100, 1700);
        }
        d.g.setAttribute('transform', `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`);
      }
      this.rainRipTimer -= dt;
      if (this.rainRipTimer <= 0) {
        this.rainRipTimer = rand(.3, .6);
        if (this.rainRipples.length < 12) {
          const el = svgEl('ellipse', { rx: 26, ry: 8, fill: 'none', stroke: '#eafcff', 'stroke-width': 3, opacity: 0 }, this.pondG);
          this.rainRipples.push({ el, x: rand(-240, 240), y: rand(-30, 50), t: 0 });
        }
      }
    }
    for (let i = this.rainRipples.length - 1; i >= 0; i--) {
      const r = this.rainRipples[i];
      r.t += dt / .9;
      if (r.t >= 1) {
        r.el.remove();
        this.rainRipples.splice(i, 1);
        continue;
      }
      r.el.setAttribute('transform', `translate(${r.x} ${r.y}) scale(${(.4 + r.t * 2.2).toFixed(2)})`);
      r.el.setAttribute('opacity', (.6 * (1 - r.t)).toFixed(2));
    }
    if (this.snowFade > .02) {
      for (const f of this.snowFlakes) {
        f.y += f.sp * dt;
        if (f.y > 920) {
          f.y = -20;
          f.bx = rand(0, 1600);
        }
        f.g.setAttribute('transform', `translate(${(f.bx + Math.sin(t * 1.1 + f.ph) * 34).toFixed(1)} ${f.y.toFixed(1)})`);
      }
    }
  },

  updateSeason(dt) {
    const F = [
      { tint: '#9fe08a', mix: .5, hill: ['#c9ec9a', .35], grass: ['#a5e06a', .3], blossom: 1, canopy: 1, snow: 0 },
      { tint: '#4fae5f', mix: 0, hill: ['#c9ec9a', 0], grass: ['#a5e06a', 0], blossom: 0, canopy: 1, snow: 0 },
      { tint: '#e08a2e', mix: .85, hill: ['#e8c25a', .5], grass: ['#d9a83f', .45], blossom: 0, canopy: 1, snow: 0 },
      { tint: '#8a7a5f', mix: .9, hill: ['#cfd8dc', .55], grass: ['#aebfc4', .5], blossom: 0, canopy: .3, snow: .35 }
    ][this.season];
    for (const c of this.foliage.main) c.el.setAttribute('fill', mixHex(c.base, F.tint, F.mix));
    for (const c of this.foliage.light) c.el.setAttribute('fill', mixHex(c.base, F.tint, F.mix * .8));
    const berryMix = this.season === 0 ? .95 : this.season === 2 ? .4 : 0;
    const berryTint = this.season === 0 ? '#ff9ec7' : '#d94f2e';
    for (const c of this.foliage.berries) {
      c.el.setAttribute('fill', mixHex(c.base, berryTint, berryMix));
      c.el.setAttribute('opacity', this.season === 3 ? 0 : 1);
    }
    this.canopyG.setAttribute('opacity', F.canopy);
    this.blossomOp += (F.blossom - this.blossomOp) * (1 - Math.exp(-dt * 1.5));
    this.blossomG.setAttribute('opacity', this.blossomOp.toFixed(3));
    this.hillEls[0].setAttribute('fill', mixHex('#a9dd7f', F.hill[0], F.hill[1]));
    this.hillEls[1].setAttribute('fill', mixHex('#8ccf63', F.hill[0], F.hill[1]));
    this.grassStops[0].setAttribute('stop-color', mixHex('#7ed957', F.grass[0], F.grass[1]));
    this.grassStops[1].setAttribute('stop-color', mixHex('#3fa34d', F.grass[0], F.grass[1]));
    this.snowGround.setAttribute('opacity', F.snow);
  },

  update(dt, t) {
    const k = 1 - Math.exp(-dt * 4);
    const prev = this.dayT;
    this.dayT = (this.dayT + dt * 1000 / this.dayMs) % 1;
    if (this.dayT < prev) this.dayCount++;
    this.season = Math.floor(this.dayCount / this.seasonDays) % 4;
    this.night = ramp01(this.dayT, .48, .60) * (1 - ramp01(this.dayT, .82, .94));
    this.updateSky(t);
    this.updateWeather(dt, t);
    this.updateSeason(dt);
    this.parallax.x += ((this.parallax.tx || 0) - this.parallax.x) * k;
    this.parallax.y += ((this.parallax.ty || 0) - this.parallax.y) * k;
    this.cloudsG.setAttribute('transform', `translate(${this.parallax.x * 16} ${this.parallax.y * 7})`);
    this.hillsG.setAttribute('transform', `translate(${this.parallax.x * 7} ${this.parallax.y * 3})`);
    this.sunRays.setAttribute('transform', `rotate(${t * 5})`);

    for (const c of this.clouds) {
      c.x += c.sp * dt;
      if (c.x - c.w > 1650) c.x = -c.w;
      c.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.s})`);
    }
    for (const b of this.birds) {
      b.x += b.sp * dt;
      if (b.x > 1700) b.x = -60;
      b.y += Math.sin(t + b.ph) * 6 * dt;
      b.g.setAttribute('transform', `translate(${b.x} ${b.y})`);
    }
    for (const r of this.ripples) {
      r.t = (r.t + dt / 2.4) % 1;
      const s = .4 + r.t * 2.4;
      r.el.setAttribute('transform', `translate(${r.x} ${r.y}) scale(${s})`);
      r.el.setAttribute('opacity', .65 * (1 - r.t));
    }
    for (const r of this.reeds) {
      r.g.setAttribute('transform', `translate(${r.x} ${r.y}) skewX(${Math.sin(t * 1.6 + r.ph) * 4})`);
    }
    for (const tf of this.tufts) {
      tf.g.setAttribute('transform', `translate(${tf.x} ${tf.y}) skewX(${Math.sin(t * 1.4 + tf.ph) * 5}) scale(${tf.s})`);
    }
    for (const f of this.flowers) {
      f.g.setAttribute('transform', `translate(${f.x} ${f.y + Math.sin(t * 1.8 + f.ph) * 2.5})`);
    }
    for (const bf of this.butterflies) {
      const pathX = bf.cx + Math.sin(t * bf.sp + bf.ph) * bf.rx;
      const pathY = bf.cy + Math.sin(t * bf.sp * 1.4 + bf.ph * 2) * bf.ry;
      let flap = 18 + Math.sin(t * 16 + bf.ph) * 22;
      if (bf.landed) {
        bf.x += (bf.landX - bf.x) * k * 2;
        bf.y += (bf.landY - bf.y) * k * 2;
        flap = 62;
      } else if (bf.releasing) {
        bf.releaseT += dt;
        const q = Math.min(bf.releaseT / .6, 1);
        bf.x = lerp(bf.rx0, pathX, q);
        bf.y = lerp(bf.ry0, pathY, q);
        flap = lerp(62, flap, q);
        if (q >= 1) bf.releasing = false;
      } else {
        bf.x = pathX;
        bf.y = pathY;
      }
      bf.g.setAttribute('transform', `translate(${bf.x} ${bf.y})`);
      bf.g.setAttribute('opacity', (1 - this.night).toFixed(2));
      bf.wl.setAttribute('transform', `rotate(${flap})`);
      bf.wr.setAttribute('transform', `rotate(${-flap})`);
    }
    this.leafTimer -= dt;
    if (this.leafTimer <= 0) {
      if (this.season === 3) this.leafTimer = rand(9, 15);
      else if (this.season === 0) {
        this.leafTimer = rand(2, 4);
        this.spawnLeaf('spring');
      } else if (this.season === 1) {
        this.leafTimer = rand(7, 11);
        this.spawnLeaf('summer');
      } else {
        this.leafTimer = rand(1.6, 3.2);
        this.spawnLeaf('autumn');
      }
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.vy += l.grav * dt;
      l.y += l.vy * dt;
      l.x += (l.vx + Math.sin(t * 2 + l.ph) * 26) * dt;
      l.rot = (l.rot + l.vr * dt) % 360;
      if (l.y > 890) {
        l.g.remove();
        this.leaves.splice(i, 1);
        continue;
      }
      l.g.setAttribute('transform', `translate(${l.bx + l.x} ${l.by + l.y}) rotate(${l.rot})`);
    }
    for (const s of this.sparkles) {
      s.y += s.vy * dt;
      if (s.y < -180) {
        s.y = 0;
        s.baseX = rand(60, 1540);
        s.baseY = rand(480, 820);
      }
      s.g.setAttribute('cx', s.baseX + Math.sin(t * .8 + s.ph) * 26);
      s.g.setAttribute('cy', s.baseY + s.y);
      s.g.setAttribute('opacity', ((1 - this.night) * .55).toFixed(2));
    }
    if (this.debug) this.updateDebug();
  }
};
