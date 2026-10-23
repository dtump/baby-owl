const OWL_BODY_RX = 58;
const OWL_BODY_RY = 66;

class Owl {
  constructor(parent, opts) {
    this.name = opts.name;
    this.scale = opts.scale;
    this.x = opts.x;
    this.y = opts.y;
    this.home = { x: opts.x, y: opts.y };
    this.rot = 0;
    this.rotTarget = 0;
    this.lockRot = false;
    this.lid = 0;
    this.beakOpen = 0;
    this.flying = false;
    this.flapSpeed = 0;
    this.flapAmp = 0;
    this.flapBase = 15;
    this.wingL = 15;
    this.wingR = 15;
    this.bobAmp = 2.5;
    this.look = { x: 0, y: 0 };
    this.lookWorld = null;
    this.blinkTimer = rand(2, 5);
    this.blinkPhase = 0;
    this.zzzTimer = rand(2.5, 5);
    this.hopTime = 0;
    this.hopDur = 0;
    this.hopH = 0;
    this.squash = 1;
    this.shadowOp = .14;
    this.pal = opts.pal;
    this.baby = !!opts.baby;
    this.build(parent);
  }

  build(parent) {
    const p = this.pal;
    const g = svgEl('g', {}, parent);
    this.g = g;

    this.shadow = svgEl('ellipse', { cx: 0, cy: 74, rx: 52, ry: 9, fill: '#1c3a2a', opacity: .14 }, g);

    const bob = svgEl('g', {}, g);
    this.bob = bob;

    const feet = svgEl('g', { class: 'feet' }, bob);
    for (const fx of [-20, 20]) {
      svgEl('path', { d: `M${fx - 8},60 L${fx - 14},74 M${fx},61 L${fx},75 M${fx + 8},60 L${fx + 14},74`, stroke: '#f59b42', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, feet);
    }
    this.feet = feet;

    const tuftD = this.baby
      ? 'M-40,-50 L-54,-82 L-16,-62 Z M40,-50 L54,-82 L16,-62 Z'
      : 'M-46,-46 L-64,-94 L-18,-64 Z M46,-46 L64,-94 L18,-64 Z';
    svgEl('path', { d: tuftD, fill: p.wing }, bob);

    svgEl('ellipse', { cx: 0, cy: 0, rx: OWL_BODY_RX, ry: OWL_BODY_RY, fill: `url(#${p.grad})`, stroke: p.stroke, 'stroke-width': 3, 'stroke-opacity': .3 }, bob);
    svgEl('ellipse', { cx: 0, cy: 24, rx: 36, ry: 40, fill: 'url(#bellyG)' }, bob);
    svgEl('path', {
      d: 'M-28,8 q7,9 14,0 q7,9 14,0 q7,9 14,0 q7,9 14,0 M-24,26 q7,9 14,0 q7,9 14,0 q7,9 14,0 M-16,44 q6,8 12,0 q6,8 12,0 q6,8 12,0',
      stroke: '#e6c795', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', opacity: .8
    }, bob);

    const wingPath = 'M-48,-14 C-88,-6 -106,36 -84,66 C-72,82 -50,78 -46,58 C-42,38 -44,4 -48,-14 Z';
    const wingL = svgEl('g', {}, bob);
    this.wingRotL = svgEl('g', {}, wingL);
    svgEl('path', { d: wingPath, fill: p.wing, stroke: p.stroke, 'stroke-width': 2.5, 'stroke-opacity': .3 }, this.wingRotL);
    const wingR = svgEl('g', { transform: 'scale(-1 1)' }, bob);
    this.wingRotR = svgEl('g', {}, wingR);
    svgEl('path', { d: wingPath, fill: p.wing, stroke: p.stroke, 'stroke-width': 2.5, 'stroke-opacity': .3 }, this.wingRotR);

    if (this.baby) {
      svgEl('path', { d: 'M-12,-60 Q-11,-76 -2,-70 Q2,-80 8,-71 Q17,-75 14,-60 Z', fill: '#ffffff', opacity: .55 }, bob);
    }

    const faceG = svgEl('g', {}, bob);
    for (const cx of [-25, 25]) {
      svgEl('circle', { cx, cy: -24, r: 31, fill: p.face, stroke: p.stroke, 'stroke-width': 2.5, 'stroke-opacity': .35 }, faceG);
    }
    svgEl('path', { d: 'M-6,-42 Q0,-49 6,-42', stroke: p.stroke, 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round', opacity: .35 }, faceG);

    this.eyeL = svgEl('g', {}, bob);
    this.eyeR = svgEl('g', {}, bob);
    for (const [eye, cx] of [[this.eyeL, -25], [this.eyeR, 25]]) {
      svgEl('circle', { cx, cy: -24, r: 24, fill: '#fffdf5', stroke: p.stroke, 'stroke-width': 2, 'stroke-opacity': .3 }, eye);
      svgEl('circle', { cx, cy: -24, r: 15.5, fill: 'url(#irisG)', stroke: '#d9932a', 'stroke-width': 1.5 }, eye);
      const pupil = svgEl('g', {}, eye);
      svgEl('circle', { cx, cy: -24, r: 9, fill: '#2e2013' }, pupil);
      svgEl('circle', { cx: cx - 3, cy: -27, r: 3.2, fill: '#ffffff' }, pupil);
      if (cx < 0) this.pupilL = pupil; else this.pupilR = pupil;
    }

    this.beakG = svgEl('g', {}, bob);
    svgEl('path', { d: 'M-9,-10 Q0,-14 9,-10 L2,8 Q0,11 -2,8 Z', fill: '#ff9f43', stroke: '#e07b2a', 'stroke-width': 2, 'stroke-linejoin': 'round' }, this.beakG);

    svgEl('ellipse', { cx: -40, cy: 4, rx: 9, ry: 5.5, fill: '#ff9d9d', opacity: .4 }, bob);
    svgEl('ellipse', { cx: 40, cy: 4, rx: 9, ry: 5.5, fill: '#ff9d9d', opacity: .4 }, bob);
  }

  hop(h = 18) {
    this.hopTime = 0;
    this.hopDur = .5;
    this.hopH = h;
  }

  flap(speed, amp) {
    this.flapSpeed = speed;
    this.flapAmp = amp;
  }

  say(text, dur = 1400) {
    Audio.pop();
    const layer = document.getElementById('fx');
    const bx = this.x;
    const by = this.y - 118 * this.scale;
    const w = Math.max(64, text.length * 15 + 36);
    const g = svgEl('g', { transform: `translate(${bx} ${by})` }, layer);
    svgEl('path', { d: 'M-9,20 L0,36 L11,20 Z', fill: '#fffdf5', stroke: '#e8d9b8', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, g);
    svgEl('rect', { x: -w / 2, y: -23, width: w, height: 46, rx: 23, fill: '#fffdf5', stroke: '#e8d9b8', 'stroke-width': 2.5 }, g);
    const tx = svgEl('text', { x: 0, y: 9, 'text-anchor': 'middle', 'font-family': "'Trebuchet MS','Segoe UI',sans-serif", 'font-size': 25, 'font-weight': 800, fill: '#6b4a2a' }, g);
    tx.textContent = text;
    const born = performance.now();
    pushFx({
      g,
      update: (dt, t) => {
        const age = (performance.now() - born) / 1000;
        const s = 1 + .14 * Math.sin(Math.min(age / .25, 1) * Math.PI);
        const fade = age > (dur - 300) / 1000 ? clamp((dur / 1000 - age) / .3, 0, 1) : 1;
        g.setAttribute('transform', `translate(${bx} ${by}) scale(${s})`);
        g.setAttribute('opacity', fade);
        return age > dur / 1000;
      },
      kill: () => g.remove()
    });
  }

  update(dt, t) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && this.blinkPhase === 0) {
      this.blinkPhase = 1;
      this.blinkTimer = rand(2.5, 6);
    }
    let blinkS = 1;
    if (this.blinkPhase === 1) {
      this.blinkPhase += dt / .09;
      if (this.blinkPhase >= 1) this.blinkPhase = 2;
      blinkS = lerp(1, .08, Math.min(this.blinkPhase, 1));
    } else if (this.blinkPhase === 2) {
      this.blinkPhase += dt / .09;
      if (this.blinkPhase >= 2) this.blinkPhase = 0;
      else blinkS = lerp(.08, 1, this.blinkPhase - 1);
    }

    if (this.lookWorld) {
      const hx = this.x;
      const hy = this.y - 24 * this.scale;
      const dx = this.lookWorld.x - hx;
      const dy = this.lookWorld.y - hy;
      const dist = Math.hypot(dx, dy) || 1;
      const m = Math.min(6.5, dist / 30);
      const tx = dx / dist * m;
      const ty = dy / dist * m;
      const k = 1 - Math.exp(-dt * 9);
      this.look.x += (tx - this.look.x) * k;
      this.look.y += (ty - this.look.y) * k;
      if (!this.lockRot && !this.flying && !this.lookLock) {
        this.rotTarget = clamp(dx / 90, -7, 7) * (this.lid > .5 ? .3 : 1);
      }
    }

    if (!this.lockRot) {
      const k = 1 - Math.exp(-dt * 6);
      this.rot += (this.rotTarget - this.rot) * k;
    }

    let wingTarget = this.flapBase;
    if (this.flapSpeed > 0) wingTarget = this.flapBase + Math.sin(t * this.flapSpeed) * this.flapAmp;
    const wk = 1 - Math.exp(-dt * (this.flapSpeed > 0 ? 40 : 5));
    this.wingL += (wingTarget - this.wingL) * wk;
    this.wingR += (wingTarget - this.wingR) * wk;

    if (this.hopDur > 0) {
      this.hopTime += dt;
      const pr = this.hopTime / this.hopDur;
      if (pr >= 1) {
        this.hopDur = 0;
        this.hopY = 0;
      } else {
        this.hopY = Math.sin(pr * Math.PI) * this.hopH;
      }
    }

    this.g.setAttribute('transform', `translate(${this.x} ${this.y - this.hopY}) rotate(${this.rot}) scale(${this.scale})`);
    this.shadow.setAttribute('transform', `translate(0 ${this.hopY / this.scale})`);
    const shadowTarget = this.flying ? 0 : .14;
    this.shadowOp += (shadowTarget - this.shadowOp) * (1 - Math.exp(-dt * 8));
    this.shadow.setAttribute('opacity', this.shadowOp);
    this.bob.setAttribute('transform', `translate(0 ${Math.sin(t * 2.2) * this.bobAmp}) translate(0 70) scale(1 ${this.squash}) translate(0 -70)`);
    this.wingRotL.setAttribute('transform', `rotate(${this.wingL} -48 -8)`);
    this.wingRotR.setAttribute('transform', `rotate(${this.wingR} -48 -8)`);

    const eyeS = blinkS * (1 - this.lid * .8);
    const drop = this.lid * 10;
    this.eyeL.setAttribute('transform', `translate(0 ${drop}) translate(-25 -24) scale(1 ${eyeS}) translate(25 24)`);
    this.eyeR.setAttribute('transform', `translate(0 ${drop}) translate(25 -24) scale(1 ${eyeS}) translate(-25 24)`);
    this.pupilL.setAttribute('transform', `translate(${this.look.x} ${this.look.y})`);
    this.pupilR.setAttribute('transform', `translate(${this.look.x} ${this.look.y})`);
    this.beakG.setAttribute('transform', `translate(0 -11) scale(1 ${1 + this.beakOpen * .75}) translate(0 11)`);
    this.feet.style.opacity = this.flying ? 0 : 1;
  }

  reset() {
    this.x = this.home.x;
    this.y = this.home.y;
    this.rot = 0;
    this.rotTarget = 0;
    this.lockRot = false;
    this.lookLock = false;
    this.lookWorld = null;
    this.lid = 0;
    this.beakOpen = 0;
    this.flying = false;
    this.flapSpeed = 0;
    this.flapAmp = 0;
    this.flapBase = 15;
    this.bobAmp = 2.5;
    this.hopDur = 0;
    this.hopY = 0;
    this.squash = 1;
    this.shadowOp = .14;
    this.look = { x: 0, y: 0 };
    this.blinkPhase = 0;
    this.blinkTimer = rand(2, 5);
    this.zzzTimer = rand(2.5, 5);
    if (this.fish) {
      this.fish.remove();
      this.fish = null;
    }
  }
}
