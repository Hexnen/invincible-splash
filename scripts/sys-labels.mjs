/* Language-independent matching of the SYSTEM's labels.
   The Invincible system writes some of its localized labels into DATA: the flavor of the "Damage Taken" card, the stunt lines of a roll
   (roll.options.stuntsList), the names in a roll's breakdown, the source name of the minions' group bonus. Such a text is in the language of
   the client that created it, so comparing it with game.i18n.localize(key) on THIS client breaks as soon as the two languages differ
   (a Polish GM and an English player, or a chat log written before the language was switched).
   Rule for the whole module: NEVER compare stored text with one localize() call; ask isLabel(text, key) / labelVariants(key), which know every
   rendering of the key: English (the system's own file), Polish (lang/pl.json of this module) and whatever the client shows now.
   The table lists only the keys the module matches on; scripts/i18n/check-glossary.mjs proves each row equals the two language files. Pure:
   no Foundry global is needed at import time. */
const A = "INVINCIBLE.Actor.base.FIELDS.";
export const MATCH_LABELS = Object.freeze({
  "INVINCIBLE.Chat.DamageInfo.DamageTaken": ["Damage Taken", "Otrzymane obrażenia"],
  "INVINCIBLE.Stunts.DoubleDamage.stunt": ["Double Damage", "Podwójne obrażenia"],
  "TYPES.Actor.minions": ["Minions", "Sługusy"],
  [`${A}attributes.fighting.label`]: ["Fighting", "Walka"],
  [`${A}attributes.agility.label`]: ["Agility", "Zwinność"],
  [`${A}attributes.strength.label`]: ["Strength", "Siła"],
  [`${A}attributes.reason.label`]: ["Reason", "Rozum"],
  [`${A}attributes.intuition.label`]: ["Intuition", "Intuicja"],
  [`${A}attributes.presence.label`]: ["Presence", "Prezencja"],
  [`${A}derived.slugfest.wreckZoneBonus`]: ["Wreck Zone", "Demolka strefy"],
  [`${A}derived.slugfest.charge`]: ["Charge", "Szarża"],
  [`${A}derived.slugfest.grapple`]: ["Grapple", "Chwyt"],
  [`${A}block.label`]: ["Block", "Blok"],
  [`${A}dodge.label`]: ["Dodge", "Unik"],
});
const norm = (s) => String(s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const fold = (s) => norm(s).toLocaleLowerCase();

/** Every known rendering of a system key: the table's English and Polish plus what this client shows now (a third language, a changed file). */
export function labelVariants(key) {
  const out = new Set((MATCH_LABELS[key] ?? []).map(norm));
  try {
    const i18n = globalThis.game?.i18n;
    if (i18n?.has?.(key)) out.add(norm(i18n.localize(key)));
    const fb = globalThis.foundry?.utils?.getProperty?.(i18n?._fallback ?? {}, key);
    if (typeof fb === "string" && fb) out.add(norm(fb));
  } catch { /* the table is enough */ }
  out.delete("");
  return [...out];
}
/** Is this stored text the label of `key`, in any language we know? (case and surrounding space do not matter) */
export const isLabel = (text, key) => { const t = fold(text); return !!t && labelVariants(key).some((v) => fold(v) === t); };
/** Does the text contain the label as a whole word (not a substring: "Roadblock" is not "Block")? */
export function hasLabelWord(text, key) {
  const f = fold(text);
  if (!f) return false;
  return labelVariants(key).some((v) => {
    const esc = fold(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !!esc && new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, "u").test(f);
  });
}
/** What this client shows for the key (the table's English when the key is unknown here). */
export function labelNow(key) {
  try { const i18n = globalThis.game?.i18n; if (i18n?.has?.(key)) return i18n.localize(key); } catch { /* fall through */ }
  return MATCH_LABELS[key]?.[0] ?? key;
}
