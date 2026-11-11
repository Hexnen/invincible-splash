// The Polish interface speaks the vocabulary of the Invincible glossary (invincible-plus-ultra: dev/glossary-pl.md):   node dev/glossary.test.mjs
// 1) no string of lang/pl.json uses a variant the glossary rejected (dev/glossary-banned.mjs is a verbatim COPY of
//    invincible-plus-ultra/scripts/i18n/glossary-banned.mjs: change that file first, then copy it here);
// 2) the game terms are pinned; 3) pl.json and en.json have the same keys and placeholders;
// 4) the roll reader recognises the system's labels in English AND in Polish (scripts/sys-labels.mjs, a copy of plus-ultra's table),
//    so nothing breaks when the system's interface is translated or two clients speak different languages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const { BANNED, bannedIn } = await load("dev/glossary-banned.mjs");
const { classify } = await load("scripts/reader.mjs");
const { MATCH_LABELS } = await load("scripts/sys-labels.mjs");
let n = 0, failed = 0;
const ok = (c, m) => { n++; if (!c) { failed++; console.error(`FAIL ${m}`); } };
const PL = JSON.parse(fs.readFileSync(path.join(root, "lang/pl.json"), "utf8")), EN = JSON.parse(fs.readFileSync(path.join(root, "lang/en.json"), "utf8"));
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

ok(BANNED.length > 20, "the banned list is loaded");
for (const [k, v] of Object.entries(PL)) {
  for (const h of bannedIn(v, k)) ok(false, `${k}: "${h.hit}" (${h.id}) -> ${h.use}   in: ${v}`);
  ok(!/(?<!\p{L})token/iu.test(v), `${k}: token -> żeton`);
  const twin = EN[k] ?? EN[k.replace(/\.(few|many)$/, ".other")];          // Polish has more plural forms than English
  ok(twin !== undefined && ph(v) === ph(twin), `${k}: missing in en.json or other placeholders`);
}
for (const k of Object.keys(EN)) ok(k in PL, `${k}: no Polish text`);
ok(PL["INSPLASH.Badge.Push"] === "FORSOWANIE" && PL["INSPLASH.Live.Pushed"] === "Rzut forsowany", "push = forsowanie / rzut forsowany");
ok(PL["INSPLASH.Badge.Resolve"].startsWith("DETERMINACJA") && PL["INSPLASH.Live.Resolve"].startsWith("Determinacja"), "Resolve = Determinacja");
ok(/^STRES/.test(PL["INSPLASH.Badge.Stress"]) && /^Stres/.test(PL["INSPLASH.Live.Stress"]), "Stress = Stres");

const A = "INVINCIBLE.Actor.base.FIELDS.";
for (const lang of [0, 1]) {
  const t = (k) => MATCH_LABELS[k][lang], where = lang ? "Polish" : "English";
  ok(classify({ names: [t(`${A}attributes.presence.label`)] }).attribute === "presence", `${where}: the attribute is read from the breakdown`);
  ok(classify({ names: [t(`${A}attributes.fighting.label`), t(`${A}derived.slugfest.wreckZoneBonus`)] }).wreck === true, `${where}: the wreck zone bonus is seen`);
  ok(classify({ flavor: `${t(`${A}derived.slugfest.grapple`)}!` }).action === "grapple", `${where}: grapple by the roll's name`);
  ok(classify({ flavor: t(`${A}block.label`) }).action === "block" && classify({ flavor: t(`${A}dodge.label`) }).action === "dodge", `${where}: block and dodge`);
  ok(classify({ flavor: t(`${A}derived.slugfest.charge`) }).action === "charge", `${where}: charge`);
}
ok(classify({ flavor: "Roadblock" }).action === "generic" && classify({ flavor: "Blokada drogi" }).action === "generic", "a substring is not the label");
ok(classify({ attackType: "shooting", flavor: "Blok" }).action === "shooting", "the system's own attack type wins");
for (const f of fs.readdirSync(path.join(root, "scripts"))) {
  const code = fs.readFileSync(path.join(root, "scripts", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
  ok(!/(===|!==|==|!=)\s*(L|game\.i18n\.localize)\(|(?<![\w.])(L|game\.i18n\.localize)\([^)]*\)\s*(===|!==|==|!=)|includes\((L|game\.i18n\.localize)\(/.test(code), `scripts/${f}: a stored text is compared with one localize() call`);
}
if (failed) { console.error(`FAIL glossary: ${failed} of ${n} checks failed`); process.exit(1); }
console.log(`OK ${n} checks (glossary)`);
