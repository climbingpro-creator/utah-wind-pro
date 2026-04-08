/**
 * findNextRideableWindow
 *
 * Scans NWS hourly forecast data for the next contiguous block where
 * wind speed meets/exceeds the discipline threshold. Returns the start
 * time, end time, peak speed, and a human-readable summary.
 *
 * @param {Array} hourlyForecast — from getHourlyForecast()
 *   Each entry: { startTime, windSpeed, windDirection, shortForecast }
 * @param {object} opts
 * @param {number} opts.minSpeed — rideable floor (default 8 mph)
 * @param {number} opts.minHours — minimum contiguous hours (default 1)
 * @returns {object|null}
 *   { startTime, endTime, peakSpeed, peakHour, hours, dayLabel, summaryFree, summaryPro }
 */

const DISCIPLINE_THRESHOLDS = {
  kiting:       8,
  windsurfing: 10,
  sailing:     6,
  paragliding: 5,
  snowkiting:  8,
  boating:     0,
  paddling:    0,
  fishing:     0,
};

export function getDisciplineThreshold(discipline) {
  return DISCIPLINE_THRESHOLDS[discipline] ?? 8;
}

function getDayLabel(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((target - today) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function describeCondition(shortForecast) {
  if (!shortForecast) return '';
  const lower = shortForecast.toLowerCase();
  if (lower.includes('thunder')) return 'Storms expected';
  if (lower.includes('rain') || lower.includes('shower')) return 'Rain possible';
  if (lower.includes('cloud')) return 'Overcast';
  if (lower.includes('sunny') || lower.includes('clear')) return 'Clear skies';
  return '';
}

export default function findNextRideableWindow(hourlyForecast, opts = {}) {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  const minSpeed = opts.minSpeed ?? 8;
  const minHours = opts.minHours ?? 1;

  let bestWindow = null;
  let currentWindow = null;

  for (let i = 0; i < hourlyForecast.length; i++) {
    const hour = hourlyForecast[i];
    const speed = hour.windSpeed ?? 0;

    if (speed >= minSpeed) {
      const startDate = new Date(hour.startTime || hour.time);

      if (!currentWindow) {
        currentWindow = {
          startIdx: i,
          startTime: startDate,
          peakSpeed: speed,
          peakHour: startDate,
          peakDirection: hour.windDirection,
          hours: 1,
          conditions: [],
        };
      } else {
        currentWindow.hours += 1;
        if (speed > currentWindow.peakSpeed) {
          currentWindow.peakSpeed = speed;
          currentWindow.peakHour = startDate;
          currentWindow.peakDirection = hour.windDirection;
        }
      }

      if (hour.shortForecast) {
        currentWindow.conditions.push(hour.shortForecast);
      }
    } else {
      if (currentWindow && currentWindow.hours >= minHours) {
        bestWindow = currentWindow;
        break;
      }
      currentWindow = null;
    }
  }

  // Check if the last open window qualifies
  if (currentWindow && currentWindow.hours >= minHours && !bestWindow) {
    bestWindow = currentWindow;
  }

  if (!bestWindow) return null;

  const endIdx = bestWindow.startIdx + bestWindow.hours - 1;
  const endHour = hourlyForecast[endIdx];
  const endDate = new Date(endHour.startTime || endHour.time);
  endDate.setHours(endDate.getHours() + 1);

  const dayLabel = getDayLabel(bestWindow.startTime);
  const startStr = formatHour(bestWindow.startTime);
  const endStr = formatHour(endDate);
  const peakStr = formatHour(bestWindow.peakHour);

  const condition = describeCondition(
    bestWindow.conditions[Math.floor(bestWindow.conditions.length / 2)]
  );

  // Pro-only summary: exact micro-window (NEVER exposed to free tier)
  const summaryPro = `${dayLabel}, ${startStr} – ${endStr} | Peak: ${Math.round(bestWindow.peakSpeed)} mph at ${peakStr}`;

  return {
    startTime: bestWindow.startTime,
    endTime: endDate,
    peakSpeed: bestWindow.peakSpeed,
    peakHour: bestWindow.peakHour,
    peakDirection: bestWindow.peakDirection,
    hours: bestWindow.hours,
    dayLabel,
    startStr,
    endStr,
    condition,
    summaryPro,
    // Boolean flag only — no timing details leak to the UI layer
    hasWindow: true,
  };
}
