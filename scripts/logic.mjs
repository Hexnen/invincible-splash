/* Czysta logika (bez DOM, bez Foundry): rozkłady, moc efektu, decyzje narratora, pule słów.
   Portowane z prototypu "Podgląd splashy", poprawione względem faktycznego systemu invincible:
   - n to faktyczna pula rzutu (roll.size), nie poziom atrybutu,
   - rzadkość po pushu liczona z liczby faktycznie przerzuconych kości (2-5),
   - stres to Resolve (maleje), liczony przez system, tu tylko odczytywany. */

export const FS = [32, 34, 38, 42, 47, 53, 60, 68, 78, 88, 98, 108];
export const K0_BASE = [1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5];

/* ---------- dwumian ---------- */
const LF = [0, 0];   // log(i!) z cache, żeby duże pule nie dawały Infinity*0 = NaN
function lf(n) { for (let i = LF.length; i <= n; i++) LF[i] = LF[i - 1] + Math.log(i); return LF[n]; }
export function C(n, k) { return Math.exp(lf(n) - lf(k) - lf(n - k)); }
export function pk(n, k, p) {
  if (k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(lf(n) - lf(k) - lf(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
export function pAtLeast(n, k, p) {
  n = Math.min(Math.max(0, Math.floor(n)), 400);
  if (k <= 0) return 1;
  if (k > n) return 0;
  let s = 0;
  for (let i = k; i <= n; i++) s += pk(n, i, p);
  return Math.min(1, s);
}

/* ---------- próg narratora K0 dla puli n (tabela do 12, dalej liczony) ---------- */
export function k0For(n, offset = 0) {
  n = Math.max(1, Math.floor(n));
  let k;
  if (n <= K0_BASE.length) k = K0_BASE[n - 1];
  else {
    k = K0_BASE[K0_BASE.length - 1];
    while (k < n && pAtLeast(n, k, 1 / 6) > 0.04) k++;
  }
  return Math.max(1, k + (offset | 0));
}

/* ---------- moc efektu P (0..1) z rzadkości: log od 50% do 1 na 250 ---------- */
export const P_TOP = 0.5;
export const P_END = 0.004;
export function powerOf(p) {
  if (p == null) return 0;
  return Math.max(0, Math.min(1, Math.log(P_TOP / p) / Math.log(P_TOP / P_END)));
}

/* ---------- kolory ---------- */
const HUES = [48, 36, 24, 10, -10, -35, -60, -90];
export function hueOf(P) {
  const x = P * (HUES.length - 1), i = Math.min(HUES.length - 2, Math.floor(x)), f = x - i;
  return HUES[i] + (HUES[i + 1] - HUES[i]) * f;
}
/* Tło pod czarnym napisem (#0a0a0f): podnosi jasność, aż kontrast >= 4.6:1.
   Przy końcu skali (fiolet, hue 270) czyste L60 dawało ok. 4.3:1; reszta skali już przechodziła. */
function hslLum(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}
export function inkAccent(h, s = 100, l = 60) {
  const BLACK = 0.0033;   // luminancja #0a0a0f
  while (l < 80 && (hslLum(h, s, l) + 0.05) / (BLACK + 0.05) < 4.6) l += 1;
  return hsl(h, s, l);
}
export function hsl(h, s, l, a) {
  return (a == null ? 'hsl(' : 'hsla(') + h.toFixed(0) + ',' + s + '%,' + l + '%' + (a == null ? ')' : ',' + a + ')');
}

/* ---------- deterministyczny PRNG: ten sam message.id daje ten sam wynik na każdym kliencie ---------- */
export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- słowa ---------- */
export const ACTIONS = {
  slugfest:  ['HAYMAKER!', 'SMASH!', 'WHAM!', 'BAM!', 'THWACK!', 'CRUSH!'],
  charge:    ['RUSH!', 'CHARGE!', 'WHOOSH!', 'BARREL!', 'STAMPEDE!'],
  grapple:   ['GRAB!', 'LOCK!', 'SQUEEZE!', 'VISE!', 'HOLD!'],
  block:     ['GUARD!', 'BRACE!', 'HOLD!', 'SHIELD!'],
  dodge:     ['ZIP!', 'DASH!', 'FLIP!', 'SWISH!', 'DUCK!'],
  shooting:  ['BLAM!', 'ZAP!', 'PEW!', 'BANG!', 'KRAK!'],
  reason:    ['CLICK!', 'EUREKA!', 'CALCULATE!'],
  intuition: ['TINGLE!', 'SENSE!', 'HUNCH!'],
  presence:  ['HUSH!', 'COMMAND!', 'ROAR!'],
  generic:   ['POW!', 'BOOM!', 'WHAM!', 'KAPOW!', 'ZOOM!']
};
export const FAIL = ['WHIFF!', 'OOPS!', 'CLUNK!', 'FIZZLE!', 'YIKES!', 'BLUNDER!'];
export const SOFTFAIL = ['NOT YET', 'HMM…', 'ALMOST', 'NEXT!', 'TRY AGAIN', 'STEADY'];
export const PUSHPRE = ['STRAIN!', 'PUSH!', 'GRRR!', 'ALL IN!', 'DIG DEEP!', 'AGAIN!', 'HNNNG!', 'ONE MORE!'];
export const PUSHFAIL = ['NOPE!', 'CRACK!', 'SO CLOSE!', 'NOT TODAY!', 'ALMOST!', 'OUCH!', 'SNAP!', 'NO LUCK!'];
export const WRECK = ['WRECK!', 'RUIN!', 'KRAKOOM!', 'DEMOLISH!'];
export const ODDS = [[0.10, 'NOT BAD!'], [0.22, 'LUCKY BREAK!'], [0.34, 'AGAINST THE ODDS!'], [0.46, 'UNLIKELY HERO!'],
  [0.58, 'NO WAY!'], [0.70, 'IMPOSSIBLE!'], [0.82, 'ONCE IN A LIFETIME!'], [0.92, 'THE ODDS ARE SHATTERED!']];
export function oddsText(P) { let t = null; for (const o of ODDS) if (P >= o[0]) t = o[1]; return t; }

export function fmtOdds(n) {
  if (!Number.isFinite(n) || n >= 999.5e9) return '1T+';   // ogromne pule: bez zapisu wykładniczego ("1e+79")
  if (n >= 999.5e6) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 999.5e3) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 9999.5) return Math.round(n / 1e3) + "K";
  return Math.round(n).toLocaleString('en-US');
}
/* Etykiety informacyjne (liczby i nazwy z systemu), w odróżnieniu od słów-SFX, które zostają angielskie (decyzja projektu).
   Domyślnie angielskie, więc logika działa bez Foundry; main.mjs podmienia je na zlokalizowane przy ready (INSPLASH.Badge.*). */
export const LBL = {
  oneIn: n => '1 IN ' + n,
  miss: n => '1 IN ' + n + ' TO MISS',
  push: 'PUSH',
  stress: n => 'STRESS +' + n,
  resolve: (now, max) => 'RESOLVE ' + now + ' / ' + max
};
export function setLabels(o) { for (const k of Object.keys(o || {})) if (k in LBL && o[k] != null) LBL[k] = o[k]; }

export function oddsLabel(p) {
  const inv = 1 / p;
  return LBL.oneIn(inv < 5 ? Math.max(1.1, inv).toFixed(1) : fmtOdds(Math.round(inv)));
}

/* ---------- kształty: zakresy mocy i pule per akcja ---------- */
export const SHAPE_RANGE = {
  burst: [.16, 1], starburst: [.16, 1], shard: [.2, 1], bolt: [.25, 1], cloud: [.04, .6],
  splat: [.2, .9], bubble: [.04, .5], banner: [.04, .5], seal: [.1, .7]
};
export const SHAPE_POOLS = {
  slugfest: ['burst', 'shard', 'splat', 'bolt'], charge: ['bolt', 'burst', 'shard', 'cloud'],
  grapple: ['splat', 'seal', 'starburst', 'cloud'], block: ['banner', 'seal', 'starburst'],
  dodge: ['cloud', 'bolt', 'shard'], shooting: ['bolt', 'starburst', 'burst'],
  reason: ['bubble', 'starburst', 'bolt'], intuition: ['bubble', 'cloud', 'starburst'],
  presence: ['banner', 'starburst', 'burst'], generic: ['burst', 'starburst', 'cloud', 'shard']
};

/* wybór z puli bez powtórzenia ostatniego (last) */
function pickFrom(pool, rng, last) {
  if (pool.length === 1) return pool[0];
  let v = pool[Math.floor(rng() * pool.length)];
  if (v === last) v = pool[(pool.indexOf(v) + 1) % pool.length];
  return v;
}
export function chooseShape(action, P, rng, last) {
  const all = Object.keys(SHAPE_RANGE);
  const ok = k => P >= SHAPE_RANGE[k][0] && P <= SHAPE_RANGE[k][1];
  let pool = (SHAPE_POOLS[action] || all).filter(ok);
  if (!pool.length) pool = all.filter(ok);
  if (!pool.length) pool = ['burst'];
  return pickFrom(pool, rng, last);
}

/* ---------- stan postaci (flagi aktora) ---------- */
export function newState() { return { dry: 0, bestP: {}, firstWin: false, firstDouble: false, firstPushWin: false, last: {} }; }
export function sanitizeState(s) {
  const o = newState();
  if (!s || typeof s !== 'object') return o;
  o.dry = Number.isFinite(s.dry) ? s.dry : 0;
  o.bestP = (s.bestP && typeof s.bestP === 'object') ? { ...s.bestP } : {};
  o.firstWin = !!s.firstWin; o.firstDouble = !!s.firstDouble; o.firstPushWin = !!s.firstPushWin;
  o.last = (s.last && typeof s.last === 'object') ? { ...s.last } : {};
  return o;
}

/* ---------- rzadkość wyniku ----------
   rd: { n, sixes, pushed, newSixes, rerolled }
   p      = szansa na dokładnie taki (lub lepszy) wynik, null przy porażce
   failP  = szansa na taką porażkę */
export function rarity(rd) {
  const { n, sixes, pushed, newSixes, rerolled } = rd;
  let p = null, failP = null;
  if (sixes > 0) {
    /* po pushu: szansa dojścia do stanu sprzed pusha razy szansa tego pusha (gdy nic nie zostało zachowane, czyli sixesBefore = 0, to sam push) */
    if (pushed && newSixes > 0 && rerolled > 0) p = pAtLeast(n, sixes - newSixes, 1 / 6) * pAtLeast(rerolled, newSixes, 1 / 6);
    else p = pAtLeast(n, sixes, 1 / 6);
    if (p != null) p = Math.max(p, 1e-9);
  } else {
    failP = Math.pow(5 / 6, pushed && rerolled > 0 ? rerolled : n);
  }
  return { p, failP };
}

/* ---------- decyzja: co pokazać i czy narrator mówi ----------
   Zwraca zdarzenie "ev" (same wartości JSON, trafia do flagi wiadomości).
   st = stan postaci (mutowany), albo null dla NPC / braku stanu. */
export function buildEvent(rd, opts) {
  const { rng, st, dryN = 8, k0Offset = 0 } = opts;
  const { p, failP } = rarity(rd);
  const fail = rd.sixes === 0;
  const action = ACTIONS[rd.action] ? rd.action : 'generic';
  const last = (st && st.last) || {};
  const ev = {
    v: 1,
    n: rd.n, sixes: rd.sixes, pushed: !!rd.pushed, newSixes: rd.newSixes || 0,
    fail, action, wreck: !!rd.wreck, npc: !!rd.npc,
    stress: rd.stress || 0, stressPending: !!rd.stressPending,
    p, failP,
    tier: fail ? null : Math.min(12, Math.max(1, rd.n + rd.sixes - 1)),
    power: fail ? null : powerOf(p),
    softFail: false, word: '', prefix: null, wreckWord: null, shape: null,
    narr: null, tag: null
  };
  ev.softFail = fail && !rd.pushed && failP > 0.5;
  if (fail) {
    ev.word = rd.pushed ? pickFrom(PUSHFAIL, rng, last.word)
      : (ev.softFail ? pickFrom(SOFTFAIL, rng, last.word) : pickFrom(FAIL, rng, last.word));
  } else {
    ev.word = pickFrom(ACTIONS[action], rng, last['w-' + action]);
    ev.shape = chooseShape(action, ev.power, rng, last.shape);
    if (ev.wreck && (action === 'slugfest' || action === 'charge')) ev.wreckWord = pickFrom(WRECK, rng, last.wreck);
  }
  if (rd.pushed) ev.prefix = pickFrom(PUSHPRE, rng, last.prefix);

  /* narrator i znaczniki */
  const key = rd.attribute || ('n' + rd.n);
  const dry0 = st ? st.dry : 0;
  if (rd.npc || !st) {
    ev.narr = (rd.sixes > 0 && rd.sixes >= k0For(rd.n, k0Offset)) ? 'k0' : null;
  } else {
    let why = null, tag = null;
    if (rd.sixes > 0 && p != null) {
      if (rd.sixes >= k0For(rd.n, k0Offset)) why = 'k0';
      else if (dryN > 0 && st.dry >= dryN) why = 'dry';
      else if (rd.pushed && rd.newSixes > 0) why = 'push';
      const best = st.bestP[key], cands = [];
      if (!st.firstWin) cands.push(['FIRST SUCCESS!', 'firstWin']);
      if (rd.pushed && rd.newSixes > 0 && !st.firstPushWin) cands.push(['PUSH PAYS OFF!', 'firstPushWin']);
      if (rd.sixes >= 2 && !st.firstDouble) cands.push(['FIRST DOUBLE!', 'firstDouble']);
      if (best != null && p < best && ev.power < 0.7) cands.push(['NEW PERSONAL BEST!', 'pb']);
      if (best == null || p < best) st.bestP[key] = p;
      if (cands.length) { tag = cands[0][0]; if (cands[0][1] !== 'pb') st[cands[0][1]] = true; }
    } else if (rd.sixes === 0 && rd.n >= 9 && failP != null && failP <= 0.2 && !rd.pushed) why = 'fail';
    if (why) st.dry = 0; else st.dry++;
    ev.narr = why; ev.tag = tag;
    /* rzut jeszcze pushowalny nie liczy się do suszy: ta sama decyzja gracza dałaby dwa naliczenia (rzut + push) */
    if (rd.pushable) st.dry = dry0;
    st.last = { ...st.last, word: fail ? ev.word : st.last.word, ['w-' + action]: fail ? st.last['w-' + action] : ev.word, shape: ev.shape || st.last.shape, prefix: ev.prefix || st.last.prefix, wreck: ev.wreckWord || st.last.wreck };
  }
  return ev;
}
