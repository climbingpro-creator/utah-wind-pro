# Data Update Frequencies

## Overview

Utah Wind Pro aggregates data from multiple sources, each with different update frequencies.

---

## Data Sources & Update Rates

### 1. Personal Weather Station (PWS) - Ambient Weather
- **Update Frequency**: Real-time (every 1-5 seconds at source)
- **App Refresh**: Every **3 minutes**
- **Data Points**: Wind speed, direction, gusts, temperature, humidity, pressure
- **Latency**: ~5-30 seconds from sensor to app

### 2. MesoWest (Synoptic) Stations
- **Update Frequency**: Varies by station (5-60 minutes)
- **App Refresh**: Every **3 minutes**
- **Typical Stations**:
  - Airport stations (KSLC, KPVU): Every 5-20 minutes
  - RAWS stations: Every 10-60 minutes
  - Research stations: Every 5-15 minutes
- **Latency**: 5-15 minutes from measurement to availability

### 3. NWS Weather Alerts
- **Update Frequency**: As issued (immediate when new alerts posted)
- **App Refresh**: Every **10 minutes**
- **Data Points**: Severe weather warnings, advisories, watches
- **Latency**: Near real-time when issued

### 4. NWS Forecasts
- **Update Frequency**: Every 1-6 hours (varies by forecast type)
- **App Refresh**: Every **30 minutes**
- **Data Points**: 7-day forecast, hourly forecast, wind predictions
- **Latency**: Forecasts are predictions, not real-time data

---

## App Refresh Intervals

| Data Type | Refresh Interval | Source |
|-----------|-----------------|--------|
| Wind Data (PWS + MesoWest) | 3 minutes | `useLakeData.js` |
| Wind History | 10 minutes | `useLakeData.js` |
| NWS Alerts | 10 minutes | `SevereWeatherAlerts.jsx` |
| NWS Forecasts | 30 minutes | `WeatherForecast.jsx` |
| Learning System - Actuals | 15 minutes | `DataCollector.js` |
| Learning System - Predictions | 1 hour | `DataCollector.js` |
| Learning System - Indicators | 6 hours | `DataCollector.js` |
| Model Retraining | 24 hours | `DataCollector.js` |

---

## Station-Specific Update Rates

### Utah Lake Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Zig Zag PWS | Ambient Weather | Real-time |
| Flight Park South (FPS) | MesoWest | 5-10 min |
| Flight Park North (UTALP) | MesoWest | 5-10 min |
| KSLC (SLC Airport) | Aviation | 5-20 min |
| KPVU (Provo Airport) | Aviation | 5-20 min |
| Spanish Fork (QSF) | MesoWest | 10-15 min |

### Deer Creek Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Arrowhead (SND) | MesoWest | 10-15 min |
| Heber Airport (KHCR) | Aviation | 5-20 min |
| Soldier Hollow | MesoWest | 10-15 min |

### Willard Bay Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Hill AFB (KHIF) | Aviation | 5-20 min |
| Ogden Airport (KOGD) | Aviation | 5-20 min |
| Ben Lomond | MesoWest | 15-30 min |

---

## Data Freshness Indicators

The app shows data freshness status:

| Status | Color | Meaning |
|--------|-------|---------|
| **Live** | Green | Data updated within last 3 minutes |
| **Updating** | Yellow | Data is 3-6 minutes old, refresh in progress |
| **Stale** | Orange | Data is 6+ minutes old |
| **Offline** | Red | Unable to fetch new data |

---

## Manual Refresh

Users can manually refresh data at any time by:
1. Clicking the refresh button in the header
2. Clicking the refresh button in the Data Freshness panel
3. Pull-to-refresh on mobile (when PWA installed)

---

## API Rate Limits

### MesoWest (Synoptic)
- **Limit**: 10,000 requests/day (free tier)
- **App Usage**: ~500-1000 requests/day typical
- **Mitigation**: Caching, batched requests

### NWS
- **Limit**: No hard limit, but requests throttled if excessive
- **App Usage**: ~150 requests/day
- **Mitigation**: 10-30 minute refresh intervals

### Ambient Weather
- **Limit**: 1 request/second
- **App Usage**: ~500 requests/day
- **Mitigation**: 3-minute refresh interval

---

## Offline Behavior

When offline:
1. Last known data is displayed
2. "Offline" indicator shown
3. Cached forecasts remain available
4. Learning system pauses data collection
5. Manual refresh attempts reconnection

---

## Best Practices for Users

1. **For real-time decisions**: Check the "Last Updated" timestamp
2. **For planning**: Use forecast data (updated less frequently but predictive)
3. **Before heading out**: Do a manual refresh to get latest data
4. **During sessions**: App auto-refreshes every 3 minutes

---

*Data freshness is critical for wind sports safety. Always verify conditions match predictions before committing to the water.*
