/**
 * GET /session/:id
 *
 * Server-rendered session review page — activity-aware with photos,
 * fish catches, jump charts, GPS track, and edit link.
 */
import { getSupabase } from '../lib/supabase.js';

const LABELS = {
  kiting:'Kite Session',snowkiting:'Snowkite Session',windsurfing:'Windsurf Session',
  sailing:'Sail Session',boating:'Boat Session',paddling:'Paddle Session',
  paragliding:'Paragliding Flight',fishing:'Fishing Session',
};
const HAS_JUMPS = new Set(['kiting','snowkiting']);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  const { id } = req.query;
  if (!id || id.length < 10) return res.status(400).send('Invalid session ID');

  try {
    const supabase = getSupabase();

    const { data: session, error } = await supabase
      .from('kite_sessions').select('*').eq('id', id).single();
    if (error || !session) return res.status(404).send(notFoundPage(id));

    const activity = session.activity_type || 'kiting';
    const sessionLabel = LABELS[activity] || 'Session';

    const [
      { data: jumps },
      { data: photos },
      { data: catches },
      spotResult,
    ] = await Promise.all([
      HAS_JUMPS.has(activity)
        ? supabase.from('jumps').select('*').eq('session_id', id).order('jump_number', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from('session_photos').select('*').eq('session_id', id).order('created_at', { ascending: false }),
      activity === 'fishing'
        ? supabase.from('fish_catches').select('*').eq('session_id', id).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      session.spot_id
        ? supabase.from('spots').select('name, slug').eq('id', session.spot_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const spot = spotResult.data;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(renderPage(session, jumps || [], spot, activity, sessionLabel, photos || [], catches || []));
  } catch (err) {
    console.error('[session page]', err.message);
    return res.status(500).send('Server error');
  }
}

function notFoundPage(id) {
  return `<!DOCTYPE html><html><head><title>Session Not Found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#ef4444}a{color:#3b82f6}</style></head>
<body><div class="box"><h1>Session Not Found</h1><p>ID: ${esc(id)}</p>
<a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

function renderPage(s, jumps, spot, activity, sessionLabel, photos, catches) {
  const dur = fmtDuration(s.duration_s || 0);
  const spotName = spot?.name || 'Unknown Spot';
  const date = s.started_at ? new Date(s.started_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }) : '';

  const showJumps = HAS_JUMPS.has(activity);
  const isFishing = activity === 'fishing';

  const bestJump = jumps.length > 0 ? jumps.reduce((a, b) => (b.height_ft > a.height_ft ? b : a)) : null;
  const longestJump = jumps.length > 0 ? jumps.reduce((a, b) => ((b.distance_ft||0) > (a.distance_ft||0) ? b : a)) : null;
  const longestHang = jumps.length > 0 ? jumps.reduce((a, b) => ((b.hangtime_s||0) > (a.hangtime_s||0) ? b : a)) : null;
  const maxH = bestJump ? bestJump.height_ft : 1;
  const avgJump = jumps.length > 0 ? jumps.reduce((sum, j) => sum + (j.height_ft || 0), 0) / jumps.length : 0;
  const totalAirtime = jumps.reduce((sum, j) => sum + (j.hangtime_s || 0), 0);

  // Hero highlights
  let heroItems = '';
  if (showJumps && bestJump) {
    heroItems = `
      <div class="best-item"><div class="bv green">${(bestJump.height_ft||0).toFixed(1)}<small style="font-size:0.5em">ft</small></div><div class="bl">Best Jump</div></div>
      <div class="best-item"><div class="bv cyan">${(longestHang?.hangtime_s||0).toFixed(1)}<small style="font-size:0.5em">s</small></div><div class="bl">Best Hang</div></div>
      <div class="best-item"><div class="bv yellow">${longestJump?.distance_ft?longestJump.distance_ft.toFixed(0):'0'}<small style="font-size:0.5em">ft</small></div><div class="bl">Farthest</div></div>
      <div class="best-item"><div class="bv pink">${jumps.length}</div><div class="bl">Jumps</div></div>`;
  } else if (isFishing) {
    const bigC = catches.length ? Math.max(...catches.map(c=>c.weight_lbs||0)) : 0;
    heroItems = `
      <div class="best-item"><div class="bv green">${catches.length}</div><div class="bl">Fish Caught</div></div>
      <div class="best-item"><div class="bv cyan">${bigC>0?bigC.toFixed(1):'0'}<small style="font-size:0.5em">lbs</small></div><div class="bl">Biggest</div></div>
      <div class="best-item"><div class="bv yellow">${dur}</div><div class="bl">Duration</div></div>`;
  } else {
    heroItems = `
      <div class="best-item"><div class="bv green">${(s.max_speed_kts||0).toFixed(1)}<small style="font-size:0.5em">kts</small></div><div class="bl">Top Speed</div></div>
      <div class="best-item"><div class="bv cyan">${(s.distance_nm||0).toFixed(1)}<small style="font-size:0.5em">NM</small></div><div class="bl">Distance</div></div>
      <div class="best-item"><div class="bv yellow">${dur}</div><div class="bl">Duration</div></div>`;
  }

  // Jump chart cards
  const jumpCards = jumps.map((j, i) => {
    const isBest = bestJump && j.id === bestJump.id;
    const isLongest = longestJump && j.id === longestJump.id;
    const isLongestHang = longestHang && j.id === longestHang.id;
    const pct = maxH > 0 ? Math.max(8, ((j.height_ft||0) / maxH) * 100) : 8;
    const hue = Math.round(120 * (1 - Math.min((j.height_ft||0) / Math.max(maxH, 1), 1)));
    const badges = [];
    if (isBest) badges.push('<span class="jbadge gold">HIGHEST</span>');
    if (isLongest) badges.push('<span class="jbadge blue">FARTHEST</span>');
    if (isLongestHang) badges.push('<span class="jbadge cyan">LONGEST HANG</span>');
    return `<div class="jcard${isBest?' best-card':''}">
      <div class="jbar-wrap"><div class="jbar" style="height:${pct}%;background:linear-gradient(to top,hsl(${hue},90%,45%),hsl(${hue},100%,65%))"></div><div class="jbar-val">${(j.height_ft||0).toFixed(1)}</div></div>
      <div class="jmeta"><div class="jnum">#${j.jump_number||i+1}</div>
        <div class="jrow"><span class="jico">&#8597;</span>${j.distance_ft?j.distance_ft.toFixed(0)+'ft':'-'}</div>
        <div class="jrow"><span class="jico">&#9202;</span>${(j.hangtime_s||0).toFixed(1)}s</div>
        <div class="jrow"><span class="jico">&#9889;</span>${j.takeoff_speed_kts?j.takeoff_speed_kts.toFixed(0)+'kt':'-'}</div>
        ${badges.length>0?'<div class="jbadges">'+badges.join('')+'</div>':''}
      </div></div>`;
  }).join('');

  // Photo gallery
  const photoHTML = photos.length > 0 ? `
    <div class="section-title">Photos</div>
    <div class="photo-grid">${photos.map(p => `<div class="photo-card">
      <img src="${esc(p.photo_url)}" alt="${esc(p.caption||'Session photo')}" loading="lazy"/>
      ${p.caption?`<div class="photo-cap">${esc(p.caption)}</div>`:''}
    </div>`).join('')}</div>` : '';

  // Catch log
  const catchHTML = catches.length > 0 ? `
    <div class="section-title">Catch Log</div>
    <div class="catch-grid">${catches.map(c => `<div class="catch-card">
      ${c.photo_url?`<img src="${esc(c.photo_url)}" alt="Catch" loading="lazy"/>`:'<div class="catch-placeholder">&#127907;</div>'}
      <div class="catch-info">
        ${c.species?`<div class="catch-species">${esc(c.species)}</div>`:''}
        <div class="catch-stats">
          ${c.weight_lbs?`<span>${c.weight_lbs.toFixed(1)} lbs</span>`:''}
          ${c.length_in?`<span>${c.length_in.toFixed(1)} in</span>`:''}
        </div>
      </div>
    </div>`).join('')}</div>` : '';

  const hasTrack = s.track && Array.isArray(s.track) && s.track.length > 1;

  // Stats grid
  let statsHTML = `
    <div class="stat s-white"><div class="val">${dur}</div><div class="lbl">Duration</div></div>
    <div class="stat s-cyan"><div class="val">${(s.distance_nm||0).toFixed(1)}</div><div class="lbl">Nautical Mi</div></div>
    <div class="stat s-green"><div class="val">${(s.max_speed_kts||0).toFixed(1)}</div><div class="lbl">Top Speed kts</div></div>
    <div class="stat s-white"><div class="val">${(s.avg_speed_kts||0).toFixed(1)}</div><div class="lbl">Avg Speed kts</div></div>`;
  if (s.max_hr) statsHTML += `<div class="stat s-red"><div class="val">${s.max_hr}</div><div class="lbl">Max HR bpm</div></div>`;
  if (s.calories) statsHTML += `<div class="stat s-orange"><div class="val">${s.calories}</div><div class="lbl">Calories</div></div>`;
  if (showJumps) {
    statsHTML += `<div class="stat s-green"><div class="val">${avgJump.toFixed(1)}</div><div class="lbl">Avg Jump ft</div></div>`;
    statsHTML += `<div class="stat s-cyan"><div class="val">${totalAirtime.toFixed(1)}</div><div class="lbl">Total Airtime s</div></div>`;
  }
  if (s.ride_count) statsHTML += `<div class="stat s-cyan"><div class="val">${s.ride_count}</div><div class="lbl">Rides</div></div>`;
  if (s.foil_ride_count) statsHTML += `<div class="stat s-yellow"><div class="val">${s.foil_ride_count}</div><div class="lbl">Foil Rides</div></div>`;

  // Day leaderboard link
  let dayLink = '';
  if (spot?.name) {
    const slug = spot.slug || (spot.name || '').toLowerCase().replace(/\s+/g, '-');
    const d = s.started_at ? new Date(s.started_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    dayLink = `<div style="text-align:center;padding:1.5rem 0 0">
      <a href="/day/${slug}/${d}?activity=${activity}" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.7rem 1.5rem;
        border-radius:12px;background:linear-gradient(135deg,#854d0e,#eab308);color:#000;font-weight:800;
        font-size:0.8rem;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;
        transition:transform 0.15s" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
        &#127942; View Day Leaderboard
      </a>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(sessionLabel)} | ${esc(spotName)} | UtahWindFinder</title>
  <meta property="og:title" content="${esc(sessionLabel)} at ${esc(spotName)}">
  <meta property="og:description" content="${dur} | ${(s.distance_nm||0).toFixed(1)} NM | ${(s.max_speed_kts||0).toFixed(1)} kts">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#050510;color:#e5e5e5;line-height:1.5;overflow-x:hidden}
    .hero{position:relative;text-align:center;padding:2.5rem 1rem 2rem;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#0c4a6e 100%);border-bottom:2px solid rgba(56,189,248,0.3);overflow:hidden}
    .hero::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 70%,rgba(34,197,94,0.08) 0%,transparent 50%),radial-gradient(circle at 70% 30%,rgba(56,189,248,0.08) 0%,transparent 50%);animation:drift 20s ease-in-out infinite alternate}
    @keyframes drift{0%{transform:translate(0,0)}100%{transform:translate(-5%,3%)}}
    .hero *{position:relative}
    .hero-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.2em;color:#38bdf8;font-weight:600}
    .hero h1{font-size:2rem;font-weight:900;background:linear-gradient(90deg,#22c55e,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0.3rem 0}
    .hero .spot{font-size:1.1rem;color:#cbd5e1;font-weight:600}.hero .date{font-size:0.8rem;color:#64748b;margin-top:0.3rem}
    .best-hero{display:flex;justify-content:center;gap:1.5rem;margin-top:1.5rem;flex-wrap:wrap}
    .best-item{text-align:center;min-width:80px}.best-item .bv{font-size:2.2rem;font-weight:900;line-height:1}.best-item .bl{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.1em;margin-top:0.2rem;opacity:0.6}
    .bv.green{color:#22c55e}.bv.yellow{color:#eab308}.bv.cyan{color:#06b6d4}.bv.pink{color:#ec4899}
    .wrap{max-width:700px;margin:0 auto;padding:0 1rem 2rem}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0.6rem;padding:1.5rem 0}
    .stat{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:0.8rem 0.5rem;text-align:center;transition:transform 0.2s}
    .stat:hover{transform:translateY(-2px)}.stat .val{font-size:1.6rem;font-weight:800}.stat .lbl{font-size:0.6rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:0.15rem}
    .stat.s-green .val{color:#22c55e}.stat.s-cyan .val{color:#06b6d4}.stat.s-red .val{color:#ef4444}.stat.s-yellow .val{color:#eab308}.stat.s-pink .val{color:#ec4899}.stat.s-white .val{color:#f1f5f9}.stat.s-orange .val{color:#f97316}
    .section-title{font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;padding:1.5rem 0 0.8rem;color:#94a3b8;display:flex;align-items:center;gap:0.5rem}
    .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(148,163,184,0.3),transparent)}
    .jump-chart{display:flex;align-items:flex-end;gap:4px;padding:0.5rem 0 1rem;overflow-x:auto;-webkit-overflow-scrolling:touch;min-height:200px}
    .jcard{flex:0 0 auto;width:72px;display:flex;flex-direction:column;align-items:center;background:linear-gradient(180deg,rgba(17,24,39,0.8),rgba(15,23,42,0.9));border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:0.4rem;transition:transform 0.15s,border-color 0.15s}
    .jcard:hover{transform:scale(1.05);border-color:rgba(56,189,248,0.3)}.jcard.best-card{border:2px solid #eab308;box-shadow:0 0 20px rgba(234,179,8,0.15)}
    .jbar-wrap{width:100%;height:120px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
    .jbar{width:28px;border-radius:6px 6px 2px 2px;min-height:8px;transition:height 0.5s ease-out}.jbar-val{font-size:0.75rem;font-weight:800;color:#fff;margin-top:0.2rem}
    .jmeta{text-align:center;width:100%;margin-top:0.3rem}.jnum{font-size:0.65rem;color:#64748b;font-weight:700}.jrow{font-size:0.6rem;color:#94a3b8;white-space:nowrap}.jico{margin-right:2px;opacity:0.5}
    .jbadges{margin-top:0.25rem}.jbadge{display:inline-block;font-size:0.5rem;font-weight:800;padding:1px 4px;border-radius:3px;text-transform:uppercase;letter-spacing:0.05em;margin:1px}
    .jbadge.gold{background:#eab308;color:#000}.jbadge.blue{background:#3b82f6;color:#fff}.jbadge.cyan{background:#06b6d4;color:#000}
    .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.6rem}
    .photo-card{border-radius:12px;overflow:hidden;background:#111827;border:1px solid rgba(255,255,255,0.05)}.photo-card img{width:100%;height:140px;object-fit:cover;display:block}.photo-cap{font-size:0.65rem;color:#94a3b8;padding:0.4rem 0.6rem}
    .catch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.6rem}
    .catch-card{border-radius:12px;overflow:hidden;background:#111827;border:1px solid rgba(34,197,94,0.15)}.catch-card img{width:100%;height:120px;object-fit:cover;display:block}
    .catch-placeholder{height:60px;display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:0.2}
    .catch-info{padding:0.4rem 0.6rem}.catch-species{font-size:0.65rem;color:#22c55e;font-weight:600}.catch-stats{font-size:0.6rem;color:#94a3b8;display:flex;gap:0.5rem;margin-top:0.15rem}
    .edit-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.6rem 1.2rem;border-radius:10px;background:linear-gradient(135deg,#334155,#475569);color:#fff;font-size:0.75rem;font-weight:700;text-decoration:none;transition:transform 0.15s;border:none;cursor:pointer}
    .edit-btn:hover{transform:scale(1.03);filter:brightness(1.15)}
    .track-wrap{position:relative;border-radius:16px;overflow:hidden;background:linear-gradient(145deg,#0c1222,#111827);border:1px solid rgba(255,255,255,0.06)}
    canvas{width:100%;height:320px;display:block}
    .track-legend{display:flex;justify-content:center;gap:1rem;padding:0.5rem;font-size:0.65rem;color:#64748b}.track-legend span{display:flex;align-items:center;gap:4px}.dot{width:8px;height:8px;border-radius:50%;display:inline-block}.dot.green{background:#22c55e}.dot.red{background:#ef4444}
    .empty-jumps{text-align:center;padding:2rem;color:#475569;font-size:0.9rem;background:linear-gradient(145deg,#111827,#0f172a);border-radius:16px;border:1px solid rgba(255,255,255,0.04)}
    footer{text-align:center;padding:2.5rem 0 1.5rem;font-size:0.7rem;color:#1e293b}footer a{color:#38bdf8;text-decoration:none;font-weight:600}footer a:hover{text-decoration:underline}
    @media(max-width:420px){.stats{grid-template-columns:repeat(2,1fr)}.jcard{width:62px}.jbar-wrap{height:90px}.hero h1{font-size:1.5rem}.best-item .bv{font-size:1.6rem}}
  </style>
</head>
<body>
<div class="hero">
  <div class="hero-label">${esc(sessionLabel)}</div>
  <h1>${esc(spotName)}</h1>
  <div class="date">${esc(date)}</div>
  ${s.rider_name ? `<div class="spot" style="margin-top:0.5rem">${esc(s.rider_name)}${s.gear_setup ? ' &middot; ' + esc(s.gear_setup) : ''}</div>` : ''}
  ${heroItems ? `<div class="best-hero">${heroItems}</div>` : ''}
</div>
<div class="wrap">
  <div class="stats">${statsHTML}</div>

  <div style="text-align:center;padding:0 0 1rem">
    <a class="edit-btn" href="/session/${s.id}/edit">&#9998; Add Photos &amp; Details</a>
  </div>

  ${showJumps ? `<div class="section-title">Jump History</div>
  ${jumps.length > 0 ? `<div class="jump-chart">${jumpCards}</div>` : '<div class="empty-jumps">No individual jump data recorded</div>'}` : ''}

  ${catchHTML}
  ${photoHTML}

  ${hasTrack ? `<div class="section-title">GPS Track</div>
  <div class="track-wrap">
    <canvas id="map"></canvas>
    <div class="track-legend"><span><span class="dot green"></span> Start</span><span><span class="dot red"></span> End</span></div>
  </div>
  <script>
    (function(){
      var track=${JSON.stringify(s.track)};var c=document.getElementById('map');var ctx=c.getContext('2d');var dpr=window.devicePixelRatio||1;c.width=c.offsetWidth*dpr;c.height=c.offsetHeight*dpr;ctx.scale(dpr,dpr);var W=c.offsetWidth,H=c.offsetHeight;
      var lats=track.map(function(p){return p[0]});var lons=track.map(function(p){return p[1]});
      var minLat=Math.min.apply(null,lats),maxLat=Math.max.apply(null,lats);var minLon=Math.min.apply(null,lons),maxLon=Math.max.apply(null,lons);
      var latR=(maxLat-minLat)*1.2||0.001;var lonR=(maxLon-minLon)*1.2||0.001;var cLat=(minLat+maxLat)/2,cLon=(minLon+maxLon)/2;
      minLat=cLat-latR/2;maxLat=cLat+latR/2;minLon=cLon-lonR/2;maxLon=cLon+lonR/2;var m=30;
      for(var i=1;i<track.length;i++){var x0=m+((track[i-1][1]-minLon)/lonR)*(W-2*m);var y0=m+((maxLat-track[i-1][0])/latR)*(H-2*m);var x1=m+((track[i][1]-minLon)/lonR)*(W-2*m);var y1=m+((maxLat-track[i][0])/latR)*(H-2*m);var pct=i/track.length;var r=Math.round(30+pct*26);var g=Math.round(70+pct*119);var b=Math.round(180+pct*68);ctx.strokeStyle='rgb('+r+','+g+','+b+')';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke()}
      ctx.shadowColor='#38bdf8';ctx.shadowBlur=8;var last=Math.max(0,track.length-Math.floor(track.length*0.15));ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;ctx.beginPath();for(var i=last;i<track.length;i++){var x=m+((track[i][1]-minLon)/lonR)*(W-2*m);var y=m+((maxLat-track[i][0])/latR)*(H-2*m);if(i===last)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.shadowBlur=0;
      var sx=m+((lons[0]-minLon)/lonR)*(W-2*m);var sy=m+((maxLat-lats[0])/latR)*(H-2*m);ctx.fillStyle='#22c55e';ctx.shadowColor='#22c55e';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(sx,sy,6,0,Math.PI*2);ctx.fill();
      var ex=m+((lons[lons.length-1]-minLon)/lonR)*(W-2*m);var ey=m+((maxLat-lats[lats.length-1])/latR)*(H-2*m);ctx.fillStyle='#ef4444';ctx.shadowColor='#ef4444';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(ex,ey,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    })();
  </script>` : ''}

  ${dayLink}

  <footer><a href="/">UtahWindFinder.com</a> &middot; ${esc(sessionLabel)}</footer>
</div>
</body></html>`;
}

function fmtDuration(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
