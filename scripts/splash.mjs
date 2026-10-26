/* Renderer splasha (styl poszarpany): SVG + WAAPI. Zero zależności od Foundry poza przeglądarką. */
import { FS, LBL, hueOf, hsl, inkAccent, oddsText, oddsLabel } from './logic.mjs';

const NS = 'http://www.w3.org/2000/svg';
const BASE = 'translate(-50%,-50%)';
let gid = 0;
let reduce = false;
export function setReduced(v) { reduce = !!v; }
export function isReduced() { return reduce; }

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/* ---------- geometria kształtów (ramka 0..100) ---------- */
function rn(a, b, i, sd) { return a + (b - a) * (Math.sin(i * 12.9898 + sd * 78.233) * 0.5 + 0.5); }
function star(sp, inr) {
  const o = [], n = sp * 2;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2, r = i % 2 ? inr : 50; o.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
  return o;
}
function burstA(sp, inr, sd) {
  const o = [], n = sp * 2;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 === 0) ? 50 * (0.93 + 0.07 * Math.sin(i * 7.1 + sd)) : inr + (Math.sin(i * 12.9898 + sd) * 0.5 + 0.5) * 6;
    o.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
  }
  return o;
}
function shardA(P, sd) {
  const n = 7 + Math.round(5 * P), o = [], st = Math.PI * 2 / (n * 2);
  for (let i = 0; i < n * 2; i++) {
    const a = i * st - Math.PI / 2 + rn(-0.4, 0.4, i, sd) * st * 1.3;
    const r = i % 2 === 0 ? rn(40, 50, i, sd + 1) : rn(26, 40, i, sd + 2);
    o.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.96]);
  }
  return o;
}
function boltA(P, sd) {
  const m = 6 + Math.round(4 * P), o = [[0, 50]];
  let i;
  for (i = 0; i <= m; i++) o.push([6 + 88 * i / m, (i % 2 ? 24 : 3) + rn(-2, 2, i, sd)]);
  o.push([100, 50]);
  for (i = m; i >= 0; i--) o.push([6 + 88 * i / m, (i % 2 ? 97 : 77) + rn(-2, 2, i + 9, sd)]);
  return o;
}
function cloudA(P, sd) {
  const k = 9 + Math.round(4 * P), o = [], N = 120;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = 0.86 + 0.14 * Math.abs(Math.sin(k * a / 2 + sd * 0.1)); o.push([50 + Math.cos(a) * 50 * r, 50 + Math.sin(a) * 50 * r]); }
  return o;
}
function splatA(P, sd) {
  const o = [], N = 140, drips = [Math.PI / 2 - 0.55, Math.PI / 2 + 0.05, Math.PI / 2 + 0.6];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    let r = 0.74 + 0.07 * Math.sin(3 * a + sd) + 0.05 * Math.sin(5 * a + 2 * sd);
    for (let j = 0; j < 3; j++) { const d = Math.atan2(Math.sin(a - drips[j]), Math.cos(a - drips[j])); r += (0.2 + 0.08 * j % 3) * Math.exp(-Math.pow(d / 0.1, 2)); }
    for (let j = 0; j < 4; j++) { const ang = rn(0, Math.PI * 2, j + 3, sd), dd = Math.atan2(Math.sin(a - ang), Math.cos(a - ang)); r += 0.2 * Math.exp(-Math.pow(dd / 0.07, 2)); }
    r = Math.min(1, r); o.push([50 + Math.cos(a) * 50 * r, 50 + Math.sin(a) * 50 * r]);
  }
  return o;
}
function bubbleA() {
  const o = [], rx = 8, ry = 17, y1 = 84;
  const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 5; i++) { const a = (a0 + (a1 - a0) * i / 5) * Math.PI / 180; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } };
  arc(rx, ry, 180, 270); arc(100 - rx, ry, 270, 360); arc(100 - rx, y1 - ry, 0, 90);
  o.push([62, y1], [26, 100], [40, y1]);
  arc(rx, y1 - ry, 90, 180);
  return o;
}
function bannerA(P, sd) {
  const o = []; let i, x;
  for (i = 0; i <= 8; i++) { x = i * 12.5; o.push([x, 13 + 4 * Math.sin(x / 100 * 9.4 + sd)]); }
  o.push([91, 50]);
  for (i = 8; i >= 0; i--) { x = i * 12.5; o.push([x, 87 + 4 * Math.sin(x / 100 * 9.4 + sd + 2)]); }
  o.push([9, 50]);
  return o;
}
const SHAPES = {
  burst:     { fit: 1,   pv: 1,    ph: 1,    f: (P, sd) => burstA(Math.round(9 + 14 * P), Math.max(26, 38 - 12 * P), sd) },
  starburst: { fit: .95, pv: 1.55, ph: 1.05, f: P => star(8 + Math.round(8 * P), 31 - 6 * P) },
  shard:     { fit: 1,   pv: 1.2,  ph: 1,    f: shardA },
  bolt:      { fit: 1,   pv: 1.15, ph: 1,    f: boltA },
  cloud:     { fit: .9,  pv: 1.4,  ph: 1.05, f: cloudA },
  splat:     { fit: .92, pv: 1.55, ph: 1,    f: splatA },
  bubble:    { fit: .9,  pv: 1.05, ph: 1.05, f: bubbleA },
  banner:    { fit: 1,   pv: .9,   ph: 1.05, f: bannerA },
  seal:      { fit: .92, pv: 1.75, ph: 1.1,  f: P => star(22 + Math.round(6 * P), 44) }
};
function ptsStr(a, sc) { sc = sc || 1; return a.map(p => (50 + (p[0] - 50) * sc).toFixed(1) + ',' + (50 + (p[1] - 50) * sc).toFixed(1)).join(' '); }

function streak(svg, defs, bx, tx, yy, th, color, op) {
  const gi = 'ins-sg' + (++gid);
  const lg = svgEl('linearGradient', { id: gi, gradientUnits: 'userSpaceOnUse', x1: bx, y1: 0, x2: tx, y2: 0 }, defs);
  svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0 }, lg);
  svgEl('stop', { offset: '28%', 'stop-color': color, 'stop-opacity': op }, lg);
  svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }, lg);
  svgEl('polygon', { points: bx + ',' + (yy - th) + ' ' + tx + ',' + yy + ' ' + bx + ',' + (yy + th), fill: 'url(#' + gi + ')' }, svg);
}

/* ---------- budowa splasha ----------
   o: { word, tier, power (undefined = proste słowo), shape, fs, label, hueShift, simple, fill, rnd } */
export function buildSplash(o) {
  const rnd = o.rnd || Math.random;
  const t = o.tier || 1;
  const el = document.createElement('div');
  el.className = 'ins-splash';
  const P = o.power;
  const inner = document.createElement('div'); inner.className = 'ins-inner';
  const word = document.createElement('div'); word.className = 'ins-word';
  const back = document.createElement('span'); back.className = 'ins-w-back'; back.textContent = o.word; back.setAttribute('aria-hidden', 'true');
  const front = document.createElement('span'); front.className = 'ins-w-front'; front.textContent = o.word;
  word.append(back, front);

  if (P === undefined) {
    el.style.setProperty('--fs', o.fs || FS[t - 1]);
    el.style.setProperty('--fill', o.fill || '#9a98a6');
    word.classList.add('plain');
    inner.appendChild(word); el.appendChild(inner);
    return el;
  }

  const h = hueOf(P) + (o.hueShift || 0), seed = t * 7.3 + (o.word || '').length;
  el.style.setProperty('--fs', Math.round((o.fs || FS[t - 1]) * (1 + 0.22 * P)));
  const svg = svgEl('svg', { 'class': 'ins-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, inner);
  const id = 'ins-g' + (++gid);
  const defs = svgEl('defs', {}, svg);
  const cream = P < 0.5 ? hsl(48, 100, 90) : hsl(h, 100, 92);

  if (P < 0.06) {
    /* pudełko narracji */
    svgEl('rect', { x: 3, y: 4, width: 100, height: 100, fill: '#0a0a0f', transform: 'translate(2.5,5)', 'vector-effect': 'non-scaling-stroke' }, svg);
    svgEl('rect', { x: 0, y: 0, width: 100, height: 100, fill: '#ffe28a', stroke: '#0a0a0f', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }, svg);
    inner.style.transform = 'rotate(-2deg)';
    front.style.background = 'none'; front.style.color = '#1a1a22'; back.style.display = 'none';
    inner.style.setProperty('--pm', '1');
  } else {
    const soft = P < 0.16;
    const SH = SHAPES[o.shape] || SHAPES.burst;
    const shape = SHAPES[o.shape] ? o.shape : 'burst';
    inner.style.setProperty('--pv', SH.pv); inner.style.setProperty('--ph', SH.ph);
    inner.style.setProperty('--pm', (1 + 0.25 * P).toFixed(2));
    el.style.setProperty('--fs', Math.round(((o.fs || FS[t - 1]) * (0.95 + 0.4 * P) + (o.simple ? 0 : 36 * P)) * SH.fit));
    if (shape === 'bubble') word.style.transform = 'translateY(-6%)';
    if (P > 0.4 && !o.simple) {
      const N2 = 3 + Math.round(8 * P);
      for (let q = 0; q < 2 * N2; q++) {
        const lf = q % 2 === 0, y2 = 6 + ((q * 37 + 11) % 88), ln = 18 + ((q * 53) % 40) * (0.6 + P), th2 = 1.3 + (q % 3) * 0.6;
        streak(svg, defs, lf ? 16 : 84, lf ? -ln : 100 + ln, y2, th2, q % 4 < 2 ? '#ffffff' : hsl(h, 100, 62), 0.88);
      }
    }
    const outerOk = P > 0.65 && !o.simple && ['burst', 'starburst', 'shard', 'bolt'].includes(shape);
    if (outerOk) svgEl('polygon', { points: ptsStr(SH.f(P, seed + 7), 1.16), fill: hsl(h, 100, 58), stroke: '#0a0a0f', 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    if (P > 0.3 && !o.simple) {
      const sd = svgEl('polygon', { points: ptsStr(SH.f(P, seed + 2)), fill: hsl(h + 38, 100, 52), stroke: '#0a0a0f', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
      sd.setAttribute('transform', 'translate(2.2,6)');
    }
    const rad = svgEl('radialGradient', { id: id + 'f' }, defs);
    svgEl('stop', { offset: '0%', 'stop-color': '#ffffff' }, rad);
    svgEl('stop', { offset: '60%', 'stop-color': cream }, rad);
    svgEl('stop', { offset: '100%', 'stop-color': soft ? '#dfe9fb' : hsl(h, 100, 80) }, rad);
    svgEl('polygon', { points: ptsStr(SH.f(P, seed)), fill: 'url(#' + id + 'f)', stroke: '#0a0a0f', 'stroke-width': (3 + 2 * P).toFixed(1), 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    inner.style.transform = 'rotate(' + ((rnd() < 0.5 ? -1 : 1) * (1.5 + (1 + 5 * P) * (0.4 + rnd()))).toFixed(1) + 'deg)';
    let w1, w2;
    if (soft) { w1 = '#3b86ff'; w2 = '#1747c9'; }
    else { w1 = hsl(h, 100, P > 0.6 ? 50 : 52); w2 = hsl(h - 8, 100, P > 0.6 ? 36 : 32); }
    el.style.setProperty('--w1', w1); el.style.setProperty('--w2', w2);
    el.style.setProperty('--sw', (0.17 + 0.05 * P).toFixed(2));
    const glow = [];
    if (P > 0.3) glow.push('drop-shadow(0 0 ' + Math.round(5 + 14 * P) + 'px ' + hsl(h + 20, 100, 65, 0.85) + ')');
    if (P > 0.75 && o.glow !== false) glow.push('drop-shadow(0 0 ' + Math.round(10 + 22 * P) + 'px ' + hsl(h - 60, 100, 60, 0.6) + ')');
    if (glow.length) el.style.filter = glow.join(' ');
  }
  inner.appendChild(word); el.appendChild(inner);
  if (o.label) { const l = document.createElement('div'); l.className = 'ins-label'; l.textContent = o.label; el.appendChild(l); }
  return el;
}

/* ---------- animacje ---------- */
const POP_MS = 900;
function rr(rnd, a, b) { return a + rnd() * (b - a); }

export function idle(el, P, rnd = Math.random) {
  if (reduce || P == null || !el.animate) return;
  const inner = el.querySelector('.ins-inner'), word = el.querySelector('.ins-word');
  if (!inner) return;
  const a = 0.8 + 2.4 * P, T = Math.round(rr(rnd, 1500, 2100));
  const ks = [{ translate: '0px 0px', rotate: '0deg', scale: 1 }];
  for (let i = 0; i < 3; i++) ks.push({ translate: (rr(rnd, -1, 1) * a * 1.5).toFixed(1) + 'px ' + (rr(rnd, -1, 1) * a).toFixed(1) + 'px', rotate: (rr(rnd, -1, 1) * a * 0.8).toFixed(2) + 'deg', scale: (1 + rr(rnd, -0.4, 1) * (0.012 + 0.03 * P)).toFixed(3) });
  ks.push({ translate: '0px 0px', rotate: '0deg', scale: 1 });
  const wa = 0.025 + 0.045 * P, wr = rr(rnd, 0.8, 1.8) * (rnd() < 0.5 ? -1 : 1);
  const its = Math.max(2, Math.ceil(4000 / T));   // drżenie trwa najwyżej ok. 4 s (potem splash wraca do spoczynku), nie w nieskończoność
  try {
    inner.animate(ks, { duration: T, iterations: its, easing: 'ease-in-out', delay: POP_MS });
    if (word) word.animate([{ scale: 1, rotate: '0deg' }, { scale: 1 + wa, rotate: wr.toFixed(1) + 'deg' }, { scale: 1, rotate: '0deg' }, { scale: 1 + wa * 0.6, rotate: (-wr * 0.6).toFixed(1) + 'deg' }, { scale: 1, rotate: '0deg' }], { duration: T, iterations: its, easing: 'ease-in-out', delay: POP_MS });
  } catch (e) { /* brak WAAPI */ }
}

export function popIn(el, amp, mag, rnd = Math.random) {
  const m = mag || 7, rot = (rnd() < 0.5 ? -1 : 1) * (m * 0.35 + rnd() * m * 0.65);
  if (reduce) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }); el.style.transform = BASE + ' rotate(' + rot + 'deg)'; return; }
  el._rot = rot;
  const T = (s, r) => BASE + ' scale(' + s + ') rotate(' + r + 'deg)';
  el.animate([
    { transform: T(0.2, rot - 14), opacity: 0, offset: 0 },
    { transform: T(amp, rot + 1.5), opacity: 1, offset: 0.2 },
    { transform: T(0.96, rot - 1), opacity: 1, offset: 0.36 },
    { transform: T(1.02, rot + 0.6), opacity: 1, offset: 0.62 },
    { transform: T(1, rot), opacity: 1, offset: 1 }
  ], { duration: POP_MS, easing: 'ease-out', fill: 'forwards' });
}

export function droop(el) {
  if (reduce) { el.animate([{ opacity: 0 }, { opacity: 0.85 }], { duration: 200, fill: 'forwards' }); return; }
  el.animate([
    { transform: BASE + ' scale(1.2)', opacity: 0, offset: 0 },
    { transform: BASE + ' scale(1)', opacity: 1, offset: 0.2 },
    { transform: BASE + ' translateY(10%) rotate(5deg)', opacity: 0.85, offset: 1 }
  ], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
}

export function fadeOut(el, ms) {
  if (!el || !el.parentNode) return;
  const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms || 200, fill: 'forwards' });
  a.onfinish = () => el.remove();
}

/* zejście: odwrotność wejścia */
export function leaveSplash(el) {
  if (!el || !el.parentNode) return;
  el.querySelectorAll('.ins-inner,.ins-word').forEach(n => n.getAnimations().forEach(a => a.cancel()));
  if (reduce) { fadeOut(el, 200); return; }
  const r = el._rot || 0, T = (s, d) => BASE + ' scale(' + s + ') rotate(' + (r + d) + 'deg)';
  const a = el.animate([
    { transform: T(1, 0), opacity: 1, offset: 0 },
    { transform: T(1.1, -2), opacity: 1, offset: 0.28 },
    { transform: T(0.25, 14), opacity: 0, offset: 1 }
  ], { duration: 520, easing: 'ease-in', fill: 'forwards' });
  a.onfinish = () => el.remove();
}
export function leaveSlide(el) {
  if (!el || !el.parentNode) return;
  if (reduce) { fadeOut(el, 200); return; }
  const a = el.animate([{ opacity: 1, translate: '0 0', scale: 1 }, { opacity: 0, translate: '0 -16px', scale: 0.8 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
  a.onfinish = () => el.remove();
}

/* ---------- efekty wokół splasha (wewnątrz stage) ---------- */
export function rays(stage, strength) {
  const r = document.createElement('div'); r.className = 'ins-rays'; stage.insertBefore(r, stage.firstChild);   // pod splashem, nie nad słowem
  const a = r.animate([
    { transform: BASE + ' scale(.3) rotate(0deg)', opacity: 0, offset: 0 },
    { transform: BASE + ' scale(.8) rotate(6deg)', opacity: strength, offset: 0.25 },
    { transform: BASE + ' scale(1.1) rotate(16deg)', opacity: 0, offset: 1 }
  ], { duration: 1500, easing: 'ease-out' });
  a.onfinish = () => r.remove();
}
/* miękki błysk (radialny, nie pełnoekranowy), maks. jeden na splash */
export function flash(stage, a) {
  const f = document.createElement('div'); f.className = 'ins-flash'; stage.appendChild(f);
  const an = f.animate([{ opacity: Math.min(0.5, a) }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
  an.onfinish = () => f.remove();
}
export function shake(stage, px) {
  px = Math.min(px, 10);
  stage.animate([
    { translate: '0 0' }, { translate: (-px) + 'px ' + (px / 2) + 'px' },
    { translate: px + 'px ' + (-px / 2) + 'px' }, { translate: (-px / 2) + 'px 0' }, { translate: '0 0' }
  ], { duration: 420, easing: 'ease-out' });
}
export function particles(stage, n, h) {
  n = n || 18;
  const cx = stage.clientWidth * 0.5, cy = stage.clientHeight * 0.46;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span'); p.className = 'ins-particle';
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    p.style.background = i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? hsl(h + 10, 100, 62) : hsl(h + 50, 100, 60));
    stage.appendChild(p);
    const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 180;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    const a = p.animate([
      { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (Math.random() * 360) + 'deg) scale(.2)', opacity: 0 }
    ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.1,.7,.3,1)' });
    a.onfinish = () => p.remove();
  }
}
/* efekty rosną płynnie z mocą P; later(fn,ms) rejestruje timery sceny */
export function fxFor(stage, P, later, level = 1, noRays = false) {
  if (reduce || level <= 0) return;
  const h = hueOf(P);
  if (P > 0.1 && !noRays) rays(stage, Math.min(1, 0.15 + 0.85 * P));
  if (P > 0.3 && level >= 1) flash(stage, Math.min(1, (P - 0.2) * 1.2));
  if (P > 0.45) shake(stage, Math.round(4 + 16 * P));
  if (P > 0.55 && level >= 1) {
    const waves = Math.min(3, 1 + Math.floor((P - 0.55) * 6));
    for (let i = 0; i < waves; i++) later(() => particles(stage, 14 + Math.round(10 * P), h), i * 170);
  }
}

/* ---------- nakładki ---------- */
export function oddsRibbon(stage, P, p, pushed, tag, shifted, labelOverride) {
  const txt = labelOverride?.text ?? tag ?? oddsText(P);
  if (!txt) return null;
  const r = document.createElement('div'); r.className = 'ins-odds';
  r.style.setProperty('--oc', labelOverride?.color ?? inkAccent(hueOf(P)));   // czarny napis na tle: kontrast >= 4.6:1
  const a = document.createElement('span'); a.className = 'ph'; a.textContent = txt;
  const b = document.createElement('span'); b.className = 'pill'; b.textContent = (labelOverride?.pill ?? oddsLabel(p)) + (pushed ? ' · ' + LBL.push : '');
  r.append(a, b); stage.appendChild(r);
  if (shifted) r.classList.add('shift');
  const maxW = stage.clientWidth * (shifted ? (stage.clientWidth < 480 ? 0.38 : 0.5) : 0.58);
  for (let it = 0; it < 3 && r.scrollWidth > maxW; it++) r.style.setProperty('--of', Math.max(0.5, (parseFloat(r.style.getPropertyValue('--of')) || 1) * maxW / r.scrollWidth * 0.98).toFixed(3));
  const tx = shifted ? '' : 'translateX(-50%) ';
  if (!reduce) r.animate([{ opacity: 0, transform: tx + 'translateY(-24px) rotate(-8deg) scale(1.6)' }, { opacity: 1, transform: tx + 'rotate(-2deg) scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
  return r;
}

export function sixBadge(stage, n) {
  const b = document.createElement('div'); b.className = 'ins-sixbadge' + (n > 9 ? ' two' : '');
  const svg = svgEl('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, b);
  svgEl('polygon', { points: ptsStr(burstA(9, 30, 5), 1), fill: '#ffd23f', stroke: '#0a0a0f', 'stroke-width': 4, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
  const num = document.createElement('div'); num.className = 'num';
  num.appendChild(document.createTextNode(n + '×'));
  const sm = document.createElement('small'); sm.textContent = n === 1 ? 'SIX' : 'SIXES'; num.appendChild(sm);
  b.appendChild(num); stage.appendChild(b);
  if (!reduce) b.animate([{ opacity: 0, transform: 'rotate(-20deg) scale(.3)' }, { opacity: 1, transform: 'rotate(8deg) scale(1.25)', offset: .6 }, { opacity: 1, transform: 'rotate(8deg) scale(1)' }], { duration: 420, easing: 'ease-out', fill: 'backwards' });
  return b;
}

/* Plakietka stresu. Resolve w systemie maleje: now = pozostało, max = pojemność. */
export function stressNote(lost, max) {
  if (lost >= max) return 'BREAKING POINT!';
  const r = lost / max;
  if (r >= 0.75) return 'ON THE EDGE!';
  if (r >= 0.5) return 'FEELING THE STRAIN';
  if (r >= 0.25) return 'SHAKEN';
  return 'SHRUGS IT OFF';
}
export function stressBadge(stage, stress, resolve, later) {
  /* resolve = null: bez pojemności (np. przeciwnik) — sama informacja o napięciu */
  const max = resolve ? Math.max(1, Math.round(Number(resolve.max) || stress)) : 0;
  const now = resolve ? Math.max(0, Math.min(max, Number(resolve.now ?? max) || 0)) : 0;
  const drawPips = max <= 24;   // sufit: absurdalna pojemność (zła flaga/dane) nie może wygenerować tysięcy węzłów
  /* pipsy: zajęte = już utracone wcześniej, nowe = ten rzut, puste = pozostałe */
  const lostBefore = resolve ? Math.max(0, Math.min(max, max - now - stress)) : 0;
  const lostTotal = resolve ? lostBefore + Math.min(stress, max - lostBefore) : 0;
  const full = !!resolve && lostTotal >= max;
  const b = document.createElement('div'); b.className = 'ins-badge' + (full ? ' hot' : '');
  const h = document.createElement('div'); h.className = 'bt'; h.textContent = LBL.stress(stress); b.appendChild(h);
  const pe = [];
  if (resolve && drawPips) {
    const pips = document.createElement('div'); pips.className = 'pips';
    for (let i = 0; i < max; i++) {
      const p = document.createElement('i');
      p.className = 'pip' + (i < lostBefore ? ' on' : (i < lostTotal ? ' new' : ''));
      pips.appendChild(p); pe.push(p);
    }
    b.appendChild(pips);
  }
  const c = document.createElement('div'); c.className = 'bc';
  c.textContent = resolve ? LBL.resolve(max - lostTotal, max) + ' · ' + stressNote(lostTotal, max) : 'FEELING THE STRAIN';
  b.appendChild(c);
  stage.appendChild(b);
  if (reduce) return b;
  b.animate([{ opacity: 0, transform: 'rotate(-4deg) scale(.4)' }, { opacity: 1, transform: 'rotate(-4deg) scale(1.12)', offset: 0.5 }, { opacity: 1, transform: 'rotate(-4deg) scale(1)' }], { duration: 400, fill: 'forwards' });
  pe.forEach((p, i) => { if (p.classList.contains('new')) p.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.7)', offset: .6 }, { transform: 'scale(1)' }], { duration: 320, delay: 380 + (i - lostBefore) * 130, easing: 'ease-out', fill: 'backwards' }); });
  if (full && later) later(() => flash(stage, 0.35), 380 + stress * 130);
  return b;
}
