import { MapPin, ChevronDown, ChevronUp, Wind, Snowflake, Mountain, Fish, Anchor, Crown, Thermometer, Clock, ArrowRight, TrendingUp, Droplets } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LAKE_CONFIGS } from '../config/lakeStations';
import { safeToFixed } from '../utils/safeToFixed';

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

// ─── VERIFIED KITING SPOTS ────────────────────────────────────
// Only locations confirmed by Utah Windriders Association, KiteForum, or local community
const KITE_SPOTS = [
  { id: 'rush-lake', name: 'Rush Lake', wind: 'S Frontal', meter: 'KSLC', desc: 'Most kitable days in UT — shallow flat water, storm-front driven', hazard: 'EXTREME WIND' },
  { id: 'grantsville', name: 'Grantsville Reservoir', wind: 'S/SW', meter: 'KSLC', desc: 'Alternative to Rush — deeper water for larger skegs' },
  { id: 'deer-creek', name: 'Deer Creek', wind: 'SW Canyon', meter: 'KHCR', desc: 'Canyon thermal kiting — afternoon SW wind' },
  { id: 'willard-bay', name: 'Willard Bay', wind: 'S Flow', meter: 'KHIF', desc: 'South beach near state park — south wind under south flow' },
];

// ─── VERIFIED SNOWKITE SPOTS ──────────────────────────────────
// Utah Kite Addiction, Visit Utah, Sanpete County verified
const SNOWKITE_EXTRA = [
  { id: 'powder-mountain', name: 'Powder Mountain', wind: 'S/W', meter: 'KSLC', desc: 'Hidden Lake to Towers — high elevation, wind exposure', position: '8,900 ft' },
  { id: 'monte-cristo', name: 'Monte Cristo', wind: 'W/NW', meter: 'KLGU', desc: 'Backcountry bowls — hike/snowmobile access, expert', position: '8,900 ft' },
];

// ─── VERIFIED PARAGLIDING SITES ───────────────────────────────
// UHGPGA, Point of the Mountain Paragliding, twocanfly.com verified
const PARAGLIDING_SITES = [
  { id: 'potm-south', name: 'PotM — South Side', wind: 'S/SE', direction: '150-200°', meter: 'FPS', desc: '#1 US training site — 300 ft vertical, morning south', position: '4,900 ft', rating: 'P2+' },
  { id: 'potm-north', name: 'PotM — North Side', wind: 'N/NW', direction: '320-360°', meter: 'UTALP', desc: '900-1200 ft vertical, two ridges, afternoon north', position: '5,200 ft', rating: 'P2+' },
  { id: 'inspo', name: 'Inspiration Point', wind: 'W/SW', direction: '220-280°', meter: 'KPVU', desc: 'P3+ — mountain thermals, restricted LZs, midday turbulence', position: '6,667 ft', rating: 'P3+' },
  { id: 'west-mountain', name: 'West Mountain', wind: 'W/NW', direction: '260-330°', meter: 'KPVU', desc: 'Large LZs, 7-10 min flights, good XC intro', position: '5,500 ft', rating: 'P2+' },
  { id: 'stockton-bar', name: 'Stockton Bar', wind: 'N', direction: '340-20°', meter: 'KSLC', desc: 'Bonneville ridge soaring — afternoon north wind', position: '5,100 ft', rating: 'P2+' },
];

const LAKE_REGIONS = [
  {
    id: 'wasatch',
    label: 'Wasatch Front & Back',
    icon: '⛰️',
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
    id: 'northern',
    label: 'Northern Utah',
    icon: '🏔️',
    lakes: [
      { id: 'willard-bay', name: 'Willard Bay', wind: 'S Flow', meter: 'KHIF', fish: '🐟 Wiper, Walleye, Catfish' },
      { id: 'pineview', name: 'Pineview', wind: 'E/W Canyon', meter: 'KOGD', fish: '🐟 LMB, SMB, Tiger Muskie' },
      { id: 'bear-lake', name: 'Bear Lake', wind: 'Strong W', meter: 'BERU1', fish: '🐟 Cutthroat, Lake Trout, Cisco', hazard: 'HIGH WIND' },
      { id: 'hyrum', name: 'Hyrum', wind: 'Valley', meter: 'KLGU', fish: '🐟 Rainbow, Perch, Bluegill' },
    ],
  },
  {
    id: 'northeast',
    label: 'Uinta Basin / Northeast',
    icon: '🦌',
    lakes: [
      { id: 'starvation', name: 'Starvation', wind: 'Valley', meter: 'KVEL', fish: '🐟 Walleye, SMB, Rainbow' },
      { id: 'flaming-gorge', name: 'Flaming Gorge', wind: 'Canyon/SE', meter: 'KFGR', fish: '🐟 Lake Trout (51 lb record!), Kokanee' },
      { id: 'steinaker', name: 'Steinaker', wind: 'Basin', meter: 'KVEL', fish: '🐟 Rainbow, LMB' },
      { id: 'red-fleet', name: 'Red Fleet', wind: 'Basin', meter: 'KVEL', fish: '🐟 Rainbow, Brown' },
    ],
  },
  {
    id: 'southeast',
    label: 'Castle Country / Plateau',
    icon: '🏜️',
    lakes: [
      { id: 'scofield', name: 'Scofield', wind: 'Plateau', meter: 'KPUC', fish: '🐟 Cutthroat, Tiger Trout', blueRibbon: true },
    ],
  },
  {
    id: 'southern',
    label: 'Southern Utah',
    icon: '☀️',
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
    id: 'dixie',
    label: 'Dixie / St. George',
    icon: '🌵',
    lakes: [
      { id: 'sand-hollow', name: 'Sand Hollow', wind: 'Desert', meter: 'KSGU', fish: '🐟 LMB, Bluegill, Rainbow' },
      { id: 'quail-creek', name: 'Quail Creek', wind: 'Desert', meter: 'KSGU', fish: '🐟 LMB, Rainbow (warmest!)' },
    ],
  },
];

// ─── FISHING INTELLIGENCE ────────────────────────────────────
// Seasonal patterns, fish behavior, and lake-specific knowledge for smart recommendations

const FISH_INTEL = {
  'strawberry-bay': {
    elevation: 7600, species: ['Cutthroat', 'Rainbow', 'Kokanee'],
    seasons: {
      winter: { rating: 4, method: 'Ice fishing — jig through 12-18" ice, target 15-30 ft', species: 'Cutthroat & Rainbow', tip: 'Ladders bay is best ice access, use wax worms or small jigs' },
      spring: { rating: 5, method: 'Shore fishing — spawning cutthroat cruise shallows', species: 'Cutthroat (spawn run)', tip: 'Cast spinners from shore at Strawberry Bay marina — fish stack up at inlet' },
      summer: { rating: 4, method: 'Trolling 20-40 ft — fish go deep when surface warms', species: 'Kokanee & Rainbow', tip: 'Troll with downriggers at dawn, Kokanee school at 30 ft by July' },
      fall: { rating: 5, method: 'Shore & trolling — fall turnover pushes fish shallow', species: 'Cutthroat (aggressive pre-winter feed)', tip: 'Best month is October — cutthroat hit everything, 3-5 lb fish common' },
    },
    pressureSensitivity: 'moderate',
    windPreference: 'light',
  },
  'deer-creek': {
    elevation: 5400, species: ['Walleye', 'SMB', 'Rainbow'],
    seasons: {
      winter: { rating: 3, method: 'Ice fishing for trout — limited access', species: 'Rainbow', tip: 'Park at Wallsburg junction, ice thickness varies — check reports' },
      spring: { rating: 5, method: 'Walleye spawn run — cast jigs along rocky points', species: 'Walleye (spawn)', tip: 'April walleye run is legendary — fish the dam face at night with jigs' },
      summer: { rating: 4, method: 'Bass fishing — SMB on rocky structure', species: 'SMB & Walleye', tip: 'Drop-shot SMB near the dam, walleye at night on bottom bouncers' },
      fall: { rating: 4, method: 'Trolling for walleye — aggressive fall feed', species: 'Walleye & Rainbow', tip: 'Walleye move shallow in fall — cast crankbaits along rip-rap at dusk' },
    },
    pressureSensitivity: 'high',
    windPreference: 'calm',
  },
  'jordanelle': {
    elevation: 6200, species: ['SMB', 'Kokanee', 'Perch'],
    seasons: {
      winter: { rating: 3, method: 'Ice fishing — perch and trout', species: 'Perch & Rainbow', tip: 'Rock Cliff area produces best through ice' },
      spring: { rating: 4, method: 'SMB spawn — sight fish in shallows', species: 'SMB (spawn)', tip: 'May-June bass move to 3-8 ft gravel — use tubes and drop-shot' },
      summer: { rating: 4, method: 'Trolling for Kokanee at 40-60 ft', species: 'Kokanee & SMB', tip: 'Kokanee stack at thermocline by July — troll with dodgers and corn' },
      fall: { rating: 3, method: 'Bass and perch on structure', species: 'SMB & Perch', tip: 'Bass push deep, fish rocky humps with jigs' },
    },
    pressureSensitivity: 'moderate',
    windPreference: 'light',
  },
  'utah-lake-lincoln': {
    elevation: 4489, species: ['Walleye', 'White Bass', 'Channel Cat', 'Carp'],
    seasons: {
      winter: { rating: 2, method: 'Limited — ice unsafe in many areas', species: 'Walleye', tip: 'Ice is unreliable — check thickness carefully, Lincoln Beach area' },
      spring: { rating: 5, method: 'White bass run up Provo River — epic action', species: 'White Bass (spawn run)', tip: 'June white bass run is UT\'s best shore fishing — Provo River inlet, cast small spoons' },
      summer: { rating: 4, method: 'Catfish at night, walleye at dawn', species: 'Catfish & Walleye', tip: 'Shore fish Lincoln Beach at night with cut bait for channel cats 5-10 lb' },
      fall: { rating: 4, method: 'Walleye bite turns on — trolling and casting', species: 'Walleye & White Bass', tip: 'September walleye push shallow — cast jerkbaits near rocky points' },
    },
    pressureSensitivity: 'low',
    windPreference: 'calm',
  },
  'flaming-gorge': {
    elevation: 6040, species: ['Lake Trout', 'Kokanee', 'SMB', 'Rainbow'],
    seasons: {
      winter: { rating: 3, method: 'Jigging for lake trout at 80-120 ft', species: 'Lake Trout', tip: 'Lakers stack in deep basins — use tube jigs tipped with sucker meat' },
      spring: { rating: 5, method: 'Lake trout move shallow — trolling and jigging', species: 'Lake Trout & Rainbow', tip: 'May lakers at 20-40 ft near points — best trophy chance (20+ lb)' },
      summer: { rating: 4, method: 'Kokanee trolling at thermocline', species: 'Kokanee & SMB', tip: 'Kokanee in Sheep Creek area at 35-50 ft — use dodgers with wedding rings' },
      fall: { rating: 5, method: 'Lake trout feeding frenzy before ice', species: 'Lake Trout (trophy season)', tip: 'October-November lakers gorge — real chance at 30+ lb fish, troll big swimbaits' },
    },
    pressureSensitivity: 'moderate',
    windPreference: 'calm',
  },
  'willard-bay': {
    elevation: 4200, species: ['Wiper', 'Walleye', 'Catfish', 'Crappie'],
    seasons: {
      winter: { rating: 3, method: 'Ice fishing for wiper and crappie', species: 'Wiper & Crappie', tip: 'South marina area — jig for crappie at 10-15 ft, wiper cruise edges' },
      spring: { rating: 4, method: 'Wiper schooling at surface — exciting topwater', species: 'Wiper', tip: 'Watch for surface boils — cast anything silver into the feeding frenzy' },
      summer: { rating: 5, method: 'Catfish at night, wiper at dawn', species: 'Catfish & Wiper', tip: 'Best catfish lake in UT — use chicken liver at south marina, 10+ lb channels' },
      fall: { rating: 4, method: 'Walleye and wiper in transition', species: 'Walleye & Wiper', tip: 'Fall walleye bite at rip-rap, slow-roll swimbaits along dam face' },
    },
    pressureSensitivity: 'moderate',
    windPreference: 'light',
  },
  'scofield': {
    elevation: 7600, species: ['Cutthroat', 'Tiger Trout', 'Rainbow'],
    seasons: {
      winter: { rating: 5, method: 'Ice fishing — premier UT ice destination', species: 'Cutthroat & Tiger Trout', tip: 'Best ice fishing in Utah — 20+ fish days common, use small jigs with wax worms' },
      spring: { rating: 4, method: 'Shore fishing at ice-off', species: 'Cutthroat & Tiger Trout', tip: 'Ice-off in late April is magic — fish stack at creek mouths, cast PowerBait' },
      summer: { rating: 3, method: 'Trolling — fish scatter in warm water', species: 'Rainbow & Cutthroat', tip: 'Fish go deep by July — troll at 15-25 ft with worm harnesses' },
      fall: { rating: 4, method: 'Shore fishing — turnover pushes fish up', species: 'Tiger Trout & Cutthroat', tip: 'September tigers get aggressive — cast Rapalas near dam, 3-5 lb tigers possible' },
    },
    pressureSensitivity: 'low',
    windPreference: 'light',
  },
  'lake-powell': {
    elevation: 3700, species: ['Striped Bass', 'LMB', 'SMB', 'Walleye'],
    seasons: {
      winter: { rating: 3, method: 'Stripers in deep channels', species: 'Striped Bass', tip: 'Stripers school at 40-60 ft — find them on sonar, vertical jig' },
      spring: { rating: 5, method: 'Bass spawn in canyons, striper boils begin', species: 'LMB, SMB, Stripers', tip: 'March-May LMB spawn in back canyons — sight fish, then striper boils start in May' },
      summer: { rating: 5, method: 'Striper boils — most exciting fishing in UT', species: 'Striped Bass (surface)', tip: 'June striper boils are EPIC — watch for bird activity, cast anything into the chaos' },
      fall: { rating: 4, method: 'Stripers push shad into canyons', species: 'Stripers & SMB', tip: 'Stripers herd shad into narrow canyons — find the bait, find the fish' },
    },
    pressureSensitivity: 'low',
    windPreference: 'calm',
  },
};

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

function getFishingRecommendation(windStatuses, pressureData) {
  const season = getSeason();
  const tod = getTimeOfDay();
  const allLakes = LAKE_REGIONS.flatMap(r => r.lakes);

  const pressureTrend = pressureData?.gradient;
  const isFallingPressure = pressureTrend != null && pressureTrend > 0.5;
  const isRisingPressure = pressureTrend != null && pressureTrend < -0.5;
  const isStablePressure = pressureTrend != null && Math.abs(pressureTrend) <= 0.5;

  let pressureNote = '';
  if (isFallingPressure) pressureNote = 'Falling pressure — fish feed aggressively before a front';
  else if (isRisingPressure) pressureNote = 'Rising pressure — bite improving as conditions stabilize';
  else if (isStablePressure) pressureNote = 'Stable barometer — consistent, predictable bite';

  const scored = [];

  for (const lake of allLakes) {
    const intel = FISH_INTEL[lake.id];
    const ws = windStatuses[lake.id];
    const windSpeed = ws?.speed ?? null;
    const seasonData = intel?.seasons?.[season];

    let score = seasonData?.rating ?? 2;
    const reasons = [];

    if (seasonData) {
      reasons.push(seasonData.method);
    }

    if (windSpeed == null) { reasons.push('No wind data — check conditions on-site'); }
    else if (windSpeed < 5) { score += 2; reasons.push('Calm water — ideal conditions'); }
    else if (windSpeed < 10) { score += 1; reasons.push('Light wind — fishable'); }
    else if (windSpeed < 15) { score -= 1; reasons.push('Moderate wind — fish deeper structure'); }
    else { score -= 3; reasons.push('High wind — tough conditions'); }

    if (isFallingPressure) {
      const sens = intel?.pressureSensitivity;
      if (sens === 'high') { score += 2; reasons.push('Pre-frontal feed — this lake responds strongly'); }
      else if (sens === 'moderate') { score += 1; }
    }

    if (tod === 'dawn' || tod === 'dusk') {
      score += 2;
      reasons.push(tod === 'dawn' ? 'Dawn feed window — peak activity' : 'Dusk feed — topwater time');
    } else if (tod === 'morning' || tod === 'evening') {
      score += 1;
    } else if (tod === 'midday') {
      score -= 1;
      reasons.push('Midday — fish deeper, slower presentations');
    } else if (tod === 'night') {
      if (lake.fish?.includes('Catfish') || lake.fish?.includes('Walleye')) {
        score += 2;
        reasons.push('Night bite — catfish and walleye active after dark');
      }
    }

    if (lake.blueRibbon) { score += 1; reasons.push('Blue Ribbon fishery'); }
    if (lake.hazard && windSpeed > 10) { score -= 2; }

    scored.push({
      lake,
      intel,
      seasonData,
      score,
      reasons,
      windSpeed,
      windStatus: ws,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const runner = scored[1];

  let todTip = '';
  if (tod === 'dawn') todTip = 'Get on the water now — prime feeding window before sun hits';
  else if (tod === 'morning') todTip = 'Good window — topwater and shallow presentations';
  else if (tod === 'midday') todTip = 'Switch to deeper techniques — fish holding at thermocline';
  else if (tod === 'evening') todTip = 'Evening bite building — move to shallows and structure';
  else if (tod === 'dusk') todTip = 'Topwater time — fish the last hour aggressively';
  else todTip = 'Night fishing — target catfish and walleye with bottom rigs';

  return {
    top,
    runner,
    season,
    seasonLabel: season.charAt(0).toUpperCase() + season.slice(1),
    timeOfDay: tod,
    todTip,
    pressureNote,
    isFallingPressure,
    isRisingPressure,
  };
}

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
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {seasonLabel} Pattern
          </span>
        </div>

        {/* Top Pick */}
        <button
          onClick={() => onSelectLake(top.lake.id)}
          className={`w-full text-left rounded-xl p-4 border transition-all hover:scale-[1.01] ${
            isDark ? 'bg-emerald-500/[0.08] border-emerald-500/30 hover:border-emerald-500/50'
              : 'bg-white border-emerald-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{top.lake.name}</span>
                {top.lake.blueRibbon && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'
                  }`}>Blue Ribbon</span>
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>#1 Pick</span>
              </div>

              {topSeason && (
                <>
                  <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {topSeason.species}
                  </p>
                  <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {topSeason.method}
                  </p>
                  <div className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                    <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="font-medium">{topSeason.tip}</span>
                  </div>
                </>
              )}
            </div>
            <div className="shrink-0 text-right">
              {top.windSpeed < 99 && (
                <div className={`text-lg font-extrabold tabular-nums ${
                  top.windSpeed < 5 ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                    : top.windSpeed < 10 ? (isDark ? 'text-sky-400' : 'text-sky-600')
                    : (isDark ? 'text-amber-400' : 'text-amber-600')
                }`}>
                  {Math.round(top.windSpeed)}
                  <span className="text-[10px] font-semibold ml-0.5">mph</span>
                </div>
              )}
              <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {top.windSpeed < 5 ? 'Glass' : top.windSpeed < 10 ? 'Light' : 'Windy'}
              </div>
              <ArrowRight className={`w-4 h-4 mt-2 ml-auto ${isDark ? 'text-emerald-500' : 'text-emerald-400'}`} />
            </div>
          </div>
        </button>

        {/* Context chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
            isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock className="w-3 h-3" />
            {todTip}
          </span>
          {pressureNote && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
              isFallingPressure
                ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
            <Droplets className="w-3 h-3" />
              {pressureNote}
            </span>
          )}
        </div>
      </div>

      {/* Runner-up */}
      {runner && runner.score > 2 && (
        <div className={`border-t px-5 py-3 ${isDark ? 'border-[var(--border-color)]' : 'border-emerald-100'}`}>
          <button
            onClick={() => onSelectLake(runner.lake.id)}
            className={`w-full flex items-center justify-between text-left rounded-lg px-3 py-2 transition-colors ${
              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>#2</span>
              <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{runner.lake.name}</span>
              {runner.seasonData && (
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  — {runner.seasonData.species}
                </span>
              )}
            </div>
            <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          </button>
        </div>
      )}
    </div>
  );
}

function isDirectionFavorable(dir, lakeId) {
  const cfg = LAKE_CONFIGS[lakeId];
  if (!cfg?.thermal?.optimalDirection || dir == null) return false;
  const { min, max } = cfg.thermal.optimalDirection;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function isNorthFlow(dir, lakeId) {
  const cfg = LAKE_CONFIGS[lakeId];
  if (!cfg?.thermal?.northFlow || dir == null) return false;
  const { min, max } = cfg.thermal.northFlow;
  return dir >= min || dir <= max;
}

// Find a station reading by ID from the cached station map
function findStation(stationCache, meterId) {
  if (!stationCache || !meterId) return null;
  // PWS special case
  if (meterId === 'PWS') return stationCache['PWS'] || null;
  return stationCache[meterId] || null;
}

function getWindStatus(launch, stationCache, activity) {
  const meterId = launch.meter;
  const station = findStation(stationCache, meterId);
  if (!station) return null;

  const speed = station.speed ?? station.windSpeed ?? 0;
  const dir = station.direction ?? station.windDirection;

  if (speed < 3) return { level: 'calm', speed, dir, label: `${safeToFixed(speed, 0)} mph` };

  const favorable = isDirectionFavorable(dir, launch.id);
  const north = isNorthFlow(dir, launch.id);
  const wantsWind = !['boating', 'paddling', 'fishing'].includes(activity);

  if (wantsWind) {
    if ((favorable || north) && speed >= 8)
      return { level: 'hot', speed, dir, label: `${safeToFixed(speed, 0)} mph` };
    if ((favorable || north) && speed >= 5)
      return { level: 'building', speed, dir, label: `${safeToFixed(speed, 0)} mph` };
    if (speed >= 8)
      return { level: 'windy', speed, dir, label: `${safeToFixed(speed, 0)} mph` };
  } else {
    if (speed < 5)
      return { level: 'glass', speed, dir, label: 'Glass' };
    if (speed >= 15)
      return { level: 'choppy', speed, dir, label: `${safeToFixed(speed, 0)} mph` };
  }
  return { level: 'light', speed, dir, label: `${safeToFixed(speed, 0)} mph` };
}

// Merge incoming station readings into a persistent cache keyed by station ID
function mergeStationCache(cache, readings) {
  if (!readings?.length) return cache;
  const next = { ...cache };
  for (const s of readings) {
    if (s.id) next[s.id] = s;
  }
  return next;
}

function WindBadge({ status, isDark }) {
  if (!status) return null;
  const isHot = status.level === 'hot';
  const isBuilding = status.level === 'building';
  const isGlass = status.level === 'glass';

  if (status.level === 'calm' || status.level === 'light') return null;

  const colors = isHot
    ? 'bg-green-500 text-white'
    : isBuilding
      ? (isDark ? 'bg-yellow-500/80 text-white' : 'bg-yellow-400 text-yellow-900')
      : isGlass
        ? 'bg-blue-500 text-white'
        : (isDark ? 'bg-orange-500/80 text-white' : 'bg-orange-400 text-white');

  return (
    <span className={`
      inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
      ${colors}
      ${isHot ? 'animate-pulse' : ''}
    `}>
      <Wind className="w-2.5 h-2.5" />
      {status.label}
    </span>
  );
}

export function LakeSelector({ selectedLake, onSelectLake, stationReadings, activity, pressureData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showAllSpots, setShowAllSpots] = useState(false);
  const [utahLakeExpanded, setUtahLakeExpanded] = useState(
    selectedLake?.startsWith('utah-lake')
  );
  const [snowExpanded, setSnowExpanded] = useState(
    selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive'
  );
  const [kiteSpotsExpanded, setKiteSpotsExpanded] = useState(
    KITE_SPOTS.some(s => s.id === selectedLake)
  );
  const [paraglidingExpanded, setParaglidingExpanded] = useState(
    PARAGLIDING_SITES.some(s => s.id === selectedLake)
  );
  const [snowExtraExpanded, setSnowExtraExpanded] = useState(
    selectedLake === 'powder-mountain' || selectedLake === 'monte-cristo'
  );

  useEffect(() => {
    if (activity === 'paragliding') setParaglidingExpanded(true);
    if (activity === 'snowkiting') setSnowExpanded(true);
    if (['kiting', 'sailing', 'windsurfing'].includes(activity)) setKiteSpotsExpanded(true);
    if (!['snowkiting', 'paragliding'].includes(activity)) setUtahLakeExpanded(true);
  }, [activity]);

  // Persistent station cache — survives tab switches
  const cacheRef = useRef({});
  useEffect(() => {
    cacheRef.current = mergeStationCache(cacheRef.current, stationReadings);
  }, [stationReadings]);

  const stationCache = useMemo(
    () => mergeStationCache(cacheRef.current, stationReadings),
    [stationReadings]
  );

  const allRegionLakes = useMemo(() => LAKE_REGIONS.flatMap(r => r.lakes), []);

  const windStatuses = useMemo(() => {
    const out = {};
    [...UTAH_LAKE_LAUNCHES, ...STRAWBERRY_LAUNCHES, SKYLINE_SPOT, ...OTHER_LAKES, ...allRegionLakes, ...KITE_SPOTS, ...SNOWKITE_EXTRA, ...PARAGLIDING_SITES].forEach(loc => {
      out[loc.id] = getWindStatus(loc, stationCache, activity);
    });
    return out;
  }, [stationCache, activity, allRegionLakes]);

  const isUtahLakeSelected = selectedLake?.startsWith('utah-lake');
  const selectedUtahLaunch = UTAH_LAKE_LAUNCHES.find(l => l.id === selectedLake);
  const anyUtahHot = UTAH_LAKE_LAUNCHES.some(l => windStatuses[l.id]?.level === 'hot');

  const isSnowSelected = selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive';
  const selectedSnowLaunch = [...STRAWBERRY_LAUNCHES, SKYLINE_SPOT].find(l => l.id === selectedLake);
  const anySnowHot = [...STRAWBERRY_LAUNCHES, SKYLINE_SPOT].some(l => windStatuses[l.id]?.level === 'hot');

  const fishingRec = useMemo(() => {
    if (activity !== 'fishing') return null;
    return getFishingRecommendation(windStatuses, pressureData);
  }, [activity, windStatuses, pressureData]);

  const isWindSport = ['kiting', 'sailing', 'windsurfing'].includes(activity);
  const isCalmSport = ['boating', 'paddling'].includes(activity);
  const isPG = activity === 'paragliding';
  const isSnow = activity === 'snowkiting';
  const isFishing = activity === 'fishing';
  const hasQuickPick = isWindSport || isCalmSport || isPG || isSnow;

  const topSpots = useMemo(() => {
    if (!hasQuickPick) return [];

    let pool;
    if (isPG) pool = PARAGLIDING_SITES;
    else if (isSnow) pool = [...STRAWBERRY_LAUNCHES, SKYLINE_SPOT, ...SNOWKITE_EXTRA];
    else if (isCalmSport) pool = [...UTAH_LAKE_LAUNCHES, ...OTHER_LAKES];
    else pool = [...UTAH_LAKE_LAUNCHES, ...KITE_SPOTS, ...OTHER_LAKES];

    const wantsWind = isWindSport || isPG || isSnow;
    const scored = pool.map(spot => {
      const ws = windStatuses[spot.id];
      const speed = ws?.speed ?? 0;
      let score = 0;
      if (wantsWind) {
        if (ws?.level === 'hot') score = 100;
        else if (ws?.level === 'building') score = 70;
        else if (speed >= 8) score = 50;
        else if (speed >= 5) score = 30;
        else score = 10;
      } else {
        if (speed <= 2) score = 100;
        else if (speed <= 5) score = 80;
        else if (speed <= 8) score = 50;
        else score = 10;
      }
      return { ...spot, ws, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [windStatuses, hasQuickPick, isPG, isSnow, isCalmSport, isWindSport]);

  const showQuickPick = hasQuickPick && !showAllSpots;

  return (
    <div className="space-y-3">
      {/* ─── QUICK PICK: Top 3 Spots ─── */}
      {showQuickPick && topSpots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isPG ? 'Best Launch Sites Now'
                : isSnow ? 'Best Snow Sites Now'
                : isWindSport ? 'Best Wind Right Now'
                : 'Calmest Water Now'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topSpots.map((spot, i) => {
              const isSelected = selectedLake === spot.id;
              const ws = spot.ws;
              return (
                <button
                  key={spot.id}
                  onClick={() => onSelectLake(spot.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/[0.08]'
                      : i === 0
                        ? (isDark ? 'border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-500/50' : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300')
                        : (isDark ? 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]' : 'border-slate-200 bg-white hover:border-slate-300')
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold shrink-0 ${
                    i === 0 ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${isSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                      {spot.name}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {ws?.speed != null ? `${safeToFixed(ws.speed, 0)} mph` : 'No data'}
                      {spot.wind ? ` · ${spot.wind}` : ''}
                    </div>
                  </div>
                  {ws && <WindBadge status={ws} isDark={isDark} />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowAllSpots(true)}
            className={`w-full py-2 text-xs font-semibold transition-colors rounded-lg ${
              isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            See all spots &darr;
          </button>
        </div>
      )}

      {/* ─── FULL SELECTOR ─── */}
      {showAllSpots && hasQuickPick && (
        <button
          onClick={() => setShowAllSpots(false)}
          className={`w-full py-2 text-xs font-semibold transition-colors rounded-lg ${
            isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-500 hover:text-sky-600'
          }`}
        >
          &uarr; Back to top picks
        </button>
      )}

      {(!showQuickPick || showAllSpots || isFishing) && (
      <>
      {!['snowkiting', 'paragliding'].includes(activity) && (
        <div className={`card !p-0 overflow-hidden ${
          anyUtahHot && !isUtahLakeSelected
            ? (isDark ? '!border-emerald-500/30' : '!border-emerald-300')
            : ''
        }`}>
          <button
          onClick={() => setUtahLakeExpanded(!utahLakeExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
            isUtahLakeSelected 
              ? (isDark ? 'bg-sky-500/[0.06]' : 'bg-sky-50/50') 
              : 'hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <MapPin className={`w-4 h-4 ${isUtahLakeSelected ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`} />
            <div className="text-left">
              <span className={`font-semibold text-sm ${isUtahLakeSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                Utah Lake
              </span>
              {selectedUtahLaunch && (
                <span className="ml-2 text-sky-500">· {selectedUtahLaunch.name}</span>
              )}
              <div className="text-[11px] text-[var(--text-tertiary)]">5 launch locations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anyUtahHot && (
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
            )}
            {utahLakeExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>
        
        {utahLakeExpanded && (
          <div className={`border-t p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
            {UTAH_LAKE_LAUNCHES.map((launch) => {
              const ws = windStatuses[launch.id];
              const isHot = ws?.level === 'hot';
              const isSelected = selectedLake === launch.id;

              return (
                <button
                  key={launch.id}
                  onClick={() => onSelectLake(launch.id)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group border
                    ${isSelected
                      ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                      : isHot
                        ? (isDark
                            ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300')
                        : (isDark 
                            ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                    }
                  `}
                >
                  <span className="data-label mb-1">{launch.position}</span>
                  <span className="font-semibold text-sm text-center leading-tight text-[var(--text-primary)]">{launch.name}</span>
                  <span className="text-[11px] mt-1.5 font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                    <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                  </span>
                  {launch.meterName && (
                    <span className="data-label mt-1 opacity-50">
                      {launch.meterName}
                    </span>
                  )}
                  {ws && <div className="mt-2"><WindBadge status={ws} isDark={isDark} /></div>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ─── SNOWKITE SECTION ─── */}
      {(activity === 'snowkiting' || isSnowSelected) && (
      <div className={`card !p-0 overflow-hidden ${
        anySnowHot ? (isDark ? '!border-sky-500/30' : '!border-sky-300') : ''
      }`}>
        <button
          onClick={() => setSnowExpanded(!snowExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
            isSnowSelected
              ? (isDark ? 'bg-sky-500/[0.06]' : 'bg-sky-50/50')
              : 'hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Snowflake className={`w-4 h-4 ${isSnowSelected ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`} />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${isSnowSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                  Snowkite Utah
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-500">
                  Snow Only
                </span>
              </div>
              {selectedSnowLaunch && (
                <span className="text-sm text-sky-500">· {selectedSnowLaunch.name}</span>
              )}
              <div className="text-[11px] text-[var(--text-tertiary)]">Strawberry Reservoir · Skyline Drive · 7,600–9,680 ft</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anySnowHot && (
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Live</span>
            )}
            {snowExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>

        {snowExpanded && (
          <div className={`border-t ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="data-label">Strawberry Reservoir</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">· 7,600 ft · 5 spots</span>
            </div>
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {STRAWBERRY_LAUNCHES.map((launch) => {
                const ws = windStatuses[launch.id];
                const isHot = ws?.level === 'hot';
                const isSelected = selectedLake === launch.id;

                return (
                  <button
                    key={launch.id}
                    onClick={() => onSelectLake(launch.id)}
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group border
                      ${isSelected
                        ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                        : isHot
                          ? (isDark
                              ? 'bg-sky-500/[0.06] border-sky-500/30 text-sky-400 hover:border-sky-500/50'
                              : 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300')
                          : (isDark
                              ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                      }
                    `}
                  >
                    <span className="data-label mb-1">{launch.position}</span>
                    <span className="font-semibold text-sm text-center leading-tight text-[var(--text-primary)]">{launch.name}</span>
                    <span className="text-[11px] mt-1.5 font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                      <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                    </span>
                    {launch.desc && (
                      <span className="text-[9px] mt-1 text-[var(--text-tertiary)] text-center leading-tight line-clamp-1">
                        {launch.desc}
                      </span>
                    )}
                    {ws && <div className="mt-2"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>

            <div className={`px-4 pt-2 pb-1 flex items-center gap-2 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
              <Mountain className="w-3.5 h-3.5 text-sky-500" />
              <span className="data-label">Skyline Drive</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">· Sanpete County · 9,680 ft</span>
            </div>
            <div className="px-4 pb-4">
              {(() => {
                const ws = windStatuses[SKYLINE_SPOT.id];
                const isHot = ws?.level === 'hot';
                const isSelected = selectedLake === SKYLINE_SPOT.id;

                return (
                  <button
                    onClick={() => onSelectLake(SKYLINE_SPOT.id)}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-lg transition-all duration-200 group border
                      ${isSelected
                        ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                        : isHot
                          ? (isDark
                              ? 'bg-sky-500/[0.06] border-sky-500/30 text-sky-400 hover:border-sky-500/50'
                              : 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300')
                          : (isDark
                              ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                      }
                    `}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base text-[var(--text-primary)]">Big Drift Complex</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-500">
                          {SKYLINE_SPOT.position}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                        <Wind className="w-3 h-3" /> {SKYLINE_SPOT.wind} {SKYLINE_SPOT.direction}
                        <span className="opacity-40 mx-1">·</span> 
                        <span>{SKYLINE_SPOT.desc}</span>
                      </span>
                    </div>
                    {ws && <div className="shrink-0"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ─── KITE SPOTS (kiting & sailing only) ─── */}
      {(['kiting', 'sailing', 'windsurfing'].includes(activity)) && (
        <div className="card !p-0 overflow-hidden">
          <button
            onClick={() => setKiteSpotsExpanded(!kiteSpotsExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]`}
          >
            <div className="flex items-center gap-3">
              <Wind className={`w-4 h-4 text-[var(--text-tertiary)]`} />
              <div className="text-left">
                <span className="font-semibold text-sm text-[var(--text-primary)]">Kite Spots</span>
                <div className="text-[11px] text-[var(--text-tertiary)]">Verified kiting locations · Rush Lake, Grantsville, Deer Creek, Willard Bay S Beach</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {KITE_SPOTS.some(s => windStatuses[s.id]?.level === 'hot') && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
              )}
              {kiteSpotsExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
            </div>
          </button>
          {kiteSpotsExpanded && (
            <div className={`border-t p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
              {KITE_SPOTS.map((spot) => {
                const ws = windStatuses[spot.id];
                const isSelected = selectedLake === spot.id;
                return (
                  <button key={spot.id} onClick={() => onSelectLake(spot.id)} className={`flex items-start gap-3 p-3 rounded-lg transition-all border text-left ${
                    isSelected ? 'bg-sky-500/[0.08] border-sky-500'
                    : ws?.level === 'hot' ? (isDark ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200')
                    : (isDark ? 'bg-white/[0.02] border-[var(--border-subtle)] hover:border-[var(--border-color)]' : 'bg-white border-slate-100 hover:border-slate-200')
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{spot.name}</span>
                        {spot.hazard && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">{spot.hazard}</span>}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{spot.desc}</div>
                      <span className={`text-[10px] flex items-center gap-0.5 mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Wind className="w-2.5 h-2.5" /> {spot.wind}
                      </span>
                    </div>
                    {ws && <div className="shrink-0 mt-0.5"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PARAGLIDING SITES ─── */}
      {activity === 'paragliding' && (
        <div className="card !p-0 overflow-hidden">
          <button
            onClick={() => setParaglidingExpanded(!paraglidingExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]`}
          >
            <div className="flex items-center gap-3">
              <Mountain className={`w-4 h-4 text-[var(--text-tertiary)]`} />
              <div className="text-left">
                <span className="font-semibold text-sm text-[var(--text-primary)]">Paragliding Sites</span>
                <div className="text-[11px] text-[var(--text-tertiary)]">UHGPGA verified · Point of the Mountain, Inspo, West Mtn, Stockton</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {PARAGLIDING_SITES.some(s => windStatuses[s.id]?.level === 'hot') && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
              )}
              {paraglidingExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
            </div>
          </button>
          {paraglidingExpanded && (
            <div className={`border-t p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
              {PARAGLIDING_SITES.map((site) => {
                const ws = windStatuses[site.id];
                const isSelected = selectedLake === site.id;
                return (
                  <button key={site.id} onClick={() => onSelectLake(site.id)} className={`flex items-start gap-3 p-3 rounded-lg transition-all border text-left ${
                    isSelected ? 'bg-sky-500/[0.08] border-sky-500'
                    : ws?.level === 'hot' ? (isDark ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200')
                    : (isDark ? 'bg-white/[0.02] border-[var(--border-subtle)] hover:border-[var(--border-color)]' : 'bg-white border-slate-100 hover:border-slate-200')
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{site.name}</span>
                        {site.rating && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-500/10 text-purple-500 uppercase">{site.rating}</span>}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{site.desc}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] flex items-center gap-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Wind className="w-2.5 h-2.5" /> {site.wind} {site.direction}
                        </span>
                        {site.position && <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{site.position}</span>}
                      </div>
                    </div>
                    {ws && <div className="shrink-0 mt-0.5"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ADDITIONAL SNOWKITE SPOTS ─── */}
      {(activity === 'snowkiting' || selectedLake === 'powder-mountain' || selectedLake === 'monte-cristo') && (
        <div className="card !p-0 overflow-hidden">
          <button
            onClick={() => setSnowExtraExpanded(!snowExtraExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]`}
          >
            <div className="flex items-center gap-3">
              <Mountain className={`w-4 h-4 text-[var(--text-tertiary)]`} />
              <div className="text-left">
                <span className="font-semibold text-sm text-[var(--text-primary)]">More Snowkite Terrain</span>
                <div className="text-[11px] text-[var(--text-tertiary)]">Powder Mountain · Monte Cristo · Backcountry bowls</div>
              </div>
            </div>
            {snowExtraExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
          </button>
          {snowExtraExpanded && (
            <div className={`border-t p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
              {[...SNOWKITE_EXTRA, { id: 'pineview', name: 'Pineview Reservoir', wind: 'E/W Light', meter: 'KOGD', desc: 'Beginner-friendly — light consistent winds 5-12 mph from spillway', position: '4,900 ft' }].map((spot) => {
                const ws = windStatuses[spot.id];
                const isSelected = selectedLake === spot.id;
                return (
                  <button key={spot.id} onClick={() => onSelectLake(spot.id)} className={`flex items-start gap-3 p-3 rounded-lg transition-all border text-left ${
                    isSelected ? 'bg-sky-500/[0.08] border-sky-500'
                    : (isDark ? 'bg-white/[0.02] border-[var(--border-subtle)] hover:border-[var(--border-color)]' : 'bg-white border-slate-100 hover:border-slate-200')
                  }`}>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>{spot.name}</span>
                      {spot.desc && <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{spot.desc}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] flex items-center gap-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Wind className="w-2.5 h-2.5" /> {spot.wind}
                        </span>
                        {spot.position && <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{spot.position}</span>}
                      </div>
                    </div>
                    {ws && <div className="shrink-0 mt-0.5"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fishing Intelligence Hero — smart spot recommendation */}
      {activity === 'fishing' && fishingRec && (
        <FishingSpotHero recommendation={fishingRec} onSelectLake={onSelectLake} isDark={isDark} />
      )}

      {/* All Utah Lakes — organized by region (fishing, boating, paddling, sailing) */}
      {['fishing', 'boating', 'paddling', 'sailing', 'windsurfing'].includes(activity) && (
      <div className="space-y-2">
        {LAKE_REGIONS.map((region) => {
          const hasSelectedLake = region.lakes.some(l => l.id === selectedLake);
          const hasHotLake = region.lakes.some(l => windStatuses[l.id]?.level === 'hot');

          return (
            <RegionSection
              key={region.id}
              region={region}
              selectedLake={selectedLake}
              onSelectLake={(id) => { onSelectLake(id); setUtahLakeExpanded(false); }}
              windStatuses={windStatuses}
              isDark={isDark}
              hasSelectedLake={hasSelectedLake}
              hasHotLake={hasHotLake}
              activity={activity}
            />
          );
        })}
      </div>
      )}
      </>
      )}
    </div>
  );
}

function RegionSection({ region, selectedLake, onSelectLake, windStatuses, isDark, hasSelectedLake, hasHotLake, activity }) {
  const [expanded, setExpanded] = useState(hasSelectedLake);

  useEffect(() => {
    if (hasSelectedLake) setExpanded(true);
  }, [hasSelectedLake]);

  const isFishingOrBoating = ['fishing', 'boating', 'paddling'].includes(activity);

  return (
    <div className={`card !p-0 overflow-hidden ${hasHotLake && !hasSelectedLake ? (isDark ? '!border-emerald-500/20' : '!border-emerald-200') : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
          hasSelectedLake ? (isDark ? 'bg-sky-500/[0.04]' : 'bg-sky-50/30') : 'hover:bg-[var(--bg-card-hover)]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{region.icon}</span>
          <div className="text-left">
            <span className={`font-semibold text-sm ${hasSelectedLake ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
              {region.label}
            </span>
            <span className={`ml-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {region.lakes.length} lake{region.lakes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasHotLake && <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </div>
      </button>

      {expanded && (
        <div className={`border-t p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
          {region.lakes.map((lake) => {
            const ws = windStatuses[lake.id];
            const isSelected = selectedLake === lake.id;
            const cfg = LAKE_CONFIGS[lake.id];

            return (
              <button
                key={lake.id}
                onClick={() => onSelectLake(lake.id)}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all border text-left ${
                  isSelected
                    ? 'bg-sky-500/[0.08] border-sky-500'
                    : ws?.level === 'hot'
                      ? (isDark ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200')
                      : (isDark ? 'bg-white/[0.02] border-[var(--border-subtle)] hover:border-[var(--border-color)]' : 'bg-white border-slate-100 hover:border-slate-200')
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-semibold text-sm ${isSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                      {lake.name}
                    </span>
                    {lake.blueRibbon && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase">Blue Ribbon</span>
                    )}
                    {lake.hazard && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">{lake.hazard}</span>
                    )}
                  </div>
                  {isFishingOrBoating && lake.fish && (
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lake.fish}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] flex items-center gap-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Wind className="w-2.5 h-2.5" /> {lake.wind}
                    </span>
                    {cfg?.elevation && (
                      <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                        {cfg.elevation.toLocaleString()} ft
                      </span>
                    )}
                  </div>
                </div>
                {ws && <div className="shrink-0 mt-0.5"><WindBadge status={ws} isDark={isDark} /></div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { UTAH_LAKE_LAUNCHES, STRAWBERRY_LAUNCHES, SKYLINE_SPOT, OTHER_LAKES, LAKE_REGIONS, KITE_SPOTS, SNOWKITE_EXTRA, PARAGLIDING_SITES };
