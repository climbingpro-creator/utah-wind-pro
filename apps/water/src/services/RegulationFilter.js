/**
 * RegulationFilter.js — Gear restriction enforcement
 *
 * Cross-references utah-regulations.json to determine if a location
 * prohibits bait, and provides filter functions for both lure and
 * fly recommendation engines.
 */

import regulationsDb from '../data/utah-regulations.json';

const allWaters = regulationsDb.waters;

const BAIT_CATEGORIES = new Set(['bait']);

const BAIT_LURE_KEYS = new Set([
  'powerbait', 'powerbaitTrout', 'nightcrawler', 'waxWorm', 'minnowLive',
  'cutBait', 'chickenLiver', 'stinkBait', 'corn', 'marshmallow',
  'shrimpCrawdad', 'suckerMeat', 'bobberWorm', 'bottomRig',
  'crawlerHarness', 'popGearWorm', 'cowbellWorm',
]);

const BAIT_KEYWORDS = /\bpowerbait\b|\bnightcrawler\b|\bworm rig\b|\blive (?:minnow|bait)\b|\bcut bait\b|\bchicken liver\b|\bstink bait\b|\bcorn\b|\bmarshmallow\b|\bshrimp\b|\bcrawdad\b|\bsucker meat\b|\bdead bait\b|\bbobber\s*\+?\s*worm\b/i;

function findRegEntry(locationId) {
  if (!locationId) return null;
  const id = locationId.toLowerCase();

  if (allWaters[id]) return allWaters[id];

  for (const [, entry] of Object.entries(allWaters)) {
    if (entry.aliases?.includes(id)) return entry;
  }

  const baseId = id.replace(/-\d+$/, '').replace(/-(?:ladders|bay|soldier|view|river|lincoln|zigzag|vineyard|sandy|mm19|north|south)$/, '');
  if (allWaters[baseId]) return allWaters[baseId];
  for (const [, entry] of Object.entries(allWaters)) {
    if (entry.aliases?.includes(baseId)) return entry;
  }

  return null;
}

/**
 * Returns true if the location has "Artificial flies and lures only" restrictions.
 */
export function isArtificialOnly(locationId) {
  const entry = findRegEntry(locationId);
  if (!entry?.rules) return false;

  return entry.rules.some(
    r => r.type === 'gear' && /artificial\s+flies\s+and\s+lures\s+only/i.test(r.text)
  );
}

/**
 * Returns true if the location prohibits live baitfish but allows dead bait.
 */
export function isNoBaitfish(locationId) {
  const entry = findRegEntry(locationId);
  if (!entry?.rules) return false;

  return entry.rules.some(
    r => /no\s+live\s+baitfish/i.test(r.text)
  );
}

/**
 * Filters an array of lure candidates, removing bait-category items
 * when the location is artificial-only.
 */
export function filterBaitLures(candidates, lureDb, locationId) {
  if (!isArtificialOnly(locationId)) return candidates;

  return candidates.filter(c => {
    if (BAIT_LURE_KEYS.has(c.lureKey)) return false;

    const lure = lureDb[c.lureKey];
    if (!lure) return true;

    if (BAIT_CATEGORIES.has(lure.category)) return false;

    if (lure.name && BAIT_KEYWORDS.test(lure.name)) return false;
    if (lure.method && BAIT_KEYWORDS.test(lure.method)) return false;

    return true;
  });
}

/**
 * Strips bait references from LLM-generated text strings.
 * Used as a post-filter on Gemini/OpenAI outputs.
 */
export function sanitizeLLMText(text, locationId) {
  if (!text || !isArtificialOnly(locationId)) return text;

  return text
    .replace(/\bPowerBait[^,;.]*/gi, '')
    .replace(/\bnightcrawler[^,;.]*/gi, '')
    .replace(/\bworm(?:s)?\s+(?:rig|harness|tipped)[^,;.]*/gi, '')
    .replace(/\blive\s+(?:minnow|bait)[^,;.]*/gi, '')
    .replace(/\bcut\s+bait[^,;.]*/gi, '')
    .replace(/\bchicken\s+liver[^,;.]*/gi, '')
    .replace(/\bstink\s+bait[^,;.]*/gi, '')
    .replace(/\bcanned?\s+corn[^,;.]*/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Returns a human-readable gear restriction label for UI display.
 */
export function getGearRestrictionLabel(locationId) {
  const entry = findRegEntry(locationId);
  if (!entry?.rules) return null;

  const gearRule = entry.rules.find(r => r.type === 'gear');
  return gearRule?.text || null;
}
