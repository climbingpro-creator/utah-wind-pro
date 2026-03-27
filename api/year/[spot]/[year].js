/**
 * GET /year/:spot/:year?activity=kiting
 *
 * Yearly cumulative leaderboard — aggregates all sessions at a spot
 * for the given year per rider, ranked by total time, sessions, distance, etc.
 */
import { getSupabase } from '../../lib/supabase.js';

const VALID = new Set([
  'kiting','snowkiting','windsurfing','sailing',
  'boating','paddling','paragliding','fishing',
]);
const LABELS = {
  kiting:'Kiting',snowkiting:'Snowkiting',windsurfing:'Windsurfing',sailing:'Sailing',
  boating:'Boating',paddling:'Paddling',paragliding:'Paragliding',fishing:'Fishing',
};
const THEMES = {
  kiting:{accent:'#eab308',grad:'linear-gradient(135deg,#1a1500 0%,#422006 50%,#854d0e 100%)',border:'rgba(234,179,8,0.25)'},
  snowkiting:{accent:'#38bdf8',grad:'linear-gradient(135deg,#0c1222 0%,#0c4a6e 50%,#38bdf8 100%)',border:'rgba(56,189,248,0.25)'},
  windsurfing:{accent:'#06b6d4',grad:'linear-gradient(135deg,#042f2e 0%,#155e75 50%,#06b6d4 100%)',border:'rgba(6,182,212,0.25)'},
  sailing:{accent:'#3b82f6',grad:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#3b82f6 100%)',border:'rgba(59,130,246,0.25)'},
  boating:{accent:'#6366f1',grad:'linear-gradient(135deg,#0f0f23 0%,#312e81 50%,#6366f1 100%)',border:'rgba(99,102,241,0.25)'},
  paddling:{accent:'#10b981',grad:'linear-gradient(135deg,#022c22 0%,#064e3b 50%,#10b981 100%)',border:'rgba(16,185,129,0.25)'},
  paragliding:{accent:'#a855f7',grad:'linear-gradient(135deg,#1a0533 0%,#581c87 50%,#a855f7 100%)',border:'rgba(168,85,247,0.25)'},
  fishing:{accent:'#22c55e',grad:'linear-gradient(135deg,#052e16 0%,#14532d 50%,#22c55e 100%)',border:'rgba(34,197,94,0.25)'},
};
const ICONS = {
  kiting:'&#127938;',snowkiting:'&#10052;',windsurfing:'&#127940;',sailing:'&#9973;',
  boating:'&#128674;',paddling:'&#128692;',paragliding:'&#129666;',fishing:'&#127907;',
};
const HAS_JUMPS = new Set(['kiting','snowkiting']);
const HAS_CATCHES = new Set(['fishing']);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  const { spot: spotSlug, year: yearStr, activity: actParam } = req.query;
  if (!spotSlug || !yearStr || !/^\d{4}$/.test(yearStr))
    return res.status(400).send('Usage: /year/:spot-slug/:YYYY?activity=...');

  const activity = VALID.has(actParam) ? actParam : 'kiting';
  const year = parseInt(yearStr, 10);

  try {
    const supabase = getSupabase();

    const { data: spot } = await supabase
      .from('spots').select('id, name, slug').eq('slug', spotSlug).single();
    if (!spot) return res.status(404).send(errorPage('Spot Not Found', `${esc(spotSlug)}`));

    const { data: sessions } = await supabase
      .from('kite_sessions').select('*')
      .eq('spot_id', spot.id)
      .eq('activity_type', activity)
      .gte('started_at', `${year}-01-01T00:00:00Z`)
      .lte('started_at', `${year}-12-31T23:59:59Z`)
      .order('started_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return res.status(404).send(errorPage(`No ${LABELS[activity]} Sessions in ${year}`, `${esc(spot.name)}`));
    }

    const sessionIds = sessions.map(s => s.id);

    let allCatches = [];
    if (HAS_CATCHES.has(activity)) {
      const { data } = await supabase.from('fish_catches').select('*').in('session_id', sessionIds);
      allCatches = data || [];
    }

    const catchesBySession = {};
    allCatches.forEach(c => {
      if (!catchesBySession[c.session_id]) catchesBySession[c.session_id] = [];
      catchesBySession[c.session_id].push(c);
    });

    // Aggregate per rider
    const riderMap = {};
    sessions.forEach(s => {
      const name = s.rider_name || 'Unknown';
      if (!riderMap[name]) {
        riderMap[name] = {
          name, sessions:0, total_time:0, total_distance:0,
          best_speed:0, total_jumps:0, best_jump:0, best_hang:0,
          total_rides:0, total_foil:0, total_catches:0, biggest_catch:0, longest_catch:0,
          best_single_session_duration:0, total_calories:0,
        };
      }
      const r = riderMap[name];
      r.sessions += 1;
      r.total_time += s.duration_s || 0;
      r.total_distance += s.distance_nm || 0;
      r.best_speed = Math.max(r.best_speed, s.max_speed_kts || 0);
      r.total_jumps += s.total_jumps || 0;
      r.best_jump = Math.max(r.best_jump, s.max_jump_ft || 0);
      r.best_hang = Math.max(r.best_hang, s.max_hangtime_s || 0);
      r.total_rides += s.ride_count || 0;
      r.total_foil += s.foil_ride_count || 0;
      r.total_calories += s.calories || 0;
      r.best_single_session_duration = Math.max(r.best_single_session_duration, s.duration_s || 0);

      const catches = catchesBySession[s.id] || [];
      r.total_catches += catches.length;
      catches.forEach(c => {
        r.biggest_catch = Math.max(r.biggest_catch, c.weight_lbs || 0);
        r.longest_catch = Math.max(r.longest_catch, c.length_in || 0);
      });
    });

    const riders = Object.values(riderMap).map((r, i) => ({
      ...r, idx: i,
      initials: r.name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2),
    }));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).send(renderYearPage(spot, year, riders, activity, sessions.length));
  } catch (err) {
    console.error('[year page]', err.message);
    return res.status(500).send('Server error');
  }
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function _fmtDur(s) { if (!s) return '0:00'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}:${String(m).padStart(2,'0')}`:`${m}m`; }
function fmtHours(s) { return (s/3600).toFixed(1); }

function errorPage(title, sub) {
  return `<!DOCTYPE html><html><head><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#eab308}a{color:#3b82f6}p{color:#94a3b8}</style></head>
<body><div class="box"><h1>${title}</h1><p>${sub}</p><a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

const COLORS = [
  {bg:'linear-gradient(135deg,#854d0e,#eab308)',accent:'#eab308'},
  {bg:'linear-gradient(135deg,#334155,#64748b)',accent:'#64748b'},
  {bg:'linear-gradient(135deg,#78350f,#b45309)',accent:'#cd7f32'},
  {bg:'linear-gradient(135deg,#1e3a5f,#2563eb)',accent:'#3b82f6'},
  {bg:'linear-gradient(135deg,#4c1d95,#7c3aed)',accent:'#7c3aed'},
  {bg:'linear-gradient(135deg,#064e3b,#059669)',accent:'#10b981'},
  {bg:'linear-gradient(135deg,#7f1d1d,#dc2626)',accent:'#ef4444'},
  {bg:'linear-gradient(135deg,#701a75,#d946ef)',accent:'#d946ef'},
];
const RANK_COLORS = ['#eab308','#94a3b8','#cd7f32'];

function renderYearPage(spot, year, riders, activity, totalSessions) {
  const theme = THEMES[activity] || THEMES.kiting;
  const label = LABELS[activity] || 'Session';
  const icon  = ICONS[activity]  || '';
  const isFishing = activity === 'fishing';

  const totalTime = riders.reduce((s,r)=>s+r.total_time,0);
  const totalDist = riders.reduce((s,r)=>s+r.total_distance,0);

  // Board definitions
  const boards = [
    { key:'time',     label:'Total Time on Water', fn:r=>`${fmtHours(r.total_time)} hrs`, raw:r=>r.total_time, unit:'', bar:'linear-gradient(90deg,#eab308,#f59e0b)' },
    { key:'sessions', label:'Most Sessions',        fn:r=>r.sessions,                      raw:r=>r.sessions,   unit:'', bar:'linear-gradient(90deg,#ec4899,#f472b6)' },
    { key:'dist',     label:'Total Distance',       fn:r=>r.total_distance.toFixed(1),     raw:r=>r.total_distance, unit:'NM', bar:'linear-gradient(90deg,#06b6d4,#22d3ee)' },
    { key:'speed',    label:'Season Top Speed',     fn:r=>r.best_speed.toFixed(1),         raw:r=>r.best_speed, unit:'kts', bar:'linear-gradient(90deg,#16a34a,#22c55e)' },
  ];

  if (HAS_JUMPS.has(activity)) {
    boards.push({ key:'jumps', label:'Total Jumps', fn:r=>r.total_jumps, raw:r=>r.total_jumps, unit:'', bar:'linear-gradient(90deg,#be185d,#ec4899)' });
    boards.push({ key:'best',  label:'Season Best Jump', fn:r=>r.best_jump.toFixed(1), raw:r=>r.best_jump, unit:'ft', bar:'linear-gradient(90deg,#7c3aed,#a78bfa)' });
  }
  if (isFishing) {
    boards.push({ key:'catches', label:'Total Catches', fn:r=>r.total_catches, raw:r=>r.total_catches, unit:'', bar:'linear-gradient(90deg,#22c55e,#4ade80)' });
    boards.push({ key:'trophy',  label:'Biggest Catch', fn:r=>r.biggest_catch>0?r.biggest_catch.toFixed(1):'0', raw:r=>r.biggest_catch, unit:'lbs', bar:'linear-gradient(90deg,#eab308,#f59e0b)' });
  }
  if (activity === 'windsurfing') {
    boards.push({ key:'rides', label:'Total Rides', fn:r=>r.total_rides, raw:r=>r.total_rides, unit:'', bar:'linear-gradient(90deg,#0891b2,#06b6d4)' });
  }

  const sortedBoards = boards.map(b => ({
    ...b, sorted: [...riders].sort((a,c) => (b.raw(c)||0) - (b.raw(a)||0))
  }));

  function lbRows(sorted, valFn, unit, barColor) {
    const maxV = sorted.length>0 ? (parseFloat(valFn(sorted[0]))||0) : 1;
    return sorted.map((r,i) => {
      const v = valFn(r);
      const n = parseFloat(v)||0;
      const pct = maxV>0 ? Math.max(5,(n/maxV)*100) : 5;
      const c = COLORS[r.idx%COLORS.length];
      const rc = i<3 ? RANK_COLORS[i] : '#475569';
      return `<div class="rider-row${i<3?' '+['gold','silver','bronze'][i]:''}">
        <div class="rr-rank" style="color:${rc}">${i+1}</div>
        <div class="rr-avatar" style="background:${c.bg}">${esc(r.initials)}</div>
        <div class="rr-info"><div class="rr-name">${esc(r.name)}</div><div class="rr-gear">${r.sessions} sessions</div></div>
        <div class="rr-bar-wrap"><div class="rr-bar" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="rr-val"><span class="big" style="color:${i<3?RANK_COLORS[i]:c.accent}">${v}</span><span class="unit">${unit}</span></div>
      </div>`;
    }).join('');
  }

  const boardsHTML = sortedBoards.map(b => lbRows(b.sorted, b.fn, b.unit, b.bar));
  const tabsHTML = boards.map((b,i) => `<div class="lb-tab${i===0?' active':''}" onclick="switchBoard('${b.key}')">${b.label}</div>`).join('');
  const panelsHTML = boards.map((b,i) => `<div class="lb-board${i===0?' active':''}" id="board-${b.key}">${boardsHTML[i]}</div>`).join('');
  const tabMapJS = boards.map((b,i) => `'${b.key}':${i}`).join(',');

  // Podium by total time
  const byTime = [...riders].sort((a,c)=>c.total_time-a.total_time);
  const top3 = byTime.slice(0,3);
  function podCard(r,rank) {
    if (!r) return '';
    const c = COLORS[r.idx%COLORS.length];
    const sz = rank===0?{a:64,b:110,f:'1.6rem'}:rank===1?{a:56,b:80,f:'1.4rem'}:{a:56,b:60,f:'1.4rem'};
    const bg = rank===0?'linear-gradient(to top,#854d0e,#eab308)':rank===1?'linear-gradient(to top,#475569,#94a3b8)':'linear-gradient(to top,#78350f,#cd7f32)';
    const crown = rank===0?'<span class="crown">&#128081;</span>':'';
    return `<div class="pod"><div class="pod-avatar" style="width:${sz.a}px;height:${sz.a}px;font-size:${sz.f};background:${c.bg};border-color:${RANK_COLORS[rank]}">${crown}${esc(r.initials)}</div>
      <div class="pod-name">${esc(r.name)}</div><div class="pod-val" style="color:${RANK_COLORS[rank]}">${fmtHours(r.total_time)}<small style="font-size:0.5em">hrs</small></div>
      <div class="pod-label">Time on Water</div><div class="pod-bar" style="height:${sz.b}px;background:${bg}"></div>
      <div class="rank">${['1st','2nd','3rd'][rank]}</div></div>`;
  }
  const podHTML = riders.length >= 2 ? [podCard(top3[1],1),podCard(top3[0],0),podCard(top3[2],2)].join('') : '';

  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(label)} ${year} | ${esc(spot.name)} | UtahWindFinder</title>
  <meta property="og:title" content="${esc(label)} Season ${year} at ${esc(spot.name)}">
  <meta property="og:description" content="${riders.length} riders | ${totalSessions} sessions | ${fmtHours(totalTime)} total hours">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#050510;color:#e5e5e5;line-height:1.5;overflow-x:hidden}
    .hero{text-align:center;padding:2.5rem 1rem 2rem;background:${theme.grad};border-bottom:2px solid ${theme.border};position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 25% 80%,${theme.accent}11 0%,transparent 50%),radial-gradient(circle at 75% 20%,${theme.accent}11 0%,transparent 50%);animation:d 18s ease-in-out infinite alternate}
    @keyframes d{0%{transform:translate(0,0)}100%{transform:translate(-3%,2%)}}
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
    .rider-row{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 0.8rem;background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.04);border-radius:14px;margin-bottom:0.5rem;transition:transform 0.15s}
    .rider-row:hover{transform:translateX(4px);border-color:${theme.accent}33}
    .rider-row.gold{border:1px solid rgba(234,179,8,0.3);background:linear-gradient(145deg,#1c1a0f,#151310)}
    .rider-row.silver{border:1px solid rgba(148,163,184,0.2)}.rider-row.bronze{border:1px solid rgba(205,127,50,0.15)}
    .rr-rank{font-size:1.1rem;font-weight:900;width:28px;text-align:center;flex-shrink:0}
    .rr-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:800;color:#fff;flex-shrink:0}
    .rr-info{flex:1;min-width:0}.rr-name{font-size:0.8rem;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rr-gear{font-size:0.6rem;color:#475569}
    .rr-val{text-align:right;flex-shrink:0}.rr-val .big{font-size:1.2rem;font-weight:900}.rr-val .unit{font-size:0.6rem;color:#64748b;margin-left:2px}
    .rr-bar-wrap{width:100px;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;flex-shrink:0}
    .rr-bar{height:100%;border-radius:4px;transition:width 0.5s ease-out}
    .share-bar{display:flex;gap:0.5rem;flex-wrap:wrap;padding:0.5rem 0}
    .share-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:10px;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;text-decoration:none;color:#fff}
    .share-btn:hover{transform:scale(1.03);filter:brightness(1.15)}
    .share-btn.copy{background:linear-gradient(135deg,#334155,#475569)}
    .share-btn.twitter{background:linear-gradient(135deg,#0c4a6e,#0ea5e9)}
    .share-copied{font-size:0.65rem;color:#22c55e;font-weight:600;margin-left:0.5rem;opacity:0;transition:opacity 0.3s}
    footer{text-align:center;padding:2.5rem 0 1.5rem;font-size:0.7rem;color:#1e293b}
    footer a{color:${theme.accent};text-decoration:none;font-weight:600}
    @media(max-width:500px){.hero h1{font-size:1.6rem}.pod{width:95px}.rr-bar-wrap{width:60px}.day-stats{gap:1rem}.day-stat .dv{font-size:1.5rem}}
  </style></head><body>
<div class="hero">
  <div class="hero-label">${icon} ${esc(label)} Season ${year}</div>
  <h1>${esc(spot.name)}</h1>
  <div class="date">${year} Yearly Leaderboard</div>
  <div class="day-stats">
    <div class="day-stat"><div class="dv">${riders.length}</div><div class="dl">Riders</div></div>
    <div class="day-stat"><div class="dv">${totalSessions}</div><div class="dl">Total Sessions</div></div>
    <div class="day-stat"><div class="dv">${fmtHours(totalTime)}<small style="font-size:0.5em">hrs</small></div><div class="dl">Total Time</div></div>
    <div class="day-stat"><div class="dv">${totalDist.toFixed(0)}<small style="font-size:0.5em">NM</small></div><div class="dl">Total Distance</div></div>
  </div>
</div>
<div class="wrap">
  ${riders.length>=2?`<div class="section-title">Season Champion</div><div class="section-sub">Most total time on the water wins</div><div class="podium">${podHTML}</div>`:''}
  <div class="section-title">Season Leaderboards</div>
  <div class="lb-tabs">${tabsHTML}</div>
  <div class="lb-boards">${panelsHTML}</div>
  <div class="section-title">Share</div>
  <div class="share-bar">
    <button class="share-btn copy" onclick="copyLink()">&#128203; Copy Link <span id="copied-msg" class="share-copied">Copied!</span></button>
    <a class="share-btn twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`${label} Season ${year} at ${spot.name}! ${riders.length} riders, ${totalSessions} sessions, ${fmtHours(totalTime)} hours total.`)}&url=${encodeURIComponent(`https://utahwindfinder.com/year/${spot.slug}/${year}?activity=${activity}`)}" target="_blank" rel="noopener">&#120143; Post</a>
  </div>
  <footer><a href="/">UtahWindFinder.com</a> &middot; ${esc(label)} ${year} &middot; ${esc(spot.name)}</footer>
</div>
<script>
function switchBoard(id){document.querySelectorAll('.lb-board').forEach(function(b){b.classList.remove('active')});document.querySelectorAll('.lb-tab').forEach(function(t){t.classList.remove('active')});document.getElementById('board-'+id).classList.add('active');var tabs=document.querySelectorAll('.lb-tab');var map={${tabMapJS}};if(map[id]!==undefined)tabs[map[id]].classList.add('active')}
function copyLink(){var u=window.location.href;if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){showCopied()})}else{var t=document.createElement('textarea');t.value=u;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showCopied()}}
function showCopied(){var e=document.getElementById('copied-msg');if(e){e.style.opacity='1';setTimeout(function(){e.style.opacity='0'},2000)}}
</script></body></html>`;
}
