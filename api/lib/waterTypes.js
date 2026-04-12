/**
 * Lightweight server-side lookup: locationId -> { type, name, depths, primarySpecies,
 *   regulations, allowedMethods }
 *
 * Extracted from FISHING_LOCATIONS in FishingMode.jsx so the API layer
 * doesn't import the full React component.
 *
 * allowedMethods: ['fly','spin','bait'] — which gear types are legal.
 *   Derived from the Utah Fishing Proclamation regulations per water.
 *   - 'fly'  = artificial flies
 *   - 'spin' = artificial lures (spinners, spoons, plugs, jigs)
 *   - 'bait' = natural/prepared bait (worms, PowerBait, salmon eggs, etc.)
 */

const WATER_LOCATIONS = {
  // ── Rivers ──
  'provo-lower':      { type: 'river', name: 'Lower Provo River', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only. Closed to cutthroat harvest.', allowedMethods: ['fly', 'spin'] },
  'provo-middle':     { type: 'river', name: 'Middle Provo River', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only on some sections. Check UDWR for current regs.', allowedMethods: ['fly', 'spin'] },
  'provo-upper':      { type: 'river', name: 'Upper Provo River', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only. Check UDWR for current section-specific regulations.', allowedMethods: ['fly', 'spin'] },
  'weber-upper':      { type: 'river', name: 'Weber River — Upper', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only. 2 trout under 15".', allowedMethods: ['fly', 'spin'] },
  'weber-middle':     { type: 'river', name: 'Weber River — Middle', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only. 2 trout under 15".', allowedMethods: ['fly', 'spin'] },
  'weber-lower':      { type: 'river', name: 'Weber River — Lower', primarySpecies: 'Brown Trout', regulations: 'All methods allowed. 4 trout limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'green-a':          { type: 'river', name: 'Green River — A Section', primarySpecies: 'Rainbow Trout', regulations: 'Artificial flies and lures only. 3 trout limit, only 1 over 20".', allowedMethods: ['fly', 'spin'] },
  'green-b':          { type: 'river', name: 'Green River — B Section', primarySpecies: 'Brown Trout', regulations: 'Artificial flies and lures only. 2 trout limit, only 1 over 20".', allowedMethods: ['fly', 'spin'] },
  'green-c':          { type: 'river', name: 'Green River — C Section', primarySpecies: 'Brown Trout', regulations: 'All methods allowed including bait. 8 trout limit.', allowedMethods: ['fly', 'spin', 'bait'] },

  // ── Lakes & Reservoirs ──
  'strawberry':       { type: 'reservoir', name: 'Strawberry Reservoir', primarySpecies: 'Cutthroat Trout', depths: { spring: '5-20 ft', summer: '20-50 ft', fall: '10-30 ft' }, regulations: 'Limit 4 trout. NO KEEPING Cutthroat between 15-22 inches.', allowedMethods: ['fly', 'spin', 'bait'] },
  'flaming-gorge':    { type: 'reservoir', name: 'Flaming Gorge', primarySpecies: 'Lake Trout', depths: { spring: '20-60 ft', summer: '70-120 ft', fall: '40-80 ft' }, regulations: 'Lake trout: 8 fish limit, only 1 over 28".', allowedMethods: ['fly', 'spin', 'bait'] },
  'deer-creek':       { type: 'reservoir', name: 'Deer Creek Reservoir', primarySpecies: 'Walleye', depths: { spring: '8-25 ft', summer: '20-45 ft', fall: '15-35 ft' }, regulations: 'Walleye: 6 fish limit, only 1 over 24".', allowedMethods: ['fly', 'spin', 'bait'] },
  'utah-lake':        { type: 'lake', name: 'Utah Lake', primarySpecies: 'Channel Catfish', depths: { spring: '4-12 ft', summer: '6-14 ft', fall: '5-12 ft' }, regulations: 'Catfish: No limit. Carp bow fishing allowed.', allowedMethods: ['fly', 'spin', 'bait'] },
  'jordanelle':       { type: 'reservoir', name: 'Jordanelle Reservoir', primarySpecies: 'Smallmouth Bass', depths: { spring: '8-20 ft', summer: '15-35 ft', fall: '10-25 ft' }, regulations: 'Bass: 6 fish limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'pineview':         { type: 'reservoir', name: 'Pineview Reservoir', primarySpecies: 'Tiger Muskie', depths: { spring: '5-15 ft', summer: '15-30 ft', fall: '10-25 ft' }, regulations: 'Tiger Muskie: Catch & release only.', allowedMethods: ['fly', 'spin', 'bait'] },
  'bear-lake':        { type: 'lake', name: 'Bear Lake', primarySpecies: 'Cutthroat Trout', depths: { spring: '5-30 ft', summer: '40-100 ft', fall: '20-60 ft' }, regulations: 'Lake trout: 3 fish limit. Cutthroat: 2 fish limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'willard-bay':      { type: 'reservoir', name: 'Willard Bay', primarySpecies: 'Wiper', depths: { spring: '4-15 ft', summer: '6-20 ft', fall: '5-15 ft' }, regulations: 'Gizzard shad: unlawful to possess (forage species).', allowedMethods: ['fly', 'spin', 'bait'] },
  'starvation':       { type: 'reservoir', name: 'Starvation Reservoir', primarySpecies: 'Walleye', depths: { spring: '8-25 ft', summer: '20-50 ft', fall: '15-35 ft' }, regulations: 'Walleye: 6 fish limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'yuba':             { type: 'reservoir', name: 'Yuba Reservoir', primarySpecies: 'Walleye', depths: { spring: '5-20 ft', summer: '15-40 ft', fall: '10-30 ft' }, regulations: 'Northern pike: unlimited harvest (invasive management).', allowedMethods: ['fly', 'spin', 'bait'] },
  'scofield':         { type: 'reservoir', name: 'Scofield Reservoir', primarySpecies: 'Cutthroat Trout', depths: { spring: '5-15 ft', summer: '10-30 ft', fall: '5-20 ft' }, regulations: 'Cutthroat/Tiger trout 15-22" must be released. Combined limit 4.', allowedMethods: ['fly', 'spin', 'bait'] },
  'lake-powell':      { type: 'reservoir', name: 'Lake Powell', primarySpecies: 'Striped Bass', depths: { spring: '15-50 ft', summer: '30-80 ft', fall: '10-40 ft' }, regulations: 'Striped bass: unlimited harvest. No size limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'sand-hollow':      { type: 'reservoir', name: 'Sand Hollow', primarySpecies: 'Largemouth Bass', depths: { spring: '3-15 ft', summer: '10-30 ft', fall: '5-20 ft' }, regulations: 'Bass: 6 fish limit.', allowedMethods: ['fly', 'spin', 'bait'] },
  'sulfur-creek':     { type: 'reservoir', name: 'Sulfur Creek Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '10-25 ft', fall: '8-20 ft' }, regulations: 'Trout: 4 fish limit, artificial flies and lures only.', allowedMethods: ['fly', 'spin'] },
  'echo':             { type: 'reservoir', name: 'Echo Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '15-35 ft', fall: '10-25 ft' }, regulations: 'Standard Utah trout regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'rockport':         { type: 'reservoir', name: 'Rockport Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-20 ft', summer: '15-40 ft', fall: '10-30 ft' }, regulations: 'Standard Utah trout regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'east-canyon':      { type: 'reservoir', name: 'East Canyon Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '15-35 ft', fall: '10-25 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'hyrum':            { type: 'reservoir', name: 'Hyrum Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '10-25 ft', fall: '8-20 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'otter-creek':      { type: 'reservoir', name: 'Otter Creek Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '12-30 ft', fall: '8-20 ft' }, regulations: 'Standard Utah trout regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'fish-lake':        { type: 'natural_lake', name: 'Fish Lake', primarySpecies: 'Lake Trout', depths: { spring: '10-30 ft', summer: '30-80 ft', fall: '20-50 ft' }, regulations: 'Lake trout: No limit. Help remove invasive lakers.', allowedMethods: ['fly', 'spin', 'bait'] },
  'piute':            { type: 'reservoir', name: 'Piute Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '10-25 ft', fall: '8-20 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'minersville':      { type: 'reservoir', name: 'Minersville Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '10-25 ft', fall: '8-20 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'steinaker':        { type: 'reservoir', name: 'Steinaker Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '12-30 ft', fall: '8-20 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'red-fleet':        { type: 'reservoir', name: 'Red Fleet Reservoir', primarySpecies: 'Rainbow Trout', depths: { spring: '5-15 ft', summer: '12-30 ft', fall: '8-20 ft' }, regulations: 'Standard Utah regs.', allowedMethods: ['fly', 'spin', 'bait'] },
  'quail-creek':      { type: 'reservoir', name: 'Quail Creek Reservoir', primarySpecies: 'Largemouth Bass', depths: { spring: '3-12 ft', summer: '10-25 ft', fall: '5-15 ft' }, regulations: 'Standard Utah warm-water regs.', allowedMethods: ['fly', 'spin', 'bait'] },
};

// Legacy aliases
WATER_LOCATIONS['provo-river']  = WATER_LOCATIONS['provo-lower'];
WATER_LOCATIONS['middle-provo'] = WATER_LOCATIONS['provo-middle'];
WATER_LOCATIONS['green-river']  = WATER_LOCATIONS['green-a'];

// Strawberry sub-locations share the parent
for (const suffix of ['ladders', 'bay', 'soldier', 'view', 'river']) {
  WATER_LOCATIONS[`strawberry-${suffix}`] = WATER_LOCATIONS['strawberry'];
}
// Utah Lake sub-locations
for (const suffix of ['lincoln', 'sandy', 'vineyard']) {
  WATER_LOCATIONS[`utah-lake-${suffix}`] = WATER_LOCATIONS['utah-lake'];
}

export function getWaterType(locationId) {
  return WATER_LOCATIONS[locationId] || null;
}

export function isRiver(locationId) {
  return WATER_LOCATIONS[locationId]?.type === 'river';
}

export function isLake(locationId) {
  const t = WATER_LOCATIONS[locationId]?.type;
  return t === 'lake' || t === 'reservoir' || t === 'natural_lake';
}

export function getSeasonalDepth(locationId) {
  const loc = WATER_LOCATIONS[locationId];
  if (!loc?.depths) return null;
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return loc.depths.spring;
  if (m >= 5 && m <= 8) return loc.depths.summer;
  return loc.depths.fall;
}

/**
 * Returns the array of legal methods for a location: ['fly','spin','bait']
 * Falls back to all methods if unknown.
 */
export function getAllowedMethods(locationId) {
  return WATER_LOCATIONS[locationId]?.allowedMethods || ['fly', 'spin', 'bait'];
}

/**
 * Check if a specific method is legal at a location.
 */
export function isMethodAllowed(locationId, method) {
  const allowed = getAllowedMethods(locationId);
  return allowed.includes(method);
}

/**
 * Returns the regulation text for a location, or null.
 */
export function getRegulations(locationId) {
  return WATER_LOCATIONS[locationId]?.regulations || null;
}

/**
 * Returns true if bait is NOT allowed (fly & lure only waters).
 */
export function isBaitRestricted(locationId) {
  return !isMethodAllowed(locationId, 'bait');
}

export { WATER_LOCATIONS };
