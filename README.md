# Utah Wind Pro

Professional-grade thermal wind prediction app for Utah Lake, Deer Creek, and Willard Bay. Predicts optimal "Thermal Windows" for wind sports using real-time weather data and weighted probability calculations.

## Features

### Core Forecasting
- **Weighted Probability Algorithm**
  - ΔP (Pressure Gap): 40% weight
  - ΔT (Thermal Delta): 40% weight  
  - Vector Convergence: 20% weight

- **Dynamic Station Switching** - Automatically loads relevant MesoWest stations when switching between lakes

- **LakeState Normalization** - Unified data model combining PWS and Synoptic data

### UI Features
- **Confidence Gauge** - Visual 0-100% probability display
- **Factor Breakdown** - See individual scores for each variable
- **3-Hour Sparklines** - Wind trend history under each station
- **Thermal Alerts** - Toast notifications when probability crosses 75%
- **Bust Alert System** - Warns when pressure gradient exceeds 2.0mb

### Mobile Ready
- Capacitor.js configured for iOS/Android deployment
- Safe area insets for notched devices
- Touch-optimized UI

## Tech Stack

- React 19 (Vite)
- Tailwind CSS 4
- Lucide Icons
- Axios
- Capacitor.js

## Data Sources

1. **Ambient Weather API** - Personal weather station data
2. **Synoptic (MesoWest) API** - Regional stations, pressure gradients, ridge data

## Probability Algorithm

### Pressure Score (40%)
```
G = P_high - P_low

Score:
  |G| ≤ 0.5mb  → 100
  |G| ≤ 1.0mb  → 85
  |G| ≤ 1.5mb  → 70
  |G| ≤ 2.0mb  → 50
  |G| > 2.0mb  → 0-25 (BUST)
```

### Thermal Score (40%)
```
ΔT = T_lakeshore - T_ridge

Score:
  ΔT ≥ 15°F → 100
  ΔT ≥ 10°F → 85
  ΔT ≥ 5°F  → 70
  ΔT ≥ 0°F  → 50
  ΔT < 0°F  → 0-30
```

### Convergence Score (20%)
Based on wind direction alignment with optimal thermal flow patterns for each lake.

### Time Multiplier
- Peak hours (11am-4pm): 1.15x
- Active hours (9am-6pm): 1.0x
- Off hours: 0.6x

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```
   VITE_AMBIENT_API_KEY=your_key
   VITE_AMBIENT_APP_KEY=your_app_key
   VITE_SYNOPTIC_TOKEN=your_token
   ```

3. Start development:
   ```bash
   npm run dev
   ```

## Mobile Deployment

### Android
```bash
npm run mobile:android
```
Opens Android Studio with the project ready to build.

### iOS (requires Mac)
```bash
npm run mobile:ios
```
Opens Xcode with the project ready to build.

### Build for both
```bash
npm run mobile:build
```

## Project Structure

```
utah-wind-app/
├── src/
│   ├── components/
│   │   ├── BustAlert.jsx
│   │   ├── ConfidenceGauge.jsx
│   │   ├── Dashboard.jsx
│   │   ├── LakeSelector.jsx
│   │   ├── Sparkline.jsx
│   │   ├── ThermalStatus.jsx
│   │   ├── ToastNotification.jsx
│   │   └── WindVector.jsx
│   ├── config/
│   │   └── lakeStations.js
│   ├── hooks/
│   │   └── useLakeData.js
│   ├── services/
│   │   ├── DataNormalizer.js
│   │   └── WeatherService.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── capacitor.config.json
├── .env
└── package.json
```

## Lake Configurations

### Utah Lake
- Pressure: KSLC → KPVU
- Ridge: Cascade Mountain
- Optimal wind: 180-270° (SW)

### Deer Creek
- Pressure: KSLC → KHCR
- Ridge: Timber Lakes
- Optimal wind: 200-280° (WSW)

### Willard Bay
- Pressure: KSLC → KOGD
- Ridge: Ben Lomond
- Optimal wind: 170-260° (S-WSW)

## License

MIT
