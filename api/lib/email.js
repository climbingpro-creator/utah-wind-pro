/**
 * Email delivery via Resend.
 *
 * Templates:
 *   - Morning Briefing: top 3 spots with full conditions + hatch + action lines
 *   - Weekend Report: separate Sat/Sun sections with forecast, precip, hatch outlook
 *   - Hatch Alert: real-time emergence with conditions, fly patterns, urgency
 *
 * Env: RESEND_API_KEY, EMAIL_FROM (defaults to alerts@notwindy.com)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'NotWindy <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { success: false, error: 'not configured' };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('[email] Resend error:', err);
      return { success: false, error: err.message || resp.statusText };
    }

    return { success: true };
  } catch (err) {
    console.error('[email] Send failed:', err);
    return { success: false, error: err.message };
  }
}

// ── Shared Styles & Layout ──────────────────────────────────────

const COLORS = {
  bg: '#0f172a',
  cardBg: '#1e293b',
  cardBorder: '#334155',
  text: '#e2e8f0',
  muted: '#94a3b8',
  dim: '#64748b',
  divider: '#1e293b',
  accent: '#22d3ee',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
};

function layout(title, body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:800;color:${COLORS.accent};">NotWindy</span>
      <span style="font-size:11px;color:${COLORS.dim};display:block;margin-top:2px;">${title}</span>
    </div>
    ${body}
    <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid ${COLORS.divider};">
      <a href="https://notwindy.com" style="color:${COLORS.accent};text-decoration:none;font-size:12px;">Open NotWindy</a>
      <span style="color:#334155;margin:0 8px;">&middot;</span>
      <a href="https://notwindy.com/settings" style="color:${COLORS.dim};text-decoration:none;font-size:12px;">Manage Alerts</a>
    </div>
  </div>
</body>
</html>`;
}

function warningBanner(warnings) {
  if (!warnings?.length) return '';
  const items = warnings.map(w =>
    `<div style="padding:8px 12px;background:rgba(239,68,68,0.12);border-left:3px solid ${COLORS.red};border-radius:4px;margin-bottom:6px;">
      <span style="font-weight:700;color:${COLORS.red};font-size:13px;">&#9888; ${w.event}</span>
      <div style="color:${COLORS.muted};font-size:12px;margin-top:2px;">${w.headline || w.areas || ''}</div>
    </div>`
  ).join('');
  return `<div style="margin-bottom:16px;">${items}</div>`;
}

function badge(label, value, color) {
  if (value == null || value === '') return '';
  return `<span style="display:inline-block;background:${color || COLORS.cardBg};padding:2px 8px;border-radius:6px;font-size:11px;color:${COLORS.text};margin:2px 3px 2px 0;">${label ? `<span style="color:${COLORS.dim}">${label}</span> ` : ''}${value}</span>`;
}

function pressureArrow(trend) {
  if (!trend) return '';
  if (trend === 'falling') return `<span style="color:${COLORS.green};">&#8600; Falling</span>`;
  if (trend === 'rising') return `<span style="color:${COLORS.amber};">&#8599; Rising</span>`;
  return `<span style="color:${COLORS.dim};">&#8594; Stable</span>`;
}

function regulationBadge(regulations) {
  if (!regulations) return '';
  return `<div style="margin-top:6px;padding:5px 8px;background:rgba(245,158,11,0.10);border-left:3px solid ${COLORS.amber};border-radius:4px;font-size:11px;color:${COLORS.amber};">&#9888;&#65039; ${regulations}</div>`;
}

function scoreBar(score) {
  const color = score > 70 ? COLORS.green : score > 40 ? COLORS.amber : COLORS.red;
  return `<div style="margin-top:8px;background:#0f172a;border-radius:4px;height:6px;overflow:hidden;">
    <div style="width:${score}%;height:100%;background:${color};border-radius:4px;"></div>
  </div>`;
}

function ctaButton(text, url) {
  return `<div style="text-align:center;margin-top:20px;">
    <a href="${url}" style="display:inline-block;background:${COLORS.gradient};color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${text}</a>
  </div>`;
}

// ── Morning Briefing ────────────────────────────────────────────

/**
 * @param {Array} spots — each: { name, score, wind, gust, windDir, temp, waterTemp,
 *   sky, skyLabel, shortForecast, pressureTrend, pressureGradient,
 *   flowCfs, topHatch, bestAction, waterType, depthZone,
 *   recommendations: { fly?, spin?, bait? } }
 * @param {Object} meta — { sunrise, sunset, warnings[], fishingStyle[] }
 */
export function buildMorningBriefingEmail(spots, meta = {}) {
  const headerRow = [
    meta.sunrise ? `&#9728;&#65039; Sunrise ${meta.sunrise}` : '',
    meta.sunset ? `&#127749; Sunset ${meta.sunset}` : '',
  ].filter(Boolean).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  const headerSection = headerRow
    ? `<div style="text-align:center;color:${COLORS.dim};font-size:12px;margin-bottom:12px;">${headerRow}</div>`
    : '';

  const cards = spots.map(s => {
    const scoreColor = s.score > 70 ? COLORS.green : s.score > 40 ? COLORS.amber : COLORS.red;
    const isStillwater = s.waterType && s.waterType !== 'river';

    const windLine = s.windDir
      ? `${s.windDir} ${s.wind} mph${s.gust > s.wind + 3 ? `, gusts ${s.gust}` : ''}`
      : `${s.wind} mph${s.gust > s.wind + 3 ? `, gusts ${s.gust}` : ''}`;

    const badges = [
      badge('&#127744;', windLine, '#0f172a'),
      s.temp != null ? badge('&#127777;', `${s.temp}°F${s.waterTemp != null ? ` / Water ${s.waterTemp}°F` : ''}`, '#0f172a') : '',
      s.pressureTrend ? badge('', pressureArrow(s.pressureTrend), '#0f172a') : '',
      s.skyLabel ? badge('', s.skyLabel, '#0f172a') : '',
      s.flowCfs ? badge('&#127754;', `${s.flowCfs} cfs`, '#0f172a') : '',
      isStillwater && s.depthZone ? badge('&#128207;', `Depth: ${s.depthZone}`, '#0f172a') : '',
    ].filter(Boolean).join('');

    const recs = s.recommendations || {};
    const recLines = [];
    if (recs.fly?.length) recLines.push(...recs.fly.map(r => `<div style="font-size:12px;color:${COLORS.muted};padding:1px 0;">&#129526; ${r}</div>`));
    if (recs.spin?.length) recLines.push(...recs.spin.map(r => `<div style="font-size:12px;color:${COLORS.muted};padding:1px 0;">&#127907; ${r}</div>`));
    if (recs.bait?.length) recLines.push(...recs.bait.map(r => `<div style="font-size:12px;color:${COLORS.muted};padding:1px 0;">&#129683; ${r}</div>`));
    const recsSection = recLines.length
      ? `<div style="margin-top:6px;padding:6px 8px;background:#0f172a;border-radius:6px;">
          <div style="font-size:10px;color:${COLORS.dim};margin-bottom:3px;">RECOMMENDED</div>
          ${recLines.join('')}
        </div>`
      : '';

    return `<div style="background:${COLORS.cardBg};border-radius:12px;padding:16px;margin-bottom:10px;border:1px solid ${COLORS.cardBorder};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:700;color:${COLORS.text};font-size:15px;">${s.name}</span>
        <span style="font-weight:800;color:${scoreColor};font-size:20px;">${s.score}<span style="font-size:11px;color:${COLORS.dim};">/100</span></span>
      </div>
      <div style="margin-bottom:8px;">${badges}</div>
      ${s.topHatch ? `<div style="font-size:13px;color:${COLORS.green};margin-bottom:4px;">&#129712; ${s.topHatch}</div>` : ''}
      ${s.bestAction ? `<div style="font-size:12px;color:${COLORS.accent};font-style:italic;">&#10148; ${s.bestAction}</div>` : ''}
      ${recsSection}
      ${regulationBadge(s.regulations)}
      ${scoreBar(s.score)}
    </div>`;
  }).join('');

  const subject = `🎣 Morning Briefing — Your top ${spots.length} spots today`;
  const html = layout('Morning Briefing', `
    ${headerSection}
    ${warningBanner(meta.warnings)}
    <h2 style="color:${COLORS.text};font-size:18px;margin:0 0 16px;">Today's Top Spots</h2>
    ${cards}
    ${ctaButton('View Full Forecast', 'https://notwindy.com')}
  `);

  return { subject, html };
}

// ── Weekend Report ──────────────────────────────────────────────

/**
 * @param {Array} satSpots — each: { name, score, wind, temp, forecast,
 *   precipChance, hatchOutlook, flowCfs, waterType, depthZone, tip }
 * @param {Array} sunSpots — same shape
 * @param {Object} meta — { bestDay, warnings[] }
 */
export function buildWeekendReportEmail(satSpots, sunSpots, meta = {}) {
  function daySection(dayLabel, spots) {
    const cards = spots.map(s => {
      const scoreColor = s.score > 70 ? COLORS.green : s.score > 40 ? COLORS.amber : COLORS.red;
      const isStillwater = s.waterType && s.waterType !== 'river';
      const badges = [
        badge('&#127744;', s.wind, '#0f172a'),
        s.temp ? badge('&#127777;', s.temp, '#0f172a') : '',
        s.precipChance != null ? badge('&#127783;', `${s.precipChance}%`, s.precipChance > 40 ? 'rgba(239,68,68,0.15)' : '#0f172a') : '',
        s.flowCfs ? badge('&#127754;', `${s.flowCfs} cfs`, '#0f172a') : '',
        isStillwater && s.depthZone ? badge('&#128207;', s.depthZone, '#0f172a') : '',
      ].filter(Boolean).join('');

      return `<div style="background:${COLORS.cardBg};border-radius:10px;padding:14px;margin-bottom:8px;border:1px solid ${COLORS.cardBorder};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;color:${COLORS.text};font-size:14px;">${s.name}</span>
          <span style="font-weight:800;color:${scoreColor};font-size:17px;">${s.score}<span style="font-size:10px;color:${COLORS.dim};">/100</span></span>
        </div>
        <div style="margin-bottom:6px;">${badges}</div>
        ${s.forecast ? `<div style="font-size:12px;color:${COLORS.muted};margin-bottom:4px;">${s.forecast}</div>` : ''}
        ${s.hatchOutlook ? `<div style="font-size:12px;color:${COLORS.green};">&#129712; ${s.hatchOutlook}</div>` : ''}
        ${s.tip ? `<div style="font-size:12px;color:${COLORS.accent};font-style:italic;">&#10148; ${s.tip}</div>` : ''}
        ${regulationBadge(s.regulations)}
        ${scoreBar(s.score)}
      </div>`;
    }).join('');

    return `<h2 style="color:${COLORS.text};font-size:17px;margin:18px 0 10px;">${dayLabel}</h2>${cards}`;
  }

  const bestDayCallout = meta.bestDay
    ? `<div style="text-align:center;background:rgba(16,185,129,0.12);border:1px solid ${COLORS.green};border-radius:10px;padding:12px;margin-bottom:14px;">
        <span style="font-weight:700;color:${COLORS.green};font-size:14px;">&#11088; Best Day: ${meta.bestDay}</span>
      </div>`
    : '';

  const subject = '🗓️ Weekend Fishing Forecast — Your best waters ranked';
  const html = layout('Weekend Fishing Forecast', `
    ${warningBanner(meta.warnings)}
    ${bestDayCallout}
    ${daySection('Saturday', satSpots)}
    ${daySection('Sunday', sunSpots)}
    ${ctaButton('Plan Your Weekend', 'https://notwindy.com?tab=forecast')}
  `);

  return { subject, html };
}

// ── Hatch Alert ─────────────────────────────────────────────────

/**
 * @param {string} locationName
 * @param {Object} hatch — { insect, likelihood, peakTime, notes }
 * @param {Object} extra — { conditions: { wind, temp, waterTemp, sky, pressure },
 *   secondaryHatches[], flyPatterns[], waterType }
 */
export function buildHatchAlertEmail(locationName, hatch, extra = {}) {
  const cond = extra.conditions || {};

  const condBadges = [
    cond.wind ? badge('&#127744;', cond.wind) : '',
    cond.temp ? badge('Air', cond.temp) : '',
    cond.waterTemp ? badge('Water', cond.waterTemp) : '',
    cond.sky ? badge('', cond.sky) : '',
    cond.pressure ? badge('', pressureArrow(cond.pressure)) : '',
  ].filter(Boolean).join('');

  const condSection = condBadges
    ? `<div style="margin:14px 0;padding:10px;background:#0f172a;border-radius:8px;">
        <div style="font-size:11px;color:${COLORS.dim};margin-bottom:6px;">CURRENT CONDITIONS</div>
        ${condBadges}
      </div>`
    : '';

  const isStillwater = extra.waterType && extra.waterType !== 'river';
  const flyLabel = isStillwater ? 'RECOMMENDED PATTERNS (STILLWATER)' : 'RECOMMENDED FLIES';
  const flySection = extra.flyPatterns?.length
    ? `<div style="margin:12px 0;padding:10px;background:#0f172a;border-radius:8px;">
        <div style="font-size:11px;color:${COLORS.dim};margin-bottom:6px;">${flyLabel}</div>
        ${extra.flyPatterns.map(f => `<div style="font-size:13px;color:${COLORS.text};padding:2px 0;">&#127907; ${f}</div>`).join('')}
      </div>`
    : '';

  let urgencyLine = '';
  if (hatch.peakTime) {
    const now = new Date();
    const mstHour = (now.getUTCHours() - 7 + 24) % 24;
    const peakMatch = hatch.peakTime.match(/(\d+)/);
    const peakStart = peakMatch ? parseInt(peakMatch[1]) : null;
    if (peakStart) {
      const hoursUntil = ((peakStart + 12) % 24) - mstHour;
      if (hoursUntil > 0 && hoursUntil <= 4) {
        urgencyLine = `<div style="text-align:center;color:${COLORS.amber};font-weight:700;font-size:13px;margin:8px 0;">&#9200; Hatch window in ~${hoursUntil}h — get on the water!</div>`;
      } else if (hoursUntil <= 0) {
        urgencyLine = `<div style="text-align:center;color:${COLORS.green};font-weight:700;font-size:13px;margin:8px 0;">&#9200; Hatch happening NOW</div>`;
      }
    }
  }

  const secondarySection = extra.secondaryHatches?.length
    ? `<div style="margin:12px 0;padding:10px;background:#0f172a;border-radius:8px;">
        <div style="font-size:11px;color:${COLORS.dim};margin-bottom:6px;">ALSO ACTIVE</div>
        ${extra.secondaryHatches.map(h => `<div style="font-size:13px;color:${COLORS.muted};padding:2px 0;">&#129712; ${h.insect} — ${h.likelihood}% — Peak: ${h.peakTime}</div>`).join('')}
      </div>`
    : '';

  const subject = `🪰 Hatch Alert — ${hatch.insect} at ${locationName}`;
  const html = layout('Hatch Alert', `
    <div style="background:${COLORS.cardBg};border-radius:12px;padding:20px;border:1px solid ${COLORS.cardBorder};">
      <div style="text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">&#129712;</div>
        <h2 style="color:${COLORS.text};font-size:20px;margin:0 0 4px;">${hatch.insect}</h2>
        <p style="color:${COLORS.muted};font-size:14px;margin:0 0 12px;">${locationName}</p>
        <div style="display:inline-block;background:${COLORS.green};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;">${hatch.likelihood}% Likely</div>
        <p style="color:${COLORS.text};font-size:14px;margin:12px 0 4px;">Peak: ${hatch.peakTime}</p>
        ${urgencyLine}
        <p style="color:${COLORS.muted};font-size:13px;margin:4px 0 0;">${hatch.notes}</p>
      </div>
      ${condSection}
      ${flySection}
      ${regulationBadge(extra.regulations)}
      ${secondarySection}
    </div>
    ${ctaButton('Open NotWindy', 'https://notwindy.com')}
  `);

  return { subject, html };
}

export { sendEmail };
