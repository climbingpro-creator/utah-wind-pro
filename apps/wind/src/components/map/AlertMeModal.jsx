/**
 * AlertMeModal — compact inline modal for creating/editing a session alert
 * on a specific spot from the map popup.
 *
 * Requires the user to be authenticated and Pro.
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2, Loader2, Check } from 'lucide-react';
import { ACTIVITY_CONFIGS } from '../ActivityMode';
import { getDisciplineThreshold } from '../../utils/findNextRideableWindow';

const WIND_DISCIPLINES = Object.entries(ACTIVITY_CONFIGS)
  .filter(([, c]) => c.wantsWind)
  .map(([id, c]) => ({ id, name: c.name }));

export default function AlertMeModal({
  spotId,
  spotName,
  discipline: initialDiscipline = 'kiting',
  existingAlert,
  onSave,
  onDelete,
  onClose,
  saving = false,
}) {
  const [discipline, setDiscipline] = useState(initialDiscipline);
  const [minWind, setMinWind] = useState(
    existingAlert?.min_wind_mph ?? getDisciplineThreshold(initialDiscipline),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingAlert) {
      setDiscipline(existingAlert.discipline);
      setMinWind(existingAlert.min_wind_mph);
    }
  }, [existingAlert]);

  useEffect(() => {
    if (!existingAlert) {
      setMinWind(getDisciplineThreshold(discipline));
    }
  }, [discipline, existingAlert]);

  const handleSave = async () => {
    await onSave({ spotId, discipline, minWindMph: minWind });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-xl p-3 w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-sky-500" />
          <span className="text-xs font-bold text-gray-800">Session Alert</span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Spot (read-only) */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Spot</div>
      <div className="text-sm font-semibold text-gray-700 mb-2.5 truncate">{spotName}</div>

      {/* Discipline */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Discipline</div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {WIND_DISCIPLINES.map(d => (
          <button
            key={d.id}
            onClick={() => setDiscipline(d.id)}
            className={`
              text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all
              ${discipline === d.id
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-slate-50 text-gray-600 border-slate-200 hover:border-sky-300'}
            `}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Wind threshold slider */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
        Minimum wind
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="range"
          min={5}
          max={25}
          value={minWind}
          onChange={e => setMinWind(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 accent-sky-500"
        />
        <span className="text-sm font-bold text-gray-800 tabular-nums w-12 text-right">
          {minWind} mph
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
          {saved ? 'Saved!' : existingAlert ? 'Update Alert' : 'Set Alert'}
        </button>

        {existingAlert && onDelete && (
          <button
            onClick={() => onDelete(spotId, discipline)}
            disabled={saving}
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="Delete alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
