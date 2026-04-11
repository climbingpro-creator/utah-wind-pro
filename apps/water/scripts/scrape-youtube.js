#!/usr/bin/env node

/**
 * YouTube Transcript Ingestion Engine
 *
 * Fetches recent videos from Utah fishing YouTube channels via RSS,
 * downloads transcripts, scans for location mentions, and writes
 * excerpted shop reports to shop-reports.json.
 *
 * Usage:  node scripts/scrape-youtube.js
 *         npm run scrape-youtube
 */

import RSSParser from 'rss-parser';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/shop-reports.json');
const LOOKBACK_DAYS = 7;
const EXCERPT_RADIUS = 300;
const FETCH_DELAY_MS = 1000;

// ───────────────────────────────────────────────────────────────────
//  Target YouTube channels — real Utah fishing content creators
// ───────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'UCDvxuCSpCZUrgJsZSwxr3fA', name: 'Ventures Fly Co.' },
  { id: 'UCZreFtJ2FBdIWoR5KNL9KKw', name: 'Kraken Bass' },
  { id: 'UCHDani31ym9gqJahEZ4j-Qg', name: 'Utah Fishing Channel' },
  { id: 'UCImkXwZ-9vFVEMIrlFKguJg', name: 'TroutFlies' },
  { id: 'UCkmciCX3bWIAJJ7OdyaFLfw', name: 'Flycraft' },
  { id: 'UCT4gBy6nA4VJA82U4eea2EA', name: 'Black Fly Creations' },
  { id: 'UCx9FnDcUlHu9Q9VsdFYwnIQ', name: 'Skiddy Fishing' },
  { id: 'UCeIAUoTlVoisHfNi7aZhu-w', name: "Fishin' Utah" },
];

// ───────────────────────────────────────────────────────────────────
//  Location keyword → locationId mapping
//  Multiple keywords can map to the same locationId.
//  Longer phrases are checked first to avoid partial matches.
// ───────────────────────────────────────────────────────────────────
const LOCATION_KEYWORDS = [
  // Provo River segments
  { keywords: ['lower provo', 'provo lower', 'provo river below deer creek', 'olmstead'], id: 'provo-lower' },
  { keywords: ['middle provo', 'provo middle', 'provo river below jordanelle', 'midway stretch'], id: 'provo-middle' },
  { keywords: ['upper provo', 'provo upper', 'provo river above jordanelle', 'woodland provo'], id: 'provo-upper' },
  { keywords: ['provo river'], id: 'provo-lower' },

  // Green River segments
  { keywords: ['green river a section', 'a section green', 'dam to little hole', 'section a'], id: 'green-a' },
  { keywords: ['green river b section', 'b section green', 'little hole to indian crossing', 'section b'], id: 'green-b' },
  { keywords: ['green river c section', 'c section green', 'browns park', 'section c'], id: 'green-c' },
  { keywords: ['green river'], id: 'green-a' },

  // Major reservoirs
  { keywords: ['strawberry reservoir', 'strawberry res', 'strawberry'], id: 'strawberry' },
  { keywords: ['deer creek reservoir', 'deer creek res', 'deer creek'], id: 'deer-creek' },
  { keywords: ['jordanelle reservoir', 'jordanelle res', 'jordanelle'], id: 'jordanelle' },
  { keywords: ['flaming gorge reservoir', 'flaming gorge res', 'flaming gorge'], id: 'flaming-gorge' },
  { keywords: ['starvation reservoir', 'starvation res', 'starvation'], id: 'starvation' },
  { keywords: ['scofield reservoir', 'scofield res', 'scofield'], id: 'scofield' },
  { keywords: ['pineview reservoir', 'pineview res', 'pineview'], id: 'pineview' },
  { keywords: ['willard bay reservoir', 'willard bay res', 'willard bay'], id: 'willard-bay' },
  { keywords: ['yuba reservoir', 'yuba res', 'yuba'], id: 'yuba' },
  { keywords: ['sand hollow reservoir', 'sand hollow res', 'sand hollow'], id: 'sand-hollow' },
  { keywords: ['echo reservoir', 'echo res'], id: 'echo' },
  { keywords: ['rockport reservoir', 'rockport res', 'rockport'], id: 'rockport' },
  { keywords: ['east canyon reservoir', 'east canyon res', 'east canyon'], id: 'east-canyon' },

  // Lakes
  { keywords: ['utah lake'], id: 'utah-lake' },
  { keywords: ['fish lake'], id: 'fish-lake' },
  { keywords: ['bear lake'], id: 'bear-lake' },
  { keywords: ['lake powell'], id: 'lake-powell' },
  { keywords: ['panguitch lake', 'panguitch'], id: 'panguitch' },

  // Other rivers
  { keywords: ['weber river', 'weber'], id: 'weber-middle' },
  { keywords: ['upper weber', 'peoa', 'oakley weber'], id: 'weber-upper' },
  { keywords: ['lower weber', 'morgan weber', 'henefer'], id: 'weber-lower' },
  { keywords: ['logan river'], id: 'logan-river' },
  { keywords: ['blacksmith fork'], id: 'blacksmith-fork' },
  { keywords: ['sevier river'], id: 'sevier-river' },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractExcerpt(text, keyword, radius) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + keyword.length + radius);
  let excerpt = text.slice(start, end).trim();

  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}

function scanForLocations(text) {
  const lower = text.toLowerCase();
  const matches = new Map();

  for (const loc of LOCATION_KEYWORDS) {
    if (matches.has(loc.id)) continue;

    for (const kw of loc.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        const excerpt = extractExcerpt(text, kw, EXCERPT_RADIUS);
        if (excerpt) {
          matches.set(loc.id, { locationId: loc.id, keyword: kw, excerpt });
        }
        break;
      }
    }
  }

  return [...matches.values()];
}

async function fetchChannelVideos(channel, parser, cutoff) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  try {
    const feed = await parser.parseURL(feedUrl);
    const recent = (feed.items || []).filter(item => {
      const pub = new Date(item.pubDate || item.isoDate);
      return pub >= cutoff;
    });
    return recent.map(item => ({
      videoId: item.id?.replace('yt:video:', '') || item.link?.split('v=')[1],
      title: item.title,
      date: item.pubDate || item.isoDate,
      channel: channel.name,
    }));
  } catch (err) {
    console.warn(`[YouTube] ⚠ Could not fetch RSS for ${channel.name}: ${err.message}`);
    return [];
  }
}

async function fetchTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (!segments || segments.length === 0) return null;
    return segments.map(s => s.text).join(' ');
  } catch {
    return null;
  }
}

async function main() {
  console.log('[YouTube Scraper] Starting transcript ingestion...');

  const parser = new RSSParser();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  cutoff.setHours(0, 0, 0, 0);

  // Phase 1: Collect recent videos from all channels
  let allVideos = [];
  for (const channel of CHANNELS) {
    const videos = await fetchChannelVideos(channel, parser, cutoff);
    if (videos.length > 0) {
      console.log(`[YouTube] ${channel.name}: ${videos.length} video(s) in last ${LOOKBACK_DAYS} days`);
    }
    allVideos.push(...videos);
  }

  console.log(`[YouTube] ${allVideos.length} total recent videos across ${CHANNELS.length} channels`);

  if (allVideos.length === 0) {
    console.log('[YouTube] No recent videos found. Writing empty report.');
    writeOutput({}, 0, 0);
    return;
  }

  // Phase 2: Fetch transcripts and scan for locations
  const reports = {};
  let transcriptsFound = 0;

  for (const video of allVideos) {
    await sleep(FETCH_DELAY_MS);

    console.log(`[YouTube] Fetching transcript: "${video.title}" (${video.videoId})`);
    const transcript = await fetchTranscript(video.videoId);

    if (!transcript) {
      console.log(`[YouTube]   ↳ No transcript available, skipping`);
      continue;
    }

    transcriptsFound++;
    console.log(`[YouTube]   ↳ Transcript: ${transcript.length} chars`);

    const locationMatches = scanForLocations(transcript);
    if (locationMatches.length === 0) {
      console.log(`[YouTube]   ↳ No Utah location mentions found`);
      continue;
    }

    console.log(`[YouTube]   ↳ Matched locations: ${locationMatches.map(m => m.locationId).join(', ')}`);

    for (const match of locationMatches) {
      if (!reports[match.locationId]) reports[match.locationId] = [];
      reports[match.locationId].push({
        channel: video.channel,
        title: video.title,
        videoId: video.videoId,
        date: new Date(video.date).toISOString().slice(0, 10),
        excerpt: match.excerpt,
      });
    }
  }

  writeOutput(reports, allVideos.length, transcriptsFound);
}

function writeOutput(reports, videosProcessed, transcriptsFound) {
  const locationCount = Object.keys(reports).length;
  const reportCount = Object.values(reports).reduce((sum, arr) => sum + arr.length, 0);

  const output = {
    _meta: {
      source: 'YouTube transcript ingestion — Utah fishing channels',
      lastUpdated: new Date().toISOString(),
      channelsScanned: CHANNELS.length,
      videosProcessed,
      transcriptsFound,
      locationsMatched: locationCount,
      totalReports: reportCount,
      lookbackDays: LOOKBACK_DAYS,
    },
    reports,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\n[YouTube Scraper] ✓ Wrote ${reportCount} report(s) across ${locationCount} location(s) to shop-reports.json`);
}

main().catch(err => {
  console.error('[YouTube Scraper] FATAL:', err.message);
  process.exit(1);
});
