/**
 * Email delivery via Resend.
 *
 * Templates:
 *   - Morning Briefing: top 3 favorite spots scored
 *   - Weekend Report: best waters for Sat/Sun
 *   - Hatch Alert: single-location hatch emergence
 *
 * Env: RESEND_API_KEY, EMAIL_FROM (defaults to alerts@notwindy.com)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'NotWindy <alerts@notwindy.com>';

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

// ── Templates ──────────────────────────────────────────────────

function layout(title, body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:800;color:#22d3ee;">NotWindy</span>
      <span style="font-size:11px;color:#64748b;display:block;margin-top:2px;">${title}</span>
    </div>
    ${body}
    <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;">
      <a href="https://notwindy.com" style="color:#22d3ee;text-decoration:none;font-size:12px;">Open NotWindy</a>
      <span style="color:#334155;margin:0 8px;">·</span>
      <a href="https://notwindy.com/settings" style="color:#64748b;text-decoration:none;font-size:12px;">Manage Alerts</a>
    </div>
  </div>
</body>
</html>`;
}

function spotCard(name, score, detail) {
  const barColor = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';
  return `
    <div style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;color:#e2e8f0;font-size:15px;">${name}</span>
        <span style="font-weight:800;color:${barColor};font-size:18px;">${score}<span style="font-size:11px;color:#64748b;">/100</span></span>
      </div>
      <div style="margin-top:6px;font-size:13px;color:#94a3b8;">${detail}</div>
      <div style="margin-top:8px;background:#0f172a;border-radius:4px;height:6px;overflow:hidden;">
        <div style="width:${score}%;height:100%;background:${barColor};border-radius:4px;"></div>
      </div>
    </div>`;
}

export function buildMorningBriefingEmail(spots) {
  const cards = spots.map(s =>
    spotCard(s.name, s.score, `${s.wind} mph wind · ${s.detail || ''}`)
  ).join('');

  const subject = `🎣 Morning Briefing — Your top ${spots.length} spots today`;
  const html = layout('Morning Briefing', `
    <h2 style="color:#e2e8f0;font-size:18px;margin:0 0 16px;">Today's Top Spots</h2>
    ${cards}
    <div style="text-align:center;margin-top:20px;">
      <a href="https://notwindy.com" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View Full Forecast</a>
    </div>
  `);

  return { subject, html };
}

export function buildWeekendReportEmail(satSpots, sunSpots) {
  const satCards = satSpots.map(s => spotCard(s.name, s.score, s.detail)).join('');
  const sunCards = sunSpots.map(s => spotCard(s.name, s.score, s.detail)).join('');

  const subject = '🗓️ Weekend Fishing Forecast — Your best waters ranked';
  const html = layout('Weekend Fishing Forecast', `
    <h2 style="color:#e2e8f0;font-size:18px;margin:0 0 12px;">Saturday</h2>
    ${satCards}
    <h2 style="color:#e2e8f0;font-size:18px;margin:20px 0 12px;">Sunday</h2>
    ${sunCards}
    <div style="text-align:center;margin-top:20px;">
      <a href="https://notwindy.com?tab=forecast" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Plan Your Weekend</a>
    </div>
  `);

  return { subject, html };
}

export function buildHatchAlertEmail(locationName, hatch) {
  const subject = `🪰 Hatch Alert — ${hatch.insect} at ${locationName}`;
  const html = layout('Hatch Alert', `
    <div style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🪰</div>
      <h2 style="color:#e2e8f0;font-size:20px;margin:0 0 4px;">${hatch.insect}</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 12px;">${locationName}</p>
      <div style="display:inline-block;background:#10b981;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;">${hatch.likelihood}% Likely</div>
      <p style="color:#cbd5e1;font-size:14px;margin:16px 0 8px;">Peak: ${hatch.peakTime}</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">${hatch.notes}</p>
    </div>
    <div style="text-align:center;margin-top:20px;">
      <a href="https://notwindy.com" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Open NotWindy</a>
    </div>
  `);

  return { subject, html };
}

export { sendEmail };
