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
- Real-time wind data from MesoWest and personal weather stations
- 3-step thermal prediction model
- Multi-day forecasting with historical pattern analysis
- NWS severe weather alerts
- Interactive wind map with station data
- Self-learning prediction system
- PWA support - install on mobile

## Data Sources

- **MesoWest (Synoptic)** - Regional weather stations
- **Ambient Weather** - Personal weather station integration
- **NWS** - Forecasts and severe weather alerts

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
VITE_SYNOPTIC_TOKEN=your_token
VITE_AMBIENT_API_KEY=your_key
VITE_AMBIENT_APP_KEY=your_app_key
```

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
