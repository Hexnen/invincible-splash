/* Czytnik rzutu: ChatMessage z YearZeroRoll (system invincible) -> płaski opis rzutu "rd".
   Nie zakłada niczego poza strukturą wyników kości (results[].indexPush / indexResult / active / discarded). */

const ATTRS = ['fighting', 'agility', 'strength', 'reason', 'intuition', 'presence'];
const L = key => game.i18n.localize(key);
const attrLabel = a => L(`INVINCIBLE.Actor.base.FIELDS.attributes.${a}.label`);

/* Czy to rzut kośćmi bazowymi Year Zero z systemu invincible? */
export function getYZRoll(message) {
  const roll = message?.rolls?.[0];
  const term = roll?.terms?.[0];
  if (!roll || !term || !Array.isArray(term.results) || !term.results.length) return null;
  const isInv = roll.options?.game === 'inv' || term.constructor?.TYPE === 'base';
  return isInv ? roll : null;
}

/* Klasyfikacja akcji z danych dostępnych w dialogu rzutu albo (zapasowo) z gotowej wiadomości:
   attackType (slugfest/charge/shooting, tylko ataki), nazwa rzutu (flavor), nazwy z breakdown, atrybut. */
export function classify({ attackType, flavor, names = [], attribute = null }) {
  attribute = attribute ?? ATTRS.find(a => names[0] === attrLabel(a)) ?? null;
  const wreck = names.includes(L('INVINCIBLE.Actor.base.FIELDS.derived.slugfest.wreckZoneBonus'));
  const f = String(flavor ?? '').toLowerCase();
  /* cały wyraz (nie podciąg): "Roadblock" nie jest "Block", "Charged Beam" nie jest "Charge" */
  const has = key => {
    const t = L(key).toLowerCase();
    if (!t || t === key.toLowerCase()) return false;
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '($|[^\\p{L}\\p{N}])', 'u').test(f);
  };
  let action;
  if (attackType === 'charge' || attackType === 'shooting' || attackType === 'slugfest') action = attackType;   // jawny typ ataku z systemu
  else if (has('INVINCIBLE.Actor.base.FIELDS.derived.slugfest.charge')) action = 'charge';
  else if (has('INVINCIBLE.Actor.base.FIELDS.derived.slugfest.grapple')) action = 'grapple';
  else if (has('INVINCIBLE.Actor.base.FIELDS.block.label')) action = 'block';
  else if (has('INVINCIBLE.Actor.base.FIELDS.dodge.label')) action = 'dodge';
  else if (attribute === 'reason' || attribute === 'intuition' || attribute === 'presence') action = attribute;
  else action = 'generic';
  return { action, attribute, wreck };
}

/* Akcja i atrybut: najpierw znacznik z opakowanego dialogu, potem dopasowanie zlokalizowanych nazw. */
export function inferAction(roll, flavor) {
  const tag = roll.options?.splash;
  if (tag?.action) return { action: tag.action, attribute: tag.attribute ?? null, wreck: !!tag.wreck };
  const names = (roll.options?.breakdown ?? []).map(b => b?.name);
  return classify({ attackType: roll.options?.attackType, flavor, names });
}

export function readRoll(message) {
  const roll = getYZRoll(message);
  if (!roll) return null;
  const results = roll.terms[0].results;
  const idxPush = r => r.indexPush ?? 0;
  const initial = results.filter(r => idxPush(r) === 0).sort((a, b) => (a.indexResult ?? 0) - (b.indexResult ?? 0));
  const n = initial.length;
  if (n < 1) return null;

  const first = initial.map(r => r.result);
  const final = results.filter(r => r.active).sort((a, b) => (a.indexResult ?? 0) - (b.indexResult ?? 0)).map(r => r.result);
  const pushCount = roll.pushCount ?? results.reduce((m, r) => Math.max(m, idxPush(r)), 0);
  const pushed = pushCount > 0;
  const lastPush = results.filter(r => idxPush(r) === pushCount && pushed);
  const sixes = final.filter(v => v === 6).length;
  const newSixes = pushed ? lastPush.filter(r => r.result === 6).length : 0;
  const rerolled = pushed ? lastPush.length : 0;
  const pushable = !!roll.pushable;

  /* stres: system sam nalicza go dopiero gdy rzut nie jest już pushowalny (opcje.stressCost zawiera wtedy jedynki z pusha) */
  let stress = 0;
  if (!pushable) {
    stress = Math.max(roll.options?.stressCost ?? 0, pushed ? (roll.attributeTrauma ?? 0) : 0);
  }

  const actor = message.speakerActor ?? null;
  const { action, attribute, wreck } = inferAction(roll, message.flavor);
  return {
    n, first, final, sixes, newSixes, rerolled, pushed, pushCount, pushable,
    stress, stressPending: pushable,
    action, attribute, wreck,
    actorId: actor?.id ?? null, actorType: actor?.type ?? null,
    npc: actor ? actor.type !== 'superhero' : true,
    flavor: message.flavor ?? ''
  };
}
