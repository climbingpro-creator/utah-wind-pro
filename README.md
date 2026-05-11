# Utah Wind Pro 🌬️

Professional wind forecasting for Utah's best water sports locations.

**Live Site:** [utahwindfinder.com](https://utahwindfinder.com)

## Features

### Multi-Activity Support
- 🪁 **Kiting** - Thermal probability, foil vs twin tip indicators
- ⛵ **Sailing** - Race day mode, wind consistency, course recommendations
- 🚤 **Boating** - Glass score for calm water seekers
- 🏄 **Paddling** - Morning calm windows, safety alerts

### Locations
- **Utah Lake** - 5 launch sites (Lincoln Beach, Sandy Beach, Vineyard, Zig Zag, Mile Marker 19)
- **Deer Creek** - Canyon thermal predictions
- **Willard Bay** - North "gap" wind forecasting

### Key Features
- Real-time wind data from NWS, Weather Underground, UDOT, and personal weather stations
- 3-step thermal prediction model
- Multi-day forecasting with historical pattern analysis
- NWS severe weather alerts
- Interactive wind map with station data
- Self-learning prediction system
- PWA support - install on mobile

## Data Sources (100% Free)

- **NWS (api.weather.gov)** - Airport observations, forecasts, severe weather alerts (free, unlimited)
- **Weather Underground PWS** - 250K+ personal weather stations nationwide (WU_API_KEY)
- **UDOT RWIS** - Utah road weather sensors (free with registration)
- **Ambient Weather** - Personal weather station integration
- **Open-Meteo** - Global weather fallback (free, no key required)
- **Tempest WeatherFlow** - Additional personal weather stations

## Tech Stack

- React 19 + Vite
- Tailwind CSS
- Leaflet Maps
- Capacitor (mobile apps)
- IndexedDB (learning system)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```env
VITE_AMBIENT_API_KEY=your_key
VITE_AMBIENT_APP_KEY=your_app_key
WU_API_KEY=your_wu_key
```

> **Note:** No Synoptic/MesoWest API key required. The system uses 100% free data sources (NWS + WU + UDOT + Open-Meteo).

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Custom Domain
1. Add `utahwindfinder.com` in Vercel domain settings
2. Update DNS records:
   - A record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

## Mobile Apps

```bash
# Build and sync to Android
npm run mobile:android

# Build and sync to iOS
npm run mobile:ios
```

## License

MIT

---

Built with ❤️ for Utah's water sports community
