import { MapPin, Map, Navigation, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const LIVE_LAKES = [
  { id: 'utah-lake', name: 'Utah Lake', type: 'reservoir', region: 'Utah', live: true },
  { id: 'deer-creek', name: 'Deer Creek', type: 'reservoir', region: 'Utah', live: true },
  { id: 'strawberry', name: 'Strawberry', type: 'reservoir', region: 'Utah', live: true },
  { id: 'sulfur-creek', name: 'Sulphur Creek', type: 'reservoir', region: 'Wyoming', live: true },
];

const FEATURED_LOCATIONS = [
  { id: 'lake-tahoe', name: 'Lake Tahoe', type: 'lake', region: 'California' },
  { id: 'lake-michigan', name: 'Lake Michigan', type: 'lake', region: 'Great Lakes' },
  { id: 'lake-powell', name: 'Lake Powell', type: 'reservoir', region: 'Arizona/Utah' },
  { id: 'florida-keys', name: 'Florida Keys', type: 'ocean', region: 'Florida' },
  { id: 'chesapeake-bay', name: 'Chesapeake Bay', type: 'bay', region: 'Maryland' },
  { id: 'columbia-river', name: 'Columbia River', type: 'river', region: 'Oregon' },
  { id: 'lake-como', name: 'Lake Como', type: 'lake', region: 'Italy' },
  { id: 'lake-geneva', name: 'Lake Geneva', type: 'lake', region: 'Switzerland' },
  { id: 'great-barrier', name: 'Great Barrier Reef', type: 'ocean', region: 'Australia' },
];

const TYPE_ICON = { river: '🏞️', lake: '💧', reservoir: '💧', ocean: '🌊', bay: '🌊' };

export default function LocationSelector({ selectedLocation, onSelectLocation, onOpenMap }) {
  const [recentLocations, setRecentLocations] = useState([]);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('notwindy_recent_locations');
      if (stored) setRecentLocations(JSON.parse(stored));
    } catch (_e) { /* ignore */ }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const scroll = useCallback((dir) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }, []);

  const onWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el || !e.deltaY) return;
    if (el.scrollWidth <= el.clientWidth) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, []);

  const liveIds = new Set(LIVE_LAKES.map(l => l.id));
  const extraLocations = [
    ...recentLocations.filter(r => !liveIds.has(r.id)).slice(0, 3),
    ...FEATURED_LOCATIONS.filter(f => !recentLocations.find(r => r.id === f.id)),
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Quick Access
          </span>
        </div>
        {onOpenMap && (
          <button
            onClick={onOpenMap}
            className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Map className="w-3 h-3" />
            <span>Explore Map</span>
          </button>
        )}
      </div>
      <div className="relative group">
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-0 bottom-2 z-10 w-8 flex items-center justify-start bg-gradient-to-r from-[var(--bg-primary,#0f172a)] via-[var(--bg-primary,#0f172a)] to-transparent cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-0 bottom-2 z-10 w-8 flex items-center justify-end bg-gradient-to-l from-[var(--bg-primary,#0f172a)] via-[var(--bg-primary,#0f172a)] to-transparent cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      <div ref={scrollRef} onWheel={onWheel} className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {/* My Location */}
        <button
          onClick={() => {
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => onSelectLocation(`geo:${pos.coords.latitude},${pos.coords.longitude}`),
                () => alert('Location access denied. Use the map to select a location.')
              );
            }
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer bg-cyan-900/30 text-cyan-400 border-cyan-500/50 hover:border-cyan-400"
        >
          <Navigation className="w-3 h-3" />
          <span>My Location</span>
        </button>

        {/* Configured lakes with real station networks */}
        {LIVE_LAKES.map((loc) => {
          const isSelected = selectedLocation === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer
                ${isSelected
                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-600/50 hover:border-emerald-400 hover:text-emerald-300'
                }
              `}
            >
              <Radio className="w-3 h-3" />
              <span>{loc.name}</span>
              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-px rounded bg-emerald-500/20 text-emerald-400 leading-none">LIVE</span>
            </button>
          );
        })}

        {/* Worldwide destinations */}
        {extraLocations.map((loc) => {
          const isSelected = selectedLocation === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer
                ${isSelected
                  ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800 text-gray-400 border-slate-700 hover:border-slate-500 hover:text-gray-300'
                }
              `}
            >
              <span className="text-sm leading-none">{TYPE_ICON[loc.type] || '💧'}</span>
              <span>{loc.name}</span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export const LOCATION_LIST = [...LIVE_LAKES, ...FEATURED_LOCATIONS];
