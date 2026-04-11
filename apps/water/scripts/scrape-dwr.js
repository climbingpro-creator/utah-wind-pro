#!/usr/bin/env node

/**
 * Utah DWR Fish Stocking Report Scraper
 *
 * Fetches the live stocking table from dwrapps.utah.gov/fishstocking/,
 * filters to the last 14 days, maps DWR abbreviated water names to our
 * app locationIds, and overwrites stocking-data.json.
 *
 * Usage:  node scripts/scrape-dwr.js
 *         npm run update-stocking
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/stocking-data.json');
const DWR_URL = 'https://dwrapps.utah.gov/fishstocking/';
const LOOKBACK_DAYS = 14;

// ───────────────────────────────────────────────────────────────────
//  DWR abbreviated name → our locationId mapping
//  DWR uses ALL-CAPS with abbreviations: RES, L, R, CR, P, PND, etc.
// ───────────────────────────────────────────────────────────────────
const DWR_NAME_MAP = {
  // Major reservoirs
  'STRAWBERRY RES':       'strawberry',
  'DEER CR RES':          'deer-creek',
  'JORDANELLE RES':       'jordanelle',
  'FLAMING GORGE RES':    'flaming-gorge',
  'STARVATION RES':       'starvation',
  'SCOFIELD RES':         'scofield',
  'PINEVIEW RES':         'pineview',
  'WILLARD BAY RES':      'willard-bay',
  'YUBA RES':             'yuba',
  'SAND HOLLOW RES':      'sand-hollow',
  'ECHO RES':             'echo',
  'ROCKPORT RES':         'rockport',
  'EAST CANYON RES':      'east-canyon',
  'CUTLER RES':           'cutler',
  'HYRUM RES':            'hyrum',
  'MANTUA RES':           'mantua',
  'GUNNISON BEND RES':    'gunnison-bend',
  'KOOSHAREM RES':        'koosharem',
  'OTTER CR RES':         'otter-creek',
  'MILLSITE RES':         'millsite',
  'MILL MEADOW RES':      'mill-meadow',
  'QUAIL CR RES':         'quail-creek',
  'ENTERPRISE RES,UPPER': 'enterprise-upper',
  'ENTERPRISE RES':       'enterprise',
  'JACKSON FLAT RES.':    'jackson-flat',
  'LEIGH HILL RES':       'leigh-hill',
  'HOLMES CR RES':        'holmes-creek',
  'FARMINGTON CITY RES':  'farmington',
  'WELLSVILLE RES':       'wellsville',
  'ADAMS RESERVOIR':      'adams',

  // Lakes
  'FISH L':               'fish-lake',
  'BEAR L':               'bear-lake',
  'PANGUITCH L':          'panguitch',
  'SPRING L':             'spring-lake',
  'LAKE POWELL':          'lake-powell',
  'UTAH L':               'utah-lake',

  // Rivers — segmented
  'GREEN R':              'green-a',
  'PROVO R':              'provo-lower',
  'PROVO R, MIDDLE':      'provo-middle',
  'PROVO R, UPPER':       'provo-upper',
  'WEBER R':              'weber-middle',
  'WEBER R, UPPER':       'weber-upper',
  'WEBER R, LOWER':       'weber-lower',
  'SEVIER R':             'sevier-river',
  'SEVIER R, E FK':       'sevier-east-fork',
  'BEAVER R':             'beaver-river',
  'LOGAN R':              'logan-river',
  'BLACKSMITH FK':        'blacksmith-fork',
  'CHALK CR':             'chalk-creek',
  'DUCK CR SPRINGS':      'duck-creek',

  // Community ponds / fisheries
  'PROVO DELTA COMM FISHERY': 'provo-delta',
  'SALEM POND':           'salem-pond',
  'SPANISH OAKS P':       'spanish-oaks',
  'BOUNTIFUL POND':       'bountiful-pond',
  'HIGHLAND GLEN PARK P': 'highland-glen',
  'CANYON VIEW PARK PD':  'canyon-view',
  'MANILA CREEK PARK POND': 'manila-creek',
  'WILLOW CREEK POND':    'willow-creek-pond',
  'SANDY COMMUNITY FISHERY': 'sandy-community',
  'BARTHOLOMEW PARK POND': 'bartholomew-park',
  'PENNY SPRINGS PARK POND': 'penny-springs',
  'FAIRMONT PARK SLC':    'fairmont-park',
  'RIVERTON POND':        'riverton-pond',
  'RIVERFRONT POND':      'riverfront-pond',
  'WILLOW PARK PND':      'willow-park',
  'SUNSET POND':          'sunset-pond',
  'COVE POND':            'cove-pond',
  'KIDNEY POND':          'kidney-pond',
  'MIDAS POND':           'midas-pond',
  'MILLRACE PARK POND':   'millrace-park',
  'CLINTON POND':         'clinton-pond',
  'STEED POND':           'steed-pond',
  'MAYBEY POND':          'maybey-pond',
  'GLASSMANS POND':       'glassmans-pond',
  'KAYSVILLE STAKE POND': 'kaysville-stake',
  'SMITH FAMILY PARK POND': 'smith-family-park',
  'MEADOW CRK P':        'meadow-creek-pond',
  'POND AT POULTER PRESERVE': 'poulter-preserve',
  'JENSEN NATURE PARK POND': 'jensen-nature-park',
  'MONROE POND':          'monroe-pond',
  'SALINA CITY POND':     'salina-pond',
  'GLENWOOD POND':        'glenwood-pond',
  'BURRASTON PONDS':      'burraston-ponds',
  'FOREBAY POND':         'forebay-pond',
  'PAROWAN POND':         'parowan-pond',

  // Southern Utah ponds
  'RAZOR RIDGE P':        'razor-ridge',
  'SKYLINE P':            'skyline-pond',
  'STRATTON P':           'stratton-pond',
  'TOWA P, UPPER':        'towa-upper',
  'TOWA P. LOWER':        'towa-lower',
  'WILLOW SPRING POND':   'willow-spring',
  'VIRGINR RIVER PARK POND': 'virgin-river-park',
};

function parseDwrDate(dateStr) {
  const [month, day, year] = dateStr.trim().split('/').map(Number);
  return new Date(year, month - 1, day);
}

async function main() {
  console.log('[DWR Scraper] Fetching stocking report…');

  let html;
  try {
    const resp = await axios.get(DWR_URL, { timeout: 15000 });
    html = resp.data;
  } catch (err) {
    console.error('[DWR Scraper] FATAL — could not fetch DWR page:', err.message);
    process.exit(1);
  }

  const $ = cheerio.load(html);
  const rows = $('table tr');
  console.log(`[DWR Scraper] Found ${rows.length} table rows`);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  cutoff.setHours(0, 0, 0, 0);

  const matched = new Set();
  const unmapped = new Map();
  let totalRows = 0;
  let recentRows = 0;

  rows.each((_i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    totalRows++;
    const waterName = $(cells[0]).text().trim();
    const dateStr = $(cells[5]).text().trim();

    if (!dateStr) return;

    let stockDate;
    try {
      stockDate = parseDwrDate(dateStr);
    } catch {
      return;
    }

    if (stockDate < cutoff) return;
    recentRows++;

    const locationId = DWR_NAME_MAP[waterName];
    if (locationId) {
      matched.add(locationId);
    } else if (!unmapped.has(waterName)) {
      unmapped.set(waterName, dateStr);
    }
  });

  const stocked = [...matched].sort();

  console.log(`[DWR Scraper] ${totalRows} total stocking entries`);
  console.log(`[DWR Scraper] ${recentRows} entries within last ${LOOKBACK_DAYS} days`);
  console.log(`[DWR Scraper] ${stocked.length} matched locationIds:`, stocked);

  if (unmapped.size > 0) {
    console.warn(`\n[DWR Scraper] ⚠ ${unmapped.size} unmapped DWR names (add to DWR_NAME_MAP):`);
    for (const [name, date] of unmapped) {
      console.warn(`  "${name}" → stocked ${date}`);
    }
  }

  const output = {
    _meta: {
      source: 'Utah Division of Wildlife Resources — Stocking Reports',
      url: DWR_URL,
      lastUpdated: new Date().toISOString(),
      lookbackDays: LOOKBACK_DAYS,
      matchedCount: stocked.length,
      notes: `Auto-generated by scrape-dwr.js. Waters stocked within the last ${LOOKBACK_DAYS} days.`,
    },
    stocked,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\n[DWR Scraper] ✓ Wrote ${stocked.length} locationIds to ${OUTPUT_PATH}`);
}

main();
