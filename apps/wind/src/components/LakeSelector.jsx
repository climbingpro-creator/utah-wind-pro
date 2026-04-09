import { MapPin, ChevronDown, ChevronUp, Wind, Snowflake, Mountain, Fish, Clock, ArrowRight, TrendingUp, Droplets, Zap } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LAKE_CONFIGS } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

// ─── SPOT METADATA ──────────────────────────────────────────────────────────

const UTAH_LAKE_LAUNCHES = [
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', wind: 'SE', direction: '135-165°', icon: '↖', position: 'South', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', wind: 'SE', direction: '130-160°', icon: '↖', position: 'S-Central', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', wind: 'S/SSW/W', direction: '180-270°', icon: '↙', position: 'Central', meter: 'PWS', meterName: 'Zigzag PWS' },
  { id: 'utah-lake-zigzag', name: 'Zig Zag', wind: 'SE', direction: '135-165°', icon: '↖', position: 'N-Central', meter: 'PWS', meterName: 'Zigzag PWS' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', wind: 'SE/E', direction: '120-160°', icon: '↖', position: 'North', meter: 'PWS', meterName: 'Zigzag PWS' },
];

const STRAWBERRY_LAUNCHES = [
  { id: 'strawberry-ladders', name: 'Ladders', wind: 'W/NW', direction: '260-340°', position: 'NW Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Primary launch — shallow, best access' },
  { id: 'strawberry-bay', name: 'Strawberry Bay', wind: 'W/SW', direction: '220-280°', position: 'W Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Marina area — good parking' },
  { id: 'strawberry-soldier', name: 'Soldier Creek', wind: 'S/SW', direction: '180-240°', position: 'South Dam', meter: 'RVZU1', meterName: 'Rays Valley', desc: 'Channeled canyon wind' },
  { id: 'strawberry-view', name: 'The View', wind: 'W/NW', direction: '260-330°', position: 'E Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Long open fetch — full exposure' },
  { id: 'strawberry-river', name: 'The River', wind: 'S/W', direction: '190-270°', position: 'SE Inlet', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'River corridor — sheltered terrain' },
];

const SKYLINE_SPOT = { id: 'skyline-drive', name: 'Skyline Drive', wind: 'W/NW', direction: '250-340°', position: '9,680 ft', meter: 'SKY', meterName: 'Skyline UDOT', desc: 'Big Drift — open bowls, deep snow' };

const OTHER_LAKES = [
  { id: 'deer-creek', name: 'Deer Creek', region: 'Wasatch', wind: 'SW Canyon', meter: 'KHCR', meterName: 'Heber Airport' },
  { id: 'willard-bay', name: 'Willard Bay', region: 'Box Elder', wind: 'S Flow', meter: 'KHIF', meterName: 'Hill AFB' },
  { id: 'pineview', name: 'Pineview', region: 'Weber', wind: 'E/W Canyon', meter: 'KOGD', meterName: 'Ogden Airport' },
];

const KITE_SPOTS = [
  { id: 'rush-lake', name: 'Rush Lake', wind: 'S Frontal', meter: 'KSLC', desc: 'Most kitable days in UT — shallow flat water, storm-front driven', hazard: 'EXTREME WIND' },
  { id: 'grantsville', name: 'Grantsville Reservoir', wind: 'S/SW', meter: 'KSLC', desc: 'Alternative to Rush — deeper water for larger skegs' },
  { id: 'deer-creek', name: 'Deer Creek', wind: 'SW Canyon', meter: 'KHCR', desc: 'Canyon thermal kiting — afternoon SW wind' },
  { id: 'willard-bay', name: 'Willard Bay', wind: 'S Flow', meter: 'KHIF', desc: 'South beach near state park — south wind under south flow' },
  { id: 'sulfur-creek', name: 'Sulphur Creek (WY)', wind: 'W Jet', meter: 'KEVW', desc: 'July wind escape — 90 min NE of SLC, fires when jet stream is due W' },
];

const SNOWKITE_EXTRA = [
  { id: 'powder-mountain', name: 'Powder Mountain', wind: 'S/W', meter: 'KSLC', desc: 'Hidden Lake to Towers — high elevation, wind exposure', position: '8,900 ft' },
  { id: 'monte-cristo', name: 'Monte Cristo', wind: 'W/NW', meter: 'KLGU', desc: 'Backcountry bowls — hike/snowmobile access, expert', position: '8,900 ft' },
];

const PARAGLIDING_SITES = [
  { id: 'potm-south', name: 'PotM — South Side', wind: 'S/SE', direction: '150-200°', meter: 'FPS', desc: '#1 US training site — 300 ft vertical, morning south', position: '4,900 ft', rating: 'P2+' },
  { id: 'potm-north', name: 'PotM — North Side', wind: 'N/NW', direction: '320-360°', meter: 'UTALP', desc: '900-1200 ft vertical, two ridges, afternoon north', position: '5,200 ft', rating: 'P2+' },
  { id: 'inspo', name: 'Inspiration Point', wind: 'W/SW', direction: '220-280°', meter: 'KPVU', desc: 'P3+ — mountain thermals, restricted LZs, midday turbulence', position: '6,667 ft', rating: 'P3+' },
  { id: 'west-mountain', name: 'West Mountain', wind: 'W/NW', direction: '260-330°', meter: 'KPVU', desc: 'Large LZs, 7-10 min flights, good XC intro', position: '5,500 ft', rating: 'P2+' },
  { id: 'stockton-bar', name: 'Stockton Bar', wind: 'N', direction: '340-20°', meter: 'KSLC', desc: 'Bonneville ridge soaring — afternoon north wind', position: '5,100 ft', rating: 'P2+' },
];

const LAKE_REGIONS = [
  {
    id: 'wasatch', label: 'Wasatch Front & Back', icon: '⛰️',
    lakes: [
      { id: 'strawberry-bay', name: 'Strawberry Reservoir', wind: 'W/NW', meter: 'UTCOP', fish: '🐟 Cutthroat, Rainbow, Kokanee, Chub', blueRibbon: true },
      { id: 'jordanelle', name: 'Jordanelle', wind: 'Canyon/Thermal', meter: 'KHCR', fish: '🐟 Kokanee, SMB, Trout' },
      { id: 'deer-creek', name: 'Deer Creek', wind: 'SW Canyon', meter: 'KHCR', fish: '🐟 Walleye, SMB, Trout', blueRibbon: true },
      { id: 'east-canyon', name: 'East Canyon', wind: 'Canyon', meter: 'KSLC', fish: '🐟 Brown Trout, SMB, Kokanee' },
      { id: 'echo', name: 'Echo', wind: 'I-80 Corridor', meter: 'KSLC', fish: '🐟 Wiper, SMB, Trout' },
      { id: 'rockport', name: 'Rockport', wind: 'Valley', meter: 'KSLC', fish: '🐟 Rainbow, SMB, Brown' },
    ],
  },
  {
    id: 'northern', label: 'Northern Utah', icon: '🏔️',
    lakes: [
      { id: 'willard-bay', name: 'Willard Bay', wind: 'S Flow', meter: 'KHIF', fish: '🐟 Wiper, Walleye, Catfish' },
      { id: 'pineview', name: 'Pineview', wind: 'E/W Canyon', meter: 'KOGD', fish: '🐟 LMB, SMB, Tiger Muskie' },
      { id: 'bear-lake', name: 'Bear Lake', wind: 'Strong W', meter: 'BERU1', fish: '🐟 Cutthroat, Lake Trout, Cisco', hazard: 'HIGH WIND' },
      { id: 'hyrum', name: 'Hyrum', wind: 'Valley', meter: 'KLGU', fish: '🐟 Rainbow, Perch, Bluegill' },
    ],
  },
  {
    id: 'northeast', label: 'Uinta Basin / Northeast', icon: '🦌',
    lakes: [
      { id: 'starvation', name: 'Starvation', wind: 'Valley', meter: 'KVEL', fish: '🐟 Walleye, SMB, Rainbow' },
      { id: 'flaming-gorge', name: 'Flaming Gorge', wind: 'Canyon/SE', meter: 'KFGR', fish: '🐟 Lake Trout (51 lb record!), Kokanee' },
      { id: 'steinaker', name: 'Steinaker', wind: 'Basin', meter: 'KVEL', fish: '🐟 Rainbow, LMB' },
      { id: 'red-fleet', name: 'Red Fleet', wind: 'Basin', meter: 'KVEL', fish: '🐟 Rainbow, Brown' },
    ],
  },
  {
    id: 'wyoming', label: 'SW Wyoming (Wind Escape)', icon: '🍺',
    lakes: [
      { id: 'sulfur-creek', name: 'Sulphur Creek', wind: 'W Jet Stream', meter: 'KEVW', fish: '🐟 Rainbow, Brown Trout', desc: 'July wind escape — 90 min NE of SLC, fires when jet stream is due west' },
    ],
  },
  {
    id: 'southeast', label: 'Castle Country / Plateau', icon: '🏜️',
    lakes: [
      { id: 'scofield', name: 'Scofield', wind: 'Plateau', meter: 'KPUC', fish: '🐟 Cutthroat, Tiger Trout', blueRibbon: true },
    ],
  },
  {
    id: 'southern', label: 'Southern Utah', icon: '☀️',
    lakes: [
      { id: 'yuba', name: 'Yuba', wind: 'Valley', meter: 'KPVU', fish: '🐟 Walleye, N.Pike, Wiper', hazard: '22-mi fetch' },
      { id: 'otter-creek', name: 'Otter Creek', wind: 'Plateau', meter: 'KCDC', fish: '🐟 Trout Factory!', blueRibbon: true },
      { id: 'fish-lake', name: 'Fish Lake', wind: 'Mountain', meter: 'KCDC', fish: '🐟 Trophy Mackinaw, Splake' },
      { id: 'minersville', name: 'Minersville', wind: 'Desert', meter: 'KCDC', fish: '🐟 Trophy Trout (lures only)' },
      { id: 'piute', name: 'Piute', wind: 'Valley', meter: 'KCDC', fish: '🐟 Trout, Crappie, White Bass' },
      { id: 'panguitch', name: 'Panguitch', wind: 'Plateau', meter: 'KCDC', fish: '🐟 Rainbow, Brown' },
      { id: 'lake-powell', name: 'Lake Powell', wind: 'Canyon/Desert', meter: 'KPGA', fish: '🐟 Stripers, LMB, Walleye', hazard: 'EXTREME' },
    ],
  },
  {
    id: 'dixie', label: 'Dixie / St. George', icon: '🌵',
    lakes: [
      { id: 'sand-hollow', name: 'Sand Hollow', wind: 'Desert', meter: 'KSGU', fish: '🐟 LMB, Bluegill, Rainbow' },
      { id: 'quail-creek', name: 'Quail Creek', wind: 'Desert', meter: 'KSGU', fish: '🐟 LMB, Rainbow (warmest!)' },
    ],
  },
];

// ─── FISHING INTELLIGENCE (unchanged) ───────────────────────────────────────

const FISH_INTEL = {
  'strawberry-bay': { elevation: 7600, species: ['Cutthroat', 'Rainbow', 'Kokanee'], seasons: { winter: { rating: 4, method: 'Ice fishing — jig through 12-18" ice', species: 'Cutthroat & Rainbow', tip: 'Ladders bay is best ice access' }, spring: { rating: 5, method: 'Shore fishing — spawning cutthroat cruise shallows', species: 'Cutthroat (spawn run)', tip: 'Cast spinners from shore at marina' }, summer: { rating: 4, method: 'Trolling 20-40 ft', species: 'Kokanee & Rainbow', tip: 'Troll with downriggers at dawn' }, fall: { rating: 5, method: 'Fall turnover pushes fish shallow', species: 'Cutthroat (aggressive)', tip: 'October cutthroat hit everything' } }, pressureSensitivity: 'moderate', windPreference: 'light' },
  'deer-creek': { elevation: 5400, species: ['Walleye', 'SMB', 'Rainbow'], seasons: { winter: { rating: 3, method: 'Ice fishing for trout', species: 'Rainbow', tip: 'Park at Wallsburg junction' }, spring: { rating: 5, method: 'Walleye spawn run', species: 'Walleye (spawn)', tip: 'April walleye run is legendary' }, summer: { rating: 4, method: 'Bass fishing — SMB on rocky structure', species: 'SMB & Walleye', tip: 'Drop-shot SMB near the dam' }, fall: { rating: 4, method: 'Trolling for walleye', species: 'Walleye & Rainbow', tip: 'Walleye move shallow in fall' } }, pressureSensitivity: 'high', windPreference: 'calm' },
  'willard-bay': { elevation: 4200, species: ['Wiper', 'Walleye', 'Catfish'], seasons: { winter: { rating: 3, method: 'Ice fishing for wiper', species: 'Wiper & Crappie', tip: 'South marina area' }, spring: { rating: 4, method: 'Wiper schooling at surface', species: 'Wiper', tip: 'Watch for surface boils' }, summer: { rating: 5, method: 'Catfish at night', species: 'Catfish & Wiper', tip: 'Best catfish lake in UT' }, fall: { rating: 4, method: 'Walleye and wiper', species: 'Walleye & Wiper', tip: 'Fall walleye bite at rip-rap' } }, pressureSensitivity: 'moderate', windPreference: 'light' },
  'utah-lake-lincoln': { elevation: 4489, species: ['Walleye', 'White Bass', 'Channel Cat'], seasons: { winter: { rating: 2, method: 'Limited', species: 'Walleye', tip: 'Ice unreliable' }, spring: { rating: 5, method: 'White bass run', species: 'White Bass (spawn run)', tip: 'June white bass run is epic' }, summer: { rating: 4, method: 'Catfish at night', species: 'Catfish & Walleye', tip: 'Shore fish Lincoln Beach' }, fall: { rating: 4, method: 'Walleye bite', species: 'Walleye & White Bass', tip: 'Walleye push shallow' } }, pressureSensitivity: 'low', windPreference: 'calm' },
  'flaming-gorge': { elevation: 6040, species: ['Lake Trout', 'Kokanee', 'SMB'], seasons: { winter: { rating: 3, method: 'Jigging for lake trout', species: 'Lake Trout', tip: 'Deep basins' }, spring: { rating: 5, method: 'Lake trout move shallow', species: 'Lake Trout & Rainbow', tip: 'May best trophy chance' }, summer: { rating: 4, method: 'Kokanee trolling', species: 'Kokanee & SMB', tip: 'Sheep Creek area' }, fall: { rating: 5, method: 'Lake trout frenzy', species: 'Lake Trout (trophy)', tip: 'October-November 30+ lb possible' } }, pressureSensitivity: 'moderate', windPreference: 'calm' },
  'scofield': { elevation: 7600, species: ['Cutthroat', 'Tiger Trout'], seasons: { winter: { rating: 5, method: 'Premier UT ice', species: 'Cutthroat & Tiger Trout', tip: '20+ fish days common' }, spring: { rating: 4, method: 'Shore fishing at ice-off', species: 'Cutthroat', tip: 'Creek mouths in late April' }, summer: { rating: 3, method: 'Trolling 15-25 ft', species: 'Rainbow & Cutthroat', tip: 'Fish go deep by July' }, fall: { rating: 4, method: 'Turnover fishing', species: 'Tiger Trout', tip: 'September tigers 3-5 lb' } }, pressureSensitivity: 'low', windPreference: 'light' },
  'lake-powell': { elevation: 3700, species: ['Striped Bass', 'LMB', 'SMB'], seasons: { winter: { rating: 3, method: 'Stripers in deep channels', species: 'Striped Bass', tip: 'Vertical jig at 40-60 ft' }, spring: { rating: 5, method: 'Bass spawn + striper boils', species: 'LMB, SMB, Stripers', tip: 'Sight fish in back canyons' }, summer: { rating: 5, method: 'Striper boils', species: 'Striped Bass (surface)', tip: 'EPIC — cast into the chaos' }, fall: { rating: 4, method: 'Stripers push shad', species: 'Stripers & SMB', tip: 'Find the bait, find the fish' } }, pressureSensitivity: 'low', windPreference: 'calm' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function mergeStationCache(cache, readings) {
  if (!readings?.length) return cache;
  const next = { ...cache };
  for (const s of readings) { if (s.id) next[s.id] = s; }
  return next;
}

function findStation(cache, meterId) {
  if (!cache || !meterId) return null;
  if (meterId === 'PWS') return cache['PWS'] || null;
  return cache[meterId] || null;
}

function getSpeedFromCache(cache, meterId) {
  const s = findStation(cache, meterId);
  if (!s) return null;
  return s.speed ?? s.windSpeed ?? null;
}

function getDirFromCache(cache, meterId) {
  const s = findStation(cache, meterId);
  if (!s) return null;
  return s.direction ?? s.windDirection ?? null;
}

function cardinal(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 4 && h < 7) return 'dawn';
  if (h >= 7 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'midday';
  if (h >= 16 && h < 19) return 'evening';
  if (h >= 19 && h < 21) return 'dusk';
  return 'night';
}

function getSpotList(activity) {
  if (activity === 'paragliding') return PARAGLIDING_SITES.map(s => ({ ...s, group: 'pg' }));
  if (activity === 'snowkiting') return [
    ...STRAWBERRY_LAUNCHES.map(s => ({ ...s, group: 'snow' })),
    { ...SKYLINE_SPOT, group: 'snow' },
    ...SNOWKITE_EXTRA.map(s => ({ ...s, group: 'snow' })),
  ];

  const spots = [
    { id: 'utah-lake', name: 'Utah Lake', wind: 'SE Thermal', meter: 'PWS', subLaunches: UTAH_LAKE_LAUNCHES, group: 'main' },
    { id: 'deer-creek', name: 'Deer Creek', wind: 'SW Canyon', meter: 'KHCR', group: 'main' },
    { id: 'willard-bay', name: 'Willard Bay', wind: 'S Flow', meter: 'KHIF', group: 'main' },
    { id: 'jordanelle', name: 'Jordanelle', wind: 'Canyon', meter: 'KHCR', group: 'main' },
    { id: 'sulfur-creek', name: 'Sulphur Creek (WY)', wind: 'W Jet', meter: 'KEVW', group: 'main' },
  ];

  if (['kiting', 'windsurfing', 'sailing'].includes(activity)) {
    spots.push(
      { id: 'rush-lake', name: 'Rush Lake', wind: 'S Frontal', meter: 'KSLC', group: 'kite' },
      { id: 'grantsville', name: 'Grantsville', wind: 'S/SW', meter: 'KSLC', group: 'kite' },
      { id: 'bear-lake', name: 'Bear Lake', wind: 'Strong W', meter: 'BERU1', group: 'kite' },
      { id: 'pineview', name: 'Pineview', wind: 'E/W Canyon', meter: 'KOGD', group: 'kite' },
      { id: 'sand-hollow', name: 'Sand Hollow', wind: 'Desert', meter: 'KSGU', group: 'kite' },
      { id: 'yuba', name: 'Yuba', wind: 'Valley', meter: 'KPVU', group: 'kite' },
    );
  }

  if (['boating', 'paddling', 'fishing'].includes(activity)) {
    spots.push(
      { id: 'strawberry-bay', name: 'Strawberry', wind: 'W/NW', meter: 'UTCOP', group: 'other' },
      { id: 'pineview', name: 'Pineview', wind: 'E/W Canyon', meter: 'KOGD', group: 'other' },
      { id: 'bear-lake', name: 'Bear Lake', wind: 'Strong W', meter: 'BERU1', group: 'other' },
      { id: 'flaming-gorge', name: 'Flaming Gorge', wind: 'Canyon/SE', meter: 'KFGR', group: 'other' },
      { id: 'sand-hollow', name: 'Sand Hollow', wind: 'Desert', meter: 'KSGU', group: 'other' },
      { id: 'scofield', name: 'Scofield', wind: 'Plateau', meter: 'KPUC', group: 'other' },
      { id: 'lake-powell', name: 'Lake Powell', wind: 'Canyon', meter: 'KPGA', group: 'other' },
      { id: 'yuba', name: 'Yuba', wind: 'Valley', meter: 'KPVU', group: 'other' },
    );
  }

  const seen = new Set();
  return spots.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
}

function isUtahLakeLaunch(id) {
  return id?.startsWith('utah-lake');
}

// ─── FISHING RECOMMENDATION ─────────────────────────────────────────────────

function getFishingRecommendation(windStatuses, pressureData) {
  const season = getSeason();
  const tod = getTimeOfDay();
  const allLakes = LAKE_REGIONS.flatMap(r => r.lakes);
  const pressureTrend = pressureData?.gradient;
  const isFallingPressure = pressureTrend != null && pressureTrend > 0.5;
  const isRisingPressure = pressureTrend != null && pressureTrend < -0.5;
  const isStablePressure = pressureTrend != null && Math.abs(pressureTrend) <= 0.5;

  let pressureNote = '';
  if (isFallingPressure) pressureNote = 'Falling pressure — fish feed aggressively';
  else if (isRisingPressure) pressureNote = 'Rising pressure — bite improving';
  else if (isStablePressure) pressureNote = 'Stable barometer — consistent bite';

  const scored = [];
  for (const lake of allLakes) {
    const intel = FISH_INTEL[lake.id];
    const windSpeed = windStatuses[lake.id] ?? null;
    const seasonData = intel?.seasons?.[season];
    let score = seasonData?.rating ?? 2;
    const reasons = [];
    if (seasonData) reasons.push(seasonData.method);
    if (windSpeed == null) { reasons.push('No wind data'); }
    else if (windSpeed < 5) { score += 2; reasons.push('Calm — ideal'); }
    else if (windSpeed < 10) { score += 1; reasons.push('Light wind'); }
    else if (windSpeed < 15) { score -= 1; reasons.push('Moderate wind'); }
    else { score -= 3; reasons.push('High wind'); }
    if (isFallingPressure && intel?.pressureSensitivity === 'high') { score += 2; }
    if (tod === 'dawn' || tod === 'dusk') score += 2;
    else if (tod === 'morning' || tod === 'evening') score += 1;
    else if (tod === 'midday') score -= 1;
    if (lake.blueRibbon) score += 1;
    scored.push({ lake, intel, seasonData, score, reasons, windSpeed });
  }
  scored.sort((a, b) => b.score - a.score);

  let todTip = '';
  if (tod === 'dawn') todTip = 'Prime feeding window';
  else if (tod === 'morning') todTip = 'Good — topwater + shallow';
  else if (tod === 'midday') todTip = 'Go deeper, slower presentations';
  else if (tod === 'evening') todTip = 'Bite building — move to shallows';
  else if (tod === 'dusk') todTip = 'Topwater time';
  else todTip = 'Night — target catfish and walleye';

  return {
    top: scored[0], runner: scored[1], season,
    seasonLabel: season.charAt(0).toUpperCase() + season.slice(1),
    timeOfDay: tod, todTip, pressureNote, isFallingPressure, isRisingPressure,
  };
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function SpotPill({ spot, speed, isSelected, isUtahLake, isDark, onSelect }) {
  const hasWind = speed != null && speed > 0;
  return (
    <button
      onClick={() => onSelect(spot.id)}
      className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all min-w-[5.5rem] ${
        isSelected
          ? 'border-sky-500 bg-sky-500/[0.08] ring-1 ring-sky-500/30'
          : hasWind && speed >= 8
            ? (isDark ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-emerald-200 bg-emerald-50')
            : (isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-card)]' : 'border-slate-200 bg-white')
      }`}
    >
      <span className={`text-[11px] font-bold truncate max-w-[6rem] ${isSelected ? 'text-sky-400' : 'text-[var(--text-primary)]'}`}>
        {spot.name}
      </span>
      <span className={`text-sm font-extrabold tabular-nums ${
        isSelected ? 'text-sky-400'
          : hasWind && speed >= 8 ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
          : 'text-[var(--text-secondary)]'
      }`}>
        {hasWind ? Math.round(speed) : '--'} <span className="text-[9px] font-semibold opacity-60">mph</span>
      </span>
      {isUtahLake && (
        <span className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>5 spots</span>
      )}
    </button>
  );
}

function SelectedSpotCard({ spot, stationCache, thermalPrediction, lakeState, selectedLake, isDark, onSelectLake }) {
  const [expandLaunches, setExpandLaunches] = useState(false);
  const isUL = spot?.id === 'utah-lake' || isUtahLakeLaunch(selectedLake);
  const cfg = LAKE_CONFIGS[selectedLake];

  const speed = getSpeedFromCache(stationCache, spot?.meter);
  const dir = getDirFromCache(stationCache, spot?.meter);
  const thermal = thermalPrediction || {};
  const rawProb = thermal.windProbability ?? thermal.probability ?? 0;
  const prob = rawProb >= 1 ? Math.round(rawProb) : Math.round(rawProb * 100);
  const arrowhead = thermal.arrowhead;
  const wahsatch = thermal.wahsatch;
  const propagation = lakeState?.propagation;

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-[var(--bg-card)] border-[var(--border-color)]' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-extrabold text-[var(--text-primary)]">
            {isUL ? 'Utah Lake' : (cfg?.name || spot?.name)}
          </h3>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isUL ? '5 launch locations · SE Thermal' : (spot?.wind || cfg?.primaryWindType || '')}
            {cfg?.elevation ? ` · ${cfg.elevation.toLocaleString()} ft` : ''}
          </p>
        </div>
        <div className="text-right">
          {speed != null ? (
            <div className={`text-2xl font-black tabular-nums ${speed >= 8 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-[var(--text-primary)]'}`}>
              {Math.round(speed)}
              <span className="text-xs font-semibold ml-0.5 text-[var(--text-tertiary)]">mph</span>
            </div>
          ) : (
            <div className="text-xl font-bold text-[var(--text-tertiary)]">--</div>
          )}
          {dir != null && <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{cardinal(dir)} ({Math.round(dir)}°)</div>}
        </div>
      </div>

      {/* Prediction chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {prob > 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
            prob >= 50 ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
              : prob >= 20 ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700')
              : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
          }`}>
            <TrendingUp className="w-3 h-3" />
            {prob}% wind probability
          </span>
        )}
        {arrowhead?.status === 'trigger' && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700'}`}>
            <Zap className="w-3 h-3" />
            Arrowhead TRIGGER
          </span>
        )}
        {wahsatch?.status === 'trigger' && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
            <Zap className="w-3 h-3" />
            Wahsatch TRIGGER
          </span>
        )}
        {propagation?.phase === 'propagating' && propagation?.etaMinutes != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
            <Clock className="w-3 h-3" />
            Wind arriving ~{propagation.etaMinutes} min
          </span>
        )}
        {lakeState?.pressure?.gradient != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            ΔP {lakeState.pressure.gradient > 0 ? '+' : ''}{safeToFixed(lakeState.pressure.gradient, 1)} mb
          </span>
        )}
      </div>

      {/* Utah Lake sub-launches */}
      {isUL && (
        <>
          <button
            onClick={() => setExpandLaunches(v => !v)}
            className={`w-full flex items-center justify-between py-2 text-xs font-semibold transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Choose Launch ({UTAH_LAKE_LAUNCHES.length} locations)</span>
            {expandLaunches ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandLaunches && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {UTAH_LAKE_LAUNCHES.map(launch => {
                const launchSpeed = getSpeedFromCache(stationCache, launch.meter);
                const isActive = selectedLake === launch.id;
                return (
                  <button
                    key={launch.id}
                    onClick={() => onSelectLake(launch.id)}
                    className={`flex flex-col items-center p-2.5 rounded-lg border transition-all ${
                      isActive
                        ? 'border-sky-500 bg-sky-500/[0.08]'
                        : isDark ? 'border-[var(--border-subtle)] bg-white/[0.02] hover:border-[var(--border-color)]'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isActive ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{launch.name}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{launch.position} · {launch.wind}</span>
                    {launchSpeed != null && (
                      <span className={`text-xs font-bold mt-1 ${isActive ? 'text-sky-400' : 'text-[var(--text-secondary)]'}`}>
                        {Math.round(launchSpeed)} mph
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FishingHero({ recommendation, onSelectLake, isDark }) {
  if (!recommendation?.top) return null;
  const { top, runner, seasonLabel, todTip, pressureNote, isFallingPressure } = recommendation;
  const topSeason = top.seasonData;

  return (
    <div className={`rounded-2xl overflow-hidden border ${
      isDark ? 'bg-gradient-to-br from-emerald-500/10 via-[var(--bg-card)] to-sky-500/5 border-emerald-500/20'
        : 'bg-gradient-to-br from-emerald-50 via-white to-sky-50 border-emerald-200'
    }`}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Fish className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Where to Fish</span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
            {seasonLabel}
          </span>
        </div>
        <button onClick={() => onSelectLake(top.lake.id)} className={`w-full text-left rounded-xl p-3 border transition-all ${isDark ? 'bg-emerald-500/[0.08] border-emerald-500/30' : 'bg-white border-emerald-200 shadow-sm'}`}>
          <span className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{top.lake.name}</span>
          {topSeason && <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{topSeason.species} — {topSeason.method}</p>}
        </button>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <Clock className="w-3 h-3 inline mr-1" />{todTip}
          </span>
          {pressureNote && (
            <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold ${
              isFallingPressure ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              <Droplets className="w-3 h-3 inline mr-1" />{pressureNote}
            </span>
          )}
        </div>
      </div>
      {runner && runner.score > 2 && (
        <div className={`border-t px-4 py-2 ${isDark ? 'border-[var(--border-color)]' : 'border-emerald-100'}`}>
          <button onClick={() => onSelectLake(runner.lake.id)} className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-sm ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-emerald-50/50'}`}>
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>#2 {runner.lake.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}

function AllSpotsSection({ isDark, selectedLake, onSelectLake, stationCache, activity }) {
  const [open, setOpen] = useState(false);

  const isFishing = ['fishing', 'boating', 'paddling'].includes(activity);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between py-2 text-xs font-semibold ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <span className="uppercase tracking-wider">All {isFishing ? 'Lakes by Region' : 'Spots'}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && isFishing && (
        <div className="space-y-3 mt-1">
          {LAKE_REGIONS.map(region => (
            <div key={region.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{region.icon}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{region.label}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {region.lakes.map(lake => {
                  const sp = getSpeedFromCache(stationCache, lake.meter);
                  const isActive = selectedLake === lake.id;
                  return (
                    <button key={lake.id} onClick={() => onSelectLake(lake.id)} className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      isActive ? 'border-sky-500 bg-sky-500/[0.08]' : isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]' : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                      <div className="min-w-0">
                        <div className={`text-[11px] font-bold truncate ${isActive ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{lake.name}</div>
                        <div className={`text-[9px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{lake.fish || lake.wind}</div>
                      </div>
                      {sp != null && <span className={`text-xs font-bold shrink-0 ml-2 ${sp >= 8 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-[var(--text-secondary)]'}`}>{Math.round(sp)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && !isFishing && (
        <div className="space-y-3 mt-1">
          {activity === 'paragliding' && (
            <SpotGroup label="Paragliding Sites" icon={<Mountain className="w-3.5 h-3.5" />} spots={PARAGLIDING_SITES} stationCache={stationCache} selectedLake={selectedLake} onSelectLake={onSelectLake} isDark={isDark} />
          )}
          {activity === 'snowkiting' && (
            <>
              <SpotGroup label="Strawberry Reservoir" icon={<Snowflake className="w-3.5 h-3.5" />} spots={STRAWBERRY_LAUNCHES} stationCache={stationCache} selectedLake={selectedLake} onSelectLake={onSelectLake} isDark={isDark} />
              <SpotGroup label="More Snow Terrain" icon={<Mountain className="w-3.5 h-3.5" />} spots={[SKYLINE_SPOT, ...SNOWKITE_EXTRA]} stationCache={stationCache} selectedLake={selectedLake} onSelectLake={onSelectLake} isDark={isDark} />
            </>
          )}
          {['kiting', 'sailing', 'windsurfing'].includes(activity) && (
            <>
              <SpotGroup label="Kite Spots" icon={<Wind className="w-3.5 h-3.5" />} spots={KITE_SPOTS} stationCache={stationCache} selectedLake={selectedLake} onSelectLake={onSelectLake} isDark={isDark} />
              <SpotGroup label="Other Lakes" icon={<MapPin className="w-3.5 h-3.5" />} spots={OTHER_LAKES} stationCache={stationCache} selectedLake={selectedLake} onSelectLake={onSelectLake} isDark={isDark} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SpotGroup({ label, icon, spots, stationCache, selectedLake, onSelectLake, isDark }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{icon}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {spots.map(spot => {
          const sp = getSpeedFromCache(stationCache, spot.meter);
          const isActive = selectedLake === spot.id;
          return (
            <button key={spot.id} onClick={() => onSelectLake(spot.id)} className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
              isActive ? 'border-sky-500 bg-sky-500/[0.08]' : isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]' : 'border-slate-100 bg-white hover:border-slate-200'
            }`}>
              <div className="min-w-0">
                <div className={`text-[11px] font-bold truncate ${isActive ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{spot.name}</div>
                <div className={`text-[9px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{spot.desc || spot.wind}</div>
              </div>
              {sp != null && <span className={`text-xs font-bold shrink-0 ml-2 ${sp >= 8 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-[var(--text-secondary)]'}`}>{Math.round(sp)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function LakeSelector({ selectedLake, onSelectLake, stationReadings, activity, pressureData, lakeState, thermalPrediction }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cacheRef = useRef({});
  useEffect(() => {
    cacheRef.current = mergeStationCache(cacheRef.current, stationReadings);
  }, [stationReadings]);

  const stationCache = useMemo(
    () => mergeStationCache(cacheRef.current, stationReadings),
    [stationReadings]
  );

  const spots = useMemo(() => getSpotList(activity), [activity]);

  const handleSelect = useCallback((id) => {
    if (id === 'utah-lake') {
      const current = selectedLake?.startsWith('utah-lake') ? selectedLake : 'utah-lake-zigzag';
      onSelectLake(current);
    } else {
      onSelectLake(id);
    }
  }, [onSelectLake, selectedLake]);

  const selectedSpot = useMemo(() => {
    if (isUtahLakeLaunch(selectedLake)) return spots.find(s => s.id === 'utah-lake') || spots[0];
    return spots.find(s => s.id === selectedLake) || spots[0];
  }, [spots, selectedLake]);

  const isFishing = activity === 'fishing';
  const windSpeedMap = useMemo(() => {
    const m = {};
    for (const lake of LAKE_REGIONS.flatMap(r => r.lakes)) {
      const sp = getSpeedFromCache(stationCache, lake.meter);
      if (sp != null) m[lake.id] = sp;
    }
    return m;
  }, [stationCache]);

  const fishingRec = useMemo(() => {
    if (!isFishing) return null;
    return getFishingRecommendation(windSpeedMap, pressureData);
  }, [isFishing, windSpeedMap, pressureData]);

  return (
    <div className="space-y-3">
      {/* SECTION 1: Horizontal scroll strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {spots.map(spot => {
          const isUL = spot.id === 'utah-lake';
          const isSelected = isUL ? isUtahLakeLaunch(selectedLake) : selectedLake === spot.id;
          const speed = getSpeedFromCache(stationCache, spot.meter);
          return (
            <SpotPill
              key={spot.id}
              spot={spot}
              speed={speed}
              isSelected={isSelected}
              isUtahLake={isUL}
              isDark={isDark}
              onSelect={handleSelect}
            />
          );
        })}
      </div>

      {/* SECTION 2: Selected spot detail card */}
      {selectedSpot && (
        <SelectedSpotCard
          spot={selectedSpot}
          stationCache={stationCache}
          thermalPrediction={thermalPrediction}
          lakeState={lakeState}
          selectedLake={selectedLake}
          isDark={isDark}
          onSelectLake={onSelectLake}
        />
      )}

      {/* Fishing hero (fishing only) */}
      {isFishing && fishingRec && (
        <FishingHero recommendation={fishingRec} onSelectLake={onSelectLake} isDark={isDark} />
      )}

      {/* SECTION 3: All spots expandable */}
      <AllSpotsSection
        isDark={isDark}
        selectedLake={selectedLake}
        onSelectLake={onSelectLake}
        stationCache={stationCache}
        activity={activity}
      />
    </div>
  );
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

export { UTAH_LAKE_LAUNCHES, STRAWBERRY_LAUNCHES, SKYLINE_SPOT, OTHER_LAKES, LAKE_REGIONS, KITE_SPOTS, SNOWKITE_EXTRA, PARAGLIDING_SITES };
