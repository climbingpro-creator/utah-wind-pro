/**
 * GET /day/:spot/:date
 *
 * Server-rendered "Session Day" page — multi-rider leaderboard and
 * gamification view. Groups all sessions at a spot on a given date
 * and renders podium, leaderboards, head-to-head, badges, and a feed.
 *
 * URL example: /day/lincoln-beach/2026-03-24
 */
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');

  const { spot: spotSlug, date: dateStr } = req.query;
  if (!spotSlug || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).send('Usage: /day/:spot-slug/:YYYY-MM-DD');
  }

  try {
    const supabase = getSupabase();

    const { data: spot } = await supabase
      .from('spots')
      .select('id, name, slug')
      .eq('slug', spotSlug)
      .single();

    if (!spot) {
      return res.status(404).send(notFoundPage(spotSlug, dateStr));
    }

    const dayStart = `${dateStr}T00:00:00Z`;
    const dayEnd = `${dateStr}T23:59:59Z`;

    const { data: sessions } = await supabase
      .from('kite_sessions')
      .select('*')
      .eq('spot_id', spot.id)
      .gte('started_at', dayStart)
      .lte('started_at', dayEnd)
      .order('started_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return res.status(404).send(emptyDayPage(spot.name, dateStr));
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: allJumps } = await supabase
      .from('jumps')
      .select('*')
      .in('session_id', sessionIds)
      .order('jump_number', { ascending: true });

    const jumpsBySession = {};
    (allJumps || []).forEach(j => {
      if (!jumpsBySession[j.session_id]) jumpsBySession[j.session_id] = [];
      jumpsBySession[j.session_id].push(j);
    });

    const riders = sessions.map((s, i) => {
      const jumps = jumpsBySession[s.id] || [];
      const bestJump = jumps.length > 0
        ? jumps.reduce((a, b) => ((b.height_ft || 0) > (a.height_ft || 0) ? b : a))
        : null;
      const bestHang = jumps.length > 0
        ? jumps.reduce((a, b) => ((b.hangtime_s || 0) > (a.hangtime_s || 0) ? b : a))
        : null;
      const farthest = jumps.length > 0
        ? jumps.reduce((a, b) => ((b.distance_ft || 0) > (a.distance_ft || 0) ? b : a))
        : null;

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
    return res.status(200).send(renderDayPage(spot, dateStr, riders));
  } catch (err) {
    console.error('[day page]', err.message);
    return res.status(500).send('Server error');
  }
}

function getInitials(name) {
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2);
}

function notFoundPage(slug, date) {
  return `<!DOCTYPE html><html><head><title>Spot Not Found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#ef4444}a{color:#3b82f6}</style></head>
<body><div class="box"><h1>Spot Not Found</h1><p>${esc(slug)} on ${esc(date)}</p>
<a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

function emptyDayPage(spotName, date) {
  return `<!DOCTYPE html><html><head><title>No Sessions | ${esc(spotName)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{text-align:center;padding:2rem}h1{color:#eab308}a{color:#3b82f6}p{color:#94a3b8}</style></head>
<body><div class="box"><h1>No Sessions Yet</h1><p>${esc(spotName)} &mdash; ${esc(date)}</p>
<p>No riders have uploaded sessions for this day.</p>
<a href="/">Back to UtahWindFinder</a></div></body></html>`;
}

function fmtDuration(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m}m`;
}

function fmtDurationLong(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const COLORS = [
  { bg: 'linear-gradient(135deg,#854d0e,#eab308)', accent: '#eab308' },
  { bg: 'linear-gradient(135deg,#334155,#64748b)', accent: '#64748b' },
  { bg: 'linear-gradient(135deg,#78350f,#b45309)', accent: '#cd7f32' },
  { bg: 'linear-gradient(135deg,#1e3a5f,#2563eb)', accent: '#3b82f6' },
  { bg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', accent: '#7c3aed' },
  { bg: 'linear-gradient(135deg,#064e3b,#059669)', accent: '#10b981' },
  { bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', accent: '#ef4444' },
  { bg: 'linear-gradient(135deg,#701a75,#d946ef)', accent: '#d946ef' },
];

const RANK_COLORS = ['#eab308', '#94a3b8', '#cd7f32'];
const RANK_CLASSES = ['gold', 'silver', 'bronze'];

function renderDayPage(spot, dateStr, riders) {
  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const totalJumps = riders.reduce((s, r) => s + r.total_jumps, 0);
  const dayRecord = Math.max(...riders.map(r => r.max_jump_ft));
  const totalTime = riders.reduce((s, r) => s + r.duration_s, 0);

  // Sorted arrays for each leaderboard
  const byHeight = [...riders].sort((a, b) => b.max_jump_ft - a.max_jump_ft);
  const byHang = [...riders].sort((a, b) => b.best_hang_s - a.best_hang_s);
  const byDist = [...riders].sort((a, b) => b.farthest_ft - a.farthest_ft);
  const bySpeed = [...riders].sort((a, b) => b.max_speed_kts - a.max_speed_kts);
  const byJumps = [...riders].sort((a, b) => b.total_jumps - a.total_jumps);
  const byDuration = [...riders].sort((a, b) => b.duration_s - a.duration_s);

  const king = byHeight[0];

  // Build leaderboard rows for each category
  function lbRows(sorted, valFn, unitStr, barColor) {
    const maxVal = sorted.length > 0 ? valFn(sorted[0]) : 1;
    return sorted.map((r, i) => {
      const v = valFn(r);
      const pct = maxVal > 0 ? Math.max(5, (v / maxVal) * 100) : 5;
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

  const heightRows = lbRows(byHeight, r => r.max_jump_ft.toFixed(1), 'ft',
    'linear-gradient(90deg,#eab308,#f59e0b)');
  const hangRows = lbRows(byHang, r => r.best_hang_s.toFixed(1), 's',
    'linear-gradient(90deg,#0891b2,#06b6d4)');
  const distRows = lbRows(byDist, r => Math.round(r.farthest_ft), 'ft',
    'linear-gradient(90deg,#7c3aed,#a78bfa)');
  const speedRows = lbRows(bySpeed, r => r.max_speed_kts.toFixed(1), 'kts',
    'linear-gradient(90deg,#16a34a,#22c55e)');
  const jumpRows = lbRows(byJumps, r => r.total_jumps, '',
    'linear-gradient(90deg,#be185d,#ec4899)');
  const durRows = lbRows(byDuration, r => fmtDurationLong(r.duration_s), '',
    'linear-gradient(90deg,#7c2d12,#f97316)');

  // Podium (top 3 by height)
  const podiumRiders = byHeight.slice(0, 3);

  function podiumCard(r, rank) {
    if (!r) return '';
    const c = COLORS[r.idx % COLORS.length];
    const sizes = rank === 0
      ? { avi: 64, bar: 110, fs: '1.6rem' }
      : rank === 1
        ? { avi: 56, bar: 80, fs: '1.4rem' }
        : { avi: 56, bar: 60, fs: '1.4rem' };
    const barBg = rank === 0
      ? 'linear-gradient(to top,#854d0e,#eab308)'
      : rank === 1
        ? 'linear-gradient(to top,#475569,#94a3b8)'
        : 'linear-gradient(to top,#78350f,#cd7f32)';
    const crown = rank === 0 ? '<span class="crown">&#128081;</span>' : '';
    const labels = ['1st', '2nd', '3rd'];
    return `<div class="pod">
      <div class="pod-avatar" style="width:${sizes.avi}px;height:${sizes.avi}px;font-size:${sizes.fs};background:${c.bg};border-color:${RANK_COLORS[rank]}">
        ${crown}${esc(r.initials)}
      </div>
      <div class="pod-name">${esc(r.name)}</div>
      <div class="pod-val" style="color:${RANK_COLORS[rank]}">${r.max_jump_ft.toFixed(1)}<small style="font-size:0.5em">ft</small></div>
      <div class="pod-label">Best Jump</div>
      <div class="pod-bar" style="height:${sizes.bar}px;background:${barBg}"></div>
      <div class="rank">${labels[rank]}</div>
    </div>`;
  }

  // Re-order for podium display: 2nd, 1st, 3rd
  const podiumHTML = [
    podiumCard(podiumRiders[1], 1),
    podiumCard(podiumRiders[0], 0),
    podiumCard(podiumRiders[2], 2),
  ].join('');

  // Head-to-head (top 2 riders by height)
  let h2hHTML = '';
  if (riders.length >= 2) {
    const a = byHeight[0];
    const b = byHeight[1];
    const ca = COLORS[a.idx % COLORS.length];
    const cb = COLORS[b.idx % COLORS.length];

    function h2hRow(label, aVal, bVal, unit) {
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      const total = aNum + bNum || 1;
      const aPct = ((aNum / total) * 100).toFixed(0);
      const bPct = (100 - parseFloat(aPct)).toFixed(0);
      return `<div class="h2h-row">
        <div class="h2h-left"><div class="hv">${aVal}${unit ? ' ' + unit : ''}</div></div>
        <div class="h2h-label">${label}</div>
        <div class="h2h-right"><div class="hv">${bVal}${unit ? ' ' + unit : ''}</div></div>
      </div>
      <div class="h2h-bar"><div class="left" style="width:${aPct}%"></div><div class="right" style="width:${bPct}%"></div></div>`;
    }

    h2hHTML = `<div class="h2h">
      <div class="h2h-header">
        <div class="h2h-player left">
          <div class="avatar" style="background:${ca.bg}">${esc(a.initials)}</div>
          <div class="pname">${esc(a.name)}</div>
        </div>
        <div style="font-size:0.8rem;font-weight:900;color:#334155">VS</div>
        <div class="h2h-player right">
          <div class="pname">${esc(b.name)}</div>
          <div class="avatar" style="background:${cb.bg}">${esc(b.initials)}</div>
        </div>
      </div>
      ${h2hRow('Best Jump', a.max_jump_ft.toFixed(1), b.max_jump_ft.toFixed(1), 'ft')}
      ${h2hRow('Hangtime', a.best_hang_s.toFixed(1), b.best_hang_s.toFixed(1), 's')}
      ${h2hRow('Farthest', Math.round(a.farthest_ft), Math.round(b.farthest_ft), 'ft')}
      ${h2hRow('Top Speed', a.max_speed_kts.toFixed(1), b.max_speed_kts.toFixed(1), 'kts')}
      ${h2hRow('Jumps', a.total_jumps, b.total_jumps, '')}
    </div>`;
  }

  // Badges
  const badges = [];
  if (king) badges.push({ ico: '&#127942;', name: 'King of the Day', desc: 'Highest jump of the session', who: king.name, color: '#eab308', earned: true });

  const speedDemon = riders.filter(r => r.max_speed_kts >= 20);
  if (speedDemon.length > 0) badges.push({ ico: '&#9889;', name: 'Speed Demon', desc: 'Hit 20+ knots top speed', who: speedDemon.map(r => r.name).join(' &middot; '), color: '#22c55e', earned: true });

  const moonShot = riders.filter(r => r.max_jump_ft >= 20);
  if (moonShot.length > 0) badges.push({ ico: '&#128640;', name: 'Moon Shot', desc: 'Single jump over 20 ft', who: moonShot.map(r => r.name).join(' &middot; '), color: '#06b6d4', earned: true });

  const ironRider = riders.filter(r => r.duration_s >= 7200);
  if (ironRider.length > 0) badges.push({ ico: '&#127947;', name: 'Iron Rider', desc: 'Session longer than 2 hours', who: ironRider.map(r => r.name).join(' &middot; '), color: '#f97316', earned: true });

  const jumpMachine = riders.filter(r => r.total_jumps >= 20);
  if (jumpMachine.length > 0) badges.push({ ico: '&#128165;', name: 'Jump Machine', desc: 'Land 20+ jumps in one session', who: jumpMachine.map(r => r.name).join(' &middot; '), color: '#ec4899', earned: true });

  const distKing = riders.filter(r => r.farthest_ft >= 300);
  if (distKing.length > 0) badges.push({ ico: '&#127756;', name: 'Distance King', desc: 'Farthest single jump > 300 ft', who: distKing.map(r => r.name).join(' &middot; '), color: '#8b5cf6', earned: true });

  const marathon = riders.filter(r => r.distance_nm >= 10);
  if (marathon.length > 0) badges.push({ ico: '&#127946;', name: 'Marathon', desc: 'Covered 10+ nautical miles', who: marathon.map(r => r.name).join(' &middot; '), color: '#06b6d4', earned: true });

  // Locked badges (not earned today)
  if (!moonShot.length) badges.push({ ico: '&#128640;', name: 'Moon Shot', desc: 'Single jump over 20 ft', who: 'Locked', color: '#64748b', earned: false });
  if (!riders.some(r => r.max_jump_ft >= 30)) badges.push({ ico: '&#127775;', name: '30 Club', desc: 'Jump over 30 ft', who: 'Locked', color: '#64748b', earned: false });
  if (!speedDemon.length) badges.push({ ico: '&#9889;', name: 'Speed Demon', desc: 'Hit 20+ knots top speed', who: 'Locked', color: '#64748b', earned: false });
  if (!ironRider.length) badges.push({ ico: '&#127947;', name: 'Iron Rider', desc: 'Session longer than 2 hours', who: 'Locked', color: '#64748b', earned: false });

  const badgeCards = badges.map(b => {
    return `<div class="badge-card${b.earned ? ' earned' : ' locked'}">
      <div class="badge-ico">${b.ico}</div>
      <div class="badge-name" style="color:${b.color}">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
      <div class="badge-who" style="color:${b.earned ? '#eab308' : '#475569'}">${esc(b.who)}</div>
    </div>`;
  }).join('');

  // Activity Feed — build from rider data sorted by start time, then add jump highlights
  const feed = [];
  riders.forEach(r => {
    feed.push({ time: r.started_at, name: r.name, initials: r.initials, idx: r.idx,
      text: `started a session at ${esc(spot.name)}` });
  });

  // Add notable achievements to feed
  if (king && king.max_jump_ft > 0) {
    feed.push({ time: king.started_at, name: king.name, initials: king.initials, idx: king.idx,
      text: `crushed a <span class="hl">${king.max_jump_ft.toFixed(1)} ft</span> jump &mdash; highest of the day!` });
  }

  const speedKing = bySpeed[0];
  if (speedKing && speedKing.max_speed_kts > 0) {
    feed.push({ time: speedKing.started_at, name: speedKing.name, initials: speedKing.initials, idx: speedKing.idx,
      text: `hit <span class="hl">${speedKing.max_speed_kts.toFixed(1)} kts</span> &mdash; fastest on the lake!` });
  }

  const distChamp = byDist[0];
  if (distChamp && distChamp.farthest_ft > 0) {
    feed.push({ time: distChamp.started_at, name: distChamp.name, initials: distChamp.initials, idx: distChamp.idx,
      text: `launched <span class="hl">${Math.round(distChamp.farthest_ft)} ft</span> horizontal &mdash; farthest of the day!` });
  }

  ironRider.forEach(r => {
    feed.push({ time: r.started_at, name: r.name, initials: r.initials, idx: r.idx,
      text: `unlocked <span class="hl">Iron Rider</span> &mdash; 2+ hours on the water!` });
  });

  feed.sort((a, b) => new Date(b.time) - new Date(a.time));

  const feedHTML = feed.slice(0, 12).map(f => {
    const c = COLORS[f.idx % COLORS.length];
    const t = new Date(f.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `<div class="feed-item">
      <div class="feed-avi" style="background:${c.bg}">${esc(f.initials)}</div>
      <div>
        <div class="feed-text"><strong>${esc(f.name)}</strong> ${f.text}</div>
        <div class="feed-time">${t}</div>
      </div>
    </div>`;
  }).join('');

  // Rider session links
  const riderLinks = riders.map(r => {
    const c = COLORS[r.idx % COLORS.length];
    return `<a class="rider-link" href="/session/${r.sessionId}">
      <div class="rl-avi" style="background:${c.bg}">${esc(r.initials)}</div>
      <div class="rl-info">
        <div class="rl-name">${esc(r.name)}</div>
        <div class="rl-sub">${fmtDurationLong(r.duration_s)} &middot; ${r.total_jumps} jumps &middot; ${r.max_speed_kts.toFixed(1)} kts</div>
      </div>
      <div class="rl-arrow">&#8250;</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Session Day | ${esc(spot.name)} | ${esc(dateStr)} | UtahWindFinder</title>
  <meta property="og:title" content="Session Day at ${esc(spot.name)} — ${esc(dateStr)}">
  <meta property="og:description" content="${riders.length} riders | ${totalJumps} jumps | Day record ${dayRecord.toFixed(1)} ft">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#050510;color:#e5e5e5;line-height:1.5;overflow-x:hidden}

    .hero{text-align:center;padding:2.5rem 1rem 2rem;
      background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#0c4a6e 100%);
      border-bottom:2px solid rgba(56,189,248,0.25);position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;
      background:radial-gradient(circle at 25% 80%,rgba(234,179,8,0.07) 0%,transparent 50%),
                 radial-gradient(circle at 75% 20%,rgba(56,189,248,0.07) 0%,transparent 50%);
      animation:drift 18s ease-in-out infinite alternate}
    @keyframes drift{0%{transform:translate(0,0)}100%{transform:translate(-3%,2%)}}
    .hero *{position:relative}
    .hero-label{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.25em;color:#eab308;font-weight:700}
    .hero h1{font-size:2.2rem;font-weight:900;
      background:linear-gradient(90deg,#eab308,#f97316,#ec4899);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0.3rem 0}
    .hero .date{font-size:0.85rem;color:#94a3b8;font-weight:600}

    .day-stats{display:flex;justify-content:center;gap:2rem;margin-top:1.5rem;flex-wrap:wrap}
    .day-stat{text-align:center}
    .day-stat .dv{font-size:2rem;font-weight:900;color:#f1f5f9}
    .day-stat .dl{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-top:0.1rem}

    .wrap{max-width:750px;margin:0 auto;padding:0 1rem 3rem}
    .section-title{font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;
      padding:2rem 0 1rem;color:#94a3b8;display:flex;align-items:center;gap:0.5rem}
    .section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(148,163,184,0.3),transparent)}
    .section-sub{font-size:0.7rem;color:#475569;margin-top:-0.5rem;margin-bottom:1rem}

    /* Podium */
    .podium{display:flex;justify-content:center;align-items:flex-end;gap:0.5rem;padding:1rem 0 1.5rem;min-height:260px}
    .pod{display:flex;flex-direction:column;align-items:center;width:120px}
    .pod-avatar{border-radius:50%;border:3px solid;display:flex;align-items:center;
      justify-content:center;font-weight:900;color:#fff;position:relative}
    .pod-avatar .crown{position:absolute;top:-16px;font-size:1.2rem;filter:drop-shadow(0 0 4px rgba(234,179,8,0.6))}
    .pod-name{font-size:0.75rem;font-weight:700;margin-top:0.5rem;color:#f1f5f9}
    .pod-val{font-size:1.3rem;font-weight:900;margin-top:0.15rem}
    .pod-label{font-size:0.55rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
    .pod-bar{width:60px;border-radius:8px 8px 0 0;margin-top:0.4rem}
    .pod .rank{font-size:0.7rem;font-weight:800;color:#fff;margin-top:0.3rem;opacity:0.7}

    /* Leaderboard tabs */
    .lb-tabs{display:flex;gap:0.4rem;overflow-x:auto;padding:0.5rem 0;-webkit-overflow-scrolling:touch}
    .lb-tab{flex:0 0 auto;padding:0.4rem 0.8rem;border-radius:20px;font-size:0.7rem;font-weight:700;
      cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);
      color:#94a3b8;transition:all 0.2s;white-space:nowrap;text-transform:uppercase;letter-spacing:0.05em}
    .lb-tab:hover{border-color:rgba(56,189,248,0.3);color:#e2e8f0}
    .lb-tab.active{background:linear-gradient(135deg,#1e3a5f,#0c4a6e);border-color:#38bdf8;color:#38bdf8}
    .lb-board{display:none}.lb-board.active{display:block}

    /* Rider row */
    .rider-row{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 0.8rem;
      background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.04);
      border-radius:14px;margin-bottom:0.5rem;transition:transform 0.15s,border-color 0.15s}
    .rider-row:hover{transform:translateX(4px);border-color:rgba(56,189,248,0.2)}
    .rider-row.gold{border:1px solid rgba(234,179,8,0.3);background:linear-gradient(145deg,#1c1a0f,#151310)}
    .rider-row.silver{border:1px solid rgba(148,163,184,0.2)}
    .rider-row.bronze{border:1px solid rgba(205,127,50,0.15)}
    .rr-rank{font-size:1.1rem;font-weight:900;width:28px;text-align:center;flex-shrink:0}
    .rr-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.85rem;font-weight:800;color:#fff;flex-shrink:0}
    .rr-info{flex:1;min-width:0}
    .rr-name{font-size:0.8rem;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rr-gear{font-size:0.6rem;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rr-val{text-align:right;flex-shrink:0}
    .rr-val .big{font-size:1.2rem;font-weight:900}
    .rr-val .unit{font-size:0.6rem;color:#64748b;margin-left:2px}
    .rr-bar-wrap{width:100px;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;flex-shrink:0}
    .rr-bar{height:100%;border-radius:4px;transition:width 0.5s ease-out}

    /* Head to head */
    .h2h{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.06);
      border-radius:16px;padding:1.2rem;margin-top:0.5rem}
    .h2h-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
    .h2h-player{display:flex;align-items:center;gap:0.5rem}
    .h2h-player .avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:0.85rem;font-weight:800;color:#fff}
    .h2h-player .pname{font-size:0.8rem;font-weight:700}
    .h2h-player.left .pname{color:#22c55e}
    .h2h-player.right .pname{color:#f97316}
    .h2h-row{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;margin-top:0.8rem}
    .h2h-label{font-size:0.6rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;width:70px;text-align:center;flex-shrink:0}
    .h2h-left,.h2h-right{flex:1;text-align:center}
    .h2h-left .hv,.h2h-right .hv{font-size:1rem;font-weight:800}
    .h2h-left .hv{color:#22c55e}.h2h-right .hv{color:#f97316}
    .h2h-bar{display:flex;height:6px;border-radius:3px;overflow:hidden}
    .h2h-bar .left{background:#22c55e}.h2h-bar .right{background:#f97316}

    /* Badges */
    .badges-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.6rem;padding:0.5rem 0}
    .badge-card{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.05);
      border-radius:14px;padding:1rem 0.7rem;text-align:center;transition:transform 0.2s}
    .badge-card:hover{transform:scale(1.03)}
    .badge-card.earned{border-color:rgba(234,179,8,0.3)}
    .badge-card.locked{opacity:0.35}
    .badge-ico{font-size:2rem;margin-bottom:0.3rem}
    .badge-name{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em}
    .badge-desc{font-size:0.6rem;color:#64748b;margin-top:0.15rem}
    .badge-who{font-size:0.6rem;font-weight:700;margin-top:0.3rem}

    /* Feed */
    .feed-item{display:flex;gap:0.7rem;padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.03)}
    .feed-item:last-child{border:none}
    .feed-avi{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.65rem;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px}
    .feed-text{font-size:0.75rem;color:#94a3b8}
    .feed-text strong{color:#f1f5f9;font-weight:700}
    .feed-text .hl{color:#eab308;font-weight:700}
    .feed-time{font-size:0.6rem;color:#334155;margin-top:0.15rem}

    /* Individual session links */
    .rider-link{display:flex;align-items:center;gap:0.7rem;padding:0.7rem 0.8rem;
      background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(255,255,255,0.04);
      border-radius:14px;margin-bottom:0.5rem;text-decoration:none;color:inherit;transition:all 0.15s}
    .rider-link:hover{border-color:rgba(56,189,248,0.3);transform:translateX(4px)}
    .rl-avi{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.85rem;font-weight:800;color:#fff;flex-shrink:0}
    .rl-info{flex:1;min-width:0}
    .rl-name{font-size:0.8rem;font-weight:700;color:#f1f5f9}
    .rl-sub{font-size:0.6rem;color:#475569}
    .rl-arrow{font-size:1.2rem;color:#475569;font-weight:300}

    /* Share bar */
    .share-bar{display:flex;gap:0.5rem;flex-wrap:wrap;padding:0.5rem 0}
    .share-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:10px;
      font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;text-decoration:none;color:#fff}
    .share-btn:hover{transform:scale(1.03);filter:brightness(1.15)}
    .share-btn.copy{background:linear-gradient(135deg,#334155,#475569)}
    .share-btn.twitter{background:linear-gradient(135deg,#0c4a6e,#0ea5e9)}
    .share-btn.sms-share{background:linear-gradient(135deg,#065f46,#10b981)}
    .share-copied{font-size:0.65rem;color:#22c55e;font-weight:600;margin-left:0.5rem;opacity:0;transition:opacity 0.3s}

    /* Rider setup CTA */
    .setup-card{background:linear-gradient(145deg,#111827,#0f172a);border:1px solid rgba(234,179,8,0.15);
      border-radius:16px;padding:1.2rem;margin-top:0.5rem}
    .setup-card h3{font-size:0.85rem;font-weight:800;color:#eab308;margin-bottom:0.3rem}
    .setup-card p{font-size:0.7rem;color:#64748b;margin-bottom:1rem;line-height:1.5}
    .setup-steps{display:flex;flex-direction:column;gap:0.6rem}
    .setup-step{display:flex;align-items:flex-start;gap:0.6rem}
    .step-num{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.65rem;font-weight:800;color:#000;background:#eab308;flex-shrink:0}
    .step-text{font-size:0.7rem;color:#94a3b8;line-height:1.5}
    .step-text strong{color:#f1f5f9}

    footer{text-align:center;padding:2.5rem 0 1.5rem;font-size:0.7rem;color:#1e293b}
    footer a{color:#38bdf8;text-decoration:none;font-weight:600}

    @media(max-width:500px){
      .hero h1{font-size:1.6rem}
      .pod{width:95px}
      .rr-bar-wrap{width:60px}
      .badges-grid{grid-template-columns:repeat(2,1fr)}
      .day-stats{gap:1rem}
      .day-stat .dv{font-size:1.5rem}
    }
  </style>
</head>
<body>

<div class="hero">
  <div class="hero-label">Session Day</div>
  <h1>${esc(spot.name)}</h1>
  <div class="date">${esc(dateFormatted)}</div>
  <div class="day-stats">
    <div class="day-stat"><div class="dv">${riders.length}</div><div class="dl">Riders</div></div>
    <div class="day-stat"><div class="dv">${totalJumps}</div><div class="dl">Total Jumps</div></div>
    <div class="day-stat"><div class="dv">${dayRecord.toFixed(1)}<small style="font-size:0.5em">ft</small></div><div class="dl">Day Record</div></div>
    <div class="day-stat"><div class="dv">${fmtDuration(totalTime)}</div><div class="dl">Time on Water</div></div>
  </div>
</div>

<div class="wrap">

  ${riders.length >= 2 ? `
  <div class="section-title">King of the Day</div>
  <div class="section-sub">Highest single jump wins the crown</div>
  <div class="podium">${podiumHTML}</div>
  ` : ''}

  <div class="section-title">Leaderboards</div>
  <div class="lb-tabs">
    <div class="lb-tab active" onclick="switchBoard('height')">Highest Jump</div>
    <div class="lb-tab" onclick="switchBoard('hang')">Best Hangtime</div>
    <div class="lb-tab" onclick="switchBoard('distance')">Farthest Jump</div>
    <div class="lb-tab" onclick="switchBoard('speed')">Top Speed</div>
    <div class="lb-tab" onclick="switchBoard('jumps')">Most Jumps</div>
    <div class="lb-tab" onclick="switchBoard('duration')">Longest Session</div>
  </div>
  <div class="lb-boards">
    <div class="lb-board active" id="board-height">${heightRows}</div>
    <div class="lb-board" id="board-hang">${hangRows}</div>
    <div class="lb-board" id="board-distance">${distRows}</div>
    <div class="lb-board" id="board-speed">${speedRows}</div>
    <div class="lb-board" id="board-jumps">${jumpRows}</div>
    <div class="lb-board" id="board-duration">${durRows}</div>
  </div>

  ${h2hHTML ? `
  <div class="section-title">Head to Head</div>
  <div class="section-sub">Top two riders compared</div>
  ${h2hHTML}` : ''}

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
    <a class="share-btn twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Session Day at ${spot.name}! ${riders.length} riders, ${totalJumps} jumps, day record ${dayRecord.toFixed(1)}ft`)}&url=${encodeURIComponent(`https://utahwindfinder.com/day/${spotSlug}/${dateStr}`)}" target="_blank" rel="noopener">&#120143; Post</a>
    <a class="share-btn sms-share" href="sms:?body=${encodeURIComponent(`Check out today's kite session leaderboard at ${spot.name}! ${totalJumps} jumps, ${riders.length} riders. https://utahwindfinder.com/day/${spotSlug}/${dateStr}`)}">&#128172; Text</a>
  </div>

  <div class="section-title">Join the Leaderboard</div>
  <div class="setup-card">
    <h3>&#127942; Get on the Board</h3>
    <p>Ride with the UtahWindFinder Garmin app and your sessions automatically appear here.</p>
    <div class="setup-steps">
      <div class="setup-step">
        <div class="step-num">1</div>
        <div class="step-text"><strong>Install the app</strong> on your Garmin watch from the Connect IQ store (search "UtahWindField")</div>
      </div>
      <div class="setup-step">
        <div class="step-num">2</div>
        <div class="step-text"><strong>Set your rider name &amp; gear</strong> in the app settings via Garmin Connect Mobile</div>
      </div>
      <div class="setup-step">
        <div class="step-num">3</div>
        <div class="step-text"><strong>Start a session</strong> and ride! When you stop, your jumps, speed, and hangtime upload automatically</div>
      </div>
      <div class="setup-step">
        <div class="step-num">4</div>
        <div class="step-text"><strong>Compare &amp; compete</strong> with everyone who rode the same spot today</div>
      </div>
    </div>
  </div>

  <footer>
    <a href="/">UtahWindFinder.com</a> &middot; Session Day &middot; ${esc(spot.name)}
  </footer>
</div>

<script>
function switchBoard(id) {
  document.querySelectorAll('.lb-board').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.lb-tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('board-' + id).classList.add('active');
  var tabs = document.querySelectorAll('.lb-tab');
  var map = { height: 0, hang: 1, distance: 2, speed: 3, jumps: 4, duration: 5 };
  if (map[id] !== undefined) tabs[map[id]].classList.add('active');
}

function copyLink() {
  var url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() { showCopied(); });
  } else {
    var t = document.createElement('textarea');
    t.value = url; document.body.appendChild(t); t.select();
    document.execCommand('copy'); document.body.removeChild(t);
    showCopied();
  }
}
function showCopied() {
  var el = document.getElementById('copied-msg');
  if (el) { el.style.opacity = '1'; setTimeout(function() { el.style.opacity = '0'; }, 2000); }
}
</script>

</body>
</html>`;
}
