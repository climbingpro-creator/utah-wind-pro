/**
 * Daily Fly Recommendation Engine
 *
 * Combines NWS forecast (sky condition), wind speed, water temperature,
 * barometric pressure, moon phase, and the seasonal hatch calendar to
 * produce ranked fly-pattern picks for each time window of the day.
 *
 * Weather-to-hatch rules are based on well-established entomology:
 *   - Overcast/drizzle triggers BWO hatches (Baetis love low light)
 *   - Wind pushes terrestrials into the water (hoppers, ants, beetles)
 *   - Falling pressure activates aggressive feeding → streamers
 *   - Cold water constrains everything to midges
 *   - Rain = subsurface: worms, eggs, attractor nymphs
 */

// ─── Sky condition parser ────────────────────────────────────────

export function parseSkyCondition(shortForecast) {
  if (!shortForecast) return 'clear';
  const t = shortForecast.toLowerCase();

  if (/thunder|tstorm|t-storm/.test(t)) return 'storm';
  if (/heavy rain|rain shower|showers/.test(t)) return 'rain';
  if (/drizzle|light rain|sprinkle/.test(t)) return 'drizzle';
  if (/snow|sleet|freezing/.test(t)) return 'storm';
  if (/overcast|mostly cloudy/.test(t)) return 'overcast';
  if (/cloudy|clouds/.test(t)) return 'cloudy';
  if (/partly/.test(t)) return 'partly';
  if (/sunny|clear|fair/.test(t)) return 'clear';
  return 'partly';
}

const SKY_LABELS = {
  clear: 'Clear skies',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  overcast: 'Overcast',
  drizzle: 'Drizzle / light rain',
  rain: 'Rain',
  storm: 'Thunderstorms',
};

// ─── Fly pattern database ────────────────────────────────────────
// Each entry: { name, size, patterns[], method, category }
// category: 'dry' | 'nymph' | 'streamer' | 'emerger' | 'terrestrial' | 'wet'

const FLIES = {
  bwo:          { name: 'Blue Winged Olive',  size: '#18-22', patterns: ['Parachute BWO', 'RS2', 'Sparkle Dun', "Barr's Emerger"], method: 'Dead drift in seams and tailouts', category: 'dry' },
  bwoNymph:     { name: 'BWO Nymph',          size: '#18-22', patterns: ['Pheasant Tail', 'RS2 Nymph', 'WD-40', "Barr's Emerger"], method: 'Nymph rig through runs, 12-18" deep', category: 'nymph' },
  pmd:          { name: 'Pale Morning Dun',    size: '#16-18', patterns: ['PMD Emerger', 'Sparkle Dun', 'Pheasant Tail'], method: 'Dry-dropper rig in riffles, midday', category: 'dry' },
  caddis:       { name: 'Caddis',              size: '#14-16', patterns: ['Elk Hair Caddis', 'X-Caddis', 'LaFontaine Sparkle Pupa'], method: 'Skate or dead drift, afternoon/evening', category: 'dry' },
  caddisEmerger:{ name: 'Caddis Emerger',      size: '#14-16', patterns: ['LaFontaine Sparkle Pupa', 'Soft Hackle Caddis'], method: 'Swing through tailouts at dusk', category: 'emerger' },
  midge:        { name: 'Midge',               size: '#20-24', patterns: ['Zebra Midge', 'Thread Midge', "Griffith's Gnat"], method: 'Slow nymph rig, 6X-7X tippet, dead drift', category: 'nymph' },
  midgeDry:     { name: 'Midge Cluster',       size: '#20-24', patterns: ["Griffith's Gnat", 'Parachute Midge'], method: 'Dead drift in foam lines during midge clouds', category: 'dry' },
  hopper:       { name: 'Grasshopper',         size: '#8-12',  patterns: ['Chubby Chernobyl', 'Hopper', 'Dave\'s Hopper'], method: 'Cast tight to banks, let it sit', category: 'terrestrial' },
  ant:          { name: 'Ant',                  size: '#14-18', patterns: ['Foam Ant', 'Parachute Ant', 'Cinnamon Ant'], method: 'Dead drift along shaded banks', category: 'terrestrial' },
  beetle:       { name: 'Beetle',               size: '#14-16', patterns: ['Foam Beetle', 'Crowe Beetle'], method: 'Dead drift under overhanging trees', category: 'terrestrial' },
  stonefly:     { name: 'Stonefly',             size: '#8-12',  patterns: ["Pat's Rubber Legs", 'Stimulator', 'Golden Stone'], method: 'Nymph deep in fast water or dry on the surface', category: 'nymph' },
  streamer:     { name: 'Streamer',             size: '#4-8',   patterns: ['Woolly Bugger', 'Sculpin', 'Articulated Streamer'], method: 'Strip through deep pools and undercut banks', category: 'streamer' },
  eggPattern:   { name: 'Egg Pattern',          size: '#10-14', patterns: ['Glo-Bug', 'Sucker Spawn', 'Scrambled Egg'], method: 'Dead drift below spawning gravel', category: 'nymph' },
  worm:         { name: 'San Juan Worm',        size: '#12-16', patterns: ['San Juan Worm (red)', 'Squirmy Wormy', 'Wire Worm'], method: 'Dead drift on bottom, heavy split shot', category: 'nymph' },
  scud:         { name: 'Scud',                 size: '#14-18', patterns: ['Orange Scud', 'Pink Scud', 'Sowbug'], method: 'Dead drift near weed beds and spring creeks', category: 'nymph' },
  trico:        { name: 'Trico',                size: '#20-24', patterns: ['Trico Spinner', 'CDC Trico', 'Parachute Trico'], method: 'Dead drift spinner falls, early morning', category: 'dry' },
  cicada:       { name: 'Cicada',               size: '#4-8',   patterns: ['Foam Cicada', 'Club Sandwich'], method: 'Slap cast, let sit, twitch — Green River only', category: 'terrestrial' },
  damsel:       { name: 'Damselfly',            size: '#10-12', patterns: ['Damsel Nymph', 'Marabou Damsel'], method: 'Slow strip in stillwaters near weeds', category: 'nymph' },
  mouse:        { name: 'Mouse Pattern',        size: '#2-6',   patterns: ['Morrish Mouse', 'Whitlock Mouse'], method: 'Dead of night — swing across current for trophy browns', category: 'dry' },

  // ── Stillwater-specific patterns ──
  chironomid:   { name: 'Chironomid',           size: '#14-18', patterns: ['Chromie', 'Ice Cream Cone', 'Copper Top', 'Snow Cone'], method: 'Under indicator at exact depth, 6X tippet, stillwater', category: 'nymph' },
  balancedLeech:{ name: 'Balanced Leech',        size: '#10-14', patterns: ['Balanced Leech (maroon)', 'Balanced Leech (olive)', 'Balance Leech (black)'], method: 'Under indicator, let it hang and undulate — deadly in stillwater', category: 'nymph' },
  boatman:      { name: 'Water Boatman',         size: '#14-16', patterns: ['Glass Bead Boatman', 'Foam Boatman'], method: 'Slow strip near weed beds, fall migration triggers', category: 'nymph' },
  callibaetis:  { name: 'Callibaetis',           size: '#14-16', patterns: ['Parachute Callibaetis', 'Callibaetis Spinner', 'Callibaetis Nymph'], method: 'Dead drift on calm surface or nymph under indicator', category: 'dry' },
  blob:         { name: 'Blob / Booby',          size: '#10-12', patterns: ['FAB Blob', 'Booby', 'Mini Egg'], method: 'Fast strip near weed beds — triggers reaction strikes', category: 'attractor' },
  buggerStill:  { name: 'Woolly Bugger (Stillwater)', size: '#8-12', patterns: ['Olive Bugger', 'Black Bugger', 'Crystal Bugger'], method: 'Slow strip off drop-offs and weed edges from float tube', category: 'streamer' },
  dragonfly:    { name: 'Dragonfly Nymph',       size: '#8-10',  patterns: ['Carey Special', 'Dragonfly Nymph', 'Bead-Head Dragon'], method: 'Slow strip near bottom structure in shallow bays', category: 'nymph' },
  backswimmer:  { name: 'Backswimmer',           size: '#14-16', patterns: ['Foam Backswimmer', 'Flashback Backswimmer'], method: 'Strip-pause near surface — mimics darting swim pattern', category: 'nymph' },
};

// ─── Weather-to-fly rules engine ─────────────────────────────────

function getMonthRange(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function buildCandidates({ month, waterTemp, windSpeed, sky, pressureTrend, hour, locationId, locationType, ecosystem }) {
  const season = getMonthRange(month);
  const candidates = [];

  function add(fly, confidence, reason, timeWindow) {
    candidates.push({ ...FLIES[fly], flyKey: fly, confidence, reason, timeWindow });
  }

  const isOvercast = sky === 'overcast' || sky === 'cloudy' || sky === 'drizzle';
  const isRaining = sky === 'rain' || sky === 'storm' || sky === 'drizzle';
  const isClear = sky === 'clear' || sky === 'partly';
  const isWindy = windSpeed >= 8;
  const isCalm = windSpeed < 5;
  const isCold = waterTemp != null && waterTemp < 40;
  const isCool = waterTemp != null && waterTemp >= 40 && waterTemp < 55;
  const isPrime = waterTemp != null && waterTemp >= 50 && waterTemp <= 65;
  const isWarm = waterTemp != null && waterTemp > 65;
  const isFalling = pressureTrend === 'falling';
  const isGreenRiver = locationId === 'green-river' || locationId === 'flaming-gorge';
  const isStillwater = locationType === 'reservoir' || locationType === 'lake';

  const eco = ecosystem || null;
  const inverts = eco?.invertebrates || {};
  const ecoHatches = eco?.hatches || {};
  const ecoForage = [...(eco?.forage?.primary || []), ...(eco?.forage?.secondary || [])];
  const forageFlies = new Set();
  ecoForage.forEach(f => (f.matchFly || []).forEach(k => forageFlies.add(k)));

  // ── COLD WATER (< 40F) — midges dominate ──
  if (isCold) {
    add('midge', 95, 'Water below 40°F — midges are the only game', 'midday');
    add('midgeDry', 55, 'Watch for midge clusters on surface 11am–2pm', 'midday');
    add('worm', 50, 'San Juan Worm as a dropper below midge', 'all-day');
    if (isFalling) add('streamer', 45, 'Falling pressure may trigger aggressive takes', 'morning');
    return candidates;
  }

  // ── WARM WATER (> 65F) — stress warning ──
  if (isWarm) {
    add('streamer', 70, 'Water above 65°F — fish early AM only with streamers', 'early-morning');
    add('midge', 40, 'Early morning midges before temps rise', 'early-morning');
    return candidates;
  }

  // ── BWO (Blue Winged Olive) — the overcast/cloud rule ──
  // BWO hatch in spring (Mar-May) and fall (Sep-Nov) on cloudy/overcast days
  const isBWOSeason = [3, 4, 5, 9, 10, 11].includes(month);
  if (isBWOSeason && isOvercast) {
    add('bwo', 95, `${SKY_LABELS[sky]} — BWO hatch highly likely. Baetis love low light.`, 'midday');
    add('bwoNymph', 80, 'Trail a BWO nymph 18" below the dry as a dropper', 'morning');
  } else if (isBWOSeason && sky === 'partly') {
    add('bwo', 60, 'Partly cloudy — BWO may come off during cloudier windows', 'midday');
    add('bwoNymph', 70, 'Nymph the BWO pattern until clouds build', 'morning');
  } else if (isBWOSeason) {
    add('bwoNymph', 45, 'BWO nymph still productive subsurface even on clear days', 'morning');
  }

  // ── WINTER (Dec, Jan, Feb) — midges + deep nymphs ──
  if (season === 'winter') {
    add('midge', 90, 'Winter tailwater — midges are primary food source', 'midday');
    add('midgeDry', 55, 'Watch for midge clusters on warm afternoons (11am-2pm)', 'midday');
    add('worm', 60, 'San Juan Worm as an attractor/dropper', 'all-day');
    if (month === 2 && isOvercast) {
      add('bwo', 50, 'Late Feb — early BWOs possible on overcast days', 'midday');
    }
    if (isFalling) add('streamer', 55, 'Falling pressure — browns may chase a streamer', 'morning');
    return candidates;
  }

  // ── PMD / Caddis (May–Jul, afternoon, needs some warmth) ──
  if ([5, 6, 7].includes(month) && isPrime) {
    if (isClear || sky === 'partly') {
      add('pmd', 75, 'Clear to partly cloudy + prime temps — PMD hatch likely afternoon', 'afternoon');
      add('caddis', 70, 'Caddis active afternoon through dusk', 'evening');
      add('caddisEmerger', 65, 'Swing caddis emergers at dusk for aggressive takes', 'evening');
    } else {
      add('pmd', 55, 'PMDs can still emerge on cloudy days, just later', 'afternoon');
      add('caddis', 60, 'Caddis are less light-sensitive — still active', 'evening');
    }
  }

  // ── TERRESTRIALS (Jun–Sep, wind is key) ──
  if ([6, 7, 8, 9].includes(month)) {
    if (isWindy) {
      add('hopper', 92, `Wind ${Math.round(windSpeed)} mph — blowing grasshoppers into the water`, 'afternoon');
      add('ant', 70, 'Windy conditions push ants off vegetation too', 'afternoon');
      add('beetle', 55, 'Beetle as an alternative bank-side pattern', 'afternoon');
    } else if (isClear) {
      add('hopper', 65, 'Sunny + calm — hopper-dropper along grassy banks', 'afternoon');
      add('ant', 55, 'Ant pattern under trees and shaded banks', 'afternoon');
    } else {
      add('hopper', 40, 'Overcast dampens terrestrial activity, but still worth trying', 'afternoon');
    }
  }

  // ── CICADA (June only, Green River) ──
  if (month === 6 && isGreenRiver) {
    add('cicada', 85, 'June on the Green — the legendary cicada hatch', 'all-day');
  }

  // ── TRICO (Jul–Aug, early morning, calm) ──
  if ([7, 8].includes(month) && isCalm) {
    add('trico', 60, 'Calm morning — trico spinner falls likely at dawn', 'early-morning');
  }

  // ── STONEFLY (Apr–Jun, freestone water) ──
  if ([4, 5, 6].includes(month)) {
    add('stonefly', 55, 'Stonefly nymph as subsurface anchor pattern', 'morning');
  }

  // ── RAIN / STORM — subsurface dominant ──
  if (isRaining) {
    add('worm', 85, `${SKY_LABELS[sky]} — worms wash in, fish key on them`, 'all-day');
    add('eggPattern', 60, 'Egg patterns in discolored water', 'all-day');
    if (season === 'fall') {
      add('streamer', 70, 'Rain + fall = aggressive browns chasing streamers', 'all-day');
    }
  }

  // ── FALLING PRESSURE — aggressive feeding ──
  if (isFalling && !isRaining) {
    add('streamer', 75, 'Falling barometer — fish feeding aggressively, go big', 'morning');
    if (season === 'fall') {
      add('eggPattern', 55, 'Falling pressure + fall = pre-spawn aggression', 'all-day');
    }
  }

  // ── FALL STREAMERS (Oct–Nov) — trophy season ──
  if ([10, 11].includes(month)) {
    const streamerConf = isFalling ? 90 : isOvercast ? 80 : 65;
    add('streamer', streamerConf, 'Trophy brown season — streamers along undercut banks', 'morning');
    add('eggPattern', 60, 'Egg patterns below spawning gravel — browns are on redds', 'all-day');
  }

  // ── SCUD (year-round on tailwaters, spring creeks) ──
  if (isCool) {
    add('scud', 45, 'Cool water — scud/sowbug as a reliable subsurface option', 'all-day');
  }

  // ── EVENING — always consider emergers/mouse ──
  if (hour >= 17 && season !== 'winter') {
    add('caddisEmerger', 60, 'Evening — caddis emergers as light fades', 'evening');
    if (season === 'summer' || season === 'fall') {
      add('mouse', 35, 'After dark — mouse pattern for trophy browns (advanced)', 'evening');
    }
  }

  // ── STILLWATER PATTERNS (reservoirs & lakes) ──
  if (isStillwater) {
    // Chironomids dominate cold stillwater (ice-off through late spring, and fall)
    if (isCool || isCold) {
      add('chironomid', 92, 'Cold stillwater — chironomids are the primary food source. Indicator at exact depth.', 'all-day');
      add('balancedLeech', 78, 'Balanced leech under indicator — deadly in cold stillwater', 'all-day');
    } else if (isPrime) {
      add('chironomid', 70, 'Chironomids still active in prime temps — especially mornings', 'morning');
    }

    // Callibaetis on calm sunny days (May-Sep)
    if ([5, 6, 7, 8, 9].includes(month) && isCalm && isClear) {
      add('callibaetis', 85, 'Calm + sunny stillwater — callibaetis hatch. Dead drift on surface or nymph underneath.', 'midday');
    } else if ([5, 6, 7, 8, 9].includes(month)) {
      add('callibaetis', 55, 'Callibaetis nymph under indicator — productive in reservoirs', 'midday');
    }

    // Leeches for overcast/windy stillwater days
    if (isOvercast || isWindy) {
      add('balancedLeech', 85, 'Overcast/windy stillwater — leech patterns are top producers', 'all-day');
      add('buggerStill', 80, 'Woolly Bugger stripped along weed edges and drop-offs', 'all-day');
    }

    // Damselflies warm-water weedy reservoirs (Jun-Aug)
    if ([6, 7, 8].includes(month) && (isPrime || isWarm)) {
      add('damsel', 82, 'Summer stillwater near weed beds — damsel nymph migration is on', 'midday');
      add('dragonfly', 65, 'Dragon nymph slow-stripped near bottom in shallow bays', 'morning');
    }

    // Boatman (Sep-Oct fall migration)
    if ([9, 10].includes(month)) {
      add('boatman', 72, 'Fall water boatman migration — slow strip near weed beds', 'afternoon');
    }

    // Backswimmer (summer, warm shallows)
    if ([6, 7, 8].includes(month) && isClear) {
      add('backswimmer', 55, 'Backswimmer near surface in warm shallows — strip-pause', 'afternoon');
    }

    // Blob/attractor when nothing else works
    if (candidates.length < 4) {
      add('blob', 50, 'Blob/attractor pattern — fast strip triggers reaction strikes in stillwater', 'all-day');
    }

    // Stillwater streamer is always an option
    add('buggerStill', 60, 'Woolly Bugger slow strip from float tube — always works in stillwater', 'all-day');

    // Scud in weedy reservoirs year-round
    add('scud', 65, 'Scud under indicator near weed beds — year-round stillwater staple', 'all-day');
  }

  // ── ECOSYSTEM-DRIVEN HATCH BOOSTS ──
  if (eco && candidates.length > 0) {
    candidates.forEach(c => {
      const ecoH = ecoHatches[c.flyKey];
      if (ecoH && ecoH.months?.includes(month)) {
        const intensityBoost = ecoH.intensity === 'extreme' ? 12 : ecoH.intensity === 'heavy' ? 8 : ecoH.intensity === 'moderate' ? 4 : 0;
        if (intensityBoost > 0) {
          c.confidence = Math.min(100, c.confidence + intensityBoost);
          c.reason += ` [${ecoH.intensity} local hatch${ecoH.notes ? ': ' + ecoH.notes : ''}]`;
        }
      }
    });
  }

  // ── ECOSYSTEM INVERTEBRATE BOOSTS ──
  if (eco) {
    if (inverts.scuds === 'extreme' || inverts.scuds === 'high') {
      const existing = candidates.find(c => c.flyKey === 'scud');
      if (existing) {
        existing.confidence = Math.min(100, existing.confidence + (inverts.scuds === 'extreme' ? 15 : 10));
        existing.reason += ' [Scud-rich ecosystem]';
      } else {
        add('scud', inverts.scuds === 'extreme' ? 80 : 70, `${inverts.scuds === 'extreme' ? 'EXTREME' : 'High'} scud population — always productive here`, 'all-day');
      }
    }
    if (inverts.leeches === 'high' || inverts.leeches === 'moderate') {
      const existing = candidates.find(c => c.flyKey === 'balancedLeech');
      if (existing) {
        existing.confidence = Math.min(100, existing.confidence + 6);
        existing.reason += ' [Leeches present in ecosystem]';
      } else if (isStillwater) {
        add('balancedLeech', inverts.leeches === 'high' ? 72 : 60, 'Leech population supports leech patterns here', 'all-day');
      }
    }
    if (inverts.sowbugs === 'high') {
      const existing = candidates.find(c => c.flyKey === 'scud');
      if (existing) {
        existing.confidence = Math.min(100, existing.confidence + 5);
        existing.reason += ' [Sowbug-rich]';
      }
    }
  }

  // ── ECOSYSTEM FORAGE-MATCHED STREAMERS ──
  if (eco && forageFlies.has('streamer')) {
    const streamerEntry = candidates.find(c => c.flyKey === 'streamer' || c.flyKey === 'buggerStill');
    const sculpinForage = ecoForage.some(f => f.name.toLowerCase().includes('sculpin'));
    const crawForage = ecoForage.some(f => f.name.toLowerCase().includes('crayfish') || f.name.toLowerCase().includes('crawfish'));
    if (streamerEntry) {
      if (sculpinForage) {
        streamerEntry.confidence = Math.min(100, streamerEntry.confidence + 6);
        streamerEntry.reason += ' [Match sculpin forage — olive/brown]';
      }
      if (crawForage) {
        streamerEntry.confidence = Math.min(100, streamerEntry.confidence + 4);
        streamerEntry.reason += ' [Match crayfish forage — brown/orange]';
      }
    }
    if (hasChubForage(ecoForage) && !candidates.find(c => c.flyKey === 'streamer')) {
      add('streamer', 55, 'Chub forage present — larger streamer patterns to match', 'morning');
    }
  }

  // ── UNIVERSAL SUBSURFACE — always viable ──
  if (candidates.length < 3) {
    add('worm', 40, 'San Juan Worm — always a solid searching pattern', 'all-day');
    add('scud', 35, 'Scud/sowbug as a reliable nymph option', 'all-day');
  }

  return candidates;
}

function hasChubForage(forageList) {
  return forageList.some(f => f.name.toLowerCase().includes('chub'));
}

// ─── Time window labels ──────────────────────────────────────────

const TIME_WINDOW_ORDER = ['early-morning', 'morning', 'midday', 'afternoon', 'evening', 'all-day'];
const TIME_WINDOW_LABELS = {
  'early-morning': '6–8 AM',
  'morning': '8–11 AM',
  'midday': '11 AM – 2 PM',
  'afternoon': '2–5 PM',
  'evening': '5 PM – dark',
  'all-day': 'All day',
};

// ─── Nymph vs Dry decision ───────────────────────────────────────

function getNymphVsDry(sky, windSpeed, waterTemp, month) {
  const season = getMonthRange(month);

  if (waterTemp != null && waterTemp < 45) return { pick: 'nymph', reason: 'Cold water — fish are holding deep, nymph rigs are most effective' };
  if (sky === 'rain' || sky === 'storm') return { pick: 'nymph', reason: 'Rain/storm — fish subsurface with nymphs and worms' };
  if (windSpeed >= 15) return { pick: 'nymph', reason: 'High wind makes dry fly presentation impossible — go subsurface' };
  if (season === 'winter') return { pick: 'nymph', reason: 'Winter — nymph deep with midges, occasional dry if midging on surface' };

  if (sky === 'overcast' && [3, 4, 5, 9, 10, 11].includes(month)) return { pick: 'dry', reason: 'Overcast in BWO season — dry fly fishing at its best' };
  if (windSpeed >= 8 && [6, 7, 8, 9].includes(month)) return { pick: 'dry', reason: 'Wind + summer = terrestrials on top. Dry fly all the way.' };
  if (sky === 'clear' && [5, 6, 7].includes(month)) return { pick: 'dry-dropper', reason: 'Clear + warm — run a dry-dropper rig to cover both' };

  return { pick: 'dry-dropper', reason: 'Mixed conditions — dry-dropper rig gives you the best of both worlds' };
}

// ─── Public API ──────────────────────────────────────────────────

export function getDailyFlyPick({
  month = new Date().getMonth() + 1,
  waterTemp = null,
  windSpeed = 5,
  skyCondition = 'partly',
  pressure = 30.0,
  pressureTrend = 'stable',
  hour = new Date().getHours(),
  locationId = 'provo-river',
  locationType = 'river',
  ecosystem = null,
} = {}) {
  const candidates = buildCandidates({
    month,
    waterTemp,
    windSpeed,
    sky: skyCondition,
    pressureTrend,
    hour,
    locationId,
    locationType,
    ecosystem,
  });

  // Deduplicate by flyKey, keeping highest confidence
  const byKey = {};
  for (const c of candidates) {
    if (!byKey[c.flyKey] || c.confidence > byKey[c.flyKey].confidence) {
      byKey[c.flyKey] = c;
    }
  }

  const ranked = Object.values(byKey)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  const nymphVsDry = getNymphVsDry(skyCondition, windSpeed, waterTemp, month);

  // Build time-of-day guide from top picks
  const timeGuide = [];
  const used = new Set();
  for (const tw of TIME_WINDOW_ORDER) {
    const pick = ranked.find(r => r.timeWindow === tw && !used.has(r.flyKey));
    if (pick) {
      timeGuide.push({ window: tw, label: TIME_WINDOW_LABELS[tw], fly: pick.name, size: pick.size, flyKey: pick.flyKey });
      used.add(pick.flyKey);
    }
  }

  const eco = ecosystem;
  return {
    picks: ranked,
    topPick: ranked[0] || null,
    alternatives: ranked.slice(1, 4),
    nymphVsDry,
    timeGuide,
    skyLabel: SKY_LABELS[skyCondition] || skyCondition,
    skyCondition,
    ecosystemInfo: eco ? {
      activeHatches: Object.entries(eco.hatches || {})
        .filter(([, h]) => h.months?.includes(month))
        .map(([key, h]) => ({ key, name: key, intensity: h.intensity, notes: h.notes })),
      invertebrates: eco.invertebrates,
      predatorPrey: eco.predatorPrey,
    } : null,
  };
}

export { TIME_WINDOW_LABELS, parseSkyCondition as parseSky };
