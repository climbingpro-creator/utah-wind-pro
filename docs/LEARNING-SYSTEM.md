# Learning System Documentation

## Overview

The Utah Wind Pro Learning System is a self-improving prediction engine that continuously collects data, validates predictions, and adjusts model weights to improve accuracy over time.

---

## How It Works

### The Learning Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS LEARNING LOOP                         │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  PREDICT │────▶│  RECORD  │────▶│  VERIFY  │────▶│  SCORE   │
    └──────────┘     └──────────┘     └──────────┘     └──────────┘
         ▲                                                    │
         │                                                    ▼
    ┌──────────┐                                        ┌──────────┐
    │  APPLY   │◀───────────────────────────────────────│  LEARN   │
    └──────────┘                                        └──────────┘
```

1. **PREDICT**: Make prediction using current model weights
2. **RECORD**: Store prediction with timestamp and conditions
3. **VERIFY**: Compare prediction to actual outcome (1-2 hours later)
4. **SCORE**: Calculate accuracy metrics
5. **LEARN**: Analyze errors and adjust model weights
6. **APPLY**: Use new weights for future predictions

---

## Data Collection Schedule

| Interval | Action | Purpose |
|----------|--------|---------|
| 15 minutes | Collect actuals | Record real weather data from all stations |
| 1 hour | Record predictions | Store current predictions for verification |
| 1 hour | Verify predictions | Compare past predictions to actual outcomes |
| 6 hours | Indicator analysis | Track indicator-to-target correlations |
| 24 hours | Learning cycle | Analyze errors and update model weights |

---

## What Gets Collected

### 1. Actual Weather Data
Every 15 minutes, we record from all stations:
- Wind speed and direction
- Wind gusts
- Temperature
- Pressure
- Derived: isKiteable, isNorthFlow, isSEThermal

### 2. Predictions
Every hour, we record:
- Probability score
- Expected wind type (thermal, north_flow, etc.)
- Expected speed and direction
- Foil/twin-tip kiteable percentages
- Current conditions (pressure gradient, thermal delta, indicator readings)

### 3. Indicator Correlations
Every 6 hours, we record:
- Indicator station readings (KSLC, KPVU, QSF, UTALP)
- Target station readings (FPS, PWS)
- Speed ratios and direction matches
- Lead time correlations

---

## Accuracy Metrics

### What We Measure

| Metric | Weight | Description |
|--------|--------|-------------|
| Speed Accuracy | 30% | How close was predicted speed to actual |
| Direction Accuracy | 20% | How close was predicted direction to actual |
| Kiteable Prediction | 30% | Did we correctly predict kiteable conditions |
| Wind Type | 20% | Did we correctly predict the wind type |

### Accuracy Calculation

```javascript
// Speed accuracy (0-100)
speedAccuracy = 100 - (|predictedSpeed - actualSpeed| × 5)

// Direction accuracy (0-100)
directionAccuracy = 100 - |predictedDirection - actualDirection|

// Overall score
overallScore = (speedAccuracy × 0.3) + (directionAccuracy × 0.2) + 
               (kiteableCorrect × 0.3) + (windTypeCorrect × 0.2)
```

---

## Learning Process

### Error Analysis

The system analyzes:

1. **Speed Bias**: Are we consistently over or under-predicting speed?
   - Positive bias = we predict too high
   - Negative bias = we predict too low
   - Correction applied to future predictions

2. **Probability Calibration**: When we say 70% chance, does it happen 70% of the time?
   - Bucket predictions by probability (0-20%, 20-40%, etc.)
   - Compare predicted rate to actual rate
   - Adjust probability scaling

3. **Time of Day Patterns**: Are we more accurate at certain hours?
   - Track accuracy by hour
   - Apply multipliers to low-accuracy hours

4. **Condition-Specific Errors**: Are we worse under certain conditions?
   - High pressure gradient
   - Strong/weak indicators
   - Different wind types

### Weight Adjustment

Based on error analysis, the system adjusts:

```javascript
newWeights = {
  // Main model weights
  pressureWeight: 0.40,    // Adjusted based on north flow accuracy
  thermalWeight: 0.40,     // Adjusted based on thermal accuracy
  convergenceWeight: 0.20, // Adjusted based on direction accuracy
  
  // Corrections
  speedBiasCorrection: -1.2,  // Subtract 1.2 mph from predictions
  
  // Indicator-specific weights
  indicators: {
    'KSLC-FPS': { weight: 0.85, speedMultiplier: 1.2 },
    'KPVU-FPS': { weight: 0.92, speedMultiplier: 1.1 },
    // ...
  },
  
  // Hourly adjustments
  hourlyMultipliers: {
    10: 1.1,  // More confident at 10am
    15: 0.8,  // Less confident at 3pm
    // ...
  },
}
```

---

## Database Schema

### IndexedDB Stores

1. **predictions**: Prediction records
   - timestamp, date, hour, lakeId
   - prediction object (probability, windType, expectedSpeed, etc.)
   - conditions object (pressureGradient, indicator readings, etc.)
   - verified, actual, accuracy

2. **actuals**: Actual weather data
   - timestamp, date, hour, minute
   - lakeId, stationId
   - windSpeed, windGust, windDirection, temperature, pressure
   - isKiteable, isNorthFlow, isSEThermal

3. **accuracy**: Accuracy scores over time
   - date, lakeId
   - speedAccuracy, directionAccuracy, overallScore
   - kiteablePredictionCorrect, windTypeCorrect

4. **modelWeights**: Learned model parameters
   - version, createdAt, basedOnSamples
   - pressureWeight, thermalWeight, convergenceWeight
   - speedBiasCorrection, indicators, hourlyMultipliers

5. **patterns**: Discovered patterns
   - type, value, confidence, description
   - discoveredAt

6. **indicators**: Indicator correlation data
   - indicatorId, targetId, leadTimeMinutes
   - indicator readings, target readings
   - speedRatio, directionMatch

---

## Minimum Data Requirements

| Milestone | Records Needed | What Happens |
|-----------|----------------|--------------|
| First learning | 50 predictions | Initial weight adjustment |
| Reliable learning | 200 predictions | Stable weight optimization |
| Pattern discovery | 500 predictions | Complex pattern detection |
| High accuracy | 1000+ predictions | Fine-tuned model |

---

## Expected Improvement Timeline

### Week 1-2: Baseline
- Collecting initial data
- No learning yet (need 50+ predictions)
- Using default weights

### Week 3-4: First Learning
- First learning cycle runs
- Initial bias corrections applied
- Accuracy starts improving

### Month 2-3: Optimization
- Multiple learning cycles completed
- Indicator weights refined
- Probability calibration improved
- Expected accuracy: 60-70%

### Month 4-6: Fine-Tuning
- Seasonal patterns learned
- Time-of-day adjustments refined
- Condition-specific corrections
- Expected accuracy: 70-80%

### Month 6+: Mature Model
- Comprehensive pattern library
- Highly calibrated predictions
- Continuous refinement
- Expected accuracy: 80-90%

---

## Manual Controls

### Force Data Collection
Click "Collect Now" to immediately:
- Fetch all station data
- Record predictions
- Verify past predictions

### Force Learning
Click "Learn Now" to immediately:
- Analyze indicator correlations
- Analyze prediction errors
- Discover patterns
- Calculate new weights

### Export Data
Click "Export" to download:
- All predictions and actuals
- Accuracy history
- Learned weights
- For backup or external analysis

---

## Viewing Learning Progress

The Learning Dashboard shows:

1. **Model Accuracy**: Current overall accuracy percentage
2. **Trend**: Improving, stable, or declining
3. **Predictions Verified**: Total predictions with accuracy data
4. **Model Version**: Current weights version
5. **Collection Stats**: Data collection activity
6. **Learned Weights**: Current model parameters

---

## Technical Notes

### Browser Storage
- Uses IndexedDB for persistent storage
- Data survives browser restarts
- Limited by browser storage quotas (~50MB typical)

### Performance
- Collection runs in background
- Minimal impact on app performance
- Learning cycle runs during low activity

### Data Retention
- Keeps all data for learning
- Consider periodic exports for backup
- Old data can be pruned if storage is limited

---

## Future Enhancements

1. **Cloud Sync**: Sync learning data across devices
2. **Community Learning**: Aggregate learning from multiple users
3. **Weather API Integration**: Correlate with NWS forecasts
4. **Machine Learning**: Neural network for pattern recognition
5. **Seasonal Models**: Separate models for different seasons

---

*The learning system is designed to continuously improve. The more you use the app, the smarter it gets!*
