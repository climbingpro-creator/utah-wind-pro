import { useState, useEffect, useCallback } from 'react';
import {
  Fish, X, Plus, Loader, Camera, MapPin, Calendar, Wind,
  Droplets, ThermometerSun, ArrowDown, TrendingUp, Moon,
  BarChart3, Lock, ChevronDown, Trash2, Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LIVE_LAKES, UTAH_WATERS } from './LocationSelector';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';
const ALL_LOCATIONS = [...LIVE_LAKES, ...UTAH_WATERS];

const SPECIES = [
  'Rainbow Trout', 'Brown Trout', 'Cutthroat Trout', 'Brook Trout',
  'Tiger Trout', 'Lake Trout', 'Splake', 'Kokanee Salmon',
  'Largemouth Bass', 'Smallmouth Bass', 'Walleye', 'Yellow Perch',
  'Channel Catfish', 'Bluegill', 'Wiper', 'Carp', 'Other',
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ConditionBadge({ icon, label, value, color = 'text-slate-400' }) {
  if (value == null) return null;
  const BadgeIcon = icon;
  return (
    <div className="flex items-center gap-1 text-xs">
      <BadgeIcon className={`w-3 h-3 ${color}`} />
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-medium">{value}</span>
    </div>
  );
}

function CatchCard({ entry, onDelete }) {
  const locName = ALL_LOCATIONS.find(l => l.id === entry.location_id)?.name || entry.location_id;

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Fish className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">{entry.species || 'Unknown Species'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{locName}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.caught_at)} {formatTime(entry.caught_at)}</span>
            </div>
          </div>
          <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {entry.notes && <p className="mt-2 text-xs text-slate-400 italic">{entry.notes}</p>}

        {/* Auto-backfilled conditions */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          <ConditionBadge icon={Wind} label="Wind" value={entry.wind_speed != null ? `${Math.round(entry.wind_speed)} mph` : null} color="text-cyan-400" />
          <ConditionBadge icon={ThermometerSun} label="Air" value={entry.air_temp != null ? `${Math.round(entry.air_temp)}°F` : null} color="text-amber-400" />
          <ConditionBadge icon={Droplets} label="Water" value={entry.water_temp != null ? `${Math.round(entry.water_temp)}°F` : null} color="text-blue-400" />
          <ConditionBadge icon={ArrowDown} label="Pressure" value={entry.barometric_pressure != null ? `${entry.barometric_pressure} mb` : null} color="text-violet-400" />
          <ConditionBadge icon={TrendingUp} label="Trend" value={entry.pressure_trend} color="text-violet-400" />
          <ConditionBadge icon={Droplets} label="Flow" value={entry.flow_cfs != null ? `${entry.flow_cfs} cfs` : null} color="text-teal-400" />
          <ConditionBadge icon={Moon} label="Moon" value={entry.moon_phase?.replace(/-/g, ' ')} color="text-yellow-400" />
        </div>
      </div>
    </div>
  );
}

function PatternCard({ pattern }) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            style={{ width: `${pattern.confidence}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-500 font-medium">{pattern.confidence}%</span>
      </div>
      <p className="text-sm text-slate-300">{pattern.insight}</p>
    </div>
  );
}

export default function CatchLog({ isOpen, onClose }) {
  const { session, isPro, openPaywall } = useAuth();
  const [view, setView] = useState('log');
  const [catches, setCatches] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Quick-log form state
  const [formSpecies, setFormSpecies] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  const headers = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
    : {};

  const fetchCatches = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_ORIGIN}/api/catch-log`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setCatches(data.catches || []);
      }
    } catch { /* offline */ }
    setLoading(false);
  }, [session]);

  const fetchPatterns = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_ORIGIN}/api/catch-log?patterns=1`, { headers });
      if (resp.ok) setPatterns(await resp.json());
    } catch { /* offline */ }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!isOpen) return;
    if (view === 'log') fetchCatches();
    else if (view === 'patterns') fetchPatterns();
  }, [isOpen, view, fetchCatches, fetchPatterns]);

  const handleSubmit = async () => {
    if (!formLocation) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`${API_ORIGIN}/api/catch-log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          locationId: formLocation,
          species: formSpecies || null,
          caughtAt: new Date(formDate).toISOString(),
          notes: formNotes || null,
        }),
      });
      if (resp.ok) {
        setShowForm(false);
        setFormSpecies('');
        setFormNotes('');
        fetchCatches();
      }
    } catch { /* offline */ }
    setSubmitting(false);
  };

  const handleDelete = async (catchId) => {
    try {
      await fetch(`${API_ORIGIN}/api/catch-log`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ catchId }),
      });
      setCatches(prev => prev.filter(c => c.id !== catchId));
    } catch { /* offline */ }
  };

  const handleExport = () => {
    if (!catches.length) return;
    const csvHeaders = ['Date', 'Species', 'Location', 'Wind (mph)', 'Air Temp (°F)', 'Water Temp (°F)', 'Pressure (mb)', 'Trend', 'Flow (cfs)', 'Moon', 'Notes'];
    const rows = catches.map(c => [
      new Date(c.caught_at).toISOString(), c.species || '', c.location_id,
      c.wind_speed ?? '', c.air_temp ?? '', c.water_temp ?? '',
      c.barometric_pressure ?? '', c.pressure_trend ?? '', c.flow_cfs ?? '',
      c.moon_phase ?? '', (c.notes || '').replace(/,/g, ';'),
    ]);
    const csv = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notwindy-catch-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Fish className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Catch Log</h2>
            {catches.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{catches.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPro && catches.length > 0 && (
              <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition cursor-pointer" title="Export CSV">
                <Download className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {['log', 'patterns'].map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                view === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'log' ? 'Catch Log' : 'My Patterns'}
            </button>
          ))}
        </div>

        {/* Pro gate */}
        {!isPro ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <Lock className="w-10 h-10 text-amber-400" />
            <p className="text-white font-semibold text-center">Smart Catch Log is a Pro feature</p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Log your catches and we'll auto-fill the weather, pressure, flow, and moon phase. Over time, we'll reveal your personal fishing patterns.
            </p>
            <button
              onClick={() => { onClose(); openPaywall(); }}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold cursor-pointer hover:from-amber-400 hover:to-orange-400 transition"
            >
              Unlock Pro
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {view === 'log' && (
              <>
                {/* New catch button */}
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/40 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/5 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Log a Catch
                </button>

                {/* Quick-log form */}
                {showForm && (
                  <div className="bg-slate-800/80 rounded-xl p-4 space-y-3 border border-slate-700/50">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Species</label>
                      <select
                        value={formSpecies}
                        onChange={e => setFormSpecies(e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600"
                      >
                        <option value="">Select species...</option>
                        {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Location</label>
                      <select
                        value={formLocation}
                        onChange={e => setFormLocation(e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600"
                      >
                        <option value="">Select location...</option>
                        {ALL_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">When</label>
                      <input
                        type="datetime-local"
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Notes</label>
                      <textarea
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        placeholder="Fly pattern, technique, etc."
                        rows={2}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={!formLocation || submitting}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <><Fish className="w-4 h-4" /> Save Catch</>}
                    </button>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 animate-spin text-slate-500" />
                  </div>
                )}

                {!loading && catches.length === 0 && (
                  <div className="text-center py-8">
                    <Fish className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No catches yet. Log your first catch!</p>
                    <p className="text-slate-600 text-xs mt-1">Weather conditions are auto-filled for every entry.</p>
                  </div>
                )}

                {catches.map(entry => (
                  <CatchCard key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </>
            )}

            {view === 'patterns' && (
              <>
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 animate-spin text-slate-500" />
                  </div>
                )}

                {!loading && patterns && !patterns.ready && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm font-medium">Not enough data yet</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Log {patterns.needed} more catch{patterns.needed !== 1 ? 'es' : ''} to unlock your personal patterns.
                    </p>
                    <div className="mt-3 w-40 mx-auto bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${(patterns.catchCount / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{patterns.catchCount}/10 catches</p>
                  </div>
                )}

                {!loading && patterns?.ready && (
                  <div className="space-y-4">
                    {patterns.topLocations?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Top Locations</h3>
                        {patterns.topLocations.map(loc => (
                          <div key={loc.locationId} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-white">{loc.name}</span>
                            <span className="text-xs text-slate-400">{loc.count} catches ({loc.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {patterns.patterns?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Your Patterns</h3>
                        <div className="space-y-2">
                          {patterns.patterns.map((p, i) => <PatternCard key={i} pattern={p} />)}
                        </div>
                      </div>
                    )}

                    {patterns.speciesBreakdown?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">By Species</h3>
                        {patterns.speciesBreakdown.map(sb => (
                          <div key={sb.species} className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Fish className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-sm font-medium text-white">{sb.species}</span>
                              <span className="text-[10px] text-slate-500">{sb.count} catches</span>
                            </div>
                            <div className="space-y-1.5 pl-5">
                              {sb.patterns.map((p, i) => <PatternCard key={i} pattern={p} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
