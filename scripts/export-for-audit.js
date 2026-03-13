/**
 * Export entire codebase into a single structured document
 * for AI audit (Gemini, Claude, GPT, etc.)
 * 
 * Usage: node scripts/export-for-audit.js
 * Output: audit-export.md in project root
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const SKIP_DIRS = ['node_modules', 'dist', '.git', '.github', 'capacitor'];
const SKIP_FILES = ['package-lock.json', '.env', '.env.production', '.env.example'];
const MAX_JSON_LINES = 50;

const FILE_ORDER = [
  // 1. Project config
  'package.json',
  'vite.config.js',
  'index.html',
  'vercel.json',
  'eslint.config.js',
  
  // 2. Documentation
  'README.md',
  'docs/SYSTEM-ARCHITECTURE.md',
  'docs/PREDICTION-METHODOLOGY.md',
  'docs/VALIDATED-CORRELATIONS.md',
  'docs/FORECAST-INTEGRATION.md',
  'docs/LEARNING-SYSTEM.md',
  'docs/USER-PERSONAS-ANALYSIS.md',
  'docs/MULTI-USER-FEATURES.md',
  'docs/DATA-UPDATE-FREQUENCIES.md',
  
  // 3. Entry points
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  
  // 4. Core services (data layer)
  'src/services/WeatherService.js',
  'src/services/DataNormalizer.js',
  'src/services/ThermalPredictor.js',
  'src/services/ForecastService.js',
  'src/services/MultiDayForecast.js',
  'src/services/NotificationService.js',
  'src/services/LearningSystem.js',
  'src/services/DataCollector.js',
  
  // 5. Configuration
  'src/config/lakeStations.js',
  'src/config/indicatorSystem.js',
  
  // 6. Hooks
  'src/hooks/useLakeData.js',
  'src/hooks/useWeatherData.js',
  
  // 7. Context
  'src/context/ThemeContext.jsx',
  
  // 8. Utilities
  'src/utils/thermalCalculations.js',
  'src/utils/themeClasses.js',
  
  // 9. Main components
  'src/components/Dashboard.jsx',
  'src/components/ActivityMode.jsx',
  'src/components/LakeSelector.jsx',
  'src/components/ParaglidingMode.jsx',
  'src/components/FishingMode.jsx',
  'src/components/ConfidenceGauge.jsx',
  'src/components/WindVector.jsx',
  'src/components/WindMap.jsx',
  'src/components/KiteSafety.jsx',
  'src/components/NorthFlowGauge.jsx',
  'src/components/BustAlert.jsx',
  'src/components/ThermalStatus.jsx',
  'src/components/ThermalForecast.jsx',
  'src/components/ForecastPanel.jsx',
  'src/components/FiveDayForecast.jsx',
  'src/components/HourlyTimeline.jsx',
  'src/components/WeeklyBestDays.jsx',
  'src/components/GlassScore.jsx',
  'src/components/RaceDayMode.jsx',
  'src/components/WeatherForecast.jsx',
  'src/components/SevereWeatherAlerts.jsx',
  'src/components/DataFreshness.jsx',
  'src/components/LearningDashboard.jsx',
  'src/components/NotificationSettings.jsx',
  'src/components/ToastNotification.jsx',
  'src/components/Sparkline.jsx',
  'src/components/ThemeToggle.jsx',
  
  // 10. Data files (truncated)
  'src/data/zigzag-historical.json',
  'src/data/spanish-fork-correlation.json',
  'src/data/north-flow-indicators.json',
  'src/data/kslc-fps-validation.json',
  'src/data/provo-utalp-correlation.json',
  
  // 11. PWA
  'public/manifest.json',
  'public/sw.js',
];

function getFileExtension(filePath) {
  return path.extname(filePath).slice(1);
}

function getLanguage(ext) {
  const map = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
    yml: 'yaml', yaml: 'yaml', svg: 'xml',
  };
  return map[ext] || ext;
}

function shouldTruncateJson(filePath) {
  const name = path.basename(filePath);
  return name.endsWith('.json') && 
    !['package.json', 'manifest.json', 'vercel.json', 'capacitor.config.json'].includes(name);
}

function readFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (shouldTruncateJson(filePath)) {
      const lines = content.split('\n');
      if (lines.length > MAX_JSON_LINES) {
        return lines.slice(0, MAX_JSON_LINES).join('\n') + 
          `\n\n// ... ${lines.length - MAX_JSON_LINES} more lines truncated (${(content.length / 1024).toFixed(1)} KB total) ...`;
      }
    }
    
    return content;
  } catch {
    return null;
  }
}

function collectRemainingFiles(dir, collected = new Set(), results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        collectRemainingFiles(fullPath, collected, results);
      }
    } else if (entry.isFile()) {
      const ext = getFileExtension(entry.name);
      if (['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'md', 'yml', 'yaml'].includes(ext)) {
        if (!collected.has(relPath) && !SKIP_FILES.includes(entry.name)) {
          results.push(relPath);
        }
      }
    }
  }
  
  return results;
}

function generateAudit() {
  let output = '';
  let fileCount = 0;
  let totalLines = 0;
  const processedFiles = new Set();
  
  // Header
  output += `# Utah Wind Pro - Full Codebase Audit Export\n\n`;
  output += `**Generated:** ${new Date().toISOString()}\n`;
  output += `**Purpose:** Complete codebase for AI audit and review\n\n`;
  
  // Audit prompt
  output += `## Audit Instructions\n\n`;
  output += `You are reviewing "Utah Wind Pro" (utahwindfinder.com), a React weather forecasting app for wind sports, paragliding, and fishing in Utah.\n\n`;
  output += `### What This App Does\n`;
  output += `- Predicts thermal wind windows for Utah Lake, Deer Creek, and Willard Bay\n`;
  output += `- Forecasts paragliding conditions at Point of the Mountain (Flight Park North/South)\n`;
  output += `- Provides fishing forecasts based on moon phase, barometric pressure, and solunar data\n`;
  output += `- Uses real-time data from Ambient Weather (PWS), Synoptic/MesoWest, and NWS APIs\n`;
  output += `- Includes a self-learning system that collects data daily to improve predictions\n`;
  output += `- Supports 6 activity modes: Kiting, Sailing, Fishing, Boating, Paddling, Paragliding\n\n`;
  
  output += `### Please Audit For\n`;
  output += `1. **Architecture & Code Quality** - Component structure, separation of concerns, DRY violations\n`;
  output += `2. **Performance** - Unnecessary re-renders, API call efficiency, bundle size\n`;
  output += `3. **Prediction Accuracy** - Are the weather algorithms sound? Missing factors?\n`;
  output += `4. **Data Flow** - How data moves from APIs through normalization to UI\n`;
  output += `5. **Error Handling** - Missing try/catch, unhandled edge cases, API failures\n`;
  output += `6. **Security** - API key exposure, XSS vectors, unsafe patterns\n`;
  output += `7. **UX/Accessibility** - Mobile responsiveness, color contrast, screen reader support\n`;
  output += `8. **Testing** - What needs tests? Critical paths without coverage\n`;
  output += `9. **Scalability** - Can this handle more locations, more users, more data?\n`;
  output += `10. **Bugs** - Anything that looks broken or could fail silently\n\n`;
  
  output += `---\n\n`;
  
  // Table of contents
  output += `## Table of Contents\n\n`;
  output += `| # | File | Lines | Size |\n`;
  output += `|---|------|-------|------|\n`;
  
  const toc = [];
  
  // Process ordered files first
  for (const relPath of FILE_ORDER) {
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      const content = readFileContent(fullPath);
      if (content) {
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content) / 1024).toFixed(1);
        toc.push({ relPath, lines, size });
        processedFiles.add(relPath);
      }
    }
  }
  
  // Collect any remaining files not in the ordered list
  const remaining = collectRemainingFiles(ROOT, processedFiles);
  for (const relPath of remaining) {
    const fullPath = path.join(ROOT, relPath);
    const content = readFileContent(fullPath);
    if (content) {
      const lines = content.split('\n').length;
      const size = (Buffer.byteLength(content) / 1024).toFixed(1);
      toc.push({ relPath, lines, size });
      processedFiles.add(relPath);
    }
  }
  
  toc.forEach((entry, i) => {
    output += `| ${i + 1} | \`${entry.relPath}\` | ${entry.lines} | ${entry.size} KB |\n`;
  });
  
  output += `\n---\n\n`;
  
  // Output each file
  for (const entry of toc) {
    const fullPath = path.join(ROOT, entry.relPath);
    const content = readFileContent(fullPath);
    if (!content) continue;
    
    fileCount++;
    totalLines += entry.lines;
    
    const ext = getFileExtension(entry.relPath);
    const lang = getLanguage(ext);
    
    output += `## File ${fileCount}: \`${entry.relPath}\`\n\n`;
    output += `> ${entry.lines} lines | ${entry.size} KB\n\n`;
    output += `\`\`\`${lang}\n`;
    output += content;
    if (!content.endsWith('\n')) output += '\n';
    output += `\`\`\`\n\n`;
    output += `---\n\n`;
  }
  
  // Summary
  output += `## Export Summary\n\n`;
  output += `- **Total files:** ${fileCount}\n`;
  output += `- **Total lines:** ${totalLines.toLocaleString()}\n`;
  output += `- **Export size:** ${(Buffer.byteLength(output) / 1024).toFixed(0)} KB\n`;
  output += `- **Estimated tokens:** ~${Math.round(Buffer.byteLength(output) / 4).toLocaleString()}\n`;
  
  return output;
}

// Run
console.log('Exporting codebase for audit...\n');
const output = generateAudit();
const outputPath = path.join(ROOT, 'audit-export.md');
fs.writeFileSync(outputPath, output, 'utf-8');

const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(0);
const sizeMB = (Buffer.byteLength(output) / (1024 * 1024)).toFixed(2);
const estimatedTokens = Math.round(Buffer.byteLength(output) / 4);

console.log(`✅ Export complete!`);
console.log(`   File: ${outputPath}`);
console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
console.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
console.log(`\nNext steps:`);
console.log(`   1. Open Google AI Studio (aistudio.google.com)`);
console.log(`   2. Select Gemini 2.5 Pro (or latest)`);
console.log(`   3. Upload audit-export.md as a file`);
console.log(`   4. Ask: "Please do a comprehensive audit of this codebase"`);
console.log(`   Or paste specific sections for focused review.`);
