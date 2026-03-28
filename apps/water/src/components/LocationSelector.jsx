import { MapPin } from 'lucide-react';

const LOCATION_LIST = [
  { id: 'strawberry', name: 'Strawberry', type: 'reservoir', region: 'Wasatch' },
  { id: 'deer-creek', name: 'Deer Creek', type: 'reservoir', region: 'Wasatch' },
  { id: 'jordanelle', name: 'Jordanelle', type: 'reservoir', region: 'Wasatch' },
  { id: 'utah-lake', name: 'Utah Lake', type: 'lake', region: 'Utah' },
  { id: 'provo-river', name: 'Provo River', type: 'river', region: 'Wasatch' },
  { id: 'middle-provo', name: 'Middle Provo', type: 'river', region: 'Wasatch' },
  { id: 'weber-river', name: 'Weber River', type: 'river', region: 'Summit' },
  { id: 'green-river', name: 'Green River', type: 'river', region: 'Daggett' },
  { id: 'flaming-gorge', name: 'Flaming Gorge', type: 'reservoir', region: 'Daggett' },
  { id: 'pineview', name: 'Pineview', type: 'reservoir', region: 'Weber' },
  { id: 'bear-lake', name: 'Bear Lake', type: 'lake', region: 'Rich' },
  { id: 'willard-bay', name: 'Willard Bay', type: 'reservoir', region: 'Box Elder' },
  { id: 'starvation', name: 'Starvation', type: 'reservoir', region: 'Duchesne' },
  { id: 'yuba', name: 'Yuba', type: 'reservoir', region: 'Juab' },
  { id: 'scofield', name: 'Scofield', type: 'reservoir', region: 'Carbon' },
  { id: 'lake-powell', name: 'Lake Powell', type: 'reservoir', region: 'Kane' },
  { id: 'sand-hollow', name: 'Sand Hollow', type: 'reservoir', region: 'Washington' },
];

const TYPE_ICON = { river: '\u{1F3DE}\uFE0F', lake: '\u{1F4A7}', reservoir: '\u{1F4A7}' };

export default function LocationSelector({ selectedLocation, onSelectLocation }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Location
        </span>
      </div>
      <div
        className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar"
      >
        {LOCATION_LIST.map((loc) => {
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
              <span className="text-sm leading-none">{TYPE_ICON[loc.type]}</span>
              <span>{loc.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { LOCATION_LIST };
