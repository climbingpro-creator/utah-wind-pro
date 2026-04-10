import React from 'react';
import { AlertTriangle, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import regulationsDb from '../data/utah-regulations.json';

const allWaters = regulationsDb.waters;

const RULE_ICONS = {
  limit: '🎣',
  slot: '📏',
  gear: '🪝',
  info: 'ℹ️',
};

const DEFAULT_REGULATION = {
  waterbody: null,
  rules: [
    { type: 'limit', text: 'Limit 4 trout (any species), no size restrictions' },
    { type: 'gear', text: 'All methods allowed — bait, lures, flies' },
  ],
  _isGeneral: true,
};

function findRegulation(locationId) {
  if (!locationId) return null;
  const id = locationId.toLowerCase();

  for (const [_key, entry] of Object.entries(allWaters)) {
    if (entry.aliases?.includes(id)) return entry;
  }

  if (allWaters[id]) return allWaters[id];

  const baseId = id.replace(/-\d+$/, '').replace(/-(?:ladders|bay|soldier|view|river|lincoln|zigzag|vineyard|sandy|mm19|north|south)$/, '');
  for (const [_key, entry] of Object.entries(allWaters)) {
    if (entry.aliases?.includes(baseId)) return entry;
  }
  if (allWaters[baseId]) return allWaters[baseId];

  return null;
}

export function getRegulations(locationId) {
  const found = findRegulation(locationId);
  if (found) return found;
  return { ...DEFAULT_REGULATION };
}

export default function RegulationsCard({ locationId, locationName }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const regs = getRegulations(locationId);
  const isGeneral = !!regs._isGeneral;

  return (
    <div className={`rounded-xl p-4 border ${
      regs.special
        ? (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
        : isGeneral
          ? (isDark ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-emerald-50/50 border-emerald-200')
          : (isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm')
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
          regs.special
            ? (isDark ? 'text-amber-400' : 'text-amber-700')
            : isGeneral
              ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
              : (isDark ? 'text-slate-300' : 'text-slate-700')
        }`}>
          {regs.special ? (
            <Shield className="w-4 h-4" />
          ) : isGeneral ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          {isGeneral
            ? 'General Regulations'
            : `Regulations — ${regs.waterbody || locationName || 'This Water'}`
          }
        </div>
        <a
          href="https://wildlife.utah.gov/fishing"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          UDWR <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {isGeneral && (
        <div className={`mb-2.5 px-2 py-1.5 rounded-lg text-xs font-medium ${
          isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
        }`}>
          <CheckCircle className="w-3 h-3 inline mr-1.5" />
          No special regulations apply to {locationName || 'this water'}.
        </div>
      )}

      <div className="space-y-1.5">
        {regs.rules.map((rule, i) => (
          <div key={i} className={`flex items-start gap-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <span className="text-xs mt-0.5 shrink-0">{RULE_ICONS[rule.type] || '•'}</span>
            <span>{rule.text}</span>
          </div>
        ))}
      </div>

      {regs.special && (
        <div className={`mt-3 p-2.5 rounded-lg flex items-start gap-2 text-xs ${
          isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="font-medium">{regs.special}</span>
        </div>
      )}

      <div className={`mt-2.5 flex items-center justify-between text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <span>Source: {regulationsDb._meta.source}</span>
        {isGeneral && <span className="italic">Check wildlife.utah.gov for seasonal closures</span>}
      </div>
    </div>
  );
}
