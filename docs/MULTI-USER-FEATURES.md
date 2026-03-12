# Utah Wind Pro - Multi-User Features

## Overview

Utah Wind Pro now supports multiple user types with activity-specific views and metrics.

---

## Activity Modes

### 🪁 Kiting Mode (Default)
**Target Users**: Kiteboarders, Kite Foilers

**Key Metrics**:
- Thermal Probability Gauge
- Foil (10+ mph) vs Twin Tip (15+ mph) indicators
- Kite Safety (onshore/side-on/offshore)
- North Flow indicators

**Ideal Conditions**: 10-25 mph, onshore or side-on wind

---

### ⛵ Sailing Mode
**Target Users**: Sailing Clubs, Regatta Organizers, Dinghy Sailors

**Key Metrics**:
- Racing Wind Probability
- Wind Consistency Score (how steady is the wind?)
- Gust Factor (gust/sustained ratio)
- Wind Shift Prediction
- Course Setup Recommendations

**Special Features**:
- **Race Day Mode**: Multi-hour window analysis
- Start line favored end prediction
- Windward mark direction
- Reefing recommendations

**Ideal Conditions**: 8-18 mph, steady direction, low gust factor

---

### 🚤 Boating Mode
**Target Users**: Powerboaters, Fishermen, Recreational Cruisers

**Key Metrics**:
- **Glass Score** (0-100, higher = calmer)
- Wave/Chop Estimate
- Morning Calm Window Duration
- "Get off water by" time

**Glass Score Levels**:
| Score | Status | Conditions |
|-------|--------|------------|
| 90-100 | Glass | Mirror-flat water |
| 70-89 | Excellent | Light ripples only |
| 50-69 | Good | Light chop (<6") |
| 30-49 | Moderate | Noticeable waves |
| 10-29 | Choppy | 1-2 ft waves |
| 0-9 | Rough/Dangerous | Stay off water |

**Ideal Conditions**: 0-8 mph, early morning

---

### 🏄 Paddling Mode
**Target Users**: SUP, Kayakers, Canoeists

**Key Metrics**:
- Glass Score (same as boating)
- Calm Hours Remaining
- Return Trip Safety
- Afternoon Warning

**Ideal Conditions**: 0-6 mph, morning hours

---

## New Components

### Activity Mode Selector
Located in the header, allows quick switching between:
- Kiting
- Sailing
- Boating
- Paddling

Each mode adjusts:
- Primary gauge (Thermal Probability vs Glass Score)
- Thresholds for "good" conditions
- Recommendations and alerts
- Color coding

### Activity Score Banner
Shows current conditions score for selected activity:
- Green (70%+): Excellent conditions
- Yellow (40-69%): Fair conditions
- Red (<40%): Poor conditions

Includes gust warning when gusty conditions detected.

### Glass Score Gauge
For boating/paddling modes:
- Inverse of wind probability
- Wave estimate
- Morning calm window countdown
- Visual wave animation based on conditions

### Hourly Timeline
Shows predicted conditions throughout the day:
- Color-coded bars for each hour
- Current hour highlighted
- Phase indicators (calm, building, peak, fading)
- Best window recommendation

### Weekly Best Days
7-day outlook showing:
- Best day for selected activity
- Daily scores
- Weather icons
- Best activity icon for each day

### Race Day Mode (Sailing)
Specialized view for regatta planning:
- Wind statistics (avg, min, max, range)
- Consistency meter
- Trend indicator
- Course setup recommendations
- Start line favored end
- Gust warnings

---

## Data Sources

All features use existing data from:
- Ambient Weather (PWS) - real-time local conditions
- MesoWest (Synoptic) - regional stations
- NWS - forecasts and alerts
- Historical analysis - pattern recognition

---

## Configuration

### Activity Thresholds

```javascript
// Kiting
tooLight: 8 mph
ideal: 12-22 mph
tooStrong: 30 mph

// Sailing
tooLight: 4 mph
ideal: 8-18 mph
racingIdeal: 10-15 mph
tooStrong: 25 mph

// Boating (inverse - want calm)
ideal: 0-8 mph
choppy: 10+ mph
rough: 15+ mph

// Paddling
ideal: 0-6 mph
manageable: 10 mph
difficult: 15+ mph
```

---

## Future Enhancements

### EMS/Safety Mode (Planned)
- Hazard level indicator
- Max gust prediction
- Helicopter ops windows
- Fire weather index
- Visibility forecast

### Windsurfing Mode (Planned)
- Lower wind thresholds
- Sail size calculator
- Overpowered warnings

### Route Analysis (Planned)
- Headwind/tailwind for paddlers
- Return trip safety
- Direction relative to route

---

## Usage Examples

### Sailing Club Planning a Regatta
1. Select ⛵ Sailing mode
2. Check Weekly Best Days for best race day
3. On race day, use Race Day Mode
4. Set race start time
5. Review consistency and course recommendations

### Fisherman Planning a Trip
1. Select 🚤 Boating mode
2. Check Glass Score (want 80+)
3. Note Morning Calm Window duration
4. Plan to be off water before thermal starts

### SUP Group Outing
1. Select 🏄 Paddling mode
2. Check Glass Score and calm hours
3. Note "Get off water by" time
4. Monitor Hourly Timeline for wind buildup

---

*Utah Wind Pro - Professional forecasting for every water sport.*
