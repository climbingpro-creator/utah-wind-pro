import { MapPin, Map, Navigation, ChevronLeft, ChevronRight, Radio, Star } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const LIVE_LAKES = [
  { id: 'utah-lake', name: 'Utah Lake', type: 'reservoir', region: 'Utah', live: true },
  { id: 'deer-creek', name: 'Deer Creek', type: 'reservoir', region: 'Utah', live: true },
  { id: 'strawberry', name: 'Strawberry', type: 'reservoir', region: 'Utah', live: true },
  { id: 'sulfur-creek', name: 'Sulphur Creek', type: 'reservoir', region: 'Wyoming', live: true },
];

const UTAH_WATERS = [
  // Provo River — segmented
  { id: 'provo-lower', name: 'Lower Provo River', type: 'river', region: 'Utah' },
  { id: 'provo-middle', name: 'Middle Provo River', type: 'river', region: 'Wasatch' },
  { id: 'provo-upper', name: 'Upper Provo River', type: 'river', region: 'Wasatch' },
  // Green River — segmented
  { id: 'green-a', name: 'Green River — A Section', type: 'river', region: 'Daggett' },
  { id: 'green-b', name: 'Green River — B Section', type: 'river', region: 'Daggett' },
  { id: 'green-c', name: 'Green River — C Section', type: 'river', region: 'Daggett' },
  // Reservoirs & other rivers
  { id: 'jordanelle', name: 'Jordanelle', type: 'reservoir', region: 'Utah' },
  { id: 'lake-powell', name: 'Lake Powell', type: 'reservoir', region: 'Utah' },
  { id: 'bear-lake', name: 'Bear Lake', type: 'lake', region: 'Utah/Idaho' },
  { id: 'flaming-gorge', name: 'Flaming Gorge', type: 'reservoir', region: 'Utah' },
  { id: 'pineview', name: 'Pineview', type: 'reservoir', region: 'Utah' },
  // Weber River — segmented
  { id: 'weber-upper', name: 'Upper Weber River', type: 'river', region: 'Summit' },
  { id: 'weber-middle', name: 'Middle Weber River', type: 'river', region: 'Summit' },
  { id: 'weber-lower', name: 'Lower Weber River', type: 'river', region: 'Morgan' },
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

function useScrollRow() {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [check]);

  const scroll = useCallback((dir) => {
    ref.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }, []);

  const onWheel = useCallback((e) => {
    const el = ref.current;
    if (!el || !e.deltaY) return;
    if (el.scrollWidth <= el.clientWidth) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, []);

  return { ref, canLeft, canRight, scroll, onWheel };
}

function ScrollRow({ scrollState, children, className = '' }) {
  const { ref, canLeft, canRight, scroll, onWheel } = scrollState;
  return (
    <div className="relative group">
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-2 z-10 w-8 flex items-center justify-start bg-gradient-to-r from-[var(--bg-primary,#0f172a)] via-[var(--bg-primary,#0f172a)] to-transparent cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-2 z-10 w-8 flex items-center justify-end bg-gradient-to-l from-[var(--bg-primary,#0f172a)] via-[var(--bg-primary,#0f172a)] to-transparent cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}
      <div ref={ref} onWheel={onWheel} className={`flex overflow-x-auto gap-2 hide-scrollbar ${className}`}>
        {children}
      </div>
    </div>
  );
}

export default function LocationSelector({ selectedLocation, onSelectLocation, onOpenMap, favorites = [], onToggleFavorite: _onToggleFavorite }) {
  const row1Scroll = useScrollRow();
  const row2Scroll = useScrollRow();

  const liveIds = new Set(LIVE_LAKES.map(l => l.id));
  const favSet = new Set(favorites);

  const favoritePills = [...LIVE_LAKES, ...UTAH_WATERS].filter(l => favSet.has(l.id));
  const nonFavLive = LIVE_LAKES.filter(l => !favSet.has(l.id));
  const row1 = [...favoritePills, ...nonFavLive];
  const row2 = UTAH_WATERS.filter(l => !favSet.has(l.id));

  const renderPill = (loc) => {
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
  };

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

      {/* Row 1: My Location + Favorites + Live Lakes */}
      <ScrollRow scrollState={row1Scroll} className="pb-1.5">
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
        {row1.map(renderPill)}
      </ScrollRow>

      {/* Row 2: Rivers & Reservoirs */}
      {row2.length > 0 && (
        <ScrollRow scrollState={row2Scroll} className="pb-1">
          {row2.map(renderPill)}
        </ScrollRow>
      )}
    </div>
  );
}

export const LOCATION_LIST = [...LIVE_LAKES, ...UTAH_WATERS];
