import { MapPin, Map, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

// Popular fishing/boating destinations worldwide - shown as suggestions
// Users can also click the map for any location
const FEATURED_LOCATIONS = [
  // North America
  { id: 'lake-tahoe', name: 'Lake Tahoe', type: 'lake', region: 'California' },
  { id: 'lake-michigan', name: 'Lake Michigan', type: 'lake', region: 'Great Lakes' },
  { id: 'lake-powell', name: 'Lake Powell', type: 'reservoir', region: 'Arizona/Utah' },
  { id: 'florida-keys', name: 'Florida Keys', type: 'ocean', region: 'Florida' },
  { id: 'chesapeake-bay', name: 'Chesapeake Bay', type: 'bay', region: 'Maryland' },
  { id: 'columbia-river', name: 'Columbia River', type: 'river', region: 'Oregon' },
  // International
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
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
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

  const displayLocations = [
    ...recentLocations.slice(0, 5),
    ...FEATURED_LOCATIONS.filter(f => !recentLocations.find(r => r.id === f.id))
  ].slice(0, 12);

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
        {/* "My Location" button */}
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
        
        {displayLocations.map((loc) => {
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

// Export for backward compatibility - but these are now "featured" not required
export const LOCATION_LIST = FEATURED_LOCATIONS;
