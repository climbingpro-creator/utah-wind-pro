# Wind Prediction Methodology

## Overview

This document describes the data-driven methodology for building wind prediction models for kiting/sailing locations. The approach uses **upstream indicator stations** to predict wind conditions at a target location with **validated lead times**.

---

## Core Concept: The Indicator Station Model

### The Problem
You want to know if wind will be good at your kiting spot **before you drive there**.

### The Solution
Find weather stations **upstream** of your location that show wind patterns **before** the wind arrives at your spot.

```
[Upstream Indicator] ---(lead time)---> [Your Kiting Spot]
     KSLC (SLC)         ~1 hour           Zig Zag
     QSF (Spanish Fork)  ~2 hours          Zig Zag
     KPVU (Provo)        ~1 hour           Lincoln Beach
```

---

## Step-by-Step Methodology

### Step 1: Identify Your Target Location
- Define the exact kiting/sailing spot
- Get historical wind data (ideally 1+ years)
- Identify the **primary wind types** that create kiteable conditions:
  - **Thermal winds** (lake/land heating differential)
  - **Prefrontal/North flows** (pressure gradient driven)
  - **Gap winds** (terrain funneling)
  - **Canyon winds** (drainage/upslope)

### Step 2: Find Candidate Indicator Stations
Look for weather stations that are:

1. **Upstream of the wind flow**
   - For thermals: Look toward the heat source (mountains, canyons)
   - For north flows: Look toward the pressure source (north/Great Salt Lake)
   - For gap winds: Look at the gap entrance

2. **At appropriate distance**
   - Too close = no lead time
   - Too far = correlation breaks down
   - Sweet spot: 10-50 miles depending on wind type

3. **Reliable data source**
   - MesoWest/Synoptic stations
   - Airport ASOS/AWOS (KSLC, KPVU, etc.)
   - Personal weather stations (PWS)

### Step 3: Analyze Historical Correlation

Run the correlation analysis:

```javascript
// Pseudocode for correlation analysis
for each day in historical_data:
  if target_station shows good_kite_wind:
    mark as "good day"
    record first_hour of good wind
    
for each indicator_station:
  for each good_day:
    check indicator 1, 2, 3, 4 hours BEFORE target
    record: speed, direction, correlation
    
  calculate:
    - % of good days where indicator showed signal
    - average indicator speed when target was good
    - average target speed when indicator shows X mph
```

### Step 4: Validate the Correlation

**Critical Step**: Don't just find correlation - validate it predicts **kiteable conditions**.

```
When [Indicator] shows [X mph] from [direction]:
  → What is the ACTUAL speed at [Target] 1 hour later?
  → What % of the time is it foil-kiteable (10+ mph)?
  → What % of the time is it twin-tip kiteable (15+ mph)?
```

Example validation table:

| Indicator Speed | Target Avg Speed | Foil Kiteable | Twin Tip Kiteable |
|-----------------|------------------|---------------|-------------------|
| 5-8 mph         | 9.3 mph          | 45%           | 14%               |
| 8-10 mph        | 12.6 mph         | 56%           | 31%               |
| 10-15 mph       | 15.5 mph         | 81%           | 50%               |
| 15+ mph         | 23.4 mph         | 100%          | 100%              |

### Step 5: Set Meaningful Thresholds

Based on validation, set thresholds that predict **actionable** conditions:

```javascript
const INDICATOR_THRESHOLDS = {
  // Don't alert at 5 mph if only 45% chance of kiteable
  minimum: 8,      // 56%+ foil kiteable - worth watching
  moderate: 10,    // 81%+ foil kiteable - likely good
  strong: 15,      // 100% kiteable - definitely go
};
```

---

## Wind Type Patterns

### Pattern 1: Thermal Winds (SE at Utah Lake)

**Mechanism**: Sun heats land faster than water → air rises over land → cooler lake air flows in

**Indicator Strategy**:
- Look for stations in the **heating zone** (canyons, valleys)
- Spanish Fork Canyon (QSF) heats up and shows SE wind ~2 hours before Utah Lake

**Key Metrics**:
- Direction: Must be from the thermal source (SE for Utah Lake)
- Speed: Indicates strength of heating differential
- Time of day: Thermals build mid-morning, peak early afternoon

```
Spanish Fork Canyon (QSF)
  ↓ SE wind at 6+ mph
  ↓ ~2 hour lead time
Utah Lake (Zig Zag)
  → SE thermal arrives
```

### Pattern 2: Prefrontal/North Flows

**Mechanism**: High pressure to the north pushes air south through terrain gaps

**Indicator Strategy**:
- Look for stations **north** of your location
- Look for stations at **gap entrances** (Point of Mountain)
- Monitor **pressure gradient** (SLC - Provo)

**Key Metrics**:
- Direction: Must be from the north (315-45°)
- Pressure gradient: Positive (SLC > Provo) confirms north flow
- Gap wind speed: Shows funneling effect

```
Salt Lake City (KSLC)     Pressure Gradient
  ↓ N wind at 8+ mph        SLC > Provo
  ↓ ~1 hour lead time         ↓
Point of Mountain (UTALP)    Confirms
  ↓ Gap funneling             north flow
  ↓                           ↓
Utah Lake                   Strong signal
```

### Pattern 3: Location-Specific Indicators

**Concept**: Different launch sites may have different best indicators

**Example**: Utah Lake has 5 launches spanning 20+ miles north-south

| Launch | Best Indicator | Why |
|--------|----------------|-----|
| Lincoln Beach (south) | KPVU (Provo) | Closest upstream station |
| Sandy Beach (south) | KPVU (Provo) | Same - southern indicator |
| Vineyard (central) | KSLC + UTALP | Between north and south |
| Zig Zag (north-central) | KSLC | North flow comes from SLC |
| MM19 (north) | KSLC + UTALP | Gap wind important |

---

## Implementation Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WEATHER DATA SOURCES                      │
├─────────────────────────────────────────────────────────────┤
│  MesoWest API          Ambient Weather API                  │
│  (KSLC, KPVU, QSF,     (Your PWS)                          │
│   UTALP, FPS, etc.)                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA NORMALIZER                           │
├─────────────────────────────────────────────────────────────┤
│  - Fetch all relevant stations                              │
│  - Extract indicator station data (KSLC, KPVU, QSF, UTALP)  │
│  - Calculate pressure gradient                              │
│  - Calculate thermal delta                                  │
│  - Package into normalized LakeState object                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    THERMAL PREDICTOR                         │
├─────────────────────────────────────────────────────────────┤
│  For each indicator:                                        │
│    1. Check direction (is it the right wind type?)          │
│    2. Check speed (above threshold?)                        │
│    3. Look up validated correlation                         │
│    4. Calculate expected speed at target                    │
│    5. Calculate kiteable probability                        │
│                                                             │
│  Combine indicators:                                        │
│    - Multiple indicators agreeing = higher confidence       │
│    - Pressure gradient confirms mechanism                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
├─────────────────────────────────────────────────────────────┤
│  - Show each indicator status                               │
│  - Show expected speed at target                            │
│  - Show kiteable probability (foil vs twin tip)             │
│  - Show lead time ("expect wind in ~1 hour")                │
│  - Color code by confidence level                           │
└─────────────────────────────────────────────────────────────┘
```

### Indicator Configuration Structure

```javascript
const INDICATOR_CONFIG = {
  station: 'KSLC',                    // MesoWest station ID
  stationName: 'Salt Lake City',      // Human-readable name
  coordinates: { lat: 40.78, lng: -111.97 },
  elevation: 4226,
  
  // What this indicator predicts
  windType: 'north_flow',             // 'thermal', 'north_flow', 'gap_wind'
  bestFor: ['utah-lake-zigzag'],      // Which launches this is best for
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: { min: 315, max: 45, label: 'N (NW to NE)' },
    speed: { min: 8, threshold: 10 },
  },
  
  // VALIDATED correlation (from historical analysis)
  speedCorrelation: {
    '5-8':   { avgTarget: 9.3,  foilKiteable: 45, twinTipKiteable: 14 },
    '8-10':  { avgTarget: 12.6, foilKiteable: 56, twinTipKiteable: 31 },
    '10-15': { avgTarget: 15.5, foilKiteable: 81, twinTipKiteable: 50 },
    '15+':   { avgTarget: 23.4, foilKiteable: 100, twinTipKiteable: 100 },
  },
};
```

---

## Analysis Scripts

### Script 1: Find Candidate Stations

```javascript
// Search for stations near your target location
// Filter by elevation, data availability, distance
searchStations(targetLat, targetLng, radiusMiles);
```

### Script 2: Identify Good Wind Days

```javascript
// Analyze target station history
// Identify days with kiteable conditions
// Record timing (first hour, peak hour, duration)
identifyGoodDays(targetStation, minSpeed, direction);
```

### Script 3: Correlate Indicators

```javascript
// For each candidate indicator:
// Check what it showed 1, 2, 3, 4 hours before good wind
// Calculate correlation strength
correlateIndicator(indicatorStation, targetGoodDays, leadHours);
```

### Script 4: Validate Correlation

```javascript
// CRITICAL: Validate that indicator predicts KITEABLE conditions
// Not just correlation, but actionable predictions
validateCorrelation(indicator, target, speedBuckets);

// Output:
// When indicator shows 8-10 mph N:
//   Target avg: 12.6 mph
//   Foil kiteable: 56%
//   Twin tip kiteable: 31%
```

---

## Applying to New Locations

### Checklist for New Location

1. **Define target location**
   - [ ] Exact coordinates
   - [ ] Primary wind types (thermal, frontal, gap, etc.)
   - [ ] Kiteable direction(s)
   - [ ] Shore orientation (for safety)

2. **Get historical data**
   - [ ] Target station (or nearby proxy)
   - [ ] At least 6 months, ideally 1+ year
   - [ ] Include seasonal variation

3. **Find indicator candidates**
   - [ ] Search upstream of each wind type
   - [ ] Check data availability
   - [ ] Verify reasonable distance (10-50 miles)

4. **Run correlation analysis**
   - [ ] Identify good wind days at target
   - [ ] Check each indicator at 1, 2, 3, 4 hour lead
   - [ ] Find best lead time for each indicator

5. **Validate predictions**
   - [ ] For each speed bucket at indicator
   - [ ] Calculate actual target speed
   - [ ] Calculate kiteable percentages
   - [ ] Set meaningful thresholds

6. **Implement in app**
   - [ ] Add indicator configuration
   - [ ] Add to data fetching
   - [ ] Add to prediction logic
   - [ ] Add to UI display

---

## Example: Deer Creek Reservoir

### Wind Type: SW Canyon Thermal

**Mechanism**: Provo Canyon heats → air rises → draws wind up canyon from Utah Valley

**Indicator Found**: Arrowhead Summit (SND) at 8,252 ft
- Shows SSW wind (200-230°) at 12-18 mph
- ~60-90 minutes before thermal reaches Deer Creek Dam

**Validated Correlation**:
| Arrowhead Speed | Dam Thermal Probability |
|-----------------|------------------------|
| < 10 mph        | < 4%                   |
| 10-12 mph       | 13%                    |
| 12-15 mph       | 25%                    |
| 15+ mph         | 30%                    |

---

## Key Learnings

1. **Correlation ≠ Prediction**: Finding that indicator correlates with target is not enough. Must validate that indicator predicts **kiteable** conditions.

2. **Thresholds matter**: A 5 mph threshold that only predicts 45% kiteable is not actionable. Set thresholds that give confidence.

3. **Location-specific indicators**: Different launches at the same lake may have different best indicators. Southern launches → southern indicators.

4. **Multiple indicators = confidence**: When KSLC, UTALP, and pressure gradient all agree → high confidence.

5. **Lead time is gold**: The whole point is knowing **before** you drive. 1-2 hour lead time is the sweet spot.

---

## Future Enhancements

1. **Machine learning model**: Train on historical data to weight multiple indicators optimally

2. **Confidence scoring**: Combine indicator agreement into single confidence score

3. **Notification system**: Alert when indicators cross thresholds

4. **Historical accuracy tracking**: Log predictions vs actual, improve over time

5. **Community validation**: Let users report actual conditions, refine model

---

*This methodology was developed for Utah Wind Pro, analyzing Utah Lake, Deer Creek, and Willard Bay. The same approach can be applied to any wind-dependent water sport location.*
