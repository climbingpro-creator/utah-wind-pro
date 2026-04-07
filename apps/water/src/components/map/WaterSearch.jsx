import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, MapPin, Waves, Loader2 } from 'lucide-react';

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Search for water bodies using Nominatim (OpenStreetMap)
async function searchWaterBodies(query) {
  if (!query || query.length < 2) return [];
  
  try {
    // Search specifically for water features
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '8',
      'accept-language': 'en',
      addressdetails: '1',
      extratags: '1',
      // Filter to water-related features
      featuretype: 'water',
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { 
        headers: { 'User-Agent': 'NotWindy/1.0' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // Filter and format results - prioritize water features
    const waterKeywords = ['lake', 'river', 'reservoir', 'creek', 'stream', 'pond', 'bay', 'ocean', 'sea', 'canal', 'lagoon'];
    
    return data
      .filter(item => {
        const name = (item.display_name || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const category = (item.class || '').toLowerCase();
        
        // Must be water-related
        return (
          category === 'natural' ||
          category === 'waterway' ||
          category === 'water' ||
          waterKeywords.some(kw => name.includes(kw)) ||
          waterKeywords.some(kw => type.includes(kw))
        );
      })
      .map(item => ({
        id: item.place_id,
        name: extractWaterName(item),
        fullName: item.display_name,
        type: categorizeWaterType(item),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        boundingBox: item.boundingbox?.map(parseFloat),
      }))
      .slice(0, 6);
  } catch (err) {
    console.error('[WaterSearch] Error:', err);
    return [];
  }
}

// Extract a clean water body name
function extractWaterName(item) {
  // Try to get the actual water name
  if (item.name) return item.name;
  
  // Parse from display_name
  const parts = (item.display_name || '').split(',');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  
  return 'Unknown Water Body';
}

// Categorize the water type for icon display
function categorizeWaterType(item) {
  const name = (item.display_name || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  
  if (name.includes('river') || type === 'river' || type === 'stream') return 'river';
  if (name.includes('lake') || type === 'lake') return 'lake';
  if (name.includes('reservoir')) return 'reservoir';
  if (name.includes('creek') || name.includes('stream')) return 'stream';
  if (name.includes('bay') || name.includes('gulf')) return 'bay';
  if (name.includes('ocean') || name.includes('sea')) return 'ocean';
  if (name.includes('pond')) return 'pond';
  
  return 'water';
}

const TYPE_ICONS = {
  river: '🏞️',
  lake: '💧',
  reservoir: '🌊',
  stream: '〰️',
  bay: '🌊',
  ocean: '🌊',
  pond: '💧',
  water: '💧',
};

const TYPE_LABELS = {
  river: 'River',
  lake: 'Lake',
  reservoir: 'Reservoir',
  stream: 'Stream/Creek',
  bay: 'Bay',
  ocean: 'Ocean',
  pond: 'Pond',
  water: 'Water',
};

export default function WaterSearch({ onSelect, isExpanded = false, onToggle }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  
  const debouncedQuery = useDebounce(query, 300);
  
  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    searchWaterBodies(debouncedQuery)
      .then(setResults)
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);
  
  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
        if (onToggle && isExpanded) onToggle(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, onToggle]);
  
  const handleSelect = useCallback((result) => {
    onSelect({
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      type: result.type,
      boundingBox: result.boundingBox,
    });
    setQuery('');
    setResults([]);
    setShowResults(false);
    if (onToggle) onToggle(false);
  }, [onSelect, onToggle]);
  
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  // Collapsed state - show labeled search button
  if (!isExpanded) {
    return (
      <button
        onClick={() => onToggle?.(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-500/25 transition-all shadow-lg"
        aria-label="Search for water body"
      >
        <Search className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-400">Search</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-72">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl backdrop-blur-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search lake, river, reservoir..."
          className="flex-1 bg-transparent text-base text-white placeholder-slate-500 outline-none"
          style={{ fontSize: '16px' }}
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
        )}
        {query && !isSearching && (
          <button onClick={handleClear} className="p-0.5 hover:bg-slate-700 rounded">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <button
          onClick={() => onToggle?.(false)}
          className="p-0.5 hover:bg-slate-700 rounded ml-1"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      
      {/* Results Dropdown */}
      {showResults && (results.length > 0 || (query.length >= 2 && !isSearching)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden z-50">
          {results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <span className="text-lg mt-0.5">{TYPE_ICONS[result.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {result.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-cyan-400 uppercase">
                          {TYPE_LABELS[result.type]}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {result.fullName?.split(',').slice(1, 3).join(',').trim()}
                        </span>
                      </div>
                    </div>
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-1" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <Waves className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No water bodies found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}
      
      {/* Hint text */}
      {!showResults && !query && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-2 text-[10px] text-slate-500">
          Search worldwide — lakes, rivers, reservoirs, bays
        </div>
      )}
    </div>
  );
}
