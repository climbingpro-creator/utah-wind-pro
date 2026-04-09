import { MapPin, Wind, Star, ChevronDown, ChevronUp, Loader2, Fish, Clock, ArrowRight, TrendingUp, Droplets, Zap } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LAKE_CONFIGS } from '@utahwind/weather';
import { useCrossLocationPredictions, ACTIVITY_SPOTS } from '../hooks/useCrossLocationPredictions';

// ─── SPOT METADATA (kept for exports + legacy consumers) ─────────────────────

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

// ─── FISHING INTELLIGENCE ────────────────────────────────────────────────────

const FISH_INTEL = {
  'strawberry-bay': { elevation: 7600, species: ['Cutthroat', 'Rainbow', 'Kokanee'], seasons: { winter: { rating: 4, method: 'Ice fishing — jig through 12-18" ice, target 15-30 ft', species: 'Cutthroat & Rainbow', tip: 'Ladders bay is best ice access, use wax worms or small jigs' }, spring: { rating: 5, method: 'Shore fishing — spawning cutthroat cruise shallows', species: 'Cutthroat (spawn run)', tip: 'Cast spinners from shore at Strawberry Bay marina — fish stack up at inlet' }, summer: { rating: 4, method: 'Trolling 20-40 ft — fish go deep when surface warms', species: 'Kokanee & Rainbow', tip: 'Troll with downriggers at dawn, Kokanee school at 30 ft by July' }, fall: { rating: 5, method: 'Shore & trolling — fall turnover pushes fish shallow', species: 'Cutthroat (aggressive pre-winter feed)', tip: 'Best month is October — cutthroat hit everything, 3-5 lb fish common' } }, pressureSensitivity: 'moderate', windPreference: 'light' },
  'deer-creek': { elevation: 5400, species: ['Walleye', 'SMB', 'Rainbow'], seasons: { winter: { rating: 3, method: 'Ice fishing for trout — limited access', species: 'Rainbow', tip: 'Park at Wallsburg junction, ice thickness varies — check reports' }, spring: { rating: 5, method: 'Walleye spawn run — cast jigs along rocky points', species: 'Walleye (spawn)', tip: 'April walleye run is legendary — fish the dam face at night with jigs' }, summer: { rating: 4, method: 'Bass fishing — SMB on rocky structure', species: 'SMB & Walleye', tip: 'Drop-shot SMB near the dam, walleye at night on bottom bouncers' }, fall: { rating: 4, method: 'Trolling for walleye — aggressive fall feed', species: 'Walleye & Rainbow', tip: 'Walleye move shallow in fall — cast crankbaits along rip-rap at dusk' } }, pressureSensitivity: 'high', windPreference: 'calm' },
  'jordanelle': { elevation: 6200, species: ['SMB', 'Kokanee', 'Perch'], seasons: { winter: { rating: 3, method: 'Ice fishing — perch and trout', species: 'Perch & Rainbow', tip: 'Rock Cliff area produces best through ice' }, spring: { rating: 4, method: 'SMB spawn — sight fish in shallows', species: 'SMB (spawn)', tip: 'May-June bass move to 3-8 ft gravel — use tubes and drop-shot' }, summer: { rating: 4, method: 'Trolling for Kokanee at 40-60 ft', species: 'Kokanee & SMB', tip: 'Kokanee stack at thermocline by July — troll with dodgers and corn' }, fall: { rating: 3, method: 'Bass and perch on structure', species: 'SMB & Perch', tip: 'Bass push deep, fish rocky humps with jigs' } }, pressureSensitivity: 'moderate', windPreference: 'light' },
  'utah-lake-lincoln': { elevation: 4489, species: ['Walleye', 'White Bass', 'Channel Cat', 'Carp'], seasons: { winter: { rating: 2, method: 'Limited — ice unsafe in many areas', species: 'Walleye', tip: 'Ice is unreliable — check thickness carefully, Lincoln Beach area' }, spring: { rating: 5, method: 'White bass run up Provo River — epic action', species: 'White Bass (spawn run)', tip: 'June white bass run is UT\'s best shore fishing — Provo River inlet, cast small spoons' }, summer: { rating: 4, method: 'Catfish at night, walleye at dawn', species: 'Catfish & Walleye', tip: 'Shore fish Lincoln Beach at night with cut bait for channel cats 5-10 lb' }, fall: { rating: 4, method: 'Walleye bite turns on — trolling and casting', species: 'Walleye & White Bass', tip: 'September walleye push shallow — cast jerkbaits near rocky points' } }, pressureSensitivity: 'low', windPreference: 'calm' },
  'flaming-gorge': { elevation: 6040, species: ['Lake Trout', 'Kokanee', 'SMB', 'Rainbow'], seasons: { winter: { rating: 3, method: 'Jigging for lake trout at 80-120 ft', species: 'Lake Trout', tip: 'Lakers stack in deep basins — use tube jigs tipped with sucker meat' }, spring: { rating: 5, method: 'Lake trout move shallow — trolling and jigging', species: 'Lake Trout & Rainbow', tip: 'May lakers at 20-40 ft near points — best trophy chance (20+ lb)' }, summer: { rating: 4, method: 'Kokanee trolling at thermocline', species: 'Kokanee & SMB', tip: 'Kokanee in Sheep Creek area at 35-50 ft — use dodgers with wedding rings' }, fall: { rating: 5, method: 'Lake trout feeding frenzy before ice', species: 'Lake Trout (trophy season)', tip: 'October-November lakers gorge — real chance at 30+ lb fish, troll big swimbaits' } }, pressureSensitivity: 'moderate', windPreference: 'calm' },
  'willard-bay': { elevation: 4200, species: ['Wiper', 'Walleye', 'Catfish', 'Crappie'], seasons: { winter: { rating: 3, method: 'Ice fishing for wiper and crappie', species: 'Wiper & Crappie', tip: 'South marina area — jig for crappie at 10-15 ft, wiper cruise edges' }, spring: { rating: 4, method: 'Wiper schooling at surface — exciting topwater', species: 'Wiper', tip: 'Watch for surface boils — cast anything silver into the feeding frenzy' }, summer: { rating: 5, method: 'Catfish at night, wiper at dawn', species: 'Catfish & Wiper', tip: 'Best catfish lake in UT — use chicken liver at south marina, 10+ lb channels' }, fall: { rating: 4, method: 'Walleye and wiper in transition', species: 'Walleye & Wiper', tip: 'Fall walleye bite at rip-rap, slow-roll swimbaits along dam face' } }, pressureSensitivity: 'moderate', windPreference: 'light' },
  'scofield': { elevation: 7600, species: ['Cutthroat', 'Tiger Trout', 'Rainbow'], seasons: { winter: { rating: 5, method: 'Ice fishing — premier UT ice destination', species: 'Cutthroat & Tiger Trout', tip: 'Best ice fishing in Utah — 20+ fish days common, use small jigs with wax worms' }, spring: { rating: 4, method: 'Shore fishing at ice-off', species: 'Cutthroat & Tiger Trout', tip: 'Ice-off in late April is magic — fish stack at creek mouths, cast PowerBait' }, summer: { rating: 3, method: 'Trolling — fish scatter in warm water', species: 'Rainbow & Cutthroat', tip: 'Fish go deep by July — troll at 15-25 ft with worm harnesses' }, fall: { rating: 4, method: 'Shore fishing — turnover pushes fish up', species: 'Tiger Trout & Cutthroat', tip: 'September tigers get aggressive — cast Rapalas near dam, 3-5 lb tigers possible' } }, pressureSensitivity: 'low', windPreference: 'light' },
  'lake-powell': { elevation: 3700, species: ['Striped Bass', 'LMB', 'SMB', 'Walleye'], seasons: { winter: { rating: 3, method: 'Stripers in deep channels', species: 'Striped Bass', tip: 'Stripers school at 40-60 ft — find them on sonar, vertical jig' }, spring: { rating: 5, method: 'Bass spawn in canyons, striper boils begin', species: 'LMB, SMB, Stripers', tip: 'March-May LMB spawn in back canyons — sight fish, then striper boils start in May' }, summer: { rating: 5, method: 'Striper boils — most exciting fishing in UT', species: 'Striped Bass (surface)', tip: 'June striper boils are EPIC — watch for bird activity, cast anything into the chaos' }, fall: { rating: 4, method: 'Stripers push shad into canyons', species: 'Stripers & SMB', tip: 'Stripers herd shad into narrow canyons — find the bait, find the fish' } }, pressureSensitivity: 'low', windPreference: 'calm' },
};

// ─── FAVORITES / RECENTS ─────────────────────────────────────────────────────

const FAVORITES_KEY = 'uwf_favorite_spots';
const RECENTS_KEY = 'uwf_recent_spots';
const MAX_RECENTS = 5;

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
}
function setFavorites(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}
function toggleFavorite(id) {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
  setFavorites(next);
  return next;
}
function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
}
function pushRecent(id) {
  const recents = getRecents().filter(r => r !== id);
  recents.unshift(id);
  const trimmed = recents.slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  return trimmed;
}

// ─── FISHING HELPERS ─────────────────────────────────────────────────────────

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

function getFishingRecommendation(predictions, pressureData) {
  const season = getSeason();
  const tod = getTimeOfDay();

  const pressureTrend = pressureData?.gradient;
  const isFallingPressure = pressureTrend != null && pressureTrend > 0.5;
  const isRisingPressure = pressureTrend != null && pressureTrend < -0.5;
  const isStablePressure = pressureTrend != null && Math.abs(pressureTrend) <= 0.5;

  let pressureNote = '';
  if (isFallingPressure) pressureNote = 'Falling pressure — fish feed aggressively before a front';
  else if (isRisingPressure) pressureNote = 'Rising pressure — bite improving as conditions stabilize';
  else if (isStablePressure) pressureNote = 'Stable barometer — consistent, predictable bite';

  const allLakes = LAKE_REGIONS.flatMap(r => r.lakes);
  const scored = [];

  for (const lake of allLakes) {
    const intel = FISH_INTEL[lake.id];
    const pred = predictions.find(p => p.spotId === lake.id);
    const windSpeed = pred?.windSpeed ?? null;
    const seasonData = intel?.seasons?.[season];

    let score = seasonData?.rating ?? 2;
    const reasons = [];
    if (seasonData) reasons.push(seasonData.method);

    if (windSpeed == null) { reasons.push('No wind data — check conditions on-site'); }
    else if (windSpeed < 5) { score += 2; reasons.push('Calm water — ideal conditions'); }
    else if (windSpeed < 10) { score += 1; reasons.push('Light wind — fishable'); }
    else if (windSpeed < 15) { score -= 1; reasons.push('Moderate wind — fish deeper structure'); }
    else { score -= 3; reasons.push('High wind — tough conditions'); }

    if (isFallingPressure && intel?.pressureSensitivity === 'high') { score += 2; reasons.push('Pre-frontal feed — this lake responds strongly'); }
    else if (isFallingPressure && intel?.pressureSensitivity === 'moderate') { score += 1; }

    if (tod === 'dawn' || tod === 'dusk') { score += 2; reasons.push(tod === 'dawn' ? 'Dawn feed window — peak activity' : 'Dusk feed — topwater time'); }
    else if (tod === 'morning' || tod === 'evening') { score += 1; }
    else if (tod === 'midday') { score -= 1; reasons.push('Midday — fish deeper, slower presentations'); }
    else if (tod === 'night' && (lake.fish?.includes('Catfish') || lake.fish?.includes('Walleye'))) { score += 2; reasons.push('Night bite — catfish and walleye active after dark'); }

    if (lake.blueRibbon) { score += 1; reasons.push('Blue Ribbon fishery'); }
    if (lake.hazard && windSpeed > 10) { score -= 2; }

    scored.push({ lake, intel, seasonData, score, reasons, windSpeed });
  }

  scored.sort((a, b) => b.score - a.score);

  let todTip = '';
  if (tod === 'dawn') todTip = 'Get on the water now — prime feeding window before sun hits';
  else if (tod === 'morning') todTip = 'Good window — topwater and shallow presentations';
  else if (tod === 'midday') todTip = 'Switch to deeper techniques — fish holding at thermocline';
  else if (tod === 'evening') todTip = 'Evening bite building — move to shallows and structure';
  else if (tod === 'dusk') todTip = 'Topwater time — fish the last hour aggressively';
  else todTip = 'Night fishing — target catfish and walleye with bottom rigs';

  return {
    top: scored[0], runner: scored[1], season,
    seasonLabel: season.charAt(0).toUpperCase() + season.slice(1),
    timeOfDay: tod, todTip, pressureNote, isFallingPressure, isRisingPressure,
  };
}

// ─── DECISION BADGE ──────────────────────────────────────────────────────────

const DECISION_COLORS = {
  GO:   { dot: 'bg-emerald-500', badge: 'bg-emerald-500 text-white', text: 'text-emerald-400', bg: 'bg-emerald-500/[0.06] border-emerald-500/30', bgLight: 'bg-emerald-50 border-emerald-200' },
  WAIT: { dot: 'bg-amber-500', badge: 'bg-amber-500 text-white', text: 'text-amber-400', bg: 'bg-amber-500/[0.06] border-amber-500/25', bgLight: 'bg-amber-50 border-amber-200' },
  PASS: { dot: 'bg-slate-400', badge: 'bg-slate-500 text-white', text: 'text-slate-400', bg: 'bg-slate-500/[0.04] border-slate-500/20', bgLight: 'bg-slate-50 border-slate-200' },
};

function DecisionDot({ decision }) {
  const c = DECISION_COLORS[decision] || DECISION_COLORS.PASS;
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot} ${decision === 'GO' ? 'animate-pulse' : ''}`} />;
}

// ─── CARDINAL DIRECTION ──────────────────────────────────────────────────────

function cardinal(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ─── WIND NOW STRIP ──────────────────────────────────────────────────────────

function WindNowStrip({ predictions, loading, selectedLake, onSelect, isDark }) {
  if (loading && predictions.length === 0) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`shrink-0 w-28 h-14 rounded-xl animate-pulse ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`} />
        ))}
      </div>
    );
  }
  if (predictions.length === 0) return null;

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {predictions.map(spot => {
        const isSelected = selectedLake === spot.spotId;
        const c = DECISION_COLORS[spot.decision] || DECISION_COLORS.PASS;
        return (
          <button
            key={spot.spotId}
            onClick={() => onSelect(spot.spotId)}
            className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all text-center min-w-[5.5rem] ${
              isSelected
                ? 'border-sky-500 bg-sky-500/[0.08] ring-1 ring-sky-500/30'
                : isDark ? `${c.bg} hover:border-opacity-60` : `${c.bgLight} hover:border-opacity-60`
            }`}
          >
            <div className="flex items-center gap-1.5">
              <DecisionDot decision={spot.decision} />
              <span className={`text-[11px] font-bold truncate max-w-[5rem] ${isSelected ? 'text-sky-400' : 'text-[var(--text-primary)]'}`}>
                {spot.spotName}
              </span>
            </div>
            <span className={`text-sm font-extrabold tabular-nums ${isSelected ? 'text-sky-400' : c.text}`}>
              {Math.round(spot.windSpeed)} <span className="text-[9px] font-semibold opacity-70">mph</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── SPOT CARD (used in favorites and all-spots) ─────────────────────────────

function SpotCard({ spot, isSelected, isFavorite, onSelect, onToggleFavorite, isDark }) {
  const c = DECISION_COLORS[spot.decision] || DECISION_COLORS.PASS;
  const dir = cardinal(spot.windDirection);

  return (
    <div className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
      isSelected
        ? 'border-sky-500 bg-sky-500/[0.08] ring-1 ring-sky-500/30'
        : isDark ? `${c.bg} hover:border-opacity-60` : `${c.bgLight} hover:border-opacity-60`
    }`}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(spot.spotId); }}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          isFavorite
            ? 'text-amber-400 bg-amber-500/15'
            : isDark ? 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
        }`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      <button onClick={() => onSelect(spot.spotId)} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-bold truncate ${isSelected ? 'text-sky-400' : 'text-[var(--text-primary)]'}`}>
            {spot.spotName}
          </span>
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black ${c.badge}`}>
            {spot.decision}
          </span>
        </div>
        <div className={`text-[11px] leading-relaxed truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {spot.briefing?.headline || spot.region || ''}
        </div>
      </button>

      <button onClick={() => onSelect(spot.spotId)} className="shrink-0 text-right">
        <div className={`text-lg font-extrabold tabular-nums ${c.text}`}>
          {Math.round(spot.windSpeed)}
          <span className="text-[10px] font-semibold ml-0.5 opacity-70">mph</span>
        </div>
        <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {dir}{spot.windGust ? ` G${Math.round(spot.windGust)}` : ''}
        </div>
      </button>
    </div>
  );
}

// ─── FISHING SPOT HERO (kept from original) ──────────────────────────────────

function FishingSpotHero({ recommendation, onSelectLake, isDark }) {
  if (!recommendation?.top) return null;
  const { top, runner, seasonLabel, todTip, pressureNote, isFallingPressure } = recommendation;
  const topSeason = top.seasonData;

  return (
    <div className={`rounded-2xl overflow-hidden border ${
      isDark ? 'bg-gradient-to-br from-emerald-500/10 via-[var(--bg-card)] to-sky-500/5 border-emerald-500/20'
        : 'bg-gradient-to-br from-emerald-50 via-white to-sky-50 border-emerald-200'
    }`}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Fish className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Where to Fish Today
          </span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
            {seasonLabel} Pattern
          </span>
        </div>
        <button onClick={() => onSelectLake(top.lake.id)} className={`w-full text-left rounded-xl p-4 border transition-all hover:scale-[1.01] ${
          isDark ? 'bg-emerald-500/[0.08] border-emerald-500/30 hover:border-emerald-500/50' : 'bg-white border-emerald-200 hover:border-emerald-300 shadow-sm'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{top.lake.name}</span>
                {top.lake.blueRibbon && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>Blue Ribbon</span>}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>#1 Pick</span>
              </div>
              {topSeason && (
                <>
                  <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{topSeason.species}</p>
                  <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{topSeason.method}</p>
                  <div className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                    <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="font-medium">{topSeason.tip}</span>
                  </div>
                </>
              )}
            </div>
            <div className="shrink-0 text-right">
              {top.windSpeed != null && top.windSpeed < 99 && (
                <div className={`text-lg font-extrabold tabular-nums ${top.windSpeed < 5 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : top.windSpeed < 10 ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                  {Math.round(top.windSpeed)}<span className="text-[10px] font-semibold ml-0.5">mph</span>
                </div>
              )}
              <ArrowRight className={`w-4 h-4 mt-2 ml-auto ${isDark ? 'text-emerald-500' : 'text-emerald-400'}`} />
            </div>
          </div>
        </button>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <Clock className="w-3 h-3" />{todTip}
          </span>
          {pressureNote && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
              isFallingPressure ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              <Droplets className="w-3 h-3" />{pressureNote}
            </span>
          )}
        </div>
      </div>
      {runner && runner.score > 2 && (
        <div className={`border-t px-5 py-3 ${isDark ? 'border-[var(--border-color)]' : 'border-emerald-100'}`}>
          <button onClick={() => onSelectLake(runner.lake.id)} className={`w-full flex items-center justify-between text-left rounded-lg px-3 py-2 transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-emerald-50/50'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>#2</span>
              <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{runner.lake.name}</span>
              {runner.seasonData && <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>— {runner.seasonData.species}</span>}
            </div>
            <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function LakeSelector({ selectedLake, onSelectLake, activity, pressureData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { predictions, loading } = useCrossLocationPredictions(activity);

  const [favorites, setFavoritesState] = useState(getFavorites);
  const [showByRegion, setShowByRegion] = useState(false);

  useEffect(() => {
    if (selectedLake) pushRecent(selectedLake);
  }, [selectedLake]);

  const handleToggleFavorite = useCallback((id) => {
    const next = toggleFavorite(id);
    setFavoritesState(next);
  }, []);

  const handleSelect = useCallback((id) => {
    pushRecent(id);
    onSelectLake(id);
  }, [onSelectLake]);

  const isFishing = activity === 'fishing';

  const fishingRec = useMemo(() => {
    if (!isFishing || predictions.length === 0) return null;
    return getFishingRecommendation(predictions, pressureData);
  }, [isFishing, predictions, pressureData]);

  // Split predictions into favorites and the rest
  const { favSpots, restSpots } = useMemo(() => {
    const recents = getRecents();
    const userSpotIds = [...new Set([...favorites, ...recents])];
    const favs = [];
    const rest = [];

    for (const p of predictions) {
      if (userSpotIds.includes(p.spotId)) {
        favs.push(p);
      } else {
        rest.push(p);
      }
    }

    // Sort favorites: pinned first, then by recency
    favs.sort((a, b) => {
      const aFav = favorites.includes(a.spotId) ? 0 : 1;
      const bFav = favorites.includes(b.spotId) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return userSpotIds.indexOf(a.spotId) - userSpotIds.indexOf(b.spotId);
    });

    return { favSpots: favs, restSpots: rest };
  }, [predictions, favorites]);

  // Group rest by decision for condition-sorted view
  const groupedByDecision = useMemo(() => {
    const go = restSpots.filter(p => p.decision === 'GO');
    const wait = restSpots.filter(p => p.decision === 'WAIT');
    const pass = restSpots.filter(p => p.decision === 'PASS');
    return { go, wait, pass };
  }, [restSpots]);

  // Group by region for region view
  const groupedByRegion = useMemo(() => {
    if (!showByRegion) return null;
    const regionMap = {};
    for (const region of LAKE_REGIONS) {
      const lakeIds = new Set(region.lakes.map(l => l.id));
      const spots = restSpots.filter(p => lakeIds.has(p.spotId));
      if (spots.length > 0) regionMap[region.id] = { label: region.label, icon: region.icon, spots };
    }
    // Any spots not in LAKE_REGIONS (e.g. Utah Lake launches, PG sites, etc.)
    const regionLakeIds = new Set(LAKE_REGIONS.flatMap(r => r.lakes.map(l => l.id)));
    const ungrouped = restSpots.filter(p => !regionLakeIds.has(p.spotId));
    if (ungrouped.length > 0) regionMap['_other'] = { label: 'Other Spots', icon: '📍', spots: ungrouped };
    return regionMap;
  }, [showByRegion, restSpots]);

  const goCount = predictions.filter(p => p.decision === 'GO').length;
  const totalCount = predictions.length;

  return (
    <div className="space-y-4">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-500" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Spot Picker
          </h2>
          {!loading && totalCount > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              goCount > 0
                ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              {goCount > 0 ? `${goCount} GO` : 'No wind'} / {totalCount} spots
            </span>
          )}
          {loading && predictions.length === 0 && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-tertiary)]" />
          )}
        </div>
        {predictions.length > 0 && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
            LIVE SENSORS
          </span>
        )}
      </div>

      {/* ─── SECTION 1: WIND NOW STRIP ─── */}
      <WindNowStrip
        predictions={predictions}
        loading={loading}
        selectedLake={selectedLake}
        onSelect={handleSelect}
        isDark={isDark}
      />

      {/* ─── FISHING HERO (fishing only) ─── */}
      {isFishing && fishingRec && (
        <FishingSpotHero recommendation={fishingRec} onSelectLake={handleSelect} isDark={isDark} />
      )}

      {/* ─── SECTION 2: YOUR SPOTS (favorites + recents) ─── */}
      {favSpots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Your Spots
            </span>
          </div>
          <div className="space-y-2">
            {favSpots.map(spot => (
              <SpotCard
                key={spot.spotId}
                spot={spot}
                isSelected={selectedLake === spot.spotId}
                isFavorite={favorites.includes(spot.spotId)}
                onSelect={handleSelect}
                onToggleFavorite={handleToggleFavorite}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── SECTION 3: ALL SPOTS ─── */}
      {(restSpots.length > 0 || (loading && predictions.length === 0)) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              All Spots
            </span>
            {restSpots.length > 3 && (
              <button
                onClick={() => setShowByRegion(v => !v)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                  showByRegion
                    ? (isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600')
                    : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                {showByRegion ? 'By Conditions' : 'By Region'}
              </button>
            )}
          </div>

          {/* Condition-sorted view (default) */}
          {!showByRegion && (
            <div className="space-y-3">
              {groupedByDecision.go.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      GO — {groupedByDecision.go.length} spot{groupedByDecision.go.length !== 1 ? 's' : ''} firing
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupedByDecision.go.map(spot => (
                      <SpotCard key={spot.spotId} spot={spot} isSelected={selectedLake === spot.spotId} isFavorite={favorites.includes(spot.spotId)} onSelect={handleSelect} onToggleFavorite={handleToggleFavorite} isDark={isDark} />
                    ))}
                  </div>
                </div>
              )}
              {groupedByDecision.wait.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      Building — check back
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupedByDecision.wait.map(spot => (
                      <SpotCard key={spot.spotId} spot={spot} isSelected={selectedLake === spot.spotId} isFavorite={favorites.includes(spot.spotId)} onSelect={handleSelect} onToggleFavorite={handleToggleFavorite} isDark={isDark} />
                    ))}
                  </div>
                </div>
              )}
              {groupedByDecision.pass.length > 0 && (
                <CollapsibleSection
                  label={`Not firing — ${groupedByDecision.pass.length} spot${groupedByDecision.pass.length !== 1 ? 's' : ''}`}
                  isDark={isDark}
                  defaultOpen={groupedByDecision.go.length === 0 && groupedByDecision.wait.length === 0}
                >
                  <div className="space-y-2">
                    {groupedByDecision.pass.map(spot => (
                      <SpotCard key={spot.spotId} spot={spot} isSelected={selectedLake === spot.spotId} isFavorite={favorites.includes(spot.spotId)} onSelect={handleSelect} onToggleFavorite={handleToggleFavorite} isDark={isDark} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* Region-sorted view */}
          {showByRegion && groupedByRegion && (
            <div className="space-y-3">
              {Object.entries(groupedByRegion).map(([regionId, { label, icon, spots }]) => (
                <div key={regionId}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{icon}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {spots.map(spot => (
                      <SpotCard key={spot.spotId} spot={spot} isSelected={selectedLake === spot.spotId} isFavorite={favorites.includes(spot.spotId)} onSelect={handleSelect} onToggleFavorite={handleToggleFavorite} isDark={isDark} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COLLAPSIBLE HELPER ──────────────────────────────────────────────────────

function CollapsibleSection({ label, isDark, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 mb-2 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </button>
      {open && children}
    </div>
  );
}

// ─── EXPORTS (kept for legacy consumers) ─────────────────────────────────────

export { UTAH_LAKE_LAUNCHES, STRAWBERRY_LAUNCHES, SKYLINE_SPOT, OTHER_LAKES, LAKE_REGIONS, KITE_SPOTS, SNOWKITE_EXTRA, PARAGLIDING_SITES };
