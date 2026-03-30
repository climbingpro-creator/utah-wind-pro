/**
 * AquaticIntelligenceEngine — 2-Tier fishery/aquatic profiling.
 *
 * Tier 1: Live telemetry from the USGS Water Services Instantaneous Values API.
 * Tier 2: Elevation/thermal inference when no gauge is nearby.
 *
 * Returns an EcologicalProfile with water temp, flow, clarity estimates,
 * and an explicit `dataSource` flag so the UI can show provenance.
 */

// ─── USGS Parameter Codes ────────────────────────────────────
const PARAM_WATER_TEMP = '00010'; // Water temperature (°C)
const PARAM_DISCHARGE  = '00060'; // Discharge / stream flow (CFS)
const PARAM_GAUGE_HT   = '00065'; // Gauge height (ft)

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv/';

// ─── Geo helpers ─────────────────────────────────────────────

function milesToDegrees(miles) {
  return miles / 69.0;
}

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Known Water Bodies (coordinates + metadata) ────────────
// ─── Utah DWR Fishing Proclamation: Complete Managed Waters ──
// Fast offline cache — Tier 0 lookup before any network calls.
// Species, regulations, forage, and depths sourced from Utah DWR guidebook.
const KNOWN_WATER_BODIES = [
  // ═══ MAJOR DESTINATION FISHERIES ═══
  { id: 'strawberry',     name: 'Strawberry Reservoir',    lat: 40.17, lng: -111.17, radiusMi: 7, type: 'reservoir', elevation: 7600, species: ['Cutthroat Trout', 'Kokanee Salmon', 'Rainbow Trout'], regulations: 'Cutthroat slot limit 15-22" must be released. Trout limit 4, only 2 cutthroat under 15" or over 22"', targetDepth: '15-30 ft (thermocline zone)', forage: 'Utah Chub, Chironomids, Scuds' },
  { id: 'flaming-gorge',  name: 'Flaming Gorge Reservoir', lat: 40.93, lng: -109.50, radiusMi: 14, type: 'reservoir', elevation: 6040, species: ['Lake Trout', 'Kokanee Salmon', 'Rainbow Trout', 'Smallmouth Bass', 'Burbot'], regulations: 'Lake trout limit 8, no size restriction (removal encouraged). Burbot: no limit', targetDepth: '40-80 ft (summer), 20-40 ft (spring/fall)', forage: 'Kokanee Salmon, Crayfish, Utah Chub' },
  { id: 'lake-powell',    name: 'Lake Powell',             lat: 37.07, lng: -111.25, radiusMi: 20, type: 'reservoir', elevation: 3700, species: ['Striped Bass', 'Largemouth Bass', 'Smallmouth Bass', 'Walleye', 'Crappie', 'Channel Catfish'], regulations: 'No limit on striped bass (removal encouraged). Bass limit 5', targetDepth: '15-40 ft (follow shad schools)', forage: 'Threadfin Shad, Gizzard Shad, Crayfish' },
  { id: 'bear-lake',      name: 'Bear Lake',               lat: 41.95, lng: -111.33, radiusMi: 7, type: 'lake', elevation: 5924, species: ['Bonneville Cutthroat', 'Lake Trout', 'Bonneville Cisco', 'Bear Lake Whitefish'], regulations: 'Cutthroat limit 2. Cisco dip-netting Jan only. Lake trout limit 4', targetDepth: '30-60 ft (summer)', forage: 'Bonneville Cisco, Bonneville Whitefish, Sculpin' },
  { id: 'utah-lake',      name: 'Utah Lake',               lat: 40.23, lng: -111.80, radiusMi: 10, type: 'lake', elevation: 4489, species: ['Channel Catfish', 'White Bass', 'Walleye', 'Black Crappie', 'Carp', 'June Sucker'], regulations: 'No limit on carp. Walleye limit 10. June sucker: protected, must release', targetDepth: '6-14 ft (entire lake is shallow)', forage: 'Gizzard Shad, Carp, Utah Sucker' },

  // ═══ WASATCH FRONT ═══
  { id: 'deer-creek',     name: 'Deer Creek Reservoir',    lat: 40.41, lng: -111.51, radiusMi: 4, type: 'reservoir', elevation: 5400, species: ['Walleye', 'Brown Trout', 'Yellow Perch', 'Smallmouth Bass', 'Rainbow Trout'], regulations: 'Walleye limit 10, only 1 over 24"', targetDepth: '18-30 ft (summer thermocline)', forage: 'Threadfin Shad, Crayfish, Yellow Perch' },
  { id: 'jordanelle',     name: 'Jordanelle Reservoir',    lat: 40.60, lng: -111.42, radiusMi: 4, type: 'reservoir', elevation: 6200, species: ['Smallmouth Bass', 'Brown Trout', 'Yellow Perch', 'Splake', 'Largemouth Bass'], regulations: 'Bass limit 6, only 1 over 12"', targetDepth: '18-30 ft (rocky structure)', forage: 'Crayfish, Yellow Perch, Sculpin' },
  { id: 'rockport',       name: 'Rockport Reservoir',      lat: 40.78, lng: -111.40, radiusMi: 4, type: 'reservoir', elevation: 6000, species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Yellow Perch'], regulations: 'Trout limit 4', targetDepth: '15-30 ft (old river channel)', forage: 'Crayfish, Yellow Perch, Utah Chub' },
  { id: 'echo',           name: 'Echo Reservoir',          lat: 40.97, lng: -111.44, radiusMi: 4, type: 'reservoir', elevation: 5500, species: ['Rainbow Trout', 'Smallmouth Bass', 'Yellow Perch', 'Brown Trout'], regulations: 'Trout limit 4, bass limit 6', targetDepth: '12-25 ft (rocky points, weed edges)', forage: 'Crayfish, Yellow Perch, Utah Chub' },
  { id: 'east-canyon',    name: 'East Canyon Reservoir',   lat: 40.88, lng: -111.59, radiusMi: 3, type: 'reservoir', elevation: 5700, species: ['Rainbow Trout', 'Kokanee Salmon', 'Smallmouth Bass'], regulations: 'Trout limit 4', targetDepth: '15-30 ft (dam, thermocline)', forage: 'Kokanee fry, Crayfish, Chironomids' },
  { id: 'little-dell',    name: 'Little Dell Reservoir',   lat: 40.75, lng: -111.70, radiusMi: 2, type: 'reservoir', elevation: 5400, species: ['Cutthroat Trout', 'Rainbow Trout'], regulations: 'Artificial flies and lures only. Cutthroat limit 2', targetDepth: '15-30 ft', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'mountain-dell',  name: 'Mountain Dell Reservoir', lat: 40.76, lng: -111.72, radiusMi: 2, type: 'reservoir', elevation: 5400, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brown Trout'], regulations: 'Trout limit 4. No boats', targetDepth: '10-25 ft', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'tibble-fork',    name: 'Tibble Fork Reservoir',   lat: 40.49, lng: -111.63, radiusMi: 2, type: 'reservoir', elevation: 6300, species: ['Rainbow Trout', 'Cutthroat Trout', 'Arctic Grayling'], regulations: 'Trout limit 4', targetDepth: '10-20 ft', forage: 'Chironomids, Damselflies, Scuds' },
  { id: 'silver-lake-flat', name: 'Silver Lake Flat Reservoir', lat: 40.53, lng: -111.61, radiusMi: 2, type: 'reservoir', elevation: 7400, species: ['Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Damselflies' },
  { id: 'salem-pond',     name: 'Salem Pond',              lat: 40.05, lng: -111.67, radiusMi: 1, type: 'pond', elevation: 4600, species: ['Rainbow Trout', 'Channel Catfish', 'Bluegill', 'Largemouth Bass'], regulations: 'Trout limit 4. Community fishery', targetDepth: '5-12 ft (dock areas)', forage: 'Stocked pellets, Bluegill, Chironomids' },
  { id: 'spring-lake',    name: 'Spring Lake',             lat: 40.08, lng: -111.70, radiusMi: 1, type: 'lake', elevation: 4500, species: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill', 'Channel Catfish'], regulations: 'Trout limit 4', targetDepth: '5-10 ft (spring-fed, clear)', forage: 'Bluegill, Chironomids, Scuds' },
  { id: 'settlement-canyon', name: 'Settlement Canyon Reservoir', lat: 40.52, lng: -112.30, radiusMi: 2, type: 'reservoir', elevation: 5900, species: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill'], regulations: 'Trout limit 4', targetDepth: '10-20 ft (weed edges, dam)', forage: 'Bluegill, Crayfish, Chironomids' },
  { id: 'vernon',         name: 'Vernon Reservoir',        lat: 40.10, lng: -112.43, radiusMi: 2, type: 'reservoir', elevation: 5600, species: ['Rainbow Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Scuds' },
  { id: 'grantsville',    name: 'Grantsville Reservoir',   lat: 40.58, lng: -112.50, radiusMi: 2, type: 'reservoir', elevation: 5100, species: ['Rainbow Trout', 'Bluegill'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Bluegill' },

  // ═══ NORTHERN UTAH ═══
  { id: 'pineview',       name: 'Pineview Reservoir',      lat: 41.26, lng: -111.80, radiusMi: 3, type: 'reservoir', elevation: 4900, species: ['Tiger Muskie', 'Largemouth Bass', 'Yellow Perch', 'Bluegill', 'Crappie'], regulations: 'Tiger muskie limit 1, must be over 40"', targetDepth: '10-25 ft (weed edges)', forage: 'Yellow Perch, Utah Chub, Bluegill' },
  { id: 'causey',         name: 'Causey Reservoir',        lat: 41.28, lng: -111.59, radiusMi: 2, type: 'reservoir', elevation: 5700, species: ['Tiger Trout', 'Cutthroat Trout', 'Rainbow Trout'], regulations: 'Artificial flies and lures only. Trout limit 2', targetDepth: '15-35 ft (steep canyon walls)', forage: 'Chironomids, Scuds, Terrestrials' },
  { id: 'willard-bay',    name: 'Willard Bay Reservoir',   lat: 41.38, lng: -112.08, radiusMi: 4, type: 'reservoir', elevation: 4200, species: ['Wiper', 'Walleye', 'Channel Catfish', 'Crappie'], regulations: 'Wiper limit 6', targetDepth: '8-20 ft (along dikes)', forage: 'Gizzard Shad, Crayfish' },
  { id: 'mantua',         name: 'Mantua Reservoir',        lat: 41.50, lng: -111.94, radiusMi: 2, type: 'reservoir', elevation: 5000, species: ['Bluegill', 'Rainbow Trout', 'Largemouth Bass', 'Yellow Perch'], regulations: 'Trout limit 4, bass limit 6', targetDepth: '8-15 ft (weed edges)', forage: 'Bluegill, Crayfish, Damselflies' },
  { id: 'hyrum',          name: 'Hyrum Reservoir',         lat: 41.63, lng: -111.86, radiusMi: 3, type: 'reservoir', elevation: 4700, species: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill', 'Yellow Perch'], regulations: 'Trout limit 4', targetDepth: '10-20 ft (weed beds, dam)', forage: 'Bluegill, Crayfish, Chironomids' },
  { id: 'newton',         name: 'Newton Reservoir',        lat: 41.86, lng: -111.99, radiusMi: 2, type: 'reservoir', elevation: 4950, species: ['Largemouth Bass', 'Bluegill', 'Crappie', 'Rainbow Trout'], regulations: 'Bass limit 6', targetDepth: '8-15 ft (weed beds)', forage: 'Bluegill, Crayfish, Damselflies' },
  { id: 'cutler',         name: 'Cutler Reservoir',        lat: 41.83, lng: -111.90, radiusMi: 4, type: 'reservoir', elevation: 4400, species: ['Walleye', 'Yellow Perch', 'Channel Catfish', 'Wiper', 'Largemouth Bass'], regulations: 'Walleye limit 6', targetDepth: '8-20 ft (channel edges)', forage: 'Utah Chub, Carp, Crayfish' },
  { id: 'porcupine',      name: 'Porcupine Reservoir',     lat: 41.55, lng: -111.55, radiusMi: 2, type: 'reservoir', elevation: 7100, species: ['Cutthroat Trout', 'Rainbow Trout', 'Tiger Trout'], regulations: 'Trout limit 2', targetDepth: '12-25 ft', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'woodruff-creek', name: 'Woodruff Creek Reservoir', lat: 41.47, lng: -111.18, radiusMi: 2, type: 'reservoir', elevation: 6300, species: ['Rainbow Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Chironomids, Scuds' },
  { id: 'birch-creek',    name: 'Birch Creek Reservoir',   lat: 41.43, lng: -111.38, radiusMi: 2, type: 'reservoir', elevation: 7600, species: ['Cutthroat Trout', 'Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Scuds' },
  { id: 'tony-grove',     name: 'Tony Grove Lake',         lat: 41.89, lng: -111.64, radiusMi: 1, type: 'lake', elevation: 8050, species: ['Brook Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft (glacial cirque)', forage: 'Chironomids, Damselflies, Scuds' },

  // ═══ UINTA MOUNTAINS / HIGH COUNTRY ═══
  { id: 'currant-creek',  name: 'Currant Creek Reservoir',  lat: 40.36, lng: -111.09, radiusMi: 3, type: 'reservoir', elevation: 8000, species: ['Cutthroat Trout', 'Rainbow Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '12-25 ft (inflow delta, thermocline)', forage: 'Chironomids, Scuds, Utah Chub' },
  { id: 'lost-creek',     name: 'Lost Creek Reservoir',    lat: 41.12, lng: -111.39, radiusMi: 3, type: 'reservoir', elevation: 6000, species: ['Cutthroat Trout', 'Rainbow Trout'], regulations: 'Trout limit 2, artificial flies and lures only', targetDepth: '15-30 ft (submerged timber)', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'smith-morehouse', name: 'Smith and Morehouse Reservoir', lat: 40.77, lng: -111.13, radiusMi: 2, type: 'reservoir', elevation: 7700, species: ['Cutthroat Trout', 'Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '10-25 ft', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'trial-lake',     name: 'Trial Lake',              lat: 40.68, lng: -110.95, radiusMi: 1, type: 'lake', elevation: 9900, species: ['Brook Trout', 'Rainbow Trout', 'Arctic Grayling'], regulations: 'Trout limit 4', targetDepth: '8-20 ft (alpine lake)', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'washington-lake', name: 'Washington Lake',         lat: 40.69, lng: -110.93, radiusMi: 1, type: 'lake', elevation: 9900, species: ['Brook Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '8-18 ft', forage: 'Chironomids, Scuds' },
  { id: 'mirror-lake',    name: 'Mirror Lake',             lat: 40.70, lng: -110.88, radiusMi: 1, type: 'lake', elevation: 10050, species: ['Brook Trout', 'Cutthroat Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft (alpine, clear)', forage: 'Chironomids, Scuds, Damselflies' },
  { id: 'moon-lake',      name: 'Moon Lake',               lat: 40.57, lng: -110.50, radiusMi: 2, type: 'lake', elevation: 8100, species: ['Lake Trout', 'Splake', 'Rainbow Trout'], regulations: 'Lake trout limit 4. Trout limit 4', targetDepth: '25-60 ft (deep alpine lake)', forage: 'Utah Chub, Crayfish, Chironomids' },
  { id: 'upper-stillwater', name: 'Upper Stillwater Reservoir', lat: 40.55, lng: -110.77, radiusMi: 2, type: 'reservoir', elevation: 8100, species: ['Cutthroat Trout', 'Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '10-25 ft (inflow area)', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'matt-warner',    name: 'Matt Warner Reservoir',   lat: 40.79, lng: -109.23, radiusMi: 2, type: 'reservoir', elevation: 7700, species: ['Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Chironomids, Scuds' },
  { id: 'crouse',         name: 'Crouse Reservoir',        lat: 40.81, lng: -109.30, radiusMi: 2, type: 'reservoir', elevation: 7600, species: ['Rainbow Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '8-18 ft', forage: 'Chironomids, Scuds' },
  { id: 'spirit-lake',    name: 'Spirit Lake',             lat: 40.82, lng: -109.77, radiusMi: 1, type: 'lake', elevation: 10200, species: ['Brook Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft (high alpine)', forage: 'Chironomids, Damselflies' },
  { id: 'browne-lake',    name: 'Browne Lake',             lat: 40.89, lng: -109.63, radiusMi: 1, type: 'lake', elevation: 9200, species: ['Brook Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Scuds' },
  { id: 'east-park',      name: 'East Park Reservoir',     lat: 40.84, lng: -109.63, radiusMi: 2, type: 'reservoir', elevation: 9100, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Chironomids, Scuds, Damselflies' },
  { id: 'oaks-park',      name: 'Oaks Park Reservoir',     lat: 40.82, lng: -109.57, radiusMi: 2, type: 'reservoir', elevation: 8500, species: ['Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-18 ft', forage: 'Chironomids, Scuds' },
  { id: 'sheep-creek',    name: 'Sheep Creek Lake',        lat: 40.91, lng: -109.70, radiusMi: 1, type: 'lake', elevation: 8900, species: ['Brook Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft', forage: 'Chironomids, Damselflies' },

  // ═══ UINTAH BASIN ═══
  { id: 'starvation',     name: 'Starvation Reservoir',    lat: 40.19, lng: -110.45, radiusMi: 4, type: 'reservoir', elevation: 5700, species: ['Walleye', 'Brown Trout', 'Yellow Perch', 'Smallmouth Bass'], regulations: 'Walleye limit 6', targetDepth: '15-30 ft (old river channel)', forage: 'Yellow Perch, Utah Chub, Crayfish' },
  { id: 'red-fleet',      name: 'Red Fleet Reservoir',     lat: 40.59, lng: -109.47, radiusMi: 3, type: 'reservoir', elevation: 5600, species: ['Rainbow Trout', 'Brown Trout', 'Bluegill', 'Largemouth Bass'], regulations: 'Trout limit 4', targetDepth: '10-25 ft (red sandstone ledges)', forage: 'Bluegill, Crayfish, Chironomids' },
  { id: 'steinaker',      name: 'Steinaker Reservoir',     lat: 40.52, lng: -109.53, radiusMi: 3, type: 'reservoir', elevation: 5500, species: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill'], regulations: 'Trout limit 4, bass limit 6', targetDepth: '10-20 ft (dam face, weed beds)', forage: 'Bluegill, Crayfish, Chironomids' },
  { id: 'pelican-lake',   name: 'Pelican Lake',            lat: 40.22, lng: -109.70, radiusMi: 3, type: 'lake', elevation: 4800, species: ['Bluegill', 'Largemouth Bass', 'Channel Catfish', 'Green Sunfish'], regulations: 'Bass limit 6. No trout', targetDepth: '5-15 ft (entire lake shallow, weed mats)', forage: 'Bluegill, Damselflies, Dragonflies' },
  { id: 'calder',         name: 'Calder Reservoir',        lat: 40.06, lng: -110.17, radiusMi: 2, type: 'reservoir', elevation: 8100, species: ['Cutthroat Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Chironomids, Scuds' },

  // ═══ CENTRAL UTAH ═══
  { id: 'yuba',           name: 'Yuba Reservoir (Sevier Bridge)', lat: 39.39, lng: -111.95, radiusMi: 8, type: 'reservoir', elevation: 5100, species: ['Northern Pike', 'Tiger Muskie', 'Walleye', 'Wiper', 'Yellow Perch'], regulations: 'No limit on northern pike. Tiger muskie limit 1, over 40"', targetDepth: '10-25 ft (weed edges, old channels)', forage: 'Utah Chub, Yellow Perch, Crayfish' },
  { id: 'scofield',       name: 'Scofield Reservoir',      lat: 39.78, lng: -111.13, radiusMi: 4, type: 'reservoir', elevation: 7600, species: ['Cutthroat Trout', 'Tiger Trout', 'Rainbow Trout'], regulations: 'Trout limit 4, only 2 cutthroat under 15"', targetDepth: '15-25 ft (thermocline)', forage: 'Chironomids, Utah Chub, Scuds' },
  { id: 'electric-lake',  name: 'Electric Lake',           lat: 39.67, lng: -111.16, radiusMi: 3, type: 'reservoir', elevation: 8600, species: ['Cutthroat Trout', 'Rainbow Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '15-40 ft (deep, cold)', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'huntington-north', name: 'Huntington North Reservoir', lat: 39.38, lng: -111.02, radiusMi: 2, type: 'reservoir', elevation: 5900, species: ['Rainbow Trout', 'Bluegill', 'Largemouth Bass', 'Green Sunfish'], regulations: 'Trout limit 4', targetDepth: '8-15 ft (weed beds)', forage: 'Bluegill, Chironomids, Crayfish' },
  { id: 'millsite',       name: 'Millsite Reservoir',      lat: 39.23, lng: -111.10, radiusMi: 2, type: 'reservoir', elevation: 6100, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brown Trout'], regulations: 'Trout limit 4', targetDepth: '10-25 ft', forage: 'Chironomids, Scuds, Utah Chub' },
  { id: 'joes-valley',    name: "Joe's Valley Reservoir",  lat: 39.32, lng: -111.26, radiusMi: 3, type: 'reservoir', elevation: 7100, species: ['Splake', 'Tiger Trout', 'Cutthroat Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '15-35 ft (dam area, submerged trees)', forage: 'Utah Chub, Crayfish, Chironomids' },
  { id: 'cleveland',      name: 'Cleveland Reservoir',     lat: 39.52, lng: -111.23, radiusMi: 2, type: 'reservoir', elevation: 8100, species: ['Cutthroat Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '10-25 ft', forage: 'Chironomids, Scuds' },
  { id: 'ferron',         name: 'Ferron Reservoir',        lat: 39.10, lng: -111.40, radiusMi: 2, type: 'reservoir', elevation: 9600, species: ['Brook Trout', 'Cutthroat Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '8-15 ft (high alpine)', forage: 'Chironomids, Scuds, Damselflies' },
  { id: 'gunnison',       name: 'Gunnison Reservoir',      lat: 39.26, lng: -111.69, radiusMi: 4, type: 'reservoir', elevation: 5300, species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout', 'Yellow Perch'], regulations: 'Trout limit 4', targetDepth: '10-25 ft (inflow channels)', forage: 'Chironomids, Scuds, Utah Chub' },
  { id: 'palisade',       name: 'Palisade Reservoir',      lat: 39.20, lng: -111.57, radiusMi: 3, type: 'reservoir', elevation: 5600, species: ['Rainbow Trout', 'Tiger Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '10-20 ft (weed beds)', forage: 'Chironomids, Scuds, Leeches' },
  { id: 'mona',           name: 'Mona Reservoir',          lat: 39.83, lng: -111.85, radiusMi: 2, type: 'reservoir', elevation: 4900, species: ['Rainbow Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '8-18 ft', forage: 'Chironomids, Scuds' },
  { id: 'payson-lakes',   name: 'Payson Lakes',            lat: 39.93, lng: -111.60, radiusMi: 1, type: 'lake', elevation: 8000, species: ['Rainbow Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '6-12 ft (shallow mountain lakes)', forage: 'Chironomids, Damselflies, Scuds' },

  // ═══ SOUTHERN UTAH ═══
  { id: 'fish-lake',      name: 'Fish Lake',               lat: 38.56, lng: -111.72, radiusMi: 4, type: 'lake', elevation: 8850, species: ['Lake Trout (Mackinaw)', 'Splake', 'Rainbow Trout', 'Yellow Perch'], regulations: 'Lake trout limit 4, only 1 over 25"', targetDepth: '30-60 ft (summer), 15-25 ft (spring/fall)', forage: 'Utah Chub, Crayfish, Yellow Perch' },
  { id: 'otter-creek',    name: 'Otter Creek Reservoir',   lat: 38.23, lng: -111.96, radiusMi: 4, type: 'reservoir', elevation: 6400, species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Wiper'], regulations: 'Trout limit 4', targetDepth: '10-25 ft (dam face, inflow)', forage: 'Utah Chub, Crayfish, Chironomids' },
  { id: 'piute',          name: 'Piute Reservoir',         lat: 38.31, lng: -112.11, radiusMi: 3, type: 'reservoir', elevation: 6100, species: ['Rainbow Trout', 'Brown Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '10-20 ft', forage: 'Chironomids, Scuds, Leeches' },
  { id: 'minersville',    name: 'Minersville Reservoir',   lat: 38.22, lng: -112.88, radiusMi: 4, type: 'reservoir', elevation: 5500, species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Wiper'], regulations: 'Trout limit 4', targetDepth: '12-30 ft (dam, rocky points)', forage: 'Utah Chub, Crayfish' },
  { id: 'panguitch',      name: 'Panguitch Lake',          lat: 37.72, lng: -112.64, radiusMi: 3, type: 'lake', elevation: 8200, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brown Trout'], regulations: 'Trout limit 4', targetDepth: '10-20 ft (weed edges, drop-offs)', forage: 'Chironomids, Scuds, Leeches' },
  { id: 'navajo-lake',    name: 'Navajo Lake',             lat: 37.51, lng: -112.80, radiusMi: 2, type: 'lake', elevation: 9100, species: ['Rainbow Trout', 'Splake', 'Brook Trout', 'Tiger Trout'], regulations: 'Trout limit 4', targetDepth: '15-30 ft (lava tubes, deep sinkholes)', forage: 'Chironomids, Scuds, Zooplankton' },
  { id: 'tropic',         name: 'Tropic Reservoir',        lat: 37.62, lng: -112.03, radiusMi: 2, type: 'reservoir', elevation: 7700, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '8-18 ft', forage: 'Chironomids, Scuds' },
  { id: 'wide-hollow',    name: 'Wide Hollow Reservoir',   lat: 37.77, lng: -111.62, radiusMi: 2, type: 'reservoir', elevation: 6500, species: ['Rainbow Trout', 'Bluegill', 'Largemouth Bass'], regulations: 'Trout limit 4, bass limit 6', targetDepth: '8-20 ft', forage: 'Bluegill, Chironomids, Crayfish' },
  { id: 'kolob',          name: 'Kolob Reservoir',         lat: 37.44, lng: -113.04, radiusMi: 2, type: 'reservoir', elevation: 8100, species: ['Rainbow Trout', 'Cutthroat Trout', 'Brook Trout'], regulations: 'Trout limit 4', targetDepth: '10-20 ft', forage: 'Chironomids, Scuds, Damselflies' },
  { id: 'baker',          name: 'Baker Reservoir',         lat: 37.42, lng: -113.35, radiusMi: 2, type: 'reservoir', elevation: 6200, species: ['Rainbow Trout', 'Brown Trout'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Chironomids, Crayfish' },

  // ═══ SOUTHWEST UTAH ═══
  { id: 'sand-hollow',    name: 'Sand Hollow Reservoir',   lat: 37.11, lng: -113.38, radiusMi: 3, type: 'reservoir', elevation: 3000, species: ['Largemouth Bass', 'Bluegill', 'Crappie', 'Channel Catfish'], regulations: 'Bass limit 6', targetDepth: '10-25 ft (sandstone ledges)', forage: 'Bluegill, Crayfish, Shad' },
  { id: 'quail-creek',    name: 'Quail Creek Reservoir',   lat: 37.20, lng: -113.39, radiusMi: 2, type: 'reservoir', elevation: 3300, species: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill', 'Crappie'], regulations: 'Trout limit 4, bass limit 6', targetDepth: '15-30 ft (dam, thermocline)', forage: 'Bluegill, Crayfish, Shad' },
  { id: 'gunlock',        name: 'Gunlock Reservoir',       lat: 37.28, lng: -113.74, radiusMi: 2, type: 'reservoir', elevation: 3600, species: ['Largemouth Bass', 'Channel Catfish', 'Bluegill', 'Crappie'], regulations: 'Bass limit 6', targetDepth: '8-20 ft (rocky ledges)', forage: 'Bluegill, Crayfish, Shad' },
  { id: 'enterprise',     name: 'Enterprise Reservoir',    lat: 37.57, lng: -113.74, radiusMi: 3, type: 'reservoir', elevation: 5500, species: ['Rainbow Trout', 'Tiger Trout', 'Cutthroat Trout'], regulations: 'Trout limit 4', targetDepth: '10-25 ft', forage: 'Chironomids, Scuds, Utah Chub' },
  { id: 'newcastle',      name: 'Newcastle Reservoir',     lat: 37.66, lng: -113.56, radiusMi: 2, type: 'reservoir', elevation: 5400, species: ['Rainbow Trout', 'Smallmouth Bass', 'Bluegill'], regulations: 'Trout limit 4', targetDepth: '8-20 ft', forage: 'Crayfish, Chironomids, Bluegill' },
];

/**
 * Identify if a coordinate is within a known lake/reservoir.
 * Returns the water body profile or null if no match.
 */
export function identifyWaterBody(lat, lng) {
  let closest = null;
  let closestDist = Infinity;

  for (const wb of KNOWN_WATER_BODIES) {
    const dist = haversine([lat, lng], [wb.lat, wb.lng]);
    if (dist <= wb.radiusMi && dist < closestDist) {
      closestDist = dist;
      closest = wb;
    }
  }
  return closest ? { ...closest, distanceMiles: Math.round(closestDist * 10) / 10 } : null;
}

// ─── Reverse Geocode: Identify water body type via OSM ───────

const OCEAN_TYPES = new Set(['ocean', 'sea', 'bay', 'strait', 'gulf', 'coastline']);

export async function reverseGeocodeWater(lat, lng) {
  const LAKE_KEYWORDS = ['lake', 'reservoir', 'pond', 'lago', 'laguna', 'loch', 'lac', 'see', 'embalse'];

  // Helper: classify a single Nominatim response
  function classify(data) {
    if (!data || data.error) return null;

    const addr = data.address || {};
    const classStr = (data.class || '').toLowerCase();
    const typeStr = (data.type || '').toLowerCase();
    const nameStr = (data.name || '');
    const displayName = (data.display_name || '');
    const all = `${classStr} ${typeStr} ${nameStr} ${displayName} ${addr.natural || ''} ${addr.water || ''}`.toLowerCase();

    // ── Ocean / Sea / Bay / Gulf ──
    if (addr.ocean || addr.sea) {
      return { isLake: false, isOcean: true, isRiver: false,
        name: addr.ocean || addr.sea || addr.bay || nameStr || 'Ocean' };
    }
    for (const key of OCEAN_TYPES) {
      if (all.includes(key)) {
        // Extract best name from display_name parts
        const parts = displayName.split(',').map(s => s.trim());
        let bestName = null;
        for (const part of parts) {
          const pl = part.toLowerCase();
          for (const kw of OCEAN_TYPES) {
            if (pl.includes(kw) && part.length > 3) { bestName = part; break; }
          }
          if (bestName) break;
        }
        return { isLake: false, isOcean: true, isRiver: false,
          name: bestName || nameStr || `Ocean near ${lat.toFixed(1)}, ${lng.toFixed(1)}` };
      }
    }

    // ── Lake / Reservoir ──
    // Check class=natural&type=water (Nominatim's way of saying "this is a water body")
    const isWaterFeature = classStr === 'natural' && typeStr === 'water';
    const nameHasLake = LAKE_KEYWORDS.some(kw => all.includes(kw));

    if (isWaterFeature || nameHasLake) {
      const bestName = (isWaterFeature ? nameStr : null)
        || addr.water
        || (nameHasLake ? nameStr : null)
        || displayName.split(',')[0]
        || 'Unknown Lake';
      return { isLake: true, isOcean: false, isRiver: false, name: bestName };
    }

    return null; // Couldn't classify as water
  }

  try {
    // Pass 1: High zoom (14) to detect specific water features (lakes, reservoirs)
    const hiRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'UtahWaterGlass/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    if (hiRes.ok) {
      const hiData = await hiRes.json();
      const result = classify(hiData);
      if (result) return result;
    }

    // Pass 2: Low zoom (3) to detect oceans/seas that don't appear at high zoom
    let loData = null;
    const loRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'UtahWaterGlass/1.0' }, signal: AbortSignal.timeout(5000) }
    );
    if (loRes.ok) {
      loData = await loRes.json();
      const result = classify(loData);
      if (result) return result;
    }

    // Do NOT use coordinate-based ocean detection here — bounding boxes
    // cover entire hemispheres including land. Ocean detection must come
    // from actual marine telemetry data in the orchestrator.

    // Last resort: return what Nominatim gave us as a river/stream default
    if (loData) {
      const addr = loData.address || {};
      return {
        isLake: false, isOcean: false, isRiver: true,
        name: addr.water || addr.river || loData.name || null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Ocean Name Inference by Coordinates ─────────────────────

const OCEAN_REGIONS = [
  { name: 'Gulf of Mexico',       latMin: 18, latMax: 31, lngMin: -98,  lngMax: -80 },
  { name: 'Caribbean Sea',        latMin: 9,  latMax: 22, lngMin: -89,  lngMax: -59 },
  { name: 'Gulf of California',   latMin: 22, latMax: 32, lngMin: -115, lngMax: -106 },
  { name: 'Chesapeake Bay',       latMin: 36.8, latMax: 39.5, lngMin: -76.5, lngMax: -75.5 },
  { name: 'Puget Sound',          latMin: 47, latMax: 49, lngMin: -123.5, lngMax: -122 },
  { name: 'San Francisco Bay',    latMin: 37.4, latMax: 38.2, lngMin: -122.6, lngMax: -121.8 },
  { name: 'Long Island Sound',    latMin: 40.8, latMax: 41.3, lngMin: -73.8, lngMax: -72 },
  { name: 'North Atlantic Ocean', latMin: 24, latMax: 60, lngMin: -80,  lngMax: -5 },
  { name: 'South Atlantic Ocean', latMin: -60, latMax: 0, lngMin: -70,  lngMax: 20 },
  { name: 'North Pacific Ocean',  latMin: 0,  latMax: 60, lngMin: -180, lngMax: -100 },
  { name: 'South Pacific Ocean',  latMin: -60, latMax: 0, lngMin: -180, lngMax: -70 },
  { name: 'Indian Ocean',         latMin: -60, latMax: 30, lngMin: 20,  lngMax: 120 },
  { name: 'Mediterranean Sea',    latMin: 30, latMax: 46, lngMin: -6,   lngMax: 36 },
  { name: 'North Sea',            latMin: 51, latMax: 62, lngMin: -5,   lngMax: 10 },
  { name: 'Baltic Sea',           latMin: 53, latMax: 66, lngMin: 10,   lngMax: 30 },
  { name: 'South China Sea',      latMin: 0,  latMax: 23, lngMin: 100,  lngMax: 121 },
  { name: 'Sea of Japan',         latMin: 33, latMax: 52, lngMin: 127,  lngMax: 142 },
  { name: 'Coral Sea',            latMin: -30, latMax: -10, lngMin: 142, lngMax: 175 },
  { name: 'Arctic Ocean',         latMin: 66, latMax: 90, lngMin: -180, lngMax: 180 },
];

// Country/state names that are NOT useful as ocean names
const GENERIC_NAMES = new Set([
  'united states', 'mexico', 'canada', 'brazil', 'australia', 'japan', 'china',
  'india', 'russia', 'united kingdom', 'france', 'spain', 'italy', 'germany',
  'texas', 'california', 'florida', 'louisiana', 'alabama', 'mississippi',
  'north carolina', 'south carolina', 'virginia', 'maine', 'oregon', 'washington',
  'new york', 'new jersey', 'massachusetts', 'connecticut', 'hawaii', 'alaska',
]);

function inferOceanName(lat, lng, geoName) {
  // If geocoder returned a real ocean/sea name, use it
  if (geoName && !GENERIC_NAMES.has(geoName.toLowerCase())) {
    return geoName;
  }
  // Look up by coordinate bounding box (checked in order, more specific first)
  for (const region of OCEAN_REGIONS) {
    if (lat >= region.latMin && lat <= region.latMax &&
        lng >= region.lngMin && lng <= region.lngMax) {
      return region.name;
    }
  }
  return `Ocean near ${lat.toFixed(1)}, ${lng.toFixed(1)}`;
}

// ─── Marine Telemetry via Open-Meteo ─────────────────────────

export async function fetchMarineTelemetry(lat, lng) {
  try {
    // Use only documented Open-Meteo Marine parameters
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period&current=wave_height,wave_period,wave_direction&daily=wave_height_max,wave_period_max&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.error) return null;

    const current = data.current || {};
    const daily = data.daily || {};

    // Prefer "current" block (most recent observation), fall back to hourly
    let waveHeightM = current.wave_height;
    let wavePeriodS = current.wave_period;

    if (waveHeightM == null) {
      const hourly = data.hourly || {};
      const len = (hourly.wave_height || []).length;
      const nowIdx = Math.min(new Date().getUTCHours(), len - 1);
      waveHeightM = hourly.wave_height?.[nowIdx] ?? null;
      wavePeriodS = hourly.wave_period?.[nowIdx] ?? null;
    }

    return {
      waveHeightFt: waveHeightM != null ? Math.round(waveHeightM * 3.281 * 10) / 10 : null,
      wavePeriodS: wavePeriodS ?? null,
      waveDirection: current.wave_direction ?? null,
      currentVelocity: null,
      seaSurfaceTempF: null,
      maxWaveHeightFt: daily.wave_height_max?.[0] != null
        ? Math.round(daily.wave_height_max[0] * 3.281 * 10) / 10 : null,
    };
  } catch {
    return null;
  }
}

// ─── Satellite Imagery URL Generator ─────────────────────────

/**
 * Build a pre-cached Esri World Imagery tile URL near a coordinate.
 * Uses slippy-map tile math at zoom 15 (~1 km coverage).
 * Pre-cached tiles serve in <100ms vs 5-8s for the export API.
 */
function buildSatelliteUrl(lat, lng) {
  const zoom = 15;
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

// ─── Dynamic Bio Profile via /api/biology ────────────────────

function _buildBioUrl(name, lat, lng, type, imageUrl) {
  const params = new URLSearchParams({ name, lat: String(lat), lng: String(lng), type });
  if (imageUrl) params.set('imageUrl', imageUrl);
  return `/api/biology?${params}`;
}

async function fetchDynamicBioProfile(name, lat, lng, type = 'lake') {
  const url = `/api/biology?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&type=${type}`;
  console.log('[BioProfile] Fetching:', url);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn('[BioProfile] HTTP', res.status);
      return null;
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      console.warn('[BioProfile] Non-JSON response:', ct);
      return null;
    }

    const data = await res.json();
    data._satelliteUrl = buildSatelliteUrl(lat, lng);
    console.log('[BioProfile] OK:', data.species?.substring(0, 40));
    return data;
  } catch (err) {
    console.warn('[BioProfile] Error:', err?.message);
    return null;
  }
}

// ─── Step 1: USGS API Fetcher ────────────────────────────────

/**
 * Fetch the nearest USGS gauge data for a given coordinate.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radiusMiles=10]
 * @returns {Promise<{ siteId: string, siteName: string, waterTemp: number|null,
 *   dischargeCFS: number|null, gaugeHeightFt: number|null, distanceMiles: number }|null>}
 */
export async function fetchNearestUSGSData(lat, lng, radiusMiles = 10) {
  const delta = milesToDegrees(radiusMiles);
  const west  = (lng - delta).toFixed(4);
  const south = (lat - delta).toFixed(4);
  const east  = (lng + delta).toFixed(4);
  const north = (lat + delta).toFixed(4);

  const params = new URLSearchParams({
    format: 'json',
    bBox: `${west},${south},${east},${north}`,
    parameterCd: [PARAM_WATER_TEMP, PARAM_DISCHARGE, PARAM_GAUGE_HT].join(','),
    siteStatus: 'active',
  });

  const url = `${USGS_BASE}?${params.toString()}`;

  let json;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  const timeSeries = json?.value?.timeSeries;
  if (!timeSeries || timeSeries.length === 0) return null;

  // Group readings by site
  const sites = new Map();
  for (const ts of timeSeries) {
    const info = ts.sourceInfo;
    const siteCode = info?.siteCode?.[0]?.value;
    if (!siteCode) continue;

    if (!sites.has(siteCode)) {
      const geo = info.geoLocation?.geogLocation;
      sites.set(siteCode, {
        siteId: siteCode,
        siteName: info.siteName || siteCode,
        lat: geo?.latitude ?? null,
        lng: geo?.longitude ?? null,
        waterTemp: null,
        dischargeCFS: null,
        gaugeHeightFt: null,
      });
    }

    const site = sites.get(siteCode);
    const paramCode = ts.variable?.variableCode?.[0]?.value;
    const latestVal = ts.values?.[0]?.value?.[0];
    const numericValue = latestVal ? parseFloat(latestVal.value) : NaN;
    if (isNaN(numericValue) || numericValue < -999) continue;

    if (paramCode === PARAM_WATER_TEMP) {
      // USGS reports °C — convert to °F for consistency with the rest of the app
      site.waterTemp = Math.round((numericValue * 9 / 5 + 32) * 10) / 10;
    } else if (paramCode === PARAM_DISCHARGE) {
      site.dischargeCFS = Math.round(numericValue * 10) / 10;
    } else if (paramCode === PARAM_GAUGE_HT) {
      site.gaugeHeightFt = Math.round(numericValue * 100) / 100;
    }
  }

  if (sites.size === 0) return null;

  // Find the closest site to the requested coordinate
  let closest = null;
  let closestDist = Infinity;

  for (const site of sites.values()) {
    if (site.lat == null || site.lng == null) continue;
    const dist = haversine([lat, lng], [site.lat, site.lng]);
    if (dist < closestDist) {
      closestDist = dist;
      closest = site;
    }
  }

  if (!closest) {
    // No geo data — just take the first site with useful data
    closest = [...sites.values()].find(s => s.waterTemp != null || s.dischargeCFS != null) || null;
    closestDist = radiusMiles;
  }

  if (!closest) return null;

  return {
    siteId: closest.siteId,
    siteName: closest.siteName,
    waterTemp: closest.waterTemp,
    dischargeCFS: closest.dischargeCFS,
    gaugeHeightFt: closest.gaugeHeightFt,
    distanceMiles: Math.round(closestDist * 10) / 10,
  };
}

// ─── Tier 2: Elevation/Thermal Inference (fallback) ──────────

/**
 * Estimate water temperature from elevation and ambient air temp.
 * High-altitude lakes are colder; shallow warm faster in summer.
 *
 * @param {number} elevationFt
 * @param {number} ambientTempF
 * @returns {number} Estimated water temperature in °F
 */
export function inferWaterTemp(elevationFt, ambientTempF) {
  if (ambientTempF == null) return 55;

  // Lapse rate: water is cooler at altitude (~3°F per 1000 ft above 4500')
  const elevationPenalty = Math.max(0, (elevationFt - 4500) / 1000) * 3;

  // Water generally lags air temp and stays cooler
  const airLag = 0.55;
  const base = ambientTempF * airLag + 32 * (1 - airLag);

  return Math.round(Math.max(33, base - elevationPenalty));
}

// ─── Flow / Clarity Physics ──────────────────────────────────

/**
 * Assess water clarity and safety from discharge data.
 *
 * @param {number|null} dischargeCFS
 * @param {string} [waterBodyType='river'] — 'river' | 'lake' | 'reservoir'
 * @returns {{ clarity: string, flowCategory: string, safeForWading: boolean, reason: string }}
 */
export function assessFlowConditions(dischargeCFS, waterBodyType = 'river') {
  if (dischargeCFS == null) {
    return { clarity: 'unknown', flowCategory: 'unknown', safeForWading: true, reason: 'No flow data available' };
  }

  if (waterBodyType === 'lake' || waterBodyType === 'reservoir') {
    return {
      clarity: dischargeCFS > 500 ? 'stained' : 'clear',
      flowCategory: 'stillwater',
      safeForWading: true,
      reason: dischargeCFS > 500
        ? `Inflow ${dischargeCFS} CFS — possible turbidity from runoff`
        : `Low inflow (${dischargeCFS} CFS) — lake clarity likely good`,
    };
  }

  // River flow thresholds (calibrated for typical Utah rivers)
  if (dischargeCFS > 2000) {
    return {
      clarity: 'blown out',
      flowCategory: 'dangerous',
      safeForWading: false,
      reason: `Dangerous flow: ${dischargeCFS} CFS. River likely brown and unfishable. Do not wade.`,
    };
  }
  if (dischargeCFS > 1000) {
    return {
      clarity: 'stained',
      flowCategory: 'high',
      safeForWading: false,
      reason: `High water: ${dischargeCFS} CFS. Stained/muddy. Bank fishing only.`,
    };
  }
  if (dischargeCFS > 400) {
    return {
      clarity: 'slightly off-color',
      flowCategory: 'moderate',
      safeForWading: true,
      reason: `Moderate flow: ${dischargeCFS} CFS. Wadeable with caution, clarity fair.`,
    };
  }
  if (dischargeCFS > 100) {
    return {
      clarity: 'clear',
      flowCategory: 'ideal',
      safeForWading: true,
      reason: `Ideal flow: ${dischargeCFS} CFS. Clear water, easy wading.`,
    };
  }
  return {
    clarity: 'clear/low',
    flowCategory: 'low',
    safeForWading: true,
    reason: `Low flow: ${dischargeCFS} CFS. Fish may concentrate in deeper pools.`,
  };
}

// ─── Ecological Hatch / Activity Estimation ──────────────────

function estimateHatchActivity(waterTempF) {
  if (waterTempF == null) return { hatch: 'unknown', feedingActivity: 'unknown' };

  if (waterTempF < 39) {
    return { hatch: 'midges (sparse)', feedingActivity: 'very low — fish lethargic in cold water' };
  }
  if (waterTempF < 45) {
    return { hatch: 'blue-winged olives, midges', feedingActivity: 'low — slow nymphing recommended' };
  }
  if (waterTempF < 55) {
    return { hatch: 'blue-winged olives, caddis starting', feedingActivity: 'moderate — subsurface feeding' };
  }
  if (waterTempF < 62) {
    return { hatch: 'PMDs, caddis, golden stones', feedingActivity: 'high — active surface feeding' };
  }
  if (waterTempF < 68) {
    return { hatch: 'caddis, PMDs, terrestrials', feedingActivity: 'high — aggressive feeding window' };
  }
  if (waterTempF < 72) {
    return { hatch: 'terrestrials, caddis (evening)', feedingActivity: 'moderate — fish stressed, dawn/dusk best' };
  }
  return { hatch: 'minimal — water too warm', feedingActivity: 'very low — trout in thermal refugia. Bass may be active.' };
}

// ─── Step 2: The 2-Tier Orchestrator ─────────────────────────

/**
 * Generate a complete ecological/fishery profile for a coordinate.
 *
 * Tier 1: Live USGS gauge data (water temp, flow, gauge height).
 * Tier 2: Elevation + ambient temp inference when no gauge exists.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [elevation=4500] — Approximate elevation in feet
 * @param {{ ambientTemp?: number, waterBodyType?: string }} [currentWeatherData={}]
 * @returns {Promise<EcologicalProfile>}
 */
export async function generateFisheryProfile(lat, lng, elevation = 4500, currentWeatherData = {}) {
  const ambientTemp = currentWeatherData.ambientTemp ?? null;

  // ── Tier 0: Hardcoded known Utah lakes (fastest, no network) ──
  const lakeMatch = identifyWaterBody(lat, lng);
  if (lakeMatch) {
    return buildLakeProfile(lakeMatch, elevation, ambientTemp);
  }

  // ── Tier 1: Reverse geocode to determine water body type ──
  const geo = await reverseGeocodeWater(lat, lng);

  // ── Ocean / Sea path ──
  if (geo?.isOcean) {
    const name = inferOceanName(lat, lng, geo.name);
    return buildOceanProfile(lat, lng, name, ambientTemp);
  }

  // ── Unknown lake (not in hardcoded list) — try dynamic bio ──
  if (geo?.isLake && geo.name) {
    return buildDynamicLakeProfile(lat, lng, geo.name, elevation, ambientTemp);
  }

  // ── Tier 2: Geocoder returned null or river. Probe USGS + Marine in parallel
  //    to determine if this is a river (has USGS gauge) or open water (has waves). ──
  const [usgs, marine] = await Promise.all([
    fetchNearestUSGSData(lat, lng, 15),
    fetchMarineTelemetry(lat, lng),
  ]);

  // If marine API returned wave data but no USGS gauge → open water
  const hasMarineData = marine && (marine.waveHeightFt != null || marine.maxWaveHeightFt != null);
  if (hasMarineData && !usgs) {
    const oceanName = inferOceanName(lat, lng, geo?.name);
    return buildOceanProfile(lat, lng, oceanName, ambientTemp);
  }

  // ── River/Stream fallback (pass pre-fetched USGS to avoid duplicate call) ──
  return buildRiverProfileWithData(lat, lng, elevation, ambientTemp, usgs);
}

function buildLakeProfile(lake, elevation, ambientTemp) {
  const effectiveElevation = lake.elevation || elevation;
  const waterTemp = inferWaterTemp(effectiveElevation, ambientTemp);

  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  const month = new Date().getMonth() + 1;
  const season = month <= 3 || month >= 11 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';

  return {
    coordinates: { lat: lake.lat, lng: lake.lng },
    elevation: effectiveElevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: `Lake Intelligence — ${lake.name}`,
    waterType: 'lake',

    lakeIntel: {
      id: lake.id,
      name: lake.name,
      species: lake.species,
      targetDepth: lake.targetDepth,
      regulations: lake.regulations,
      forage: lake.forage,
      distanceMiles: lake.distanceMiles,
      season,
    },

    usgsGauge: null,

    clarity: 'clear',
    flowCategory: 'stillwater',
    safeForWading: true,
    reason: `${lake.name} — stillwater fishery. Target ${lake.targetDepth}.`,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: lake.type,
    generatedAt: new Date().toISOString(),
  };
}

async function buildOceanProfile(lat, lng, name, ambientTemp) {
  const [marine, bio] = await Promise.all([
    fetchMarineTelemetry(lat, lng),
    fetchDynamicBioProfile(name, lat, lng, 'ocean'),
  ]);

  // Latitude-based SST estimation for ocean (tropical ≈ 82°F, polar ≈ 35°F)
  const absLat = Math.abs(lat);
  const waterTemp = ambientTemp != null
    ? ambientTemp * 0.85 + 10
    : Math.max(35, 85 - absLat * 1.1);

  return {
    coordinates: { lat, lng },
    elevation: 0,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: marine?.waveHeightFt != null ? `Open-Meteo Marine — ${name}` : `Thermal Inference — ${name}`,
    waterType: 'ocean',

    oceanData: {
      name,
      waveHeightFt: marine?.waveHeightFt ?? null,
      wavePeriodS: marine?.wavePeriodS ?? null,
      waveDirection: marine?.waveDirection ?? null,
      maxWaveHeightFt: marine?.maxWaveHeightFt ?? null,
      currentVelocity: marine?.currentVelocity ?? null,
      seaSurfaceTempF: null,
    },

    lakeIntel: bio ? {
      name,
      species: bio.species ? (Array.isArray(bio.species) ? bio.species : bio.species.split(', ')) : [],
      targetDepth: bio.targetDepth || null,
      regulations: bio.regulations || null,
      forage: bio.forage || null,
    } : { name, species: [], targetDepth: null, regulations: null, forage: null },

    visualIntel: bio?._visual ? {
      analysis: bio.visualAnalysis || null,
      clue: bio.clue || null,
      habitatComplexity: bio.habitatComplexity ?? null,
      satelliteUrl: bio._satelliteUrl || null,
    } : null,

    usgsGauge: null,

    clarity: 'clear',
    flowCategory: 'ocean',
    safeForWading: true,
    reason: marine?.waveHeightFt > 6
      ? `Large swell (${marine.waveHeightFt} ft) — exercise caution near shore`
      : `${name} — marine environment`,

    hatch: bio?.forage || 'Baitfish, crustaceans, plankton',
    feedingActivity: waterTemp > 75 ? 'high — warm water, active pelagics' : waterTemp > 60 ? 'moderate — temperate zone feeding' : 'low — cold water, bottom dwellers active',
    thermalStress: 'none',
    thermalAdvice: null,

    ambientTemp,
    waterBodyType: 'ocean',
    generatedAt: new Date().toISOString(),
  };
}

async function buildDynamicLakeProfile(lat, lng, name, elevation, ambientTemp) {
  const [bio, usgs] = await Promise.all([
    fetchDynamicBioProfile(name, lat, lng),
    fetchNearestUSGSData(lat, lng, 15),
  ]);

  const waterTemp = usgs?.waterTemp ?? inferWaterTemp(elevation, ambientTemp);
  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  const month = new Date().getMonth() + 1;
  const season = month <= 3 || month >= 11 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';

  return {
    coordinates: { lat, lng },
    elevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: bio ? `AI Synthesized Lake Profile — ${name}` : (usgs ? `USGS + Inference — ${name}` : `Thermal Inference — ${name}`),
    waterType: 'lake',

    lakeIntel: {
      name,
      species: bio?.species ? (Array.isArray(bio.species) ? bio.species : bio.species.split(', ')) : [],
      targetDepth: bio?.targetDepth || null,
      regulations: bio?.regulations || null,
      forage: bio?.forage || null,
      season,
    },

    visualIntel: bio?._visual ? {
      analysis: bio.visualAnalysis || null,
      clue: bio.clue || null,
      habitatComplexity: bio.habitatComplexity ?? null,
      satelliteUrl: bio._satelliteUrl || null,
    } : null,

    usgsGauge: usgs ? {
      siteId: usgs.siteId,
      siteName: usgs.siteName,
      distanceMiles: usgs.distanceMiles,
      dischargeCFS: usgs.dischargeCFS,
      gaugeHeightFt: usgs.gaugeHeightFt,
    } : null,

    clarity: 'clear',
    flowCategory: 'stillwater',
    safeForWading: true,
    reason: `${name} — stillwater fishery.${bio?.targetDepth ? ` Target ${bio.targetDepth}.` : ''}`,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: 'lake',
    generatedAt: new Date().toISOString(),
  };
}

async function buildRiverProfile(lat, lng, elevation, ambientTemp) {
  return buildRiverProfileWithData(lat, lng, elevation, ambientTemp, null);
}

async function buildRiverProfileWithData(lat, lng, elevation, ambientTemp, prefetchedUsgs) {
  const usgs = prefetchedUsgs ?? await fetchNearestUSGSData(lat, lng, 15);

  let waterTemp;
  let dataSource;

  if (usgs?.waterTemp != null) {
    waterTemp = usgs.waterTemp;
    dataSource = `USGS Live Gauge (Site ${usgs.siteId} — ${usgs.siteName}, ${usgs.distanceMiles} mi)`;
  } else {
    waterTemp = inferWaterTemp(elevation, ambientTemp);
    dataSource = 'Elevation/Thermal Inference';
  }

  const flow = assessFlowConditions(usgs?.dischargeCFS ?? null, 'river');

  if (usgs?.dischargeCFS != null && usgs.dischargeCFS > 1000) {
    flow.clarity = 'stained/blown out';
    flow.reason = `USGS reports ${usgs.dischargeCFS} CFS — river likely muddy and high. ${flow.reason}`;
  }

  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  return {
    coordinates: { lat, lng },
    elevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource,
    waterType: 'river',

    lakeIntel: null,

    usgsGauge: usgs ? {
      siteId: usgs.siteId,
      siteName: usgs.siteName,
      distanceMiles: usgs.distanceMiles,
      dischargeCFS: usgs.dischargeCFS,
      gaugeHeightFt: usgs.gaugeHeightFt,
    } : null,

    ...flow,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: 'river',
    generatedAt: new Date().toISOString(),
  };
}

export const AquaticIntelligenceEngine = {
  fetchNearestUSGSData,
  inferWaterTemp,
  assessFlowConditions,
  generateFisheryProfile,
  identifyWaterBody,
  reverseGeocodeWater,
  fetchMarineTelemetry,
};
