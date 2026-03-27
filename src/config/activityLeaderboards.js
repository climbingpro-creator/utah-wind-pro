/**
 * Per-activity leaderboard definitions.
 * Shared between the day page API, year page API, and frontend components.
 */

export const ACTIVITY_TYPE_MAP = {
  kite_session:       'kiting',
  snowkite_session:   'snowkiting',
  windsurf_session:   'windsurfing',
  sail_session:       'sailing',
  boat_session:       'boating',
  paddle_session:     'paddling',
  paraglide_session:  'paragliding',
  fish_session:       'fishing',
};

export const VALID_ACTIVITIES = [
  'kiting', 'snowkiting', 'windsurfing', 'sailing',
  'boating', 'paddling', 'paragliding', 'fishing',
];

export const ACTIVITY_LABELS = {
  kiting:       'Kiting',
  snowkiting:   'Snowkiting',
  windsurfing:  'Windsurfing',
  sailing:      'Sailing',
  boating:      'Boating',
  paddling:     'Paddling',
  paragliding:  'Paragliding',
  fishing:      'Fishing',
};

export const ACTIVITY_THEMES = {
  kiting:      { primary: '#eab308', secondary: '#854d0e', gradient: 'linear-gradient(135deg,#1a1500 0%,#422006 40%,#854d0e 100%)' },
  snowkiting:  { primary: '#38bdf8', secondary: '#0c4a6e', gradient: 'linear-gradient(135deg,#0c1222 0%,#0c4a6e 40%,#38bdf8 100%)' },
  windsurfing: { primary: '#06b6d4', secondary: '#155e75', gradient: 'linear-gradient(135deg,#042f2e 0%,#155e75 40%,#06b6d4 100%)' },
  sailing:     { primary: '#3b82f6', secondary: '#1e3a8a', gradient: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 40%,#3b82f6 100%)' },
  boating:     { primary: '#6366f1', secondary: '#312e81', gradient: 'linear-gradient(135deg,#0f0f23 0%,#312e81 40%,#6366f1 100%)' },
  paddling:    { primary: '#10b981', secondary: '#064e3b', gradient: 'linear-gradient(135deg,#022c22 0%,#064e3b 40%,#10b981 100%)' },
  paragliding: { primary: '#a855f7', secondary: '#581c87', gradient: 'linear-gradient(135deg,#1a0533 0%,#581c87 40%,#a855f7 100%)' },
  fishing:     { primary: '#22c55e', secondary: '#14532d', gradient: 'linear-gradient(135deg,#052e16 0%,#14532d 40%,#22c55e 100%)' },
};

export const ACTIVITY_ICONS = {
  kiting:      '&#127938;',
  snowkiting:  '&#10052;',
  windsurfing: '&#127940;',
  sailing:     '&#9973;',
  boating:     '&#128674;',
  paddling:    '&#128692;',
  paragliding: '&#129666;',
  fishing:     '&#127907;',
};

/**
 * Leaderboard tab definitions per activity.
 * key: tab id, label: display name, field: rider object key, unit, sort: 'desc'|'asc',
 * format: optional function name for special formatting.
 */
export const ACTIVITY_BOARDS = {
  kiting: [
    { key: 'height',   label: 'Highest Jump',   field: 'max_jump_ft',   unit: 'ft',  sort: 'desc' },
    { key: 'hang',     label: 'Best Hangtime',   field: 'best_hang_s',   unit: 's',   sort: 'desc' },
    { key: 'distance', label: 'Farthest Jump',   field: 'farthest_ft',   unit: 'ft',  sort: 'desc' },
    { key: 'speed',    label: 'Top Speed',        field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'jumps',    label: 'Most Jumps',        field: 'total_jumps',   unit: '',    sort: 'desc' },
    { key: 'duration', label: 'Longest Session',   field: 'duration_s',    unit: 'dur', sort: 'desc' },
  ],
  snowkiting: [
    { key: 'height',   label: 'Highest Jump',   field: 'max_jump_ft',   unit: 'ft',  sort: 'desc' },
    { key: 'hang',     label: 'Best Hangtime',   field: 'best_hang_s',   unit: 's',   sort: 'desc' },
    { key: 'distance', label: 'Farthest Jump',   field: 'farthest_ft',   unit: 'ft',  sort: 'desc' },
    { key: 'speed',    label: 'Top Speed',        field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'jumps',    label: 'Most Jumps',        field: 'total_jumps',   unit: '',    sort: 'desc' },
    { key: 'duration', label: 'Longest Session',   field: 'duration_s',    unit: 'dur', sort: 'desc' },
  ],
  windsurfing: [
    { key: 'speed',    label: 'Top Speed',         field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'rides',    label: 'Most Rides',         field: 'ride_count',    unit: '',    sort: 'desc' },
    { key: 'foil',     label: 'Foil Rides',         field: 'foil_ride_count', unit: '',  sort: 'desc' },
    { key: 'height',   label: 'Air Time',           field: 'max_jump_ft',   unit: 'ft',  sort: 'desc' },
    { key: 'duration', label: 'Longest Session',    field: 'duration_s',    unit: 'dur', sort: 'desc' },
    { key: 'dist',     label: 'Distance',           field: 'distance_nm',   unit: 'NM',  sort: 'desc' },
  ],
  sailing: [
    { key: 'speed',    label: 'Top Speed',       field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'dist',     label: 'Distance',         field: 'distance_nm',   unit: 'NM',  sort: 'desc' },
    { key: 'avg',      label: 'Avg Speed',        field: 'avg_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'duration', label: 'Longest Session',   field: 'duration_s',    unit: 'dur', sort: 'desc' },
  ],
  boating: [
    { key: 'duration', label: 'Longest Outing',  field: 'duration_s',    unit: 'dur', sort: 'desc' },
    { key: 'dist',     label: 'Distance',         field: 'distance_nm',   unit: 'NM',  sort: 'desc' },
    { key: 'speed',    label: 'Top Speed',         field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'avg',      label: 'Avg Speed',         field: 'avg_speed_kts', unit: 'kts', sort: 'desc' },
  ],
  paddling: [
    { key: 'duration', label: 'Longest Paddle',  field: 'duration_s',    unit: 'dur', sort: 'desc' },
    { key: 'dist',     label: 'Distance',         field: 'distance_nm',   unit: 'NM',  sort: 'desc' },
    { key: 'avg',      label: 'Avg Speed',         field: 'avg_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'speed',    label: 'Top Speed',         field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
  ],
  paragliding: [
    { key: 'duration', label: 'Longest Flight',  field: 'duration_s',    unit: 'dur', sort: 'desc' },
    { key: 'dist',     label: 'Distance',         field: 'distance_nm',   unit: 'NM',  sort: 'desc' },
    { key: 'speed',    label: 'Top Speed',         field: 'max_speed_kts', unit: 'kts', sort: 'desc' },
    { key: 'avg',      label: 'Avg Speed',         field: 'avg_speed_kts', unit: 'kts', sort: 'desc' },
  ],
  fishing: [
    { key: 'biggest',  label: 'Biggest Fish',     field: 'biggest_catch_lbs', unit: 'lbs', sort: 'desc' },
    { key: 'most',     label: 'Most Fish',         field: 'total_catches',     unit: '',    sort: 'desc' },
    { key: 'longest',  label: 'Longest Fish',      field: 'longest_catch_in',  unit: 'in',  sort: 'desc' },
    { key: 'duration', label: 'Longest Session',    field: 'duration_s',        unit: 'dur', sort: 'desc' },
  ],
};

export const PODIUM_METRIC = {
  kiting:      'max_jump_ft',
  snowkiting:  'max_jump_ft',
  windsurfing: 'max_speed_kts',
  sailing:     'max_speed_kts',
  boating:     'distance_nm',
  paddling:    'distance_nm',
  paragliding: 'duration_s',
  fishing:     'biggest_catch_lbs',
};

export const PODIUM_LABEL = {
  kiting:      'Best Jump (ft)',
  snowkiting:  'Best Jump (ft)',
  windsurfing: 'Top Speed (kts)',
  sailing:     'Top Speed (kts)',
  boating:     'Distance (NM)',
  paddling:    'Distance (NM)',
  paragliding: 'Flight Time',
  fishing:     'Biggest Catch (lbs)',
};

export const HAS_JUMPS = new Set(['kiting', 'snowkiting']);
export const HAS_RIDES = new Set(['windsurfing']);
export const HAS_CATCHES = new Set(['fishing']);
export const HAS_PHOTOS = new Set(VALID_ACTIVITIES);
