# Forecast Integration Methodology

## Overview

This document describes how we integrate NWS (National Weather Service) forecasts and weather warnings with our indicator-based prediction model to provide multi-day wind forecasts.

---

## Data Sources

### 1. NWS Forecast API
- **7-day forecast**: General weather conditions, wind speed/direction
- **Hourly forecast**: Detailed hour-by-hour wind predictions
- **Grid data**: Raw numerical forecast data

### 2. NWS Alerts API
- **Wind advisories**: Official wind warnings
- **Storm warnings**: Approaching weather systems
- **Special weather statements**: Unusual conditions

### 3. Our Indicator Stations
- **Real-time validation**: Compare forecast to actual conditions
- **Historical correlation**: How accurate are NWS forecasts for our locations?

---

## Weather Pattern Classification

We classify NWS forecast text into wind patterns relevant to kiting:

### North Flow Pattern
**NWS Keywords**: "north wind", "northerly", "cold front", "high pressure building"

**What it means for kiting**:
- Strong, consistent north wind
- Excellent for Utah Lake (all launches)
- Usually afternoon/evening timing
- Can last 6-12 hours

**Correlation with indicators**:
- KSLC shows north wind 1 hour before Utah Lake
- Pressure gradient (SLC > Provo) confirms pattern
- UTALP shows gap wind funneling

### South Storm Pattern
**NWS Keywords**: "south wind", "southerly", "low pressure", "storm"

**What it means for kiting**:
- Variable, often gusty conditions
- Can be strong but unpredictable
- Usually associated with precipitation
- Generally poor for kiting (safety concerns)

**Correlation with indicators**:
- Pressure gradient (Provo > SLC)
- KPVU shows south wind
- Often rapid changes

### Thermal Pattern
**NWS Keywords**: "sunny", "clear", "light wind", "high pressure"

**What it means for kiting**:
- SE thermal development likely
- Best window: 1pm - 5pm
- Requires clear skies and heating
- Moderate confidence (weather-dependent)

**Correlation with indicators**:
- QSF (Spanish Fork) shows SE wind 2 hours before
- Neutral pressure gradient
- Morning calm at KSLC

### Wind Advisory Pattern
**NWS Keywords**: "wind advisory", "high wind warning", "gusty"

**What it means for kiting**:
- Potentially dangerous conditions
- Often too strong or gusty
- Exercise extreme caution
- May be associated with frontal passage

**Correlation with indicators**:
- Rapid pressure changes (> 4mb in 6 hours)
- KSLC sustained 25+ mph
- Large gusts at all stations

---

## Forecast-to-Indicator Correlation

### The Validation Loop

```
NWS Forecast ──────────────────────────────────────────┐
    │                                                   │
    │ "North wind 15-20 mph Thursday afternoon"        │
    │                                                   │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           FORECAST ANALYSIS                      │    │
│                                                  │    │
│  Pattern: North Flow                            │    │
│  Expected: Strong north wind                    │    │
│  Timing: Thursday 2pm-8pm                       │    │
│  Confidence: 70% (NWS forecast)                 │    │
└─────────────────────────────────────────────────┘    │
    │                                                   │
    │ As time approaches...                            │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           INDICATOR VALIDATION                   │    │
│                                                  │    │
│  KSLC: 12 mph N at 1pm ✓ Confirms forecast     │    │
│  UTALP: 15 mph N at 1pm ✓ Gap wind active      │    │
│  Pressure: SLC > Provo by 2.5mb ✓              │    │
│                                                  │    │
│  → Confidence boosted to 90%                    │    │
└─────────────────────────────────────────────────┘    │
    │                                                   │
    │ After event...                                   │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           ACCURACY TRACKING                      │    │
│                                                  │    │
│  Forecast: 15-20 mph N                          │    │
│  Actual: 18 mph N at Zig Zag                    │    │
│  Timing: 2:30pm - 7pm                           │    │
│                                                  │    │
│  → Forecast was ACCURATE                        │◄───┘
│  → Log for future model improvement             │
└─────────────────────────────────────────────────┘
```

### Confidence Levels

| Source | Base Confidence | Notes |
|--------|-----------------|-------|
| NWS 7-day forecast | 50-60% | General pattern only |
| NWS 3-day forecast | 65-75% | More reliable timing |
| NWS 24-hour forecast | 75-85% | Good accuracy |
| NWS + 1 indicator confirming | 80-90% | High confidence |
| NWS + 2+ indicators confirming | 90-95% | Very high confidence |
| Wind Advisory active | 95% | NWS advisories are reliable |

---

## Multi-Day Prediction Strategy

### Day 5-7 Out
- **Source**: NWS 7-day forecast only
- **Confidence**: Low (50-60%)
- **What we show**: General pattern (north flow likely, thermal possible)
- **Actionable**: "Keep an eye on this day"

### Day 3-4 Out
- **Source**: NWS forecast + historical pattern matching
- **Confidence**: Medium (65-75%)
- **What we show**: Expected wind type, approximate timing
- **Actionable**: "Plan tentatively"

### Day 1-2 Out
- **Source**: NWS hourly forecast + indicator trends
- **Confidence**: Medium-High (75-85%)
- **What we show**: Specific kite windows, expected speeds
- **Actionable**: "Make plans"

### Day Of (Morning)
- **Source**: NWS hourly + current indicator readings
- **Confidence**: High (85-95%)
- **What we show**: Confirmed windows, real-time updates
- **Actionable**: "Go/No-go decision"

### 1-2 Hours Before
- **Source**: Current indicator readings
- **Confidence**: Very High (90-98%)
- **What we show**: Validated prediction with expected arrival time
- **Actionable**: "Head to the beach"

---

## Weather Event Effects on Surface Wind

### Cold Front Passage

**Before Front (6-12 hours)**:
- Pressure starts dropping
- South/SW wind may increase
- Clouds building

**During Front (1-2 hours)**:
- Rapid wind shift to N/NW
- Strongest gusts
- Possible precipitation

**After Front (6-24 hours)**:
- Sustained north wind
- Pressure rising
- Clearing skies
- **BEST KITING WINDOW**

### Low Pressure System

**Approach (24-48 hours)**:
- Increasing south wind
- Pressure dropping
- Clouds increasing

**During (6-12 hours)**:
- Variable, gusty conditions
- Precipitation likely
- **NOT SAFE FOR KITING**

**Departure (12-24 hours)**:
- Wind shifting to west/north
- Pressure rising
- May produce good north flow

### High Pressure System

**Building (24-48 hours)**:
- Light winds
- Clear skies
- Pressure rising

**Peak (12-24 hours)**:
- Calm mornings
- Thermal development afternoon
- **GOOD FOR THERMAL KITING**

**Weakening**:
- Thermals may be weaker
- Watch for approaching systems

---

## Implementation

### ForecastService.js

```javascript
// Key functions:

// Fetch and parse NWS alerts
getActiveAlerts()

// Get 7-day forecast with wind analysis
get7DayForecast(locationId)

// Get hourly forecast for detailed windows
getHourlyForecast(locationId)

// Find kite windows in forecast
getKiteWindows(locationId)

// Combined summary with alerts
getForecastSummary(locationId)

// Correlate forecast with current indicators
correlateForecastWithIndicators(forecastAnalysis, currentIndicators)
```

### WeatherForecast.jsx Component

Displays:
- Active weather alerts
- Next kite window
- 5-day forecast with kite windows
- Expandable daily details
- Wind pattern analysis

---

## Accuracy Tracking (Future Enhancement)

To improve predictions over time, we should track:

1. **Forecast vs Actual**
   - What did NWS predict?
   - What actually happened?
   - How far off was timing/speed?

2. **Indicator Lead Time Accuracy**
   - Did KSLC predict Utah Lake wind correctly?
   - Was the 1-hour lead time accurate?

3. **Pattern Recognition**
   - Which NWS phrases correlate with good kiting?
   - Are there seasonal patterns?

4. **Model Refinement**
   - Adjust confidence levels based on accuracy
   - Identify systematic biases

---

## Example: Reading a Forecast

**NWS Forecast**: "Thursday: Sunny, with a high near 65. North wind 10 to 15 mph, with gusts as high as 25 mph."

**Our Analysis**:
1. **Pattern**: North Flow (keywords: "north wind", "sunny")
2. **Speed**: 10-15 mph sustained, 25 mph gusts → Good for kiting
3. **Timing**: Daytime → Likely afternoon peak
4. **Confidence**: 70% (NWS forecast alone)

**Indicator Validation** (Thursday morning):
- KSLC: 8 mph N at 10am ✓
- Pressure: SLC > Provo by 2mb ✓
- **Confidence boosted to 90%**

**Final Prediction**:
- **Kite Window**: Thursday 1pm - 6pm
- **Expected Speed**: 12-18 mph at Zig Zag
- **Type**: North Flow
- **Foil Kiteable**: 85%
- **Twin Tip Kiteable**: 60%

---

*This methodology combines NWS forecasting expertise with our validated local indicator correlations to provide the most accurate multi-day wind predictions possible.*
