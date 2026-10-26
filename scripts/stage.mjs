/* Scena splasha: warstwa ekranowa (fixed) albo przy tokenie (wewnątrz #hud rdzenia, zsynchronizowanego z canvasem).
   Jeden splash na klucz ('screen' albo id tokena); nowy wypiera poprzedni. */
import { FS, LBL, oddsText, hueOf, hsl, fmtOdds } from './logic.mjs';
import * as S from './splash.mjs';

const active = new Map();   // key -> ctl
const MAX_STAGES = 4;
/* położenia (% sceny): przy tokenie słowo jest tuż nad jego głową, reszta (plakietki, wstążka) w CSS .on-token */
const POS_SCREEN = { main: [50, 45], mainWreck: [34, 45], wreck: [79, 60], fail: [50, 45], pre: [50, 22] };
const POS_TOKEN = { main: [50, 21], mainWreck: [38, 21], wreck: [74, 31], fail: [50, 22], pre: [50, 8] };
let layer = null;

/* Obszar roboczy: okno bez otwartego paska bocznego (czat). Scena centruje się na nim i nie wchodzi pod czat.
   Wymiary trafiają też do warstwy jako --ins-cx / --ins-right (CSS przycina warstwę do obszaru). */
let area = { w: window.innerWidth, cx: window.innerWidth / 2, right: 0 };
export function getArea() { return area; }
export function measureArea() {
  let right = 0;
  try {
    const r = document.getElementById('sidebar')?.getBoundingClientRect();
    const rr = r ? window.innerWidth - r.left : 0;
    /* tylko wiarygodny pasek po prawej: węższy niż pół okna (inaczej zakładamy, że to nie panel boczny) */
    if (r && r.width > 0 && rr > 0 && rr < window.innerWidth * 0.5) right = Math.round(rr);
  } catch (e) { right = 0; }
  const w = Math.max(320, window.innerWidth - right);
  area = { w, cx: w / 2, right };
  if (layer) { layer.style.setProperty('--ins-right', right + 'px'); layer.style.setProperty('--ins-cx', area.cx.toFixed(1) + 'px'); }
  return area;
}
/* zmiana rozmiaru okna / zwinięcie paska: przelicz obszar i przestaw trwające sceny przy tokenach */
export function refreshArea() {
  measureArea();
  for (const ctl of active.values()) if (ctl.token) placeTokenStage(ctl);
}

function ensureLayer() {
  if (layer?.isConnected) { measureArea(); return layer; }
  layer = document.createElement('div');
  layer.id = 'invincible-splash-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  measureArea();
  return layer;
}

/* Żywy komunikat dla czytników ekranu: warstwa wizualna jest aria-hidden, więc wynik ogłasza ten element. */
let live = null, liveTimer = 0;
export function announce(text) {
  try {
    if (!text) return;
    if (!live?.isConnected) {
      live = document.createElement('div');
      live.id = 'invincible-splash-live'; live.className = 'ins-sr-only';
      live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
      document.body.appendChild(live);
    }
    live.textContent = '';   // czyszczenie przed ustawieniem, żeby ten sam tekst z kolejnego rzutu został odczytany ponownie
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { live.textContent = text; liveTimer = setTimeout(() => { if (live) live.textContent = ''; }, 9000); }, 60);
  } catch (e) { /* komunikat to dodatek: nigdy nie psuje splasha */ }
}

/* szerokość słowa w em z prawdziwym fontem (zapas na szerokość liter) */
let _ctx = null;
function wordEm(word) {
  try {
    _ctx ??= document.createElement('canvas').getContext('2d');
    _ctx.font = '100px Comic, Impact, sans-serif';
    return _ctx.measureText(word).width / 100 + 0.04 * word.length;
  } catch (e) { return word.length * 0.6; }
}
function uOf(stage) { return parseFloat(stage.style.getPropertyValue('--u')) || 1; }
function fitFs(stage, word, base, P, frac, minFs) {
  const w = stage.clientWidth || 700, u = uOf(stage);
  const factor = 0.95 + 0.4 * P, pad = 1.5 * (1 + 0.25 * P);
  const maxFs = ((w * frac) / (u * (wordEm(word) + pad)) - 36 * P) / factor;
  return Math.max(minFs || 14, Math.min(base, Math.floor(maxFs)));
}

function tokenScale() { return canvas?.stage?.scale?.x || 1; }
/* Scena przy tokenie żyje w tej samej warstwie co ekranowa (nad oknami kart postaci), a środek tokena liczymy
   w pikselach ekranu: canvas.stage.toGlobal + położenie płótna na stronie. Zoom nie zmienia rozmiaru sceny. */
function placeTokenStage(ctl) {
  try {
    const g = canvas.stage.toGlobal(ctl.token.center);
    const r = canvas.app.view.getBoundingClientRect();
    let x = r.left + g.x, y = r.top + g.y;
    /* trzymaj scenę w obszarze roboczym: nie pod czatem (słowo zajmuje ~64% szerokości) i nie nad górną krawędzią */
    const W = ctl.W || 470, H = W * 0.75, hx = W * 0.34;
    x = Math.max(hx, Math.min(area.w - hx, x));
    const yMin = H * 0.4, yMax = Math.max(yMin, window.innerHeight - H * 0.45);
    y = Math.min(yMax, Math.max(yMin, y));
    ctl.el.style.left = x.toFixed(1) + 'px';
    ctl.el.style.top = y.toFixed(1) + 'px';
  } catch (e) { /* płótno niegotowe: zostaje ostatnia pozycja */ }
}
export function onCanvasPan() {
  for (const ctl of active.values()) if (ctl.token) placeTokenStage(ctl);
}

/* tło pełnoekranowe: poświata w kolorze wyniku i promienie na cały widok; nigdy nie zasłania całkiem mapy */
function addBackdrop(ctl, P, strength, fx) {
  const h = hueOf(P), k = 0.5 + 0.5 * strength, reduced = S.isReduced();
  const bd = document.createElement('div'); bd.className = 'ins-backdrop';
  bd.style.background =
    'radial-gradient(circle at 50% 46%, ' + hsl(h + 20, 100, 70, (0.30 * k).toFixed(2)) + ' 0%, ' + hsl(h, 100, 52, (0.22 * k).toFixed(2)) + ' 32%, ' + hsl(h - 28, 90, 10, (0.62 * k).toFixed(2)) + ' 100%)';
  const layerEl = ensureLayer();
  layerEl.insertBefore(bd, ctl.el);
  ctl.extras.push(bd);
  if (!reduced) bd.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'backwards' });
  /* obracające się promienie to czysty efekt ruchu: bez nich przy ograniczonym ruchu i przy Efekty = Wyłączone (poświata zostaje) */
  if (reduced || !fx) return;
  const ray = document.createElement('div'); ray.className = 'ins-fullrays';
  ray.style.setProperty('--ray', hsl(h + 20, 100, 72, (0.50 * k).toFixed(2)));
  layerEl.insertBefore(ray, ctl.el);
  ctl.extras.push(ray);
  {
    ray.animate([{ opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) rotate(10deg) scale(1)', offset: 0.2 }, { opacity: 1, transform: 'translate(-50%,-50%) rotate(60deg) scale(1)' }],
      { duration: 7000, easing: 'linear', fill: 'forwards' });
  }
}

/* Pełny ekran: poświata i obracające się promienie schodzą razem ze słowem, nie dopiero po całym ogonie sceny (finish = hold + 3 s).
   Bez tego ściemniony widok z promieniami wisiał nad mapą jeszcze ok. 3 s po zniknięciu słowa. Węzły wychodzą z ctl.extras,
   żeby endCtl nie wygaszał ich drugi raz (animacja 1 -> 0 na już przezroczystym węźle mignęłaby z powrotem). */
function fadeExtrasEarly(ctl) {
  for (const x of ctl.extras.splice(0)) {
    if (S.isReduced() || !x.animate) { x.remove(); continue; }
    const a = x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });
    a.onfinish = () => x.remove();
    setTimeout(() => x.remove(), 1000);   // gdy karta jest ukryta, animacje nie kończą się same
  }
}

function endCtl(ctl, quick) {
  if (ctl.dead) return;
  ctl.dead = true;
  ctl.timers.forEach(clearTimeout);
  if (active.get(ctl.key) === ctl) active.delete(ctl.key);
  for (const x of ctl.extras || []) {
    if (quick || S.isReduced()) { x.remove(); continue; }
    const a = x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
    a.onfinish = () => x.remove();
    setTimeout(() => x.remove(), 900);   // gdy karta jest ukryta, animacje nie kończą się same
  }
  if (quick) {
    for (const n of Array.from(ctl.el.children)) {
      if (n.classList.contains('ins-splash')) S.leaveSplash(n); else S.fadeOut(n, 160);
    }
    setTimeout(() => ctl.el.remove(), 700);
  } else if (S.isReduced() || !ctl.el.animate) ctl.el.remove();
  else {
    /* koniec naturalny: krótkie wygaszenie zamiast nagłego zniknięcia ostatnich plakietek */
    const a = ctl.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    a.onfinish = () => ctl.el.remove();
    setTimeout(() => ctl.el.remove(), 500);
  }
}

/* tworzy scenę; opts: { token (Token|null), scale } */
function openStage(opts) {
  const token = opts.full ? null : (opts.token || null);
  const key = token ? 't:' + token.id : 'screen';
  const old = active.get(key);
  if (old) endCtl(old, true);
  while (active.size >= MAX_STAGES) endCtl(active.values().next().value, true);   // limit scen naraz (spam rzutów)

  const el = document.createElement('div');
  el.className = 'ins-stage' + (token ? ' on-token' : '') + (opts.full ? ' full' : '');
  const scale = opts.scale || 1;
  const lay = ensureLayer();   // mierzy też obszar roboczy (okno bez czatu)
  let W;
  if (token) {
    /* scena jest mała i wyśrodkowana na tokenie: elementy układają się wokół niego, a nie w dużym kadrze */
    const tokenPx = (token.w || 100) * tokenScale();
    W = Math.round(Math.max(470, Math.min(tokenPx * 4.6, 660)) * scale);
    W = Math.min(W, Math.round(area.w * 0.9), Math.round(window.innerHeight * 1.2));   // scena 4:3 nie wyższa niż okno
  } else if (opts.full) {
    /* pełny ekran: scena prawie na całą szerokość obszaru roboczego (16:9 mieści się też w niskim oknie) */
    W = Math.round(Math.min(area.w * 0.92, window.innerHeight * 1.4, 1600) * scale);
    W = Math.min(W, Math.round(area.w * 0.96), Math.round(window.innerHeight * 1.5));
  } else {
    W = Math.round(Math.min(area.w * 0.7, 900) * scale);
    W = Math.min(W, Math.round(area.w * 0.96), Math.round(window.innerHeight * 1.45));
  }
  el.style.width = W + 'px';
  lay.appendChild(el);
  el.style.setProperty('--u', Math.max(0.4, Math.min(opts.full ? 2.2 : 1.4, W / 760)).toFixed(3));
  const ctl = { key, el, token, W, extras: [], timers: [], dead: false, pos: token ? POS_TOKEN : POS_SCREEN };
  ctl.later = (fn, ms) => {
    ctl.timers.push(setTimeout(() => {
      if (ctl.dead) return;
      try { fn(); } catch (e) { console.warn('invincible-splash | stage step failed', e); endCtl(ctl, false); }   // wyjątek nie zostawia sceny w DOM
    }, ms));
  };
  if (token) placeTokenStage(ctl);
  active.set(key, ctl);
  return ctl;
}

/* Odtwarza zdarzenie.
   o: { rnd, token, scale, hold (mnożnik czasu), fx (0/1), resolve: () => ({now,max}) | null, label } */
export function play(ev, o) {
  const rnd = o.rnd || Math.random;
  /* rzadszy sukces (moc >= próg) dostaje pełny ekran; porażki i rutyna nie */
  const full = o.fullFrom != null && !ev.fail && ev.power != null && ev.power >= o.fullFrom;
  const ctl = openStage(full ? { ...o, full: true } : o);
  const stage = ctl.el, later = ctl.later;
  if (full) addBackdrop(ctl, ev.power, o.fullFrom >= 1 ? 1 : (ev.power - o.fullFrom) / (1 - o.fullFrom), o.fx);
  const holdK = o.hold || 1;
  const hueShift = ev.npc ? 150 : 0;

  const finish = ms => later(() => endCtl(ctl, false), ms);
  const stressNow = () => {
    if (!ev.stress) return;
    S.stressBadge(stage, ev.stress, o.resolve ? o.resolve() : null, later);
  };

  let t = 0;
  if (ev.pushed && ev.prefix) {
    const pre = S.buildSplash({ word: ev.prefix, tier: 5, fs: fitFs(stage, ev.prefix, 34, 0, 0.6), fill: '#ff9330', rnd });
    pre.style.top = ctl.pos.pre[1] + '%';
    later(() => { stage.appendChild(pre); S.popIn(pre, 1.15, 7, rnd); }, 0);
    later(() => S.fadeOut(pre, 220), 650);
    t = 680;
  }

  later(() => {
    if (ev.fail) {
      /* siła porażki z jej rzadkości: rutyna (>50%) jest cicha, rzadka porażka silnej postaci jest komiczna */
      const dF = ev.failP == null ? 0.3 : Math.max(0, Math.min(1, Math.log(0.5 / ev.failP) / Math.log(10)));
      if (ev.softFail) {
        const sf = S.buildSplash({ word: ev.word, tier: 1, fs: fitFs(stage, ev.word, 36, 0, 0.55), fill: '#b1afc4', rnd });
        sf.style.top = ctl.pos.fail[1] + '%'; sf.style.opacity = '0';
        stage.appendChild(sf);
        if (!S.isReduced()) sf.animate([{ opacity: 0, transform: 'translate(-50%,-50%) translateY(8px)' }, { opacity: 0.85, transform: 'translate(-50%,-50%)', offset: 0.25 }, { opacity: 0.85, transform: 'translate(-50%,-50%)', offset: 0.7 }, { opacity: 0, transform: 'translate(-50%,-50%) translateY(-6px)' }], { duration: 2300 * holdK, fill: 'forwards' });
        else sf.style.opacity = '0.8';
        if (ev.stress) later(stressNow, 300);
        finish(2500 * holdK + (ev.stress ? 2600 : 0));
        return;
      }
      const f = S.buildSplash({ word: ev.word, tier: 1, fs: fitFs(stage, ev.word, Math.round((ev.pushed ? 40 : 34) + 34 * dF), 0, 0.7), fill: '#b4b2c2', rnd });
      f.style.top = ctl.pos.fail[1] + '%';
      stage.appendChild(f); S.droop(f); later(() => S.fadeOut(f, 600), 2800 * holdK);
      if (dF > 0.3 && !ev.pushed && ev.failP) {
        later(() => {
          S.oddsRibbon(stage, 0, ev.failP, false, null, !!ev.stress && !ctl.token, {
            text: dF > 0.6 ? 'WHAT A FLOP!' : 'UNLUCKY!', color: '#8fa3d9',
            pill: LBL.miss(fmtOdds(Math.round(1 / ev.failP)))
          });
          if (!S.isReduced() && o.fx) S.shake(stage, 4 + Math.round(8 * dF));
        }, 350);
      }
      if (ev.stress) later(stressNow, 450);
      finish(3600 * holdK + 800);
      return;
    }

    const P = ev.power;
    const ribbon = !!oddsText(P) || !!ev.tag;
    const label = o.label || null;
    const fs = fitFs(stage, ev.word, FS[ev.tier - 1], P, ev.wreckWord ? 0.40 : (ev.sixes > 0 ? 0.64 : 0.76));
    const s = S.buildSplash({ word: ev.word, tier: ev.tier, label, power: P, hueShift, shape: ev.shape, fs, rnd, glow: o.fx >= 1 });
    const pm = ev.wreckWord ? ctl.pos.mainWreck : ctl.pos.main;
    s.style.left = pm[0] + '%'; s.style.top = pm[1] + '%';
    const hold = Math.round((3400 + 1800 * P) * holdK);
    later(() => {
      S.leaveSplash(s);
      Array.from(stage.querySelectorAll('.ins-odds,.ins-sixbadge')).forEach((n, i) => later(() => S.leaveSlide(n), 120 + i * 90));
    }, hold);
    later(() => Array.from(stage.querySelectorAll('.ins-badge')).forEach(S.leaveSlide), hold + 1400);
    if (full) later(() => fadeExtrasEarly(ctl), hold + 300);   // słowo schodzi w hold (520 ms); tło znika zaraz za nim
    stage.appendChild(s); S.popIn(s, 1.05 + 0.55 * P, 5 + 9 * P, rnd); S.idle(s, P, rnd);
    if (o.fx) S.fxFor(stage, ev.tag ? Math.max(P, 0.32) : P, later, o.fx, full);
    if (ev.sixes > 0) later(() => S.sixBadge(stage, ev.sixes), 260);
    if (ev.p != null && ribbon) later(() => S.oddsRibbon(stage, P, ev.p, ev.pushed, ev.tag, !!ev.stress && !ctl.token), 380);
    if (ev.wreckWord) {
      later(() => {
        const wp = Math.min(1, P + 0.1);
        const wshape = ['burst', 'shard', 'splat'][Math.floor(rnd() * 3)];
        const x = S.buildSplash({ word: ev.wreckWord, tier: ev.tier, fs: fitFs(stage, ev.wreckWord, Math.round(FS[ev.tier - 1] * 0.55), wp, 0.3, 20), power: wp, hueShift: -22 + hueShift, simple: true, shape: wshape, rnd });
        x.style.left = ctl.pos.wreck[0] + '%'; x.style.top = ctl.pos.wreck[1] + '%';
        stage.appendChild(x); S.popIn(x, 1.25, 10, rnd); S.idle(x, wp, rnd);
        later(() => S.leaveSplash(x), hold - 550 + 160);
        if (o.fx && !S.isReduced()) S.shake(stage, 5);
      }, 550);
    }
    if (ev.stress) later(stressNow, 450);
    finish(hold + 3000 * holdK);
  }, t);
  return ctl;
}

/* Sam stres (np. po Accept, gdy rzut był pushowalny w chwili splasha). */
export function playStress(ev, o) {
  /* jeśli splash tego tokena (albo ekranu) jeszcze trwa, plakietka dołącza do niego zamiast go wypierać */
  const key = o.token ? 't:' + o.token.id : 'screen';
  const existing = active.get(key);
  const joined = !!existing && !existing.dead;
  const ctl = joined ? existing : openStage(o);
  const stage = ctl.el;
  ctl.later(() => S.stressBadge(stage, ev.stress, o.resolve ? o.resolve() : null, ctl.later), 100);
  ctl.later(() => Array.from(stage.querySelectorAll('.ins-badge')).forEach(S.leaveSlide), 3400 * (o.hold || 1));
  if (!joined) ctl.later(() => endCtl(ctl, false), 4000 * (o.hold || 1));
  return ctl;
}

export function clearAll() { for (const c of Array.from(active.values())) endCtl(c, true); }
export function activeCount() { return active.size; }
