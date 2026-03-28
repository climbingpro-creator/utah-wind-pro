/**
 * LureRecommender.js — Universal lure / bait / trolling recommendation engine
 *
 * Covers every angler type in Utah:
 *   • Bass (soft plastics, hard baits, topwater)
 *   • Bait fishing (PowerBait, worms, cut bait, live bait)
 *   • Trolling (dodger rigs, cowbells, downriggers, lead core)
 *   • Shore casting (spoons, spinners, bobber rigs, bottom rigs)
 *
 * Weather × species × method × season → ranked recommendations
 * Ecosystem-aware: forage matching, clarity-driven colors, thermocline-adjusted trolling
 */

// ─── LURE DATABASE ──────────────────────────────────────────────────
// ~55 entries across five categories

export const LURES = {
  // ── Bass — Soft Plastics ──
  senko:          { name: 'Senko / Stick Bait', size: '5"',    colors: ['Watermelon', 'Green Pumpkin', 'Junebug'], method: 'Weightless or wacky rig, let sink on slack line', category: 'soft-plastic', species: ['Largemouth Bass', 'Smallmouth Bass'], retrieve: 'deadfall', depthRange: [2, 15] },
  texasWorm:      { name: 'Texas-Rigged Worm', size: '7-10"',  colors: ['Plum', 'Black/Blue', 'Red Shad'],         method: 'Drag along bottom near cover', category: 'soft-plastic', species: ['Largemouth Bass'], retrieve: 'drag', depthRange: [5, 25] },
  nedRig:         { name: 'Ned Rig', size: '3"',               colors: ['Green Pumpkin', 'Smoke', 'TRD'],          method: 'Light jighead, drag on rock bottom', category: 'soft-plastic', species: ['Smallmouth Bass', 'Largemouth Bass'], retrieve: 'drag', depthRange: [5, 30] },
  tubeJig:        { name: 'Tube Jig', size: '3-4"',            colors: ['Smoke', 'Watermelon', 'White'],           method: 'Hop on rocky bottom or swim near structure', category: 'soft-plastic', species: ['Smallmouth Bass', 'Cutthroat Trout', 'Lake Trout'], retrieve: 'hop', depthRange: [5, 80] },
  crawTrailer:    { name: 'Jig + Craw Trailer', size: '3/8-1/2 oz', colors: ['Brown/Orange', 'Black/Blue', 'PB&J'], method: 'Pitch to cover, drag on bottom', category: 'soft-plastic', species: ['Largemouth Bass', 'Smallmouth Bass'], retrieve: 'drag', depthRange: [5, 35] },
  dropShot:       { name: 'Drop Shot', size: '4" minnow',      colors: ['Morning Dawn', 'Smoke', 'Ayu'],           method: 'Vertical or cast, subtle shakes', category: 'soft-plastic', species: ['Smallmouth Bass', 'Largemouth Bass', 'Walleye'], retrieve: 'finesse', depthRange: [10, 50] },
  swimbait:       { name: 'Paddle Tail Swimbait', size: '3.5-5"', colors: ['Silver Shad', 'Bluegill', 'Perch'],    method: 'Steady retrieve, match baitfish', category: 'soft-plastic', species: ['Largemouth Bass', 'Smallmouth Bass', 'Wiper', 'Striped Bass'], retrieve: 'steady', depthRange: [5, 30] },

  // ── Bass — Hard Baits ──
  crankbaitShallow: { name: 'Shallow Crankbait', size: '2-3"', colors: ['Chartreuse Shad', 'Firetiger', 'Crawfish'], method: 'Crank into cover and deflect off structure', category: 'hard-bait', species: ['Largemouth Bass', 'Smallmouth Bass'], retrieve: 'crank', depthRange: [2, 8] },
  crankbaitDeep:    { name: 'Deep Crankbait', size: '3-4"',    colors: ['Shad', 'Sexy Shad', 'Citrus'],            method: 'Long cast, crank to depth, grind bottom', category: 'hard-bait', species: ['Largemouth Bass', 'Smallmouth Bass', 'Walleye'], retrieve: 'crank', depthRange: [10, 25] },
  jerkbait:       { name: 'Jerkbait / Rip Bait', size: '4-5"', colors: ['Ghost Minnow', 'Clown', 'Chrome'],       method: 'Jerk-jerk-pause cadence', category: 'hard-bait', species: ['Largemouth Bass', 'Smallmouth Bass', 'Walleye', 'Wiper'], retrieve: 'jerk-pause', depthRange: [3, 12] },
  spinnerbait:    { name: 'Spinnerbait', size: '3/8-1/2 oz',   colors: ['White', 'Chartreuse/White', 'Shad'],      method: 'Slow roll or burn along cover', category: 'hard-bait', species: ['Largemouth Bass', 'Wiper', 'Northern Pike'], retrieve: 'steady', depthRange: [3, 15] },
  chatterbait:    { name: 'Chatterbait / Bladed Jig', size: '3/8 oz', colors: ['Green Pumpkin', 'White', 'Bluegill'], method: 'Rip through grass, steady retrieve', category: 'hard-bait', species: ['Largemouth Bass'], retrieve: 'steady', depthRange: [3, 12] },
  liplessCrank:   { name: 'Lipless Crankbait', size: '1/2 oz', colors: ['Red Craw', 'Chrome/Blue', 'Gold'],        method: 'Rip and pause through grass, yo-yo retrieve', category: 'hard-bait', species: ['Largemouth Bass', 'Wiper', 'White Bass', 'Walleye'], retrieve: 'rip-pause', depthRange: [3, 20] },
  topwaterFrog:   { name: 'Topwater Frog', size: '3"',         colors: ['Black', 'White', 'Leopard'],              method: 'Walk over pads and mats, wait for blowup', category: 'topwater', species: ['Largemouth Bass'], retrieve: 'walk', depthRange: [0, 2] },
  buzzbait:       { name: 'Buzzbait', size: '3/8 oz',          colors: ['White', 'Black', 'Chartreuse'],           method: 'Burn across surface, keep blade churning', category: 'topwater', species: ['Largemouth Bass', 'Northern Pike'], retrieve: 'burn', depthRange: [0, 1] },
  whopperPlopper: { name: 'Whopper Plopper', size: '90-130',   colors: ['Bone', 'Loon', 'Monkey Butt'],            method: 'Steady retrieve, tail churns surface', category: 'topwater', species: ['Largemouth Bass', 'Smallmouth Bass', 'Wiper', 'Striped Bass'], retrieve: 'steady', depthRange: [0, 2] },
  popR:           { name: 'Pop-R / Popper', size: '2-3"',      colors: ['Bone', 'Chrome', 'Frog'],                 method: 'Pop-pop-pause, walk the dog', category: 'topwater', species: ['Largemouth Bass', 'Smallmouth Bass', 'White Bass'], retrieve: 'pop-pause', depthRange: [0, 1] },
  walkingBait:    { name: 'Walking Bait (Zara Spook)', size: '4.5"', colors: ['Bone', 'Chrome', 'Frog'],           method: 'Walk the dog, rhythmic side-to-side', category: 'topwater', species: ['Largemouth Bass', 'Striped Bass', 'Wiper'], retrieve: 'walk', depthRange: [0, 2] },
  bladeBait:      { name: 'Blade Bait', size: '1/2 oz',        colors: ['Silver', 'Gold', 'Painted'],              method: 'Vertical jig, rip and drop', category: 'hard-bait', species: ['Walleye', 'Smallmouth Bass', 'White Bass', 'Wiper'], retrieve: 'vertical-jig', depthRange: [15, 50] },
  largeSwimbait:  { name: 'Large Swimbait / Jerkbait 6"+', size: '6-10"', colors: ['Rainbow Trout', 'Perch', 'Shad'], method: 'Slow steady retrieve near structure', category: 'hard-bait', species: ['Tiger Muskie', 'Northern Pike', 'Largemouth Bass'], retrieve: 'steady', depthRange: [3, 20] },
  bucktailSpinner:{ name: 'Bucktail Spinner / Bulldawg', size: '6-8"', colors: ['Firetiger', 'Black/Orange', 'Perch'], method: 'Figure-8 at boat, cast and burn', category: 'hard-bait', species: ['Tiger Muskie', 'Northern Pike'], retrieve: 'burn', depthRange: [3, 15] },

  // ── Bait ──
  powerbait:      { name: 'PowerBait (Dough)', size: 'Pea-sized', colors: ['Chartreuse', 'Rainbow', 'Salmon Peach'], method: 'Slip sinker rig on bottom, 18" leader', category: 'bait', species: ['Rainbow Trout'], retrieve: 'still', depthRange: [5, 30], rig: 'Slip sinker, #14 treble, 18" 4lb leader' },
  powerbaitTrout: { name: 'PowerBait Mice Tail', size: '3"',   colors: ['Chartreuse/Salmon', 'White/Chartreuse'],  method: 'Float off bottom with marshmallow or inflated worm', category: 'bait', species: ['Rainbow Trout', 'Cutthroat Trout'], retrieve: 'still', depthRange: [5, 25], rig: '#14 hook, 12" leader, float off bottom' },
  nightcrawler:   { name: 'Nightcrawler', size: 'Full or half', colors: ['Natural'],                               method: 'Worm harness, bottom rig, or bobber', category: 'bait', species: ['Rainbow Trout', 'Brown Trout', 'Channel Catfish', 'Walleye', 'Yellow Perch'], retrieve: 'still', depthRange: [3, 40], rig: 'Worm harness or #6 bait hook' },
  waxWorm:        { name: 'Wax Worm / Meal Worm', size: 'Small', colors: ['White', 'Yellow'],                      method: 'Ice jig or small hook under bobber', category: 'bait', species: ['Rainbow Trout', 'Yellow Perch', 'Bluegill', 'Cutthroat Trout'], retrieve: 'jig', depthRange: [5, 30], rig: '#10-12 hook or ice jig' },
  minnowLive:     { name: 'Live Minnow', size: '2-4"',         colors: ['Natural'],                                method: 'Hook through lips or back, bobber or freeline', category: 'bait', species: ['Walleye', 'Channel Catfish', 'Northern Pike', 'Largemouth Bass'], retrieve: 'still', depthRange: [5, 30], rig: '#4 hook, split shot, bobber optional' },
  cutBait:        { name: 'Cut Bait (Carp / Shad)', size: 'Chunk', colors: ['Natural'],                            method: 'Circle hook on bottom, let it soak', category: 'bait', species: ['Channel Catfish'], retrieve: 'still', depthRange: [3, 20], rig: 'Circle hook #2/0, 1 oz slip sinker' },
  chickenLiver:   { name: 'Chicken Liver', size: 'Thumb-sized', colors: ['Natural'],                               method: 'Treble hook wrapped with thread, bottom rig', category: 'bait', species: ['Channel Catfish'], retrieve: 'still', depthRange: [3, 15], rig: '#6 treble, wrap with thread to hold' },
  stinkBait:      { name: 'Stink Bait / Punch Bait', size: 'Worm-dipped', colors: ['Various'],                     method: 'Dip worm or sponge, bottom fish at dusk', category: 'bait', species: ['Channel Catfish'], retrieve: 'still', depthRange: [3, 15], rig: 'Dip tube or sponge on #4 treble' },
  corn:           { name: 'Canned Corn', size: '2-3 kernels',  colors: ['Yellow'],                                 method: 'Thread on #12 hook, bottom rig or bobber', category: 'bait', species: ['Rainbow Trout', 'Cutthroat Trout', 'Yellow Perch'], retrieve: 'still', depthRange: [3, 20], rig: '#12 hook, split shot' },
  marshmallow:    { name: 'Mini Marshmallow', size: 'Small',   colors: ['Pink', 'White', 'Yellow'],                method: 'Float bait off bottom above worm or PowerBait', category: 'bait', species: ['Rainbow Trout'], retrieve: 'still', depthRange: [5, 25], rig: '#14 hook with worm below' },
  shrimpCrawdad:  { name: 'Frozen Shrimp / Crawdad Tail', size: 'Tail-sized', colors: ['Natural'],                 method: 'Bottom rig in rocky areas', category: 'bait', species: ['Channel Catfish', 'Largemouth Bass', 'Brown Trout'], retrieve: 'still', depthRange: [3, 25], rig: '#4 bait hook, slip sinker' },
  suckerMeat:     { name: 'Sucker Meat / Dead Bait', size: 'Chunk or whole', colors: ['Natural'],                  method: 'Dead bait rig, deep jigging', category: 'bait', species: ['Lake Trout', 'Tiger Muskie', 'Northern Pike', 'Burbot'], retrieve: 'still', depthRange: [20, 100], rig: 'Quick-strike rig, wire leader for pike' },

  // ── Shore Casting ──
  kastmaster:     { name: 'Kastmaster Spoon', size: '1/8-1/4 oz', colors: ['Gold', 'Silver', 'Trout'],             method: 'Cast and retrieve, let flutter on drop', category: 'shore-cast', species: ['Rainbow Trout', 'Cutthroat Trout', 'Brown Trout', 'Wiper', 'White Bass'], retrieve: 'flutter', depthRange: [3, 25] },
  roosterTail:    { name: 'Rooster Tail Spinner', size: '1/16-1/4 oz', colors: ['Brown Trout', 'Rainbow', 'Black'],  method: 'Steady retrieve, keep blade spinning', category: 'shore-cast', species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout', 'Smallmouth Bass'], retrieve: 'steady', depthRange: [3, 15] },
  pantherMartin:  { name: 'Panther Martin Spinner', size: '1/16-1/4 oz', colors: ['Gold', 'Black/Gold', 'Firetiger'], method: 'Steady retrieve through pools and runs', category: 'shore-cast', species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout'], retrieve: 'steady', depthRange: [3, 12] },
  blueFox:        { name: 'Blue Fox Vibrax', size: '#3-5',     colors: ['Silver', 'Firetiger', 'Chartreuse'],       method: 'Slow steady retrieve, vibration attracts', category: 'shore-cast', species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Northern Pike'], retrieve: 'steady', depthRange: [3, 15] },
  mepps:          { name: 'Mepps Aglia Spinner', size: '#2-4', colors: ['Silver', 'Gold', 'Black Fury'],            method: 'Classic steady retrieve, vary speed', category: 'shore-cast', species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass'], retrieve: 'steady', depthRange: [3, 12] },
  rapalaOriginal: { name: 'Rapala Original Floating', size: '3-4"', colors: ['Rainbow Trout', 'Silver', 'Gold'],   method: 'Twitch and pause on surface/subsurface', category: 'shore-cast', species: ['Brown Trout', 'Rainbow Trout', 'Largemouth Bass', 'Smallmouth Bass'], retrieve: 'twitch-pause', depthRange: [0, 6] },
  krocodile:      { name: 'Krocodile Spoon', size: '1/4-3/4 oz', colors: ['Gold', 'Silver/Blue', 'Firetiger'],      method: 'Long cast, steady or flutter retrieve', category: 'shore-cast', species: ['Cutthroat Trout', 'Lake Trout', 'Brown Trout'], retrieve: 'flutter', depthRange: [5, 30] },
  bobberWorm:     { name: 'Bobber + Worm Rig', size: 'Half crawler', colors: ['Natural'],                          method: 'Set bobber 3-6 ft deep near structure', category: 'shore-cast', species: ['Rainbow Trout', 'Bluegill', 'Yellow Perch', 'Black Crappie'], retrieve: 'still', depthRange: [3, 8], rig: '#8 hook, split shot, clip-on bobber' },
  bottomRig:      { name: 'Bottom Rig (Egg Sinker)', size: '1/2-1 oz', colors: ['Natural bait'],                   method: 'Cast out, let it soak on bottom', category: 'shore-cast', species: ['Channel Catfish', 'Walleye', 'Rainbow Trout'], retrieve: 'still', depthRange: [5, 30], rig: 'Egg sinker, swivel, 18" leader, #4-6 hook' },

  // ── Trolling Rigs ──
  dodgerHoochie:  { name: 'Dodger + Hoochie', size: '#0-1 dodger', colors: ['Pink', 'Orange', 'Watermelon'],       method: 'Troll 1.0-1.5 mph, 30-50 ft depth', category: 'trolling', species: ['Kokanee Salmon', 'Rainbow Trout'], retrieve: 'troll-slow', depthRange: [20, 60], speed: '1.0-1.5 mph' },
  weddingRing:    { name: 'Wedding Ring + Worm/Corn', size: '#4-6', colors: ['Chartreuse', 'Pink', 'Orange'],       method: 'Behind dodger, tip with shoepeg corn or worm', category: 'trolling', species: ['Kokanee Salmon', 'Rainbow Trout', 'Cutthroat Trout'], retrieve: 'troll-slow', depthRange: [15, 50], speed: '1.0-1.8 mph' },
  cowbellWorm:    { name: 'Cowbell + Trailing Worm', size: '4-blade cowbell', colors: ['Silver', 'Brass', 'Copper'], method: 'Troll slowly with long leader behind cowbell', category: 'trolling', species: ['Rainbow Trout', 'Cutthroat Trout', 'Lake Trout'], retrieve: 'troll-slow', depthRange: [15, 60], speed: '1.2-1.8 mph' },
  popGearWorm:    { name: 'Pop Gear + Worm', size: '5-7 blade pop gear', colors: ['Silver', 'Gold', 'Chartreuse'], method: 'Troll at moderate speed with full crawler', category: 'trolling', species: ['Rainbow Trout', 'Cutthroat Trout'], retrieve: 'troll-moderate', depthRange: [10, 40], speed: '1.5-2.0 mph' },
  downriggerSpoon:{ name: 'Downrigger Spoon', size: '3-5"',    colors: ['Silver', 'Hammered Brass', 'Glow Green'], method: 'Downrigger to exact depth, slow troll', category: 'trolling', species: ['Lake Trout', 'Kokanee Salmon', 'Rainbow Trout'], retrieve: 'troll-slow', depthRange: [40, 120], speed: '1.5-2.5 mph' },
  jPlug:          { name: 'J-Plug', size: '4-5"',              colors: ['Silver/Prism', 'Glow Green', 'Fire'],     method: 'Downrigger or long line, erratic action', category: 'trolling', species: ['Lake Trout'], retrieve: 'troll-moderate', depthRange: [50, 120], speed: '2.0-3.0 mph' },
  rapalaCD:       { name: 'Rapala Countdown / Shad Rap', size: '5-7', colors: ['Silver', 'Firetiger', 'Perch'],    method: 'Flat-line or leadcore troll', category: 'trolling', species: ['Walleye', 'Brown Trout', 'Rainbow Trout'], retrieve: 'troll-moderate', depthRange: [8, 25], speed: '1.5-2.5 mph' },
  umbrellaRig:    { name: 'Umbrella Rig / A-Rig', size: '5-arm', colors: ['Shad', 'White'],                        method: 'Slow troll simulating baitfish school', category: 'trolling', species: ['Striped Bass', 'Largemouth Bass', 'Wiper'], retrieve: 'troll-moderate', depthRange: [15, 40], speed: '2.0-3.0 mph' },
  flatlineRapala: { name: 'Flat-line Rapala', size: '4-6"',    colors: ['Rainbow Trout', 'Silver', 'Firetiger'],   method: 'Let out 100+ ft of line, troll near surface', category: 'trolling', species: ['Brown Trout', 'Rainbow Trout'], retrieve: 'troll-moderate', depthRange: [3, 15], speed: '2.0-3.0 mph' },
  leadCoreSpoon:  { name: 'Lead Core + Spoon', size: '2-4" spoon', colors: ['Silver', 'Hammered Copper', 'Glow'],  method: 'Lead core line for depth without downrigger', category: 'trolling', species: ['Lake Trout', 'Brown Trout', 'Rainbow Trout'], retrieve: 'troll-slow', depthRange: [25, 80], speed: '1.5-2.5 mph' },
  crawlerHarness: { name: 'Crawler Harness', size: '2-hook spinner', colors: ['Chartreuse', 'Copper', 'Rainbow'],  method: 'Bottom bouncer rig, slow troll', category: 'trolling', species: ['Walleye'], retrieve: 'troll-slow', depthRange: [10, 35], speed: '0.8-1.5 mph' },

  // ── Ice Fishing ──
  iceJig:         { name: 'Ice Jig + Wax Worm', size: '1/32-1/16 oz', colors: ['Glow', 'Chartreuse', 'White'],    method: 'Jig 6" off bottom, subtle shakes', category: 'ice', species: ['Rainbow Trout', 'Yellow Perch', 'Cutthroat Trout', 'Bluegill'], retrieve: 'jig', depthRange: [10, 40] },
  jiggingRapala:  { name: 'Jigging Rapala', size: '#5-7',      colors: ['Silver', 'Glow Green', 'Perch'],          method: 'Aggressive jigging, attracts from distance', category: 'ice', species: ['Walleye', 'Lake Trout', 'Brown Trout'], retrieve: 'jig', depthRange: [15, 100] },
  tipUp:          { name: 'Tip-Up + Live Minnow', size: '3-4" minnow', colors: ['Natural'],                        method: 'Set at depth, flag when hit', category: 'ice', species: ['Walleye', 'Northern Pike', 'Tiger Muskie', 'Lake Trout'], retrieve: 'still', depthRange: [10, 60] },
  airplaneJig:    { name: 'Airplane Jig', size: '1-2 oz',      colors: ['White', 'Chartreuse', 'Glow'],            method: 'Drop to depth, rip and flutter', category: 'ice', species: ['Lake Trout'], retrieve: 'rip-flutter', depthRange: [40, 120] },
  glowSpoon:      { name: 'Glow Spoon', size: '1/4-1/2 oz',   colors: ['Glow Green', 'Glow White', 'UV Pink'],    method: 'Charge in light, jig with pauses', category: 'ice', species: ['Cutthroat Trout', 'Rainbow Trout', 'Splake'], retrieve: 'jig', depthRange: [15, 40] },
};


// ─── SEASON DETECTION ───────────────────────────────────────────────

function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getBassSeason(waterTemp) {
  if (waterTemp < 50) return { phase: 'winter', label: 'Winter Dormancy', desc: 'Bass are lethargic — ultra-slow finesse presentations on deep structure' };
  if (waterTemp < 58) return { phase: 'pre-spawn', label: 'Pre-Spawn', desc: 'Bass staging on secondary points 8-15 ft, feeding aggressively before bedding' };
  if (waterTemp < 65) return { phase: 'spawn', label: 'Spawn', desc: 'Bass on beds in 3-8 ft, males guarding — sight fish with soft plastics' };
  if (waterTemp < 72) return { phase: 'post-spawn', label: 'Post-Spawn', desc: 'Females recovering near deep cover, males still shallow guarding fry' };
  if (waterTemp < 82) return { phase: 'summer', label: 'Summer Pattern', desc: 'Bass on structure 15-25 ft midday, shallow dawn/dusk — topwater early' };
  return { phase: 'hot', label: 'Dog Days', desc: 'Bass deep and sluggish — early morning topwater only window, deep shade midday' };
}

function getWalleyeSeason(waterTemp, month) {
  if (month >= 3 && month <= 4 && waterTemp < 52) return { phase: 'spawn', label: 'Spawn', desc: 'Night fishing rocky flats 8-15 ft — jig + minnow is king' };
  if (month >= 4 && month <= 5) return { phase: 'post-spawn', label: 'Post-Spawn', desc: 'Transition to main lake points — crankbaits and harnesses' };
  if (month >= 6 && month <= 8) return { phase: 'summer', label: 'Summer Trolling', desc: 'Crawler harness along weed edges — night is best' };
  if (month >= 9 && month <= 11) return { phase: 'fall', label: 'Fall Feed', desc: 'Following shad schools on structure — blade baits and jigs' };
  return { phase: 'ice', label: 'Ice Fishing', desc: 'Tip-ups + minnows at 25-40 ft near old river channels' };
}


// ─── COLOR RECOMMENDATION ───────────────────────────────────────────

export function getColorRecommendation(sky, waterClarity, ecosystem) {
  const clear = waterClarity === 'clear';
  const visFt = ecosystem?.waterClarity?.visibilityFt;
  const season = _currentSeason;
  const vis = visFt?.[season] ?? null;
  const ultraClear = vis != null && vis >= 15;
  const veryStained = vis != null && vis <= 3;

  const forageColors = [];
  if (ecosystem?.forage) {
    [...(ecosystem.forage.primary || []), ...(ecosystem.forage.secondary || [])].forEach(f => {
      (f.matchLure || []).forEach(c => { if (!forageColors.includes(c)) forageColors.push(c); });
    });
  }
  const forageHint = forageColors.length > 0 ? ` [Forage match: ${forageColors.slice(0, 3).join(', ')}]` : '';

  if (sky === 'overcast' || sky === 'cloudy' || sky === 'rain') {
    if (veryStained) return { primary: 'Chartreuse / Black', secondary: 'Firetiger', reason: `Low light + very stained water (${vis} ft vis) — maximum contrast and vibration${forageHint}` };
    return { primary: 'Chartreuse / White', secondary: 'Firetiger', reason: (clear ? 'Overcast + clear water — bright colors with subtlety' : 'Low light + stained — maximum visibility') + forageHint };
  }
  if (sky === 'clear' || sky === 'partly') {
    if (ultraClear) return { primary: 'Natural / Smoke / Translucent', secondary: 'Watermelon / Ghost', reason: `Ultra-clear water (${vis} ft vis) — downsize, go natural, long fluorocarbon leader essential${forageHint}` };
    if (veryStained) return { primary: 'Chartreuse / Gold', secondary: 'Black/Blue', reason: `Bright sky but stained water (${vis} ft vis) — vibration and flash rule${forageHint}` };
    return { primary: clear ? 'Natural / Smoke / Translucent' : 'Silver / Chrome', secondary: clear ? 'Watermelon / Green Pumpkin' : 'Gold / Crawfish', reason: (clear ? 'Bright + clear — natural colors, let action do the work' : 'Bright sun + stained — flash and vibration') + forageHint };
  }
  return { primary: 'Natural', secondary: 'Chartreuse', reason: 'General conditions — start natural, go brighter if no bites' + forageHint };
}

let _currentSeason = 'summer';


// ─── TROLLING DEPTH CALCULATOR ──────────────────────────────────────

export function getTrollingSetup(species, season, waterTemp, ecosystem) {
  const setups = {
    'Kokanee Salmon': {
      spring: { depth: [15, 30], speed: '1.0-1.5 mph', rig: 'Dodger + hoochie or wedding ring + corn', note: 'Follow 52-55°F thermocline' },
      summer: { depth: [30, 55], speed: '1.0-1.5 mph', rig: 'Dodger + hoochie, tipped corn', note: 'Kokanee hold tight to thermocline — find 52°F and stay there' },
      fall:   { depth: [10, 25], speed: '0.8-1.2 mph', rig: 'Small spoon near tributary mouths', note: 'Pre-spawn kokanee stage shallow near inlets' },
      winter: null,
    },
    'Lake Trout': {
      spring: { depth: [20, 60], speed: '1.5-2.5 mph', rig: 'Tube jig, airplane jig, or flutter spoon', note: 'Lakers near surface in spring — your best shot without downriggers' },
      summer: { depth: [70, 120], speed: '1.5-2.5 mph', rig: 'Downrigger + spoon or J-plug', note: 'Deep summer pattern — downriggers required' },
      fall:   { depth: [40, 80], speed: '1.0-2.0 mph', rig: 'Vertical jigging tube jig or flutter spoon', note: 'Lakers move to rocky spawning shoals 40-80 ft' },
      winter: { depth: [60, 100], speed: 'N/A — ice jig', rig: 'Airplane jig or dead cisco', note: 'Ice fishing or deep jigging from boat' },
    },
    'Rainbow Trout': {
      spring: { depth: [10, 25], speed: '1.5-2.0 mph', rig: 'Pop gear + worm or cowbell + worm', note: 'Rainbows cruising post ice-off shallows' },
      summer: { depth: [20, 40], speed: '1.5-2.5 mph', rig: 'Cowbell + worm or flat-line Rapala at dawn', note: 'Find the thermocline — rainbows stay in 55-62°F zone' },
      fall:   { depth: [15, 30], speed: '1.5-2.0 mph', rig: 'Pop gear + worm or trolling spoon', note: 'Cooling surface brings trout shallower' },
      winter: null,
    },
    'Cutthroat Trout': {
      spring: { depth: [5, 20], speed: '1.0-1.8 mph', rig: 'Wedding ring + worm or tube jig (casting)', note: 'Post ice-off cutts cruise shallows — cast or slow troll' },
      summer: { depth: [20, 45], speed: '1.5-2.0 mph', rig: 'Cowbell + worm or trolling spoon at thermocline', note: 'Cutthroat follow thermocline in summer' },
      fall:   { depth: [10, 25], speed: '1.2-1.8 mph', rig: 'Tube jig or Kastmaster (casting/trolling)', note: 'Aggressive fall feeding — troll or cast the drop-offs' },
      winter: null,
    },
    'Walleye': {
      spring: { depth: [8, 20], speed: '0.8-1.5 mph', rig: 'Jig + minnow or crawler harness', note: 'Spring walleye on spawning flats — slow presentations' },
      summer: { depth: [15, 35], speed: '1.0-1.8 mph', rig: 'Bottom bouncer + crawler harness', note: 'Night trolling along weed edges is most productive' },
      fall:   { depth: [15, 35], speed: '1.0-2.0 mph', rig: 'Crankbait or blade bait along structure', note: 'Walleye school on structure — trolling cranks or vertically jigging' },
      winter: { depth: [25, 45], speed: 'N/A — ice jig', rig: 'Tip-up + minnow, jigging Rapala', note: 'Ice fish near old river channels' },
    },
    'Striped Bass': {
      spring: { depth: [15, 40], speed: '2.0-3.5 mph', rig: 'Umbrella rig or large swimbait', note: 'Stripers following shad in main channels' },
      summer: { depth: [40, 80], speed: '2.5-3.5 mph', rig: 'Downrigger spoon or live shad', note: 'Deep summer — dawn/dusk surface feeds in narrows' },
      fall:   { depth: [10, 40], speed: '2.0-3.5 mph', rig: 'Topwater or casting spoon into boils', note: 'STRIPER BOILS! Follow the birds, cast into the frenzy' },
      winter: { depth: [40, 60], speed: 'N/A — vertical jig', rig: 'Slab spoon, jigging Rapala', note: 'Stripers suspend near dams — electronics + vertical jig' },
    },
    'Wiper': {
      spring: { depth: [5, 20], speed: '2.0-3.0 mph', rig: 'Lipless crankbait or Kastmaster', note: 'Wipers chase shad schools near surface' },
      summer: { depth: [10, 30], speed: '2.5-3.5 mph', rig: 'Trolling spoon or umbrella rig', note: 'Dawn/dusk surface feeds at Willard Bay are explosive' },
      fall:   { depth: [5, 20], speed: '2.5-3.5 mph', rig: 'Jerkbait or Kastmaster along rip-rap', note: 'Aggressive fall feeding — fast retrieve' },
      winter: { depth: [15, 30], speed: 'N/A — vertical jig', rig: 'Blade bait, jigging spoon', note: 'Find with electronics, vertical jig slowly' },
    },
  };
  const data = setups[species]?.[season];
  if (!data) return null;
  const tempAdjust = waterTemp ? (() => {
    const optTemp = { 'Kokanee Salmon': 52, 'Lake Trout': 48, 'Rainbow Trout': 58, 'Cutthroat Trout': 50, 'Walleye': 67, 'Striped Bass': 70, 'Wiper': 70 }[species] || 55;
    if (waterTemp > optTemp + 8) return 'Water warm — fish deeper than normal, slow down';
    if (waterTemp < optTemp - 8) return 'Water cold — fish shallower and slower';
    return 'Water temp is in the zone — fish at listed depths';
  })() : null;

  const result = { ...data, tempAdvice: tempAdjust };

  const thermo = ecosystem?.thermocline?.[season];
  if (thermo?.depth) {
    result.thermoclineDepth = thermo.depth;
    result.thermoclineTemp = thermo.tempRange;
    result.depth = thermo.depth;
    result.thermoclineNote = `Real thermocline data: ${thermo.depth[0]}-${thermo.depth[1]} ft (${thermo.tempRange[0]}-${thermo.tempRange[1]}°F)`;
  }

  return result;
}


// ─── SHORE STRATEGY ─────────────────────────────────────────────────

export function getShoreStrategy(locationConfig, windDir, windSpeed, species) {
  const tips = [];
  let bankRec = null;

  if (windSpeed > 8 && windSpeed < 20) {
    bankRec = { direction: 'windward', reason: 'Wind pushes baitfish against the windward bank — fish where the food is concentrating' };
    tips.push('Cast WITH the wind for maximum distance');
    tips.push('Wind stirs up food — fish are actively feeding on the windward side');
  } else if (windSpeed >= 20) {
    bankRec = { direction: 'sheltered', reason: 'Wind too strong for effective casting — find a sheltered cove or fish the lee side' };
    tips.push('Find a wind break — casting into 20+ mph wind is futile');
  } else {
    bankRec = { direction: 'structure', reason: 'Light wind — focus on visible structure: points, docks, weed edges, inlet areas' };
    tips.push('Calm conditions — fish can see your line. Use lighter leader and natural colors.');
  }

  const hasCatfish = species?.some(s => s.includes('Catfish'));
  const hasBass = species?.some(s => s.includes('Bass'));
  const hasTrout = species?.some(s => s.includes('Trout'));

  if (hasCatfish) {
    tips.push('Night shore fishing for catfish: rip-rap, river mouths, any rocky structure');
    tips.push('Set multiple rods with bottom rigs — cut bait or chicken liver');
  }
  if (hasBass) {
    tips.push('Cast parallel to shore — bass cruise the bank edges');
    tips.push('Work docks, fallen trees, and weed points thoroughly before moving');
  }
  if (hasTrout) {
    tips.push('Look for inlets where streams enter — trout stage near flowing water');
    tips.push('PowerBait on bottom rig for stocked trout; spoons and spinners for wild fish');
  }

  const shoreRig = hasCatfish ? 'Bottom rig + cut bait or stink bait'
    : hasBass ? 'Texas rig or Ned rig for finesse shore bass'
    : hasTrout ? 'PowerBait on slip sinker rig, or Kastmaster spoon'
    : 'Bobber + worm for versatile shore fishing';

  return { bankRecommendation: bankRec, tips, recommendedRig: shoreRig };
}


// ─── RULES ENGINE: BUILD LURE CANDIDATES ────────────────────────────

function buildLureCandidates({ month, waterTemp, windSpeed, sky, pressureTrend, hour, species, locationType, ecosystem }) {
  const season = getSeason(month);
  const candidates = [];
  const isDawn = hour >= 4 && hour <= 8;
  const isDusk = hour >= 17 && hour <= 21;
  const isMidDay = hour >= 10 && hour <= 15;
  const isNight = hour >= 21 || hour <= 4;
  const isCalmAM = isDawn && windSpeed < 8;
  const isWindy = windSpeed > 10;
  const isFallingPressure = pressureTrend === 'falling';
  const isRisingPressure = pressureTrend === 'rising';
  const isOvercast = ['overcast', 'cloudy', 'rain', 'drizzle'].includes(sky);
  const hasSpecies = (s) => species?.includes(s);

  const eco = ecosystem || null;
  const forageNames = (eco?.forage?.primary || []).map(f => f.name.toLowerCase());
  const hasCrawfishForage = eco?.invertebrates?.crayfish === 'high' || eco?.invertebrates?.crayfish === 'moderate';
  const hasShadForage = forageNames.some(n => n.includes('shad'));
  const hasPerchForage = forageNames.some(n => n.includes('perch'));
  const hasChubForage = forageNames.some(n => n.includes('chub'));
  const hasBluegillForage = forageNames.some(n => n.includes('bluegill'));
  const ecoClarity = eco?.waterClarity?.typical;

  function add(key, confidence, reason, timeWindow) {
    if (LURES[key]) candidates.push({ lureKey: key, confidence, reason, timeWindow: timeWindow || 'all-day' });
  }

  // ── BASS PATTERNS ──
  if (hasSpecies('Largemouth Bass') || hasSpecies('Smallmouth Bass')) {
    const bassType = hasSpecies('Largemouth Bass') ? 'Largemouth' : 'Smallmouth';

    // Topwater magic hour
    if (isCalmAM && waterTemp > 58) {
      add('topwaterFrog', 92, `Calm dawn + ${waterTemp}°F — prime topwater for ${bassType}`, 'dawn');
      add('buzzbait', 88, 'Calm surface, burn it along cover edges', 'dawn');
      add('whopperPlopper', 90, 'Topwater chopper — works on calm mornings', 'dawn');
      add('popR', 82, 'Pop-pause over shallow structure', 'dawn');
    }
    if (isDusk && windSpeed < 10 && waterTemp > 60) {
      add('walkingBait', 85, 'Evening topwater walk-the-dog — bass feeding on surface', 'dusk');
      add('buzzbait', 83, 'Dusk buzzbait along weed edges', 'dusk');
    }

    // Wind = spinnerbait / chatterbait
    if (isWindy && waterTemp > 50) {
      add('spinnerbait', 90, 'Wind stains water and activates lateral line — spinnerbait time', 'all-day');
      add('chatterbait', 85, 'Vibration bait through wind-blown grass', 'all-day');
      add('liplessCrank', 82, 'Rip lipless through wind-blown weed areas', 'all-day');
    }

    // Cold water finesse
    if (waterTemp < 55) {
      add('nedRig', 88, `Cold water (${waterTemp}°F) — finesse is key, drag Ned on bottom`, 'all-day');
      add('dropShot', 85, 'Cold bass need subtle presentation — drop shot', 'midday');
      add('jerkbait', 84, 'Cold-water jerkbait with long pauses between jerks', 'all-day');
    }

    // Warm water — classic patterns
    if (waterTemp >= 58 && waterTemp <= 80) {
      add('senko', 90, `${waterTemp}°F water — Senko is the most versatile bass bait ever made`, 'all-day');
      add('texasWorm', 82, 'Texas rig along any cover — always a producer', 'all-day');
      add('crawTrailer', 80, 'Jig and craw pitching to heavy cover', 'all-day');
    }

    // Midday deep
    if (isMidDay && waterTemp > 65) {
      add('crankbaitDeep', 83, 'Midday bass go deep — crank along break lines 15-25 ft', 'midday');
      add('dropShot', 86, 'Midday finesse on deep structure', 'midday');
    }

    // Falling pressure — reaction baits
    if (isFallingPressure) {
      add('liplessCrank', 88, 'Falling pressure = aggressive fish — rip reaction baits', 'all-day');
      add('spinnerbait', 86, 'Front approaching — bass feed aggressively, cover water fast', 'all-day');
    }

    // Post-front / rising pressure — finesse
    if (isRisingPressure && waterTemp > 45) {
      add('dropShot', 90, 'Post-front high pressure — fish tight to cover with finesse', 'all-day');
      add('nedRig', 88, 'High pressure = lockjaw. Downsize and slow down.', 'all-day');
      add('senko', 85, 'Wacky rig Senko falling slowly near cover', 'all-day');
    }

    // Smallmouth specific
    if (hasSpecies('Smallmouth Bass')) {
      add('tubeJig', 87, 'Tube jig on rocky bottom — the #1 smallmouth bait in Utah', 'all-day');
      if (waterTemp > 60 && isCalmAM) {
        add('whopperPlopper', 91, 'Smallmouth go CRAZY for topwater — explosive strikes', 'dawn');
      }
    }
  }

  // ── WALLEYE PATTERNS ──
  if (hasSpecies('Walleye')) {
    if (isNight || isDusk || isDawn) {
      add('bladeBait', 85, 'Walleye feed at night — vertical blade bait on structure', isNight ? 'night' : isDusk ? 'dusk' : 'dawn');
      add('crawlerHarness', 83, 'Slow troll crawler harness along weed edges at dusk', 'dusk');
    }
    if (season === 'spring' && waterTemp < 52) {
      add('minnowLive', 90, 'Spring walleye — jig + live minnow on spawning flats', 'all-day');
    }
    add('rapalaCD', 80, 'Walleye crankbait trolled along break lines', 'all-day');
    if (isFallingPressure) {
      add('jerkbait', 85, 'Falling pressure activates walleye — jerkbait along structure', 'all-day');
    }
  }

  // ── CATFISH PATTERNS ──
  if (hasSpecies('Channel Catfish')) {
    if (isNight || isDusk) {
      add('cutBait', 95, 'Night catfish — cut bait on bottom near rip-rap or river mouths', 'night');
      add('chickenLiver', 88, 'Classic catfish bait — chicken liver on circle hook', 'night');
      add('stinkBait', 85, 'Stink bait: smells awful, catches catfish', 'night');
    }
    if (waterTemp > 60) {
      add('nightcrawler', 80, 'Crawler on bottom rig — catches catfish day or night', 'all-day');
    }
    add('bottomRig', 78, 'Bottom rig + any bait near structure — catfish are scavengers', 'all-day');
  }

  // ── TROUT IN LAKES/RESERVOIRS ──
  if ((hasSpecies('Rainbow Trout') || hasSpecies('Cutthroat Trout') || hasSpecies('Brown Trout')) && (locationType === 'reservoir' || locationType === 'lake')) {
    add('powerbait', 85, 'PowerBait on bottom — the #1 method for stocked trout from shore', 'all-day');
    add('kastmaster', 83, 'Kastmaster: cast, let flutter, retrieve — covers water fast', 'all-day');
    add('roosterTail', 80, 'Rooster Tail steady retrieve — spinner flash attracts trout', 'all-day');
    add('nightcrawler', 78, 'Nightcrawler on bottom rig — always works for trout', 'all-day');
    add('corn', 70, 'Canned corn on #12 hook — cheap and effective for stocked fish', 'all-day');

    if (waterTemp > 55 && season !== 'winter') {
      add('popGearWorm', 82, 'Pop gear + worm trolling — flasher draws trout from distance', 'all-day');
      add('cowbellWorm', 80, 'Cowbell + worm — vibration trolling for reservoir trout', 'all-day');
    }

    if (isDawn || isDusk) {
      add('rapalaOriginal', 84, 'Twitch a Rapala near shore at low light — big trout ambush', isDawn ? 'dawn' : 'dusk');
    }

    if (hasSpecies('Cutthroat Trout')) {
      add('tubeJig', 86, 'Tube jig tipped with worm — THE cutthroat lure at Strawberry', 'all-day');
    }
  }

  // ── LAKE TROUT ──
  if (hasSpecies('Lake Trout')) {
    if (season === 'spring') {
      add('tubeJig', 88, 'Spring lakers near surface (20-60 ft) — tube jig is king', 'all-day');
    }
    add('downriggerSpoon', 80, 'Downrigger trolling for lakers at depth', 'all-day');
    add('jPlug', 78, 'J-plug with downrigger — erratic action triggers lake trout', 'all-day');
    add('airplaneJig', 82, 'Airplane jig — drop and rip for vertical laker fishing', 'all-day');
  }

  // ── KOKANEE ──
  if (hasSpecies('Kokanee Salmon') && season !== 'winter') {
    add('dodgerHoochie', 90, 'Dodger + hoochie is THE kokanee rig — troll 1.0-1.5 mph', 'all-day');
    add('weddingRing', 88, 'Wedding ring tipped with shoepeg corn behind dodger', 'all-day');
  }

  // ── WIPER / WHITE BASS ──
  if (hasSpecies('Wiper') || hasSpecies('White Bass')) {
    add('kastmaster', 88, 'Kastmaster — the ultimate wiper/white bass spoon', 'all-day');
    if (isCalmAM || isDusk) {
      add('whopperPlopper', 85, 'Wipers smash topwater during surface feeds', isDawn ? 'dawn' : 'dusk');
    }
    add('liplessCrank', 82, 'Lipless crank ripped through schools', 'all-day');
    if (hasSpecies('White Bass') && season === 'spring') {
      add('roosterTail', 90, 'White bass spring run — small spinner nonstop action!', 'all-day');
    }
  }

  // ── TIGER MUSKIE / NORTHERN PIKE ──
  if (hasSpecies('Tiger Muskie') || hasSpecies('Northern Pike')) {
    add('largeSwimbait', 88, 'Muskie/pike — throw big baits, get big fish', 'all-day');
    add('bucktailSpinner', 85, 'Bucktail spinner — classic muskie producer. ALWAYS figure-8!', 'all-day');
    if (isDusk || season === 'fall') {
      add('largeSwimbait', 92, 'Fall trophy season — largest baits you own along deep weed transitions', 'dusk');
    }
  }

  // ── STRIPED BASS ──
  if (hasSpecies('Striped Bass')) {
    add('umbrellaRig', 85, 'A-rig trolling simulates baitfish school', 'all-day');
    if (season === 'fall') {
      add('kastmaster', 92, 'STRIPER BOILS — cast any shiny spoon into the frenzy!', 'all-day');
      add('whopperPlopper', 88, 'Topwater into boiling stripers — bucket-list fishing', 'all-day');
    }
  }

  // ── PERCH / CRAPPIE / BLUEGILL (PANFISH) ──
  if (hasSpecies('Yellow Perch') || hasSpecies('Black Crappie') || hasSpecies('Bluegill')) {
    add('bobberWorm', 82, 'Bobber + worm — classic panfish rig, kids love it', 'all-day');
    add('waxWorm', 80, 'Wax worm on small jig or hook — perch and bluegill can\'t resist', 'all-day');
    if (season === 'winter') {
      add('iceJig', 88, 'Ice jig + wax worm — jigging for perch through the ice', 'all-day');
    }
  }

  // ── ICE FISHING ──
  if (season === 'winter') {
    add('iceJig', 85, 'Ice jig + wax worm — start here for any ice fishing', 'all-day');
    if (hasSpecies('Walleye') || hasSpecies('Lake Trout') || hasSpecies('Brown Trout')) {
      add('jiggingRapala', 86, 'Jigging Rapala — aggressive jigging attracts predators from distance', 'all-day');
      add('tipUp', 84, 'Tip-up + live minnow — set it and wait for the flag', 'all-day');
    }
    if (hasSpecies('Lake Trout')) {
      add('airplaneJig', 88, 'Airplane jig for deep ice-fishing lakers — 60-100 ft', 'all-day');
    }
    if (hasSpecies('Cutthroat Trout') || hasSpecies('Rainbow Trout')) {
      add('glowSpoon', 83, 'Glow spoon jigged with pauses — trout under ice', 'all-day');
    }
  }

  // ── ECOSYSTEM FORAGE MATCHING ──
  if (eco && candidates.length > 0) {
    candidates.forEach(c => {
      const l = LURES[c.lureKey];
      if (!l) return;
      const lColors = (l.colors || []).map(x => x.toLowerCase());

      if (hasShadForage && lColors.some(x => x.includes('shad') || x.includes('silver') || x.includes('chrome') || x.includes('white'))) {
        c.confidence = Math.min(100, c.confidence + 8);
        c.reason += ' [Forage: shad-dominant ecosystem]';
      }
      if (hasCrawfishForage && (lColors.some(x => x.includes('craw') || x.includes('orange') || x.includes('brown')) || l.category === 'soft-plastic' && l.name.toLowerCase().includes('craw'))) {
        c.confidence = Math.min(100, c.confidence + 8);
        c.reason += ' [Forage: crayfish-rich water]';
      }
      if (hasPerchForage && lColors.some(x => x.includes('perch') || x.includes('firetiger') || x.includes('chartreuse'))) {
        c.confidence = Math.min(100, c.confidence + 6);
        c.reason += ' [Forage: perch present]';
      }
      if (hasChubForage && lColors.some(x => x.includes('natural') || x.includes('silver') || x.includes('minnow'))) {
        c.confidence = Math.min(100, c.confidence + 5);
        c.reason += ' [Forage: chub baitfish]';
      }
      if (hasBluegillForage && lColors.some(x => x.includes('bluegill') || x.includes('green'))) {
        c.confidence = Math.min(100, c.confidence + 6);
        c.reason += ' [Forage: bluegill present]';
      }
    });

    if (ecoClarity === 'turbid' || (eco.waterClarity?.visibilityFt?.[season] ?? 99) <= 3) {
      candidates.forEach(c => {
        const l = LURES[c.lureKey];
        if (l && (l.retrieve === 'steady' || l.retrieve === 'burn' || l.category === 'bait')) {
          c.confidence = Math.min(100, c.confidence + 4);
          c.reason += ' [Turbid water — vibration & scent advantage]';
        }
      });
    }
    if (ecoClarity === 'clear' && (eco.waterClarity?.visibilityFt?.[season] ?? 0) >= 12) {
      candidates.forEach(c => {
        const l = LURES[c.lureKey];
        if (l && (l.retrieve === 'finesse' || l.retrieve === 'deadfall' || l.retrieve === 'drag')) {
          c.confidence = Math.min(100, c.confidence + 4);
          c.reason += ' [Clear water — finesse rewarded]';
        }
      });
    }
  }

  // ── UNIVERSAL PRESSURE RULES ──
  if (isFallingPressure && candidates.length > 0) {
    candidates.forEach(c => {
      const l = LURES[c.lureKey];
      if (l && (l.retrieve === 'burn' || l.retrieve === 'rip-pause' || l.retrieve === 'steady' || l.category === 'topwater')) {
        c.confidence = Math.min(100, c.confidence + 8);
        c.reason += ' [Falling pressure bonus — fish aggressive]';
      }
    });
  }
  if (isRisingPressure && candidates.length > 0) {
    candidates.forEach(c => {
      const l = LURES[c.lureKey];
      if (l && (l.retrieve === 'finesse' || l.retrieve === 'drag' || l.retrieve === 'deadfall')) {
        c.confidence = Math.min(100, c.confidence + 8);
        c.reason += ' [High pressure — finesse rewarded]';
      }
    });
  }

  // ── OVERCAST BOOST ──
  if (isOvercast && candidates.length > 0) {
    candidates.forEach(c => {
      const l = LURES[c.lureKey];
      if (l && (l.category === 'topwater' || l.retrieve === 'steady')) {
        c.confidence = Math.min(100, c.confidence + 5);
      }
    });
  }

  return candidates;
}


// ─── METHOD SELECTOR ────────────────────────────────────────────────

export function getBestMethod({ species, locationType, waterTemp, windSpeed, hour, season }) {
  const methods = [];
  const hasBass = species?.some(s => s.includes('Bass'));
  const hasTrout = species?.some(s => s.includes('Trout'));
  const hasCatfish = species?.some(s => s.includes('Catfish'));
  const hasKokanee = species?.includes('Kokanee Salmon');
  const hasLakers = species?.includes('Lake Trout');
  const hasWalleye = species?.includes('Walleye');
  const hasMuskie = species?.some(s => s.includes('Muskie') || s.includes('Pike'));
  const isDawn = hour >= 4 && hour <= 8;
  const isDusk = hour >= 17 && hour <= 21;
  const isNight = hour >= 21 || hour <= 4;
  const isStillwater = locationType === 'reservoir' || locationType === 'lake';

  if (hasBass && (isDawn || isDusk) && windSpeed < 10 && waterTemp > 58) {
    methods.push({ method: 'topwater', confidence: 90, label: 'Topwater', reason: `${isDawn ? 'Dawn' : 'Dusk'} + calm + warm water — surface feeding time` });
  }
  if (hasBass) {
    methods.push({ method: 'spin', confidence: 82, label: 'Spinning (Bass)', reason: 'Bass respond to artificial lures year-round' });
  }
  if (hasTrout && isStillwater) {
    methods.push({ method: 'bait', confidence: 80, label: 'Bait Fishing', reason: 'PowerBait and worms — proven for reservoir trout' });
    methods.push({ method: 'troll', confidence: 78, label: 'Trolling', reason: 'Cover water to find cruising trout' });
    methods.push({ method: 'fly', confidence: 72, label: 'Fly Fishing (Stillwater)', reason: 'Indicator nymphing or stripping streamers from float tube' });
  }
  if (hasTrout && locationType === 'river') {
    methods.push({ method: 'fly', confidence: 88, label: 'Fly Fishing', reason: 'Rivers are prime fly fishing water' });
    methods.push({ method: 'spin', confidence: 75, label: 'Spin Fishing', reason: 'Spinners and spoons work well in rivers' });
  }
  if (hasKokanee) {
    methods.push({ method: 'troll', confidence: 92, label: 'Trolling (Kokanee)', reason: 'Kokanee almost exclusively caught trolling' });
  }
  if (hasLakers) {
    methods.push({ method: 'troll', confidence: 88, label: 'Trolling / Jigging', reason: 'Lake trout require depth — trolling or vertical jigging' });
  }
  if (hasCatfish && (isNight || isDusk)) {
    methods.push({ method: 'bait', confidence: 92, label: 'Bait Fishing (Catfish)', reason: 'Night bait fishing for catfish is king' });
  } else if (hasCatfish) {
    methods.push({ method: 'bait', confidence: 75, label: 'Bait Fishing', reason: 'Catfish respond best to natural bait on bottom' });
  }
  if (hasWalleye) {
    methods.push({ method: 'troll', confidence: 80, label: 'Trolling (Walleye)', reason: 'Crawler harness trolling along structure edges' });
    methods.push({ method: 'spin', confidence: 78, label: 'Jigging / Spin', reason: 'Vertical jigging or casting blade baits' });
  }
  if (hasMuskie) {
    methods.push({ method: 'spin', confidence: 88, label: 'Casting (Muskie/Pike)', reason: 'Large swimbaits and bucktails — cast and retrieve' });
  }
  if (species?.includes('Wiper') || species?.includes('White Bass')) {
    methods.push({ method: 'spin', confidence: 85, label: 'Casting / Spinning', reason: 'Fast-retrieve spoons and cranks for schooling fish' });
  }
  if (species?.some(s => s.includes('Perch') || s.includes('Crappie') || s.includes('Bluegill'))) {
    methods.push({ method: 'bait', confidence: 80, label: 'Bait (Panfish)', reason: 'Bobber + worm or small jig — simple and effective' });
  }
  if (season === 'winter' && isStillwater) {
    methods.push({ method: 'ice', confidence: 88, label: 'Ice Fishing', reason: 'Winter on Utah reservoirs means ice fishing' });
  }

  methods.sort((a, b) => b.confidence - a.confidence);
  return methods;
}


// ─── MAIN PUBLIC API ────────────────────────────────────────────────

export function getDailyLurePick({ month, waterTemp, windSpeed, sky, pressureTrend, hour, locationId: _locationId, species, locationType, ecosystem }) {
  const season = getSeason(month);
  _currentSeason = season;
  const candidates = buildLureCandidates({ month, waterTemp, windSpeed, sky, pressureTrend, hour, species, locationType, ecosystem });

  // Deduplicate and keep highest confidence per lure key
  const best = {};
  candidates.forEach(c => {
    if (!best[c.lureKey] || c.confidence > best[c.lureKey].confidence) {
      best[c.lureKey] = c;
    }
  });

  const ranked = Object.values(best).sort((a, b) => b.confidence - a.confidence);

  // Group by category
  const byCat = {};
  ranked.forEach(r => {
    const cat = LURES[r.lureKey]?.category || 'other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r);
  });

  const eco = ecosystem || null;
  const methods = getBestMethod({ species, locationType, waterTemp, windSpeed, hour, season });
  const ecoClarity = eco?.waterClarity?.typical || (waterTemp > 50 ? 'clear' : 'stained');
  const colorRec = getColorRecommendation(sky, ecoClarity, eco);

  // Bass seasonal info
  const bassInfo = (species?.some(s => s.includes('Bass') && !s.includes('White') && !s.includes('Striped')))
    ? getBassSeason(waterTemp) : null;

  const walleyeInfo = species?.includes('Walleye') ? getWalleyeSeason(waterTemp, month) : null;

  // Trolling setup for primary trolling species
  const trollSpecies = ['Kokanee Salmon', 'Lake Trout', 'Rainbow Trout', 'Cutthroat Trout', 'Walleye', 'Striped Bass', 'Wiper']
    .find(s => species?.includes(s));
  const trollSetup = trollSpecies ? getTrollingSetup(trollSpecies, season, waterTemp, eco) : null;

  // Time plan
  const timePlan = buildTimePlan(ranked, hour);

  return {
    topPick: ranked[0] ? { ...ranked[0], lure: LURES[ranked[0].lureKey] } : null,
    alternatives: ranked.slice(1, 5).map(r => ({ ...r, lure: LURES[r.lureKey] })),
    byCategory: byCat,
    methods,
    colorRecommendation: colorRec,
    bassPattern: bassInfo,
    walleyePattern: walleyeInfo,
    trollingSetup: trollSetup,
    trollingSpecies: trollSpecies,
    timePlan,
    season,
    allPicks: ranked.slice(0, 12).map(r => ({ ...r, lure: LURES[r.lureKey] })),
    ecosystemInfo: eco ? {
      clarity: eco.waterClarity?.typical,
      visibilityFt: eco.waterClarity?.visibilityFt?.[season],
      topPredator: eco.predatorPrey?.topPredator,
      keyRelationship: eco.predatorPrey?.keyRelationship,
      primaryForage: (eco.forage?.primary || []).map(f => f.name).slice(0, 3),
    } : null,
  };
}


// ─── TIME PLAN BUILDER ──────────────────────────────────────────────

function buildTimePlan(ranked, currentHour) {
  const windows = [
    { key: 'dawn', label: 'Dawn (5-8 AM)', hours: [5,6,7] },
    { key: 'morning', label: 'Morning (8-11 AM)', hours: [8,9,10] },
    { key: 'midday', label: 'Midday (11 AM-2 PM)', hours: [11,12,13] },
    { key: 'afternoon', label: 'Afternoon (2-5 PM)', hours: [14,15,16] },
    { key: 'dusk', label: 'Dusk (5-8 PM)', hours: [17,18,19] },
    { key: 'night', label: 'Night (8 PM+)', hours: [20,21,22,23] },
  ];

  return windows.map(w => {
    const pick = ranked.find(r => r.timeWindow === w.key) || ranked.find(r => r.timeWindow === 'all-day');
    const isCurrent = w.hours.includes(currentHour);
    return {
      ...w,
      isCurrent,
      pick: pick ? { lureKey: pick.lureKey, name: LURES[pick.lureKey]?.name, confidence: pick.confidence, reason: pick.reason } : null,
    };
  });
}

export const TIME_WINDOW_LABELS = {
  'dawn': 'Dawn 5-8 AM',
  'morning': 'Morning 8-11',
  'midday': 'Midday 11-2',
  'afternoon': 'Afternoon 2-5',
  'dusk': 'Dusk 5-8 PM',
  'night': 'Night 8 PM+',
  'all-day': 'All Day',
};
