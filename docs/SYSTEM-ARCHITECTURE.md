# Utah Wind Pro - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Confidence│  │ Thermal  │  │  North   │  │   Wind   │  │  5-Day   │      │
│  │  Gauge   │  │ Forecast │  │   Flow   │  │   Map    │  │ Forecast │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PREDICTION ENGINE                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ThermalPredictor.js                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Thermal    │  │  North Flow  │  │   Gap Wind   │               │   │
│  │  │  Prediction  │  │  Prediction  │  │  Prediction  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │         │                  │                  │                      │   │
│  │         └──────────────────┼──────────────────┘                      │   │
│  │                            ▼                                         │   │
│  │              ┌─────────────────────────┐                            │   │
│  │              │  Combined Probability   │                            │   │
│  │              │  (Weighted by factors)  │                            │   │
│  │              └─────────────────────────┘                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA NORMALIZATION                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DataNormalizer.js                               │   │
│  │                                                                      │   │
│  │  Raw API Data ──► Normalized LakeState Object                       │   │
│  │                                                                      │   │
│  │  • Extract indicator station data (KSLC, KPVU, QSF, UTALP)         │   │
│  │  • Calculate pressure gradient (SLC - Provo)                        │   │
│  │  • Calculate thermal delta (shore - ridge)                          │   │
│  │  • Normalize wind vectors                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA SOURCES                                      │
│                                                                              │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │   MesoWest API      │              │  Ambient Weather    │              │
│  │   (Synoptic)        │              │      API            │              │
│  │                     │              │                     │              │
│  │  • KSLC (SLC)       │              │  • Your PWS         │              │
│  │  • KPVU (Provo)     │              │    (Saratoga)       │              │
│  │  • QSF (Span Fork)  │              │                     │              │
│  │  • UTALP (PotM)     │              │                     │              │
│  │  • FPS (Flight Pk)  │              │                     │              │
│  │  • SND (Arrowhead)  │              │                     │              │
│  └─────────────────────┘              └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Indicator Flow Diagram

```
                    UPSTREAM INDICATORS
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌────────┐           ┌────────┐           ┌────────┐
│  QSF   │           │  KSLC  │           │  KPVU  │
│Spanish │           │  SLC   │           │ Provo  │
│ Fork   │           │Airport │           │Airport │
└────────┘           └────────┘           └────────┘
    │                      │                      │
    │ 2hr lead             │ 1hr lead             │ 1hr lead
    │                      │                      │
    │ SE Thermal           │ North Flow           │ North Flow
    │                      │                      │ (Southern)
    ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    UTAH LAKE LAUNCHES                       │
│                                                             │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│   │  MM19   │  │ Zig Zag │  │Vineyard │  │  Sandy  │       │
│   │ (North) │  │(N-Cent) │  │(Central)│  │ (South) │       │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                              │              │
│                                          ┌───┴───┐          │
│                                          │Lincoln│          │
│                                          │(South)│          │
│                                          └───────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │   UTALP    │
                    │  Point of  │
                    │  Mountain  │
                    └────────────┘
                           │
                           │ Gap Wind
                           │ Confirmation
                           ▼
                    ┌────────────┐
                    │  Funneling │
                    │   Effect   │
                    └────────────┘
```

## Prediction Logic Flow

```
                         START
                           │
                           ▼
              ┌────────────────────────┐
              │  Fetch Current Data    │
              │  from all indicators   │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  For each indicator:   │
              │  1. Check direction    │
              │  2. Check speed        │
              │  3. Look up validated  │
              │     correlation        │
              └────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Thermal   │  │   North    │  │    Gap     │
    │ Indicator  │  │   Flow     │  │   Wind     │
    │   (QSF)    │  │  (KSLC/    │  │  (UTALP)   │
    │            │  │   KPVU)    │  │            │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Direction  │  │ Direction  │  │ Direction  │
    │ in range?  │  │ in range?  │  │ in range?  │
    │  (SE)      │  │   (N)      │  │   (N)      │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
      Yes  │          Yes  │          Yes  │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Speed    │  │   Speed    │  │   Speed    │
    │ > threshold│  │ > threshold│  │ > threshold│
    │   (6mph)   │  │   (8mph)   │  │   (8mph)   │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
      Yes  │          Yes  │          Yes  │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Look up    │  │ Look up    │  │ Look up    │
    │ validated  │  │ validated  │  │ validated  │
    │correlation │  │correlation │  │correlation │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Combine Predictions  │
              │                        │
              │  • Multiple indicators │
              │    agreeing = higher   │
              │    confidence          │
              │                        │
              │  • Pressure gradient   │
              │    confirms mechanism  │
              │                        │
              │  • Select best for     │
              │    specific launch     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Output Prediction    │
              │                        │
              │  • Expected speed      │
              │  • Foil kiteable %     │
              │  • Twin tip kiteable % │
              │  • Lead time           │
              │  • Confidence level    │
              └────────────────────────┘
                           │
                           ▼
                          END
```

## Data Model

### LakeState Object

```javascript
{
  // Location info
  lakeId: 'utah-lake-zigzag',
  lakeName: 'Utah Lake - Zig Zag',
  
  // Current conditions at target
  currentWind: {
    speed: 12.5,
    direction: 135,
    gust: 18.2,
  },
  
  // Indicator station data
  indicators: {
    spanishFork: {
      stationId: 'QSF',
      speed: 8.2,
      direction: 125,
      status: 'active',
    },
    saltLakeCity: {
      stationId: 'KSLC',
      speed: 10.5,
      direction: 350,
      status: 'active',
    },
    provoAirport: {
      stationId: 'KPVU',
      speed: 11.2,
      direction: 355,
      status: 'active',
    },
    pointOfMountain: {
      stationId: 'UTALP',
      speed: 14.8,
      direction: 5,
      status: 'active',
    },
  },
  
  // Calculated metrics
  pressureGradient: 1.8,  // SLC - Provo (mb)
  thermalDelta: 12.5,     // Shore - Ridge (°F)
  
  // Predictions
  prediction: {
    probability: 78,
    windType: 'north_flow',
    expectedSpeed: 15.5,
    foilKiteablePct: 81,
    twinTipKiteablePct: 50,
    startTime: '14:30',
    confidence: 'high',
    
    // Individual indicator predictions
    thermal: { status: 'inactive', message: '...' },
    northFlow: { status: 'strong', message: '...', expectedSpeed: 15.5 },
    provoIndicator: { status: 'strong', message: '...', expectedSpeed: 17.8 },
    pointOfMountain: { status: 'active', message: '...' },
  },
}
```

## File Structure

```
utah-wind-app/
├── src/
│   ├── components/
│   │   ├── ConfidenceGauge.jsx    # Main probability display
│   │   ├── ThermalForecast.jsx    # Detailed prediction breakdown
│   │   ├── WindMap.jsx            # Interactive map with indicators
│   │   ├── NorthFlowGauge.jsx     # North flow specific display
│   │   ├── ForecastPanel.jsx      # Multi-day forecast
│   │   └── ...
│   │
│   ├── services/
│   │   ├── ThermalPredictor.js    # Core prediction logic
│   │   ├── DataNormalizer.js      # API data normalization
│   │   ├── WeatherService.js      # API calls
│   │   └── ...
│   │
│   ├── config/
│   │   ├── indicatorSystem.js     # Indicator configurations
│   │   ├── lakeStations.js        # Station definitions
│   │   └── ...
│   │
│   └── App.jsx                    # Main application
│
├── scripts/
│   ├── templates/
│   │   └── analyze-new-location.js  # Template for new locations
│   ├── analyze-spanish-fork-correlation.js
│   ├── analyze-north-flow-indicators.js
│   ├── validate-kslc-threshold.js
│   └── ...
│
├── docs/
│   ├── PREDICTION-METHODOLOGY.md  # How the system works
│   └── SYSTEM-ARCHITECTURE.md     # This file
│
└── ...
```

## Adding a New Location

1. **Create analysis script** from template
   ```bash
   cp scripts/templates/analyze-new-location.js scripts/analyze-bear-lake.js
   ```

2. **Configure target location** in the script

3. **Run analysis** to find and validate indicators
   ```bash
   node scripts/analyze-bear-lake.js
   ```

4. **Add validated indicators** to `indicatorSystem.js`

5. **Add launch locations** to `lakeStations.js`

6. **Update UI components** to display new location

## Key Principles

1. **Data-Driven**: All predictions based on validated historical correlations
2. **Upstream Indicators**: Find stations that show patterns before they reach target
3. **Validated Thresholds**: Don't just correlate - validate that predictions are actionable
4. **Location-Specific**: Different launches may have different best indicators
5. **Multiple Confirmation**: Higher confidence when multiple indicators agree
