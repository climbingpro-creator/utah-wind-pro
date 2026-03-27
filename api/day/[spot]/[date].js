/**
 * GET /day/:spot/:date?activity=kiting
 *
 * Activity-aware "Session Day" leaderboard page. Renders different
 * metrics, themes, and sections based on the activity type.
 */
import { getSupabase } from '../../lib/supabase.js';

const VALID = new Set([
  'kiting','snowkiting','windsurfing','sailing',
  'boating','paddling','paragliding','fishing',
]);

const LABELS = {
  kiting:'Kiting', snowkiting:'Snowkiting', windsurfing:'Windsurfing',
  sailing:'Sailing', boating:'Boating', paddling:'Paddling',
  paragliding:'Paragliding', fishing:'Fishing',
};

const THEMES = {
  kiting:      { grad:'linear-gradient(135deg,#1a1500 0%,#422006 50%,#854d0e 100%)', accent:'#eab308', border:'rgba(234,179,8,0.25)' },
  snowkiting:  { grad:'linear-gradient(135deg,#0c1222 0%,#0c4a6e 50%,#38bdf8 100%)', accent:'#38bdf8', border:'rgba(56,189,248,0.25)' },
  windsurfing: { grad:'linear-gradient(135deg,#042f2e 0%,#155e75 50%,#06b6d4 100%)', accent:'#06b6d4', border:'rgba(6,182,212,0.25)' },
  sailing:     { grad:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#3b82f6 100%)', accent:'#3b82f6', border:'rgba(59,130,246,0.25)' },
  boating:     { grad:'linear-gradient(135deg,#0f0f23 0%,#312e81 50%,#6366f1 100%)', accent:'#6366f1', border:'rgba(99,102,241,0.25)' },
  paddling:    { grad:'linear-gradient(135deg,#022c22 0%,#064e3b 50%,#10b981 100%)', accent:'#10b981', border:'rgba(16,185,129,0.25)' },
  paragliding: { grad:'linear-gradient(135deg,#1a0533 0%,#581c87 50%,#a855f7 100%)', accent:'#a855f7', border:'rgba(168,85,247,0.25)' },
  fishing:     { grad:'linear-gradient(135deg,#052e16 0%,#14532d 50%,#22c55e 100%)', accent:'#22c55e', border:'rgba(34,197,94,0.25)' },
};

const ICONS = {
  kiting:'&#127938;',snowkiting:'&#10052;',windsurfing:'&#127940;',sailing:'&#9973;',
  boating:'&#128674;',paddling:'&#128692;',paragliding:'&#129666;',fishing:'&#127907;',
};

const HAS_JUMPS = new Set(['kiting','snowkiting']);
const HAS_CATCHES = new Set(['fishing']);

function boardDefs(act) {
  switch (act) {
    case 'kiting': case 'snowkiting': return [
      { key:'height',   label:'Highest Jump',   fn:r=>r.max_jump_ft.toFixed(1), unit:'ft',  bar:'linear-gradient(90deg,#eab308,#f59e0b)' },
      { key:'hang',     label:'Best Hangtime',   fn:r=>r.best_hang_s.toFixed(1), unit:'s',   bar:'linear-gradient(90deg,#0891b2,#06b6d4)' },
      { key:'distance', label:'Farthest Jump',   fn:r=>Math.round(r.farthest_ft), unit:'ft', bar:'linear-gradient(90deg,#7c3aed,#a78bfa)' },
      { key:'speed',    label:'Top Speed',        fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
      { key:'jumps',    label:'Most Jumps',        fn:r=>r.total_jumps, unit:'',              bar:'linear-gradient(90deg,#be185d,#ec4899)' },
      { key:'duration', label:'Longest Session',   fn:r=>fmtDurLong(r.duration_s), unit:'',  bar:'linear-gradient(90deg,#7c2d12,#f97316)', raw:r=>r.duration_s },
    ];
    case 'windsurfing': return [
      { key:'speed',    label:'Top Speed',         fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'rides',    label:'Most Rides',         fn:r=>r.ride_count, unit:'',                 bar:'linear-gradient(90deg,#0891b2,#06b6d4)' },
      { key:'foil',     label:'Foil Rides',         fn:r=>r.foil_ride_count, unit:'',            bar:'linear-gradient(90deg,#7c3aed,#a78bfa)' },
      { key:'height',   label:'Air Time',           fn:r=>r.max_jump_ft.toFixed(1), unit:'ft',   bar:'linear-gradient(90deg,#eab308,#f59e0b)' },
      { key:'duration', label:'Longest Session',    fn:r=>fmtDurLong(r.duration_s), unit:'',     bar:'linear-gradient(90deg,#7c2d12,#f97316)', raw:r=>r.duration_s },
      { key:'dist',     label:'Distance',           fn:r=>r.distance_nm.toFixed(1), unit:'NM',   bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
    ];
    case 'sailing': return [
      { key:'speed',    label:'Top Speed',       fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#3b82f6,#60a5fa)' },
      { key:'dist',     label:'Distance',         fn:r=>r.distance_nm.toFixed(1), unit:'NM',   bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'avg',      label:'Avg Speed',        fn:r=>r.avg_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
      { key:'duration', label:'Longest Session',   fn:r=>fmtDurLong(r.duration_s), unit:'',     bar:'linear-gradient(90deg,#7c2d12,#f97316)', raw:r=>r.duration_s },
    ];
    case 'boating': return [
      { key:'duration', label:'Longest Outing',  fn:r=>fmtDurLong(r.duration_s), unit:'', bar:'linear-gradient(90deg,#6366f1,#818cf8)', raw:r=>r.duration_s },
      { key:'dist',     label:'Distance',         fn:r=>r.distance_nm.toFixed(1), unit:'NM', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'speed',    label:'Top Speed',         fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
      { key:'avg',      label:'Avg Speed',         fn:r=>r.avg_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    ];
    case 'paddling': return [
      { key:'duration', label:'Longest Paddle',  fn:r=>fmtDurLong(r.duration_s), unit:'', bar:'linear-gradient(90deg,#10b981,#34d399)', raw:r=>r.duration_s },
      { key:'dist',     label:'Distance',         fn:r=>r.distance_nm.toFixed(1), unit:'NM', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'avg',      label:'Avg Speed',        fn:r=>r.avg_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
      { key:'speed',    label:'Top Speed',         fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    ];
    case 'paragliding': return [
      { key:'duration', label:'Longest Flight',  fn:r=>fmtDurLong(r.duration_s), unit:'', bar:'linear-gradient(90deg,#a855f7,#c084fc)', raw:r=>r.duration_s },
      { key:'dist',     label:'Distance',         fn:r=>r.distance_nm.toFixed(1), unit:'NM', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'speed',    label:'Top Speed',         fn:r=>r.max_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
      { key:'avg',      label:'Avg Speed',         fn:r=>r.avg_speed_kts.toFixed(1), unit:'kts', bar:'linear-gradient(90deg,#3b82f6,#60a5fa)' },
    ];
    case 'fishing': return [
      { key:'biggest',  label:'Biggest Fish',     fn:r=>r.biggest_catch_lbs > 0 ? r.biggest_catch_lbs.toFixed(1) : '0', unit:'lbs', bar:'linear-gradient(90deg,#22c55e,#4ade80)' },
      { key:'most',     label:'Most Fish',         fn:r=>r.total_catches, unit:'',        bar:'linear-gradient(90deg,#eab308,#f59e0b)' },
      { key:'longest',  label:'Longest Fish',      fn:r=>r.longest_catch_in > 0 ? r.longest_catch_in.toFixed(1) : '0', unit:'in', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
      { key:'duration', label:'Longest Session',    fn:r=>fmtDurLong(r.duration_s), unit:'', bar:'linear-gradient(90deg,#7c2d12,#f97316)', raw:r=>r.duration_s },
    ];
    default: return [];
  }
}

function podiumField(act) {
  if (HAS_JUMPS.has(act)) return { field:'max_jump_ft', label:'Best Jump', unit:'ft' };
  if (act === 'windsurfing' || act === 'sailing') return { field:'max_speed_kts', label:'Top Speed', unit:'kts' };
  if (act === 'fishing') return { field:'biggest_catch_lbs', label:'Biggest Catch', unit:'lbs' };
  if (act === 'boating' || act === 'paddling') return { field:'distance_nm', label:'Distance', unit:'NM' };
  return { field:'duration_s', label:'Flight Time', unit:'', isDur:true };
}

// ─── Handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  const { spot: spotSlug, date: dateStr, activity: actParam } = req.query;
  if (!spotSlug || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).send('Usage: /day/:spot-slug/:YYYY-MM-DD');
  }

  const activity = VALID.has(actParam) ? actParam : 'kiting';

  try {
    const supabase = getSupabase();

    const { data: spot } = await supabase
      .from('spots').select('id, name, slug').eq('slug', spotSlug).single();
    if (!spot) return res.status(404).send(notFoundPage(spotSlug, dateStr));

    const dayStart = `${dateStr}T00:00:00Z`;
    const dayEnd   = `${dateStr}T23:59:59Z`;

    let q = supabase.from('kite_sessions').select('*')
      .eq('spot_id', spot.id)
      .gte('started_at', dayStart)
      .lte('started_at', dayEnd)
      .order('started_at', { ascending: true });

    q = q.eq('activity_type', activity);

    const { data: sessions } = await q;
    if (!sessions || sessions.length === 0) {
      return res.status(404).send(emptyDayPage(spot.name, dateStr, activity));
    }

    const sessionIds = sessions.map(s => s.id);

    const jumpP = HAS_JUMPS.has(activity)
      ? supabase.from('jumps').select('*').in('session_id', sessionIds).order('jump_number', { ascending: true })
      : Promise.resolve({ data: [] });

    const catchP = HAS_CATCHES.has(activity)
      ? supabase.from('fish_catches').select('*').in('session_id', sessionIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] });

    const photoP = supabase.from('session_photos').select('*').in('session_id', sessionIds).order('created_at', { ascending: false });

    const [{ data: allJumps }, { data: allCatches }, { data: allPhotos }] = await Promise.all([jumpP, catchP, photoP]);

    const jumpsBySession = {};
    (allJumps || []).forEach(j => {
      if (!jumpsBySession[j.session_id]) jumpsBySession[j.session_id] = [];
      jumpsBySession[j.session_id].push(j);
    });

    const catchesBySession = {};
    (allCatches || []).forEach(c => {
      if (!catchesBySession[c.session_id]) catchesBySession[c.session_id] = [];
      catchesBySession[c.session_id].push(c);
    });

    const riders = sessions.map((s, i) => {
      const jumps = jumpsBySession[s.id] || [];
      const catches = catchesBySession[s.id] || [];
      const bestJump = jumps.length ? jumps.reduce((a, b) => ((b.height_ft||0) > (a.height_ft||0) ? b : a)) : null;
      const bestHang = jumps.length ? jumps.reduce((a, b) => ((b.hangtime_s||0) > (a.hangtime_s||0) ? b : a)) : null;
      const farthest = jumps.length ? jumps.reduce((a, b) => ((b.distance_ft||0) > (a.distance_ft||0) ? b : a)) : null;
      const biggestCatch = catches.length ? catches.reduce((a, b) => ((b.weight_lbs||0) > (a.weight_lbs||0) ? b : a)) : null;
      const longestCatch = catches.length ? catches.reduce((a, b) => ((b.length_in||0) > (a.length_in||0) ? b : a)) : null;

      return {
        idx: i,
        name: s.rider_name || `Rider ${i + 1}`,
        initials: getInitials(s.rider_name || `Rider ${i + 1}`),
        gear: s.gear_setup || '',
        duration_s: s.duration_s || 0,
        distance_nm: s.distance_nm || 0,
        max_speed_kts: s.max_speed_kts || 0,
        avg_speed_kts: s.avg_speed_kts || 0,
        total_jumps: s.total_jumps || 0,
        max_jump_ft: bestJump ? bestJump.height_ft : (s.max_jump_ft || 0),
        best_hang_s: bestHang ? bestHang.hangtime_s : (s.max_hangtime_s || 0),
        farthest_ft: farthest ? (farthest.distance_ft || 0) : 0,
        ride_count: s.ride_count || 0,
        foil_ride_count: s.foil_ride_count || 0,
        total_catches: catches.length,
        biggest_catch_lbs: biggestCatch ? (biggestCatch.weight_lbs || 0) : 0,
        longest_catch_in: longestCatch ? (longestCatch.length_in || 0) : 0,
        catches,
        calories: s.calories || 0,
        avg_hr: s.avg_hr || 0,
        max_hr: s.max_hr || 0,
        jumps,
        sessionId: s.id,
        started_at: s.started_at,
      };
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).send(renderDayPage(spot, dateStr, riders, activity, allPhotos || []));
  } catch (err) {
    console.error('[day page]', err.message);
    return res.status(500).send('Server error');
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(name) {
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDur(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}` : `${m}m`;
}

function fmtDurLong(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

function notFoundPage(slug, date) {
  return `<!DOCTYPE html><html><head><title>Spot Not Found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#ef4444}a{color:#3b82f6}</style></head>
<body><div class="box"><h1>Spot Not Found</h1><p>${esc(slug)} on ${esc(date)}</p>
<a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

function emptyDayPage(spotName, date, activity) {
  const label = LABELS[activity] || 'Session';
  return `<!DOCTYPE html><html><head><title>No Sessions | ${esc(spotName)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#eab308}a{color:#3b82f6}p{color:#94a3b8}</style></head>
<body><div class="box"><h1>No ${esc(label)} Sessions Yet</h1><p>${esc(spotName)} &mdash; ${esc(date)}</p>
<p>No riders have uploaded ${esc(label.toLowerCase())} sessions for this day.</p>
<a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

// ─── Render ──────────────────────────────────────────────────

const COLORS = [
  { bg:'linear-gradient(135deg,#854d0e,#eab308)', accent:'#eab308' },
  { bg:'linear-gradient(135deg,#334155,#64748b)', accent:'#64748b' },
  { bg:'linear-gradient(135deg,#78350f,#b45309)', accent:'#cd7f32' },
  { bg:'linear-gradient(135deg,#1e3a5f,#2563eb)', accent:'#3b82f6' },
  { bg:'linear-gradient(135deg,#4c1d95,#7c3aed)', accent:'#7c3aed' },
  { bg:'linear-gradient(135deg,#064e3b,#059669)', accent:'#10b981' },
  { bg:'linear-gradient(135deg,#7f1d1d,#dc2626)', accent:'#ef4444' },
  { bg:'linear-gradient(135deg,#701a75,#d946ef)', accent:'#d946ef' },
];
const RANK_COLORS = ['#eab308','#94a3b8','#cd7f32'];
const RANK_CLASSES = ['gold','silver','bronze'];

function renderDayPage(spot, dateStr, riders, activity, photos) {
  const theme = THEMES[activity] || THEMES.kiting;
  const label = LABELS[activity] || 'Session';
  const icon  = ICONS[activity]  || '';
  const boards = boardDefs(activity);
  const pod = podiumField(activity);
  const isFishing = activity === 'fishing';

  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday:'long', month:'long', day:'numeric', year:'numeric',
  });

  // Hero stats
  const totalTime = riders.reduce((s, r) => s + r.duration_s, 0);
  let heroStats = '';
  if (HAS_JUMPS.has(activity)) {
    const totalJumps = riders.reduce((s, r) => s + r.total_jumps, 0);
    const dayRecord  = Math.max(...riders.map(r => r.max_jump_ft));
    heroStats = `
      <div class="day-stat"><div class="dv">${riders.length}</div><div class="dl">Riders</div></div>
      <div class="day-stat"><div class="dv">${totalJumps}</div><div class="dl">Total Jumps</div></div>
      <div class="day-stat"><div class="dv">${dayRecord.toFixed(1)}<small style="font-size:0.5em">ft</small></div><div class="dl">Day Record</div></div>
      <div class="day-stat"><div class="dv">${fmtDur(totalTime)}</div><div class="dl">Time on Water</div></div>`;
  } else if (isFishing) {
    const totalCatch = riders.reduce((s, r) => s + r.total_catches, 0);
    const biggestAll = Math.max(0, ...riders.map(r => r.biggest_catch_lbs));
    heroStats = `
      <div class="day-stat"><div class="dv">${riders.length}</div><div class="dl">Anglers</div></div>
      <div class="day-stat"><div class="dv">${totalCatch}</div><div class="dl">Total Catches</div></div>
      <div class="day-stat"><div class="dv">${biggestAll > 0 ? biggestAll.toFixed(1) : '0'}<small style="font-size:0.5em">lbs</small></div><div class="dl">Biggest Fish</div></div>
      <div class="day-stat"><div class="dv">${fmtDur(totalTime)}</div><div class="dl">Time Fishing</div></div>`;
  } else {
    const topSpeed = Math.max(0, ...riders.map(r => r.max_speed_kts));
    const totalDist = riders.reduce((s, r) => s + r.distance_nm, 0);
    heroStats = `
      <div class="day-stat"><div class="dv">${riders.length}</div><div class="dl">Riders</div></div>
      <div class="day-stat"><div class="dv">${topSpeed.toFixed(1)}<small style="font-size:0.5em">kts</small></div><div class="dl">Top Speed</div></div>
      <div class="day-stat"><div class="dv">${totalDist.toFixed(1)}<small style="font-size:0.5em">NM</small></div><div class="dl">Total Distance</div></div>
      <div class="day-stat"><div class="dv">${fmtDur(totalTime)}</div><div class="dl">Time on Water</div></div>`;
  }

  // Sorted riders for each board
  const sortedBoards = boards.map(b => {
    const rawFn = b.raw || (r => parseFloat(b.fn(r)) || 0);
    return { ...b, sorted: [...riders].sort((a, c) => rawFn(c) - rawFn(a)) };
  });

  function lbRows(sorted, valFn, unitStr, barColor) {
    const maxVal = sorted.length > 0 ? (parseFloat(valFn(sorted[0])) || 0) : 1;
    return sorted.map((r, i) => {
      const v = valFn(r);
      const numV = parseFloat(v) || 0;
      const pct = maxVal > 0 ? Math.max(5, (numV / maxVal) * 100) : 5;
      const c = COLORS[r.idx % COLORS.length];
      const rankCls = i < 3 ? ` ${RANK_CLASSES[i]}` : '';
      const rankColor = i < 3 ? RANK_COLORS[i] : '#475569';
      return `<div class="rider-row${rankCls}">
        <div class="rr-rank" style="color:${rankColor}">${i + 1}</div>
        <div class="rr-avatar" style="background:${c.bg}">${esc(r.initials)}</div>
        <div class="rr-info"><div class="rr-name">${esc(r.name)}</div>${r.gear ? `<div class="rr-gear">${esc(r.gear)}</div>` : ''}</div>
        <div class="rr-bar-wrap"><div class="rr-bar" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="rr-val"><span class="big" style="color:${i < 3 ? RANK_COLORS[i] : c.accent}">${v}</span><span class="unit">${unitStr}</span></div>
      </div>`;
    }).join('');
  }

  const boardsHTML = sortedBoards.map(b => lbRows(b.sorted, b.fn, b.unit, b.bar));

  const tabsHTML = boards.map((b, i) =>
    `<div class="lb-tab${i === 0 ? ' active' : ''}" onclick="switchBoard('${b.key}')">${b.label}</div>`
  ).join('');

  const boardPanels = boards.map((b, i) =>
    `<div class="lb-board${i === 0 ? ' active' : ''}" id="board-${b.key}">${boardsHTML[i]}</div>`
  ).join('');

  const tabMapJS = boards.map((b, i) => `'${b.key}':${i}`).join(',');

  // Podium
  const byPodium = [...riders].sort((a, c) => {
    const av = pod.isDur ? a.duration_s : (a[pod.field] || 0);
    const bv = pod.isDur ? c.duration_s : (c[pod.field] || 0);
    return bv - av;
  });
  const podiumRiders = byPodium.slice(0, 3);

  function podiumCard(r, rank) {
    if (!r) return '';
    const c = COLORS[r.idx % COLORS.length];
    const sizes = rank === 0 ? { avi:64, bar:110, fs:'1.6rem' } : rank === 1 ? { avi:56, bar:80, fs:'1.4rem' } : { avi:56, bar:60, fs:'1.4rem' };
    const barBg = rank === 0 ? 'linear-gradient(to top,#854d0e,#eab308)' : rank === 1 ? 'linear-gradient(to top,#475569,#94a3b8)' : 'linear-gradient(to top,#78350f,#cd7f32)';
    const crown = rank === 0 ? '<span class="crown">&#128081;</span>' : '';
    const labels = ['1st','2nd','3rd'];
    const val = pod.isDur ? fmtDurLong(r.duration_s) : (r[pod.field] || 0).toFixed ? (r[pod.field] || 0).toFixed(1) : (r[pod.field] || 0);
    return `<div class="pod">
      <div class="pod-avatar" style="width:${sizes.avi}px;height:${sizes.avi}px;font-size:${sizes.fs};background:${c.bg};border-color:${RANK_COLORS[rank]}">
        ${crown}${esc(r.initials)}
      </div>
      <div class="pod-name">${esc(r.name)}</div>
      <div class="pod-val" style="color:${RANK_COLORS[rank]}">${val}<small style="font-size:0.5em">${pod.isDur ? '' : pod.unit}</small></div>
      <div class="pod-label">${pod.label}</div>
      <div class="pod-bar" style="height:${sizes.bar}px;background:${barBg}"></div>
      <div class="rank">${labels[rank]}</div>
    </div>`;
  }

  const podiumHTML = riders.length >= 2
    ? [podiumCard(podiumRiders[1], 1), podiumCard(podiumRiders[0], 0), podiumCard(podiumRiders[2], 2)].join('')
    : '';

  const kingTitle = HAS_JUMPS.has(activity) ? 'King of the Day' : isFishing ? 'Top Angler' : 'Leader of the Day';
  const kingSub = HAS_JUMPS.has(activity) ? 'Highest single jump wins the crown'
    : isFishing ? 'Biggest fish takes the trophy'
    : activity === 'paragliding' ? 'Longest flight earns the crown'
    : 'Top performance wins the crown';

  // Head-to-head
  let h2hHTML = '';
  if (riders.length >= 2) {
    const a = byPodium[0], b = byPodium[1];
    const ca = COLORS[a.idx % COLORS.length], cb = COLORS[b.idx % COLORS.length];
    function h2hRow(lbl, aVal, bVal, unit) {
      const aN = parseFloat(aVal)||0, bN = parseFloat(bVal)||0, tot = aN + bN || 1;
      const aP = ((aN/tot)*100).toFixed(0), bP = (100-parseFloat(aP)).toFixed(0);
      return `<div class="h2h-row"><div class="h2h-left"><div class="hv">${aVal}${unit?' '+unit:''}</div></div><div class="h2h-label">${lbl}</div><div class="h2h-right"><div class="hv">${bVal}${unit?' '+unit:''}</div></div></div>
      <div class="h2h-bar"><div class="left" style="width:${aP}%"></div><div class="right" style="width:${bP}%"></div></div>`;
    }
    const rows = [];
    if (HAS_JUMPS.has(activity)) {
      rows.push(h2hRow('Best Jump', a.max_jump_ft.toFixed(1), b.max_jump_ft.toFixed(1), 'ft'));
      rows.push(h2hRow('Hangtime', a.best_hang_s.toFixed(1), b.best_hang_s.toFixed(1), 's'));
      rows.push(h2hRow('Jumps', a.total_jumps, b.total_jumps, ''));
    }
    if (isFishing) {
      rows.push(h2hRow('Biggest Fish', a.biggest_catch_lbs.toFixed(1), b.biggest_catch_lbs.toFixed(1), 'lbs'));
      rows.push(h2hRow('Total Catches', a.total_catches, b.total_catches, ''));
    }
    rows.push(h2hRow('Top Speed', a.max_speed_kts.toFixed(1), b.max_speed_kts.toFixed(1), 'kts'));
    rows.push(h2hRow('Duration', fmtDurLong(a.duration_s), fmtDurLong(b.duration_s), ''));

    h2hHTML = `<div class="h2h">
      <div class="h2h-header">
        <div class="h2h-player left"><div class="avatar" style="background:${ca.bg}">${esc(a.initials)}</div><div class="pname">${esc(a.name)}</div></div>
        <div style="font-size:0.8rem;font-weight:900;color:#334155">VS</div>
        <div class="h2h-player right"><div class="pname">${esc(b.name)}</div><div class="avatar" style="background:${cb.bg}">${esc(b.initials)}</div></div>
      </div>${rows.join('')}</div>`;
  }

  // Badges
  const badges = [];
  const king = byPodium[0];
  if (king) badges.push({ ico:'&#127942;', name: kingTitle, desc:'Top performer of the day', who:king.name, color:theme.accent, earned:true });

  const speedD = riders.filter(r => r.max_speed_kts >= 20);
  if (speedD.length) badges.push({ ico:'&#9889;', name:'Speed Demon', desc:'Hit 20+ knots', who:speedD.map(r=>r.name).join(' &middot; '), color:'#22c55e', earned:true });

  if (HAS_JUMPS.has(activity)) {
    const moon = riders.filter(r => r.max_jump_ft >= 20);
    if (moon.length) badges.push({ ico:'&#128640;', name:'Moon Shot', desc:'Jump over 20 ft', who:moon.map(r=>r.name).join(' &middot; '), color:'#06b6d4', earned:true });
    const jumpM = riders.filter(r => r.total_jumps >= 20);
    if (jumpM.length) badges.push({ ico:'&#128165;', name:'Jump Machine', desc:'20+ jumps in a session', who:jumpM.map(r=>r.name).join(' &middot; '), color:'#ec4899', earned:true });
  }

  if (isFishing) {
    const trophy = riders.filter(r => r.biggest_catch_lbs >= 5);
    if (trophy.length) badges.push({ ico:'&#127907;', name:'Trophy Catch', desc:'Landed a 5+ lb fish', who:trophy.map(r=>r.name).join(' &middot; '), color:'#eab308', earned:true });
    const limit = riders.filter(r => r.total_catches >= 10);
    if (limit.length) badges.push({ ico:'&#128031;', name:'Limit Breaker', desc:'10+ fish in a session', who:limit.map(r=>r.name).join(' &middot; '), color:'#06b6d4', earned:true });
  }

  const ironR = riders.filter(r => r.duration_s >= 7200);
  if (ironR.length) badges.push({ ico:'&#127947;', name:'Iron Rider', desc:'Session over 2 hours', who:ironR.map(r=>r.name).join(' &middot; '), color:'#f97316', earned:true });

  const marathon = riders.filter(r => r.distance_nm >= 10);
  if (marathon.length) badges.push({ ico:'&#127946;', name:'Marathon', desc:'10+ nautical miles', who:marathon.map(r=>r.name).join(' &middot; '), color:'#06b6d4', earned:true });

  if (!speedD.length) badges.push({ ico:'&#9889;', name:'Speed Demon', desc:'Hit 20+ knots', who:'Locked', color:'#64748b', earned:false });
  if (!ironR.length)  badges.push({ ico:'&#127947;', name:'Iron Rider', desc:'Session over 2 hours', who:'Locked', color:'#64748b', earned:false });

  const badgeCards = badges.map(b => `<div class="badge-card${b.earned?' earned':' locked'}">
    <div class="badge-ico">${b.ico}</div>
    <div class="badge-name" style="color:${b.color}">${b.name}</div>
    <div class="badge-desc">${b.desc}</div>
    <div class="badge-who" style="color:${b.earned?'#eab308':'#475569'}">${esc(b.who)}</div>
  </div>`).join('');

  // Feed
  const feed = [];
  riders.forEach(r => feed.push({ time:r.started_at, name:r.name, initials:r.initials, idx:r.idx, text:`started a ${label.toLowerCase()} session at ${esc(spot.name)}` }));
  if (king && (king.max_jump_ft > 0 || king.biggest_catch_lbs > 0 || king.max_speed_kts > 0)) {
    const highlight = HAS_JUMPS.has(activity) ? `crushed a <span class="hl">${king.max_jump_ft.toFixed(1)} ft</span> jump`
      : isFishing && king.biggest_catch_lbs > 0 ? `landed a <span class="hl">${king.biggest_catch_lbs.toFixed(1)} lb</span> fish`
      : `hit <span class="hl">${king.max_speed_kts.toFixed(1)} kts</span>`;
    feed.push({ time:king.started_at, name:king.name, initials:king.initials, idx:king.idx, text:`${highlight} &mdash; best of the day!` });
  }
  ironR.forEach(r => feed.push({ time:r.started_at, name:r.name, initials:r.initials, idx:r.idx, text:`unlocked <span class="hl">Iron Rider</span> &mdash; 2+ hours!` }));
  feed.sort((a, b) => new Date(b.time) - new Date(a.time));

  const feedHTML = feed.slice(0, 12).map(f => {
    const c = COLORS[f.idx % COLORS.length];
    const t = new Date(f.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    return `<div class="feed-item"><div class="feed-avi" style="background:${c.bg}">${esc(f.initials)}</div>
      <div><div class="feed-text"><strong>${esc(f.name)}</strong> ${f.text}</div><div class="feed-time">${t}</div></div></div>`;
  }).join('');

  // Rider links
  const riderLinks = riders.map(r => {
    const c = COLORS[r.idx % COLORS.length];
    const sub = HAS_JUMPS.has(activity) ? `${fmtDurLong(r.duration_s)} &middot; ${r.total_jumps} jumps &middot; ${r.max_speed_kts.toFixed(1)} kts`
      : isFishing ? `${fmtDurLong(r.duration_s)} &middot; ${r.total_catches} fish &middot; ${r.biggest_catch_lbs > 0 ? r.biggest_catch_lbs.toFixed(1) + ' lbs best' : 'no weigh-in'}`
      : `${fmtDurLong(r.duration_s)} &middot; ${r.distance_nm.toFixed(1)} NM &middot; ${r.max_speed_kts.toFixed(1)} kts`;
    return `<a class="rider-link" href="/session/${r.sessionId}">
      <div class="rl-avi" style="background:${c.bg}">${esc(r.initials)}</div>
      <div class="rl-info"><div class="rl-name">${esc(r.name)}</div><div class="rl-sub">${sub}</div></div>
      <div class="rl-arrow">&#8250;</div></a>`;
  }).join('');

  // Photo gallery
  const galleryHTML = photos.length > 0 ? `
    <div class="section-title">Photo Gallery</div>
    <div class="photo-grid">${photos.map(p => `<div class="photo-card">
      <img src="${esc(p.photo_url)}" alt="${esc(p.caption || 'Session photo')}" loading="lazy"/>
      ${p.caption ? `<div class="photo-cap">${esc(p.caption)}</div>` : ''}
    </div>`).join('')}</div>` : '';

  // Fish catch gallery (fishing only)
  let catchGallery = '';
  if (isFishing) {
    const allC = riders.flatMap(r => r.catches.map(c => ({ ...c, riderName: r.name })));
    if (allC.length > 0) {
      catchGallery = `<div class="section-title">Catch Log</div>
        <div class="catch-grid">${allC.map(c => `<div class="catch-card">
          ${c.photo_url ? `<img src="${esc(c.photo_url)}" alt="Catch" loading="lazy"/>` : '<div class="catch-placeholder">&#127907;</div>'}
          <div class="catch-info">
            <div class="catch-who">${esc(c.riderName)}</div>
            ${c.species ? `<div class="catch-species">${esc(c.species)}</div>` : ''}
            <div class="catch-stats">
              ${c.weight_lbs ? `<span>${c.weight_lbs.toFixed(1)} lbs</span>` : ''}
              ${c.length_in ? `<span>${c.length_in.toFixed(1)} in</span>` : ''}
            </div>
          </div>
        </div>`).join('')}</div>`;
    }
  }

  // OG description
  const ogDesc = HAS_JUMPS.has(activity) ? `${riders.length} riders | ${riders.reduce((s,r)=>s+r.total_jumps,0)} jumps | Day record ${Math.max(...riders.map(r=>r.max_jump_ft)).toFixed(1)} ft`
    : isFishing ? `${riders.length} anglers | ${riders.reduce((s,r)=>s+r.total_catches,0)} fish caught`
    : `${riders.length} riders | Top speed ${Math.max(0,...riders.map(r=>r.max_speed_kts)).toFixed(1)} kts`;

  const shareText = HAS_JUMPS.has(activity)
    ? `${label} Day at ${spot.name}! ${riders.length} riders, ${riders.reduce((s,r)=>s+r.total_jumps,0)} jumps.`
    : isFishing
    ? `Fishing Day at ${spot.name}! ${riders.length} anglers, ${riders.reduce((s,r)=>s+r.total_catches,0)} fish caught.`
    : `${label} Day at ${spot.name}! ${riders.length} riders on the water.`;

  const pageUrl = `https://utahwindfinder.com/day/${spot.slug}/${dateStr}?activity=${activity}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(label)} Day | ${esc(spot.name)} | ${esc(dateStr)} | UtahWindFinder</title>
  <meta property="og:title" content="${esc(label)} Day at ${esc(spot.name)} — ${esc(dateStr)}">
  <meta property="og:description" content="${ogDesc}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#050510;color:#e5e5e5;line-height:1.5;overflow-x:hidden}
    .hero{text-align:center;padding:2.5rem 1rem 2rem;background:${theme.grad};border-bottom:2px solid ${theme.border};position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 25% 80%,${theme.accent}11 0%,transparent 50%),radial-gradient(circle at 75% 20%,${theme.accent}11 0%,transparent 50%);animation:drift 18s ease-in-out infinite alternate}
    @keyframes drift{0%{transform:translate(0,0)}100%{transform:translate(-3%,2%)}}
    .hero *{position:relative}
    .hero-label{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.25em;color:${theme.accent};font-weight:700}
    .hero h1{font-size:2.2rem;font-weight:900;background:linear-gradient(90deg,${theme.accent},#f97316,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0.3rem 0}
    .hero .date{font-size:0.85rem;color:#94a3b8;font-weight:600}
    .day-stats{display:flex;justify-content:center;gap:2rem;margin-top:1.5rem;flex-wrap:wrap}
    .day-stat{text-align:center}.day-stat .dv{font-size:2rem;font-weight:900;color:#f1f5f9}.day-stat .dl{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-top:0.1rem}
    .wrap{max-width:750px;margin:0 auto;padding:0 1rem 3rem}
    .section-title{font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;padding:2rem 0 1rem;color:#94a3b8;display:flex;align-items:center;gap:0.5rem}
    .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(148,163,184,0.3),transparent)}
    .section-sub{font-size:0.7rem;color:#475569;margin-top:-0.5rem;margin-bottom:1rem}
    .podium{display:flex;justify-content:center;align-items:flex-end;gap:0.5rem;padding:1rem 0 1.5rem;min-height:260px}
    .pod{display:flex;flex-direction:column;align-items:center;width:120px}
    .pod-avatar{border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;position:relative}
    .pod-avatar .crown{position:absolute;top:-16px;font-size:1.2rem;filter:drop-shadow(0 0 4px rgba(234,179,8,0.6))}
    .pod-name{font-size:0.75rem;font-weight:700;margin-top:0.5rem;color:#f1f5f9}
    .pod-val{font-size:1.3rem;font-weight:900;margin-top:0.15rem}
    .pod-label{font-size:0.55rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
    .pod-bar{width:60px;border-radius:8px 8px 0 0;margin-top:0.4rem}
    .pod .rank{font-size:0.7rem;font-weight:800;color:#fff;margin-top:0.3rem;opacity:0.7}
    .lb-tabs{display:flex;gap:0.4rem;overflow-x:auto;padding:0.5rem 0;-webkit-overflow-scrolling:touch}
    .lb-tab{flex:0 0 auto;padding:0.4rem 0.8rem;border-radius:20px;font-size:0.7rem;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:#94a3b8;transition:all 0.2s;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em}
    .lb-tab:hover{border-color:${theme.accent}55;color:#e2e8f0}
    .lb-tab.active{background:linear-gradient(135deg,${theme.accent}22,${theme.accent}33);border-color:${theme.accent};color:${theme.accent}}
    .lb-board{display:none}.lb-board.active{display:block}
    .rider-row{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 0.8rem;background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.04);border-radius:14px;margin-bottom:0.5rem;transition:transform 0.15s,border-color 0.15s}
    .rider-row:hover{transform:translateX(4px);border-color:${theme.accent}33}
    .rider-row.gold{border:1px solid rgba(234,179,8,0.3);background:linear-gradient(145deg,#1c1a0f,#151310)}
    .rider-row.silver{border:1px solid rgba(148,163,184,0.2)}.rider-row.bronze{border:1px solid rgba(205,127,50,0.15)}
    .rr-rank{font-size:1.1rem;font-weight:900;width:28px;text-align:center;flex-shrink:0}
    .rr-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:800;color:#fff;flex-shrink:0}
    .rr-info{flex:1;min-width:0}.rr-name{font-size:0.8rem;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rr-gear{font-size:0.6rem;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rr-val{text-align:right;flex-shrink:0}.rr-val .big{font-size:1.2rem;font-weight:900}.rr-val .unit{font-size:0.6rem;color:#64748b;margin-left:2px}
    .rr-bar-wrap{width:100px;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;flex-shrink:0}
    .rr-bar{height:100%;border-radius:4px;transition:width 0.5s ease-out}
    .h2h{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:1.2rem;margin-top:0.5rem}
    .h2h-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
    .h2h-player{display:flex;align-items:center;gap:0.5rem}
    .h2h-player .avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:800;color:#fff}
    .h2h-player .pname{font-size:0.8rem;font-weight:700}
    .h2h-player.left .pname{color:#22c55e}.h2h-player.right .pname{color:#f97316}
    .h2h-row{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;margin-top:0.8rem}
    .h2h-label{font-size:0.6rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;width:70px;text-align:center;flex-shrink:0}
    .h2h-left,.h2h-right{flex:1;text-align:center}.h2h-left .hv,.h2h-right .hv{font-size:1rem;font-weight:800}
    .h2h-left .hv{color:#22c55e}.h2h-right .hv{color:#f97316}
    .h2h-bar{display:flex;height:6px;border-radius:3px;overflow:hidden}.h2h-bar .left{background:#22c55e}.h2h-bar .right{background:#f97316}
    .badges-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.6rem;padding:0.5rem 0}
    .badge-card{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:1rem 0.7rem;text-align:center;transition:transform 0.2s}
    .badge-card:hover{transform:scale(1.03)}.badge-card.earned{border-color:${theme.accent}44}.badge-card.locked{opacity:0.35}
    .badge-ico{font-size:2rem;margin-bottom:0.3rem}.badge-name{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em}
    .badge-desc{font-size:0.6rem;color:#64748b;margin-top:0.15rem}.badge-who{font-size:0.6rem;font-weight:700;margin-top:0.3rem}
    .feed-item{display:flex;gap:0.7rem;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.03)}.feed-item:last-child{border:none}
    .feed-avi{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px}
    .feed-text{font-size:0.75rem;color:#94a3b8}.feed-text strong{color:#f1f5f9;font-weight:700}.feed-text .hl{color:${theme.accent};font-weight:700}
    .feed-time{font-size:0.6rem;color:#334155;margin-top:0.15rem}
    .rider-link{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 0.8rem;background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.04);border-radius:14px;margin-bottom:0.5rem;text-decoration:none;color:inherit;transition:all 0.15s}
    .rider-link:hover{border-color:${theme.accent}44;transform:translateX(4px)}
    .rl-avi{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:800;color:#fff;flex-shrink:0}
    .rl-info{flex:1;min-width:0}.rl-name{font-size:0.8rem;font-weight:700;color:#f1f5f9}.rl-sub{font-size:0.6rem;color:#475569}.rl-arrow{font-size:1.2rem;color:#475569;font-weight:300}
    .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.6rem}
    .photo-card{border-radius:12px;overflow:hidden;background:#111827;border:1px solid rgba(255,255,255,0.05)}
    .photo-card img{width:100%;height:140px;object-fit:cover;display:block}
    .photo-cap{font-size:0.65rem;color:#94a3b8;padding:0.4rem 0.6rem}
    .catch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.6rem}
    .catch-card{border-radius:12px;overflow:hidden;background:#111827;border:1px solid rgba(34,197,94,0.15)}
    .catch-card img{width:100%;height:140px;object-fit:cover;display:block}
    .catch-placeholder{height:80px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;opacity:0.2}
    .catch-info{padding:0.5rem 0.6rem}.catch-who{font-size:0.7rem;font-weight:700;color:#f1f5f9}
    .catch-species{font-size:0.6rem;color:#22c55e;font-weight:600}.catch-stats{font-size:0.65rem;color:#94a3b8;display:flex;gap:0.5rem;margin-top:0.2rem}
    .share-bar{display:flex;gap:0.5rem;flex-wrap:wrap;padding:0.5rem 0}
    .share-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:10px;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;text-decoration:none;color:#fff}
    .share-btn:hover{transform:scale(1.03);filter:brightness(1.15)}
    .share-btn.copy{background:linear-gradient(135deg,#334155,#475569)}
    .share-btn.twitter{background:linear-gradient(135deg,#0c4a6e,#0ea5e9)}
    .share-btn.sms-share{background:linear-gradient(135deg,#065f46,#10b981)}
    .share-copied{font-size:0.65rem;color:#22c55e;font-weight:600;margin-left:0.5rem;opacity:0;transition:opacity 0.3s}
    .setup-card{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid ${theme.accent}22;border-radius:16px;padding:1.2rem;margin-top:0.5rem}
    .setup-card h3{font-size:0.85rem;font-weight:800;color:${theme.accent};margin-bottom:0.3rem}
    .setup-card p{font-size:0.7rem;color:#64748b;margin-bottom:1rem;line-height:1.5}
    .setup-steps{display:flex;flex-direction:column;gap:0.6rem}
    .setup-step{display:flex;align-items:flex-start;gap:0.6rem}
    .step-num{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#000;background:${theme.accent};flex-shrink:0}
    .step-text{font-size:0.7rem;color:#94a3b8;line-height:1.5}.step-text strong{color:#f1f5f9}
    footer{text-align:center;padding:2.5rem 0 1.5rem;font-size:0.7rem;color:#1e293b}
    footer a{color:${theme.accent};text-decoration:none;font-weight:600}
    @media(max-width:500px){.hero h1{font-size:1.6rem}.pod{width:95px}.rr-bar-wrap{width:60px}.badges-grid{grid-template-columns:repeat(2,1fr)}.day-stats{gap:1rem}.day-stat .dv{font-size:1.5rem}}
  </style>
</head>
<body>
<div class="hero">
  <div class="hero-label">${icon} ${esc(label)} Day</div>
  <h1>${esc(spot.name)}</h1>
  <div class="date">${esc(dateFormatted)}</div>
  <div class="day-stats">${heroStats}</div>
</div>
<div class="wrap">
  ${riders.length >= 2 ? `<div class="section-title">${kingTitle}</div><div class="section-sub">${kingSub}</div><div class="podium">${podiumHTML}</div>` : ''}
  <div class="section-title">Leaderboards</div>
  <div class="lb-tabs">${tabsHTML}</div>
  <div class="lb-boards">${boardPanels}</div>
  ${h2hHTML ? `<div class="section-title">Head to Head</div><div class="section-sub">Top two compared</div>${h2hHTML}` : ''}
  ${catchGallery}
  ${galleryHTML}
  <div class="section-title">Achievements</div>
  <div class="section-sub">Unlocked during this session day</div>
  <div class="badges-grid">${badgeCards}</div>
  <div class="section-title">Session Feed</div>
  <div class="feed">${feedHTML}</div>
  <div class="section-title">Individual Sessions</div>
  <div class="section-sub">Tap to view full session details</div>
  ${riderLinks}
  <div class="section-title">Share This Day</div>
  <div class="share-bar">
    <button class="share-btn copy" onclick="copyLink()">&#128203; Copy Link <span id="copied-msg" class="share-copied">Copied!</span></button>
    <a class="share-btn twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener">&#120143; Post</a>
    <a class="share-btn sms-share" href="sms:?body=${encodeURIComponent(shareText + ' ' + pageUrl)}">&#128172; Text</a>
  </div>
  <div class="section-title">Join the Leaderboard</div>
  <div class="setup-card">
    <h3>&#127942; Get on the Board</h3>
    <p>Use the UtahWindFinder Garmin app or log your session on the web to appear here.</p>
    <div class="setup-steps">
      <div class="setup-step"><div class="step-num">1</div><div class="step-text"><strong>Install the app</strong> on your Garmin watch from Connect IQ (search "UtahWindField")</div></div>
      <div class="setup-step"><div class="step-num">2</div><div class="step-text"><strong>Set your name &amp; gear</strong> in the app settings via Garmin Connect Mobile</div></div>
      <div class="setup-step"><div class="step-num">3</div><div class="step-text"><strong>Start a session</strong> and ride! Data uploads automatically when you stop</div></div>
      <div class="setup-step"><div class="step-num">4</div><div class="step-text"><strong>Add photos &amp; details</strong> on the web after your session for the full experience</div></div>
    </div>
  </div>
  <footer><a href="/">UtahWindFinder.com</a> &middot; ${esc(label)} Day &middot; ${esc(spot.name)}</footer>
</div>
<script>
function switchBoard(id){document.querySelectorAll('.lb-board').forEach(function(b){b.classList.remove('active')});document.querySelectorAll('.lb-tab').forEach(function(t){t.classList.remove('active')});document.getElementById('board-'+id).classList.add('active');var tabs=document.querySelectorAll('.lb-tab');var map={${tabMapJS}};if(map[id]!==undefined)tabs[map[id]].classList.add('active')}
function copyLink(){var u=window.location.href;if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){showCopied()})}else{var t=document.createElement('textarea');t.value=u;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showCopied()}}
function showCopied(){var e=document.getElementById('copied-msg');if(e){e.style.opacity='1';setTimeout(function(){e.style.opacity='0'},2000)}}
</script>
</body>
</html>`;
}
