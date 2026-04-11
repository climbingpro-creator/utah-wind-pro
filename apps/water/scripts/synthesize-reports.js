#!/usr/bin/env node

/**
 * LLM Synthesis Engine — RAG Loop Completion
 *
 * Reads raw YouTube transcript excerpts from shop-reports.json,
 * sends them through an LLM with a strict tactical fishing prompt,
 * and writes clean, actionable summaries to synthesized-reports.json.
 *
 * Usage:  node scripts/synthesize-reports.js
 * Env:    OPENAI_API_KEY (required)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOP_REPORTS_PATH = resolve(__dirname, '../src/data/shop-reports.json');
const OUTPUT_PATH = resolve(__dirname, '../src/data/synthesized-reports.json');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a master Utah fly fishing guide with 30 years of experience on every tailwater, reservoir, and high-mountain lake in the state. Read the following fishing report transcript excerpt. Extract only the most actionable intelligence.

Return a 2 to 3 sentence summary detailing:
- Exactly what flies, lures, or rigs to throw (with sizes if mentioned)
- Target depth, water type, or specific water column position
- Current water conditions, clarity, or temperature if mentioned

Do not use conversational filler. Be punchy and tactical. If the transcript is too vague to extract specific tactics, state what general technique was used and what species were targeted.`;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set. Add it to .env or export it.');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  let raw;
  try {
    raw = JSON.parse(readFileSync(SHOP_REPORTS_PATH, 'utf-8'));
  } catch (err) {
    console.error('❌ Could not read shop-reports.json:', err.message);
    process.exit(1);
  }

  const reports = raw.reports || {};
  const locationIds = Object.keys(reports).filter(k => k !== '_meta');

  if (locationIds.length === 0) {
    console.log('⚠️  No reports found in shop-reports.json. Run scrape-youtube first.');
    process.exit(0);
  }

  console.log(`🧠 Synthesizing ${locationIds.length} location reports via ${MODEL}...\n`);

  const synthesized = {};
  let successCount = 0;
  let failCount = 0;

  for (const locationId of locationIds) {
    const entries = reports[locationId];
    if (!entries || entries.length === 0) continue;

    const best = entries[0];
    const transcriptText = best.excerpt?.replace(/\.\.\./g, '').trim();
    if (!transcriptText || transcriptText.length < 30) {
      console.log(`  ⏭️  ${locationId}: excerpt too short, skipping`);
      continue;
    }

    console.log(`  📡 ${locationId}: "${best.title}" (${best.channel})`);

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Location: ${locationId}\nChannel: ${best.channel}\nVideo: "${best.title}"\nDate: ${best.date}\n\nTranscript excerpt:\n${transcriptText}` },
        ],
      });

      const summary = completion.choices?.[0]?.message?.content?.trim();
      if (summary) {
        synthesized[locationId] = {
          summary,
          date: best.date,
          sourceChannel: best.channel,
          sourceTitle: best.title,
          videoId: best.videoId,
          model: MODEL,
        };
        successCount++;
        console.log(`    ✅ ${summary.slice(0, 80)}...`);
      } else {
        console.log(`    ⚠️  Empty LLM response`);
        failCount++;
      }
    } catch (err) {
      console.error(`    ❌ LLM error for ${locationId}:`, err.message);
      failCount++;
    }
  }

  const output = {
    _meta: {
      source: 'LLM synthesis of YouTube fishing transcripts',
      model: MODEL,
      lastUpdated: new Date().toISOString(),
      locationsProcessed: locationIds.length,
      successCount,
      failCount,
    },
    ...synthesized,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n✅ Wrote ${successCount} synthesized reports to synthesized-reports.json`);
  if (failCount > 0) console.log(`⚠️  ${failCount} locations failed or were skipped`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
