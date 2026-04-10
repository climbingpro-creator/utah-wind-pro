import { MapPin, Map, Navigation, ChevronLeft, ChevronRight, Radio, Star } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const LIVE_LAKES = [
  { id: 'utah-lake', name: 'Utah Lake', type: 'reservoir', region: 'Utah', live: true },
  { id: 'deer-creek', name: 'Deer Creek', type: 'reservoir', region: 'Utah', live: true },
  { id: 'strawberry', name: 'Strawberry', type: 'reservoir', region: 'Utah', live: true },
  { id: 'sulfur-creek', name: 'Sulphur Creek', type: 'reservoir', region: 'Wyoming', live: true },
];

const UTAH_WATERS = [
  { id: 'provo-river', name: 'Provo River', type: 'river', region: 'Utah' },
  { id: 'green-river', name: 'Green River', type: 'river', region: 'Utah' },
  { id: 'jordanelle', name: 'Jordanelle', type: 'reservoir', region: 'Utah' },
  { id: 'lake-powell', name: 'Lake Powell', type: 'reservoir', region: 'Utah' },
  { id: 'bear-lake', name: 'Bear Lake', type: 'lake', region: 'Utah/Idaho' },
  { id: 'flaming-gorge', name: 'Flaming Gorge', type: 'reservoir', region: 'Utah' },
  { id: 'pineview', name: 'Pineview', type: 'reservoir', region: 'Utah' },
  { id: 'weber-river', name: 'Weber River', type: 'river', region: 'Utah' },
  { id: 'yuba', name: 'Yuba', type: 'reservoir', region: 'Utah' },
  { id: 'starvation', name: 'Starvation', type: 'reservoir', region: 'Utah' },
  { id: 'scofield', name: 'Scofield', type: 'reservoir', region: 'Utah' },
  { id: 'sand-hollow', name: 'Sand Hollow', type: 'reservoir', region: 'Utah' },
  { id: 'fish-lake', name: 'Fish Lake', type: 'lake', region: 'Utah' },
];

const TYPE_ICON = { river: '🏞️', lake: '💧', reservoir: '💧', ocean: '🌊', bay: '🌊' };

const FAVORITES_KEY = 'notwindy_favorites';

function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const toggle = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return { favorites, toggle, isFavorite: (id) => favorites.includes(id) };
}

export { useFavorites, LIVE_LAKES, UTAH_WATERS };

export default function LocationSelector({ selectedLocation, onSelectLocation, onOpenMap, favorites = [], onToggleFavorite: _onToggleFavorite }) {
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
  const favSet = new Set(favorites);

  const favoritePills = [...LIVE_LAKES, ...UTAH_WATERS].filter(l => favSet.has(l.id));
  const nonFavLive = LIVE_LAKES.filter(l => !favSet.has(l.id));
  const nonFavUtah = UTAH_WATERS.filter(l => !favSet.has(l.id));
  const orderedPills = [...favoritePills, ...nonFavLive, ...nonFavUtah];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Quick Access
          </span>
          {favorites.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              {favorites.length} ★
            </span>
          )}
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

        {orderedPills.map((loc) => {
          const isSelected = selectedLocation === loc.id;
          const isLive = liveIds.has(loc.id);
          const isFav = favSet.has(loc.id);
          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer
                ${isFav && isSelected
                  ? 'bg-amber-900/40 text-amber-300 border-amber-400 shadow-lg shadow-amber-500/20'
                  : isFav
                    ? 'bg-amber-950/30 text-amber-400 border-amber-600/50 hover:border-amber-400 hover:text-amber-300'
                    : isSelected && isLive
                      ? 'bg-emerald-900/50 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : isLive
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/50 hover:border-emerald-400 hover:text-emerald-300'
                        : isSelected
                          ? 'bg-slate-700/60 text-white border-slate-400 shadow-lg'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300'
                }
              `}
            >
              {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
              {isLive && !isFav && <Radio className="w-3 h-3" />}
              {!isLive && !isFav && <span className="text-sm leading-none">{TYPE_ICON[loc.type] || '💧'}</span>}
              <span>{loc.name}</span>
              {isLive && (
                <span className="text-[8px] font-black uppercase tracking-wider px-1 py-px rounded bg-emerald-500/20 text-emerald-400 leading-none">LIVE</span>
              )}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export const LOCATION_LIST = [...LIVE_LAKES, ...UTAH_WATERS];
