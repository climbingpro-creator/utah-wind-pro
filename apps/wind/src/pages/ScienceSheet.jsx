/**
 * ScienceSheet.jsx — Two-page printable sales sheet
 * Demonstrates the science, math, and data behind our wind forecasting system.
 * Optimized for both screen viewing and print (Cmd+P / Ctrl+P).
 */

import { Wind, Radio, CheckCircle, TrendingUp, Zap, Clock, MapPin, BarChart3, Activity, Target, Layers } from 'lucide-react';

/* ─────────────────────────── PAGE 1: THE SCIENCE ─────────────────────────── */

function PipelineStep({ step, title, subtitle, color, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg ${color}`}>
          {step}
        </div>
        <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-300 to-transparent mt-2" />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function StatBox({ value, label, sublabel, accent = false }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center border ${
      accent ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`text-2xl font-black tabular-nums leading-none ${accent ? 'text-sky-600' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
      {sublabel && <div className="text-[9px] text-slate-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function FormulaBox({ formula, description }) {
  return (
    <div className="rounded-lg bg-slate-900 px-4 py-2.5 font-mono text-sm text-emerald-400 flex items-center gap-3">
      <code className="flex-1">{formula}</code>
      <span className="text-[10px] text-slate-500 font-sans font-medium shrink-0">{description}</span>
    </div>
  );
}

function ChainNode({ name, lag, role, isTarget, isFired }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full shrink-0 ${
        isTarget ? 'bg-emerald-500 ring-2 ring-emerald-200' : isFired ? 'bg-sky-500' : 'bg-slate-300'
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800">{name}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            isTarget ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {lag}
          </span>
        </div>
        <div className="text-[9px] text-slate-400 leading-tight">{role}</div>
      </div>
    </div>
  );
}

function Page1() {
  return (
    <div className="page-sheet bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">UtahWindFinder</h1>
              <p className="text-xs font-semibold text-sky-600">AI-Driven Microclimate Forecasting</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical Brief</div>
          <div className="text-[10px] text-slate-400">liftforecast.com</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #0ea5e9 0%, transparent 50%)' }} />
        <div className="relative">
          <h2 className="text-3xl font-black text-white mb-2">
            How We Predict Wind<span className="text-sky-400">.</span>
          </h2>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Our 3-stage prediction pipeline combines barometric pressure differentials, thermal
            development physics, and a network of 30+ real-time stations to deliver forecasts
            that outperform NWS by identifying microclimate patterns invisible to regional models.
          </p>
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatBox value="30+" label="Live Stations" accent />
            <StatBox value="105K" label="Data Points" sublabel="FPS alone, 1 yr" />
            <StatBox value="3" label="Data Sources" sublabel="NWS · UDOT · WU PWS" />
            <StatBox value="60s" label="Update Cycle" />
          </div>
        </div>
      </div>

      {/* 3-Stage Pipeline */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-sky-500" />
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">The 3-Stage Prediction Pipeline</h2>
        </div>

        <PipelineStep step="A" title="Pressure Gradient Analysis" subtitle="Barometric differential between valley floor and mountain reference" color="bg-violet-600">
          <FormulaBox formula="ΔP = P(SLC, 4226 ft) − P(PVU, 4495 ft)" description="millibar differential" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-xs font-bold text-emerald-700">ΔP &lt; 0</div>
              <div className="text-[10px] text-emerald-600">Thermal favorable</div>
              <div className="text-[9px] text-emerald-500 mt-0.5">Lake draws canyon air</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-xs font-bold text-amber-700">ΔP 0 – 2.0 mb</div>
              <div className="text-[10px] text-amber-600">Marginal window</div>
              <div className="text-[9px] text-amber-500 mt-0.5">Competing forces</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <div className="text-xs font-bold text-red-700">ΔP &gt; 2.0 mb</div>
              <div className="text-[10px] text-red-600">North flow override</div>
              <div className="text-[9px] text-red-500 mt-0.5">0% SE thermal success</div>
            </div>
          </div>
        </PipelineStep>

        <PipelineStep step="B" title="Thermal Development Model" subtitle="Temperature differential between lakeshore and ridge drives convective draw" color="bg-orange-500">
          <FormulaBox formula="ΔT = T(shore) − T(ridge)  →  ΔT ≥ 10°F = pump active" description="thermal engine" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thermal States</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-700"><strong>Pump Active</strong> — ΔT ≥ 10°F, air rising</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-slate-700"><strong>Building</strong> — ΔT 5–10°F, developing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-[10px] text-slate-700"><strong>Inversion</strong> — ΔT &lt; 0°F, trapped cold air</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deer Creek Validated Stats</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]"><span className="text-slate-500">Avg ΔT on thermal days</span><span className="font-bold text-slate-800">9.6°F</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-500">Optimal range</span><span className="font-bold text-slate-800">8–15°F</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-500">Turbulence threshold</span><span className="font-bold text-slate-800">&gt;18°F</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-500">Observations (Jun–Aug)</span><span className="font-bold text-slate-800">13,248</span></div>
              </div>
            </div>
          </div>
        </PipelineStep>

        <PipelineStep step="C" title="Ground Truth Validation" subtitle="Live station readings confirm or deny prediction — closes the feedback loop" color="bg-emerald-600">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
              <Radio className="w-4 h-4 text-sky-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-700">Synoptic/MesoWest</div>
              <div className="text-[9px] text-slate-400">ASOS, RWIS, RAWS</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
              <Activity className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-700">UDOT RWIS</div>
              <div className="text-[9px] text-slate-400">Canyon & highway sensors</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
              <MapPin className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-700">Weather Underground</div>
              <div className="text-[9px] text-slate-400">Hyperlocal PWS network</div>
            </div>
          </div>
        </PipelineStep>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-auto">
        <span className="text-[9px] text-slate-400">UtahWindFinder Technical Brief — Page 1 of 2</span>
        <span className="text-[9px] text-slate-400">liftforecast.com</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── PAGE 2: THE PROOF ─────────────────────────── */

function CorrelationRow({ upstream, speed, avgAtLake, foilPct, ttPct, highlight }) {
  return (
    <tr className={highlight ? 'bg-sky-50' : ''}>
      <td className="px-3 py-1.5 text-[10px] font-semibold text-slate-600">{upstream}</td>
      <td className="px-3 py-1.5 text-[10px] font-bold text-slate-800 text-center">{speed}</td>
      <td className="px-3 py-1.5 text-[10px] font-bold text-sky-600 text-center">{avgAtLake}</td>
      <td className="px-3 py-1.5 text-center">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          foilPct >= 80 ? 'bg-emerald-100 text-emerald-700' : foilPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
        }`}>{foilPct}%</span>
      </td>
      <td className="px-3 py-1.5 text-center">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          ttPct >= 80 ? 'bg-emerald-100 text-emerald-700' : ttPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
        }`}>{ttPct}%</span>
      </td>
    </tr>
  );
}

function HourlyBar({ hour, prob, peak }) {
  const h = Math.round(prob * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[8px] font-bold text-slate-500 tabular-nums">{h}%</div>
      <div className="w-5 bg-slate-100 rounded-full overflow-hidden" style={{ height: 48 }}>
        <div
          className={`w-full rounded-full transition-all ${peak ? 'bg-sky-500' : 'bg-sky-300'}`}
          style={{ height: `${Math.max(h, 4)}%`, marginTop: `${100 - Math.max(h, 4)}%` }}
        />
      </div>
      <div className={`text-[8px] tabular-nums ${peak ? 'font-bold text-sky-600' : 'text-slate-400'}`}>{hour}</div>
    </div>
  );
}

function Page2() {
  const dcHourly = [
    { hour: '6a', prob: 0.02 }, { hour: '7a', prob: 0.03 }, { hour: '8a', prob: 0.05 },
    { hour: '9a', prob: 0.10 }, { hour: '10a', prob: 0.17 }, { hour: '11a', prob: 0.22 },
    { hour: '12p', prob: 0.266 }, { hour: '1p', prob: 0.284 }, { hour: '2p', prob: 0.24 },
    { hour: '3p', prob: 0.19 }, { hour: '4p', prob: 0.13 }, { hour: '5p', prob: 0.07 },
    { hour: '6p', prob: 0.03 }, { hour: '7p', prob: 0.01 },
  ];
  const peakHour = '1p';

  return (
    <div className="page-sheet bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            The Proof<span className="text-sky-400">.</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Validated patterns, real data, measurable accuracy</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-700">Data-Backed</span>
        </div>
      </div>

      {/* Propagation Chains — the "early warning" visual */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">Deer Creek Canyon Thermal</h3>
              <p className="text-[9px] text-slate-400">S → N propagation through Provo Canyon</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <ChainNode name="Lower Provo Canyon" lag="−60 min" role="Canyon mouth — first to feel thermal draw" isFired />
            <ChainNode name="Provo Canyon MP10" lag="−45 min" role="Mid-canyon confirmation — venturi acceleration" isFired />
            <ChainNode name="Charleston (UDOT)" lag="−20 min" role="Valley entry — wind exits canyon into Heber" />
            <ChainNode name="Deer Creek Dam" lag="TARGET" role="Ground truth — thermal arrival at the reservoir" isTarget />
          </div>
          <div className="mt-3 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
            <div className="text-[9px] font-bold text-sky-700 uppercase tracking-wider mb-0.5">Arrowhead Trigger</div>
            <div className="text-[10px] text-sky-600">12–18 mph SSW (200–230°) at ridge → <strong>24.8–29.9%</strong> thermal rate</div>
            <div className="text-[10px] text-sky-600">When triggered: probability <strong>×1.8</strong> · Lead time: <strong>60 min</strong></div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-violet-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">Sulphur Creek Jet Stream</h3>
              <p className="text-[9px] text-slate-400">W → E propagation along I-80 corridor</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <ChainNode name="SLC Airport (KSLC)" lag="−90 min" role="Regional jet indicator — strong W at SLC = pattern active" isFired />
            <ChainNode name="Wahsatch Hill EB" lag="−30 min" role="Upstream predictor — W wind at summit signals firing" isFired />
            <ChainNode name="Evanston Airport" lag="−15 min" role="Valley confirmation — W flow means corridor active" />
            <ChainNode name="First Divide (WYDOT)" lag="TARGET" role="Closest station to Sulphur Creek Reservoir" isTarget />
          </div>
          <div className="mt-3 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2">
            <div className="text-[9px] font-bold text-violet-700 uppercase tracking-wider mb-0.5">Wahsatch Trigger</div>
            <div className="text-[10px] text-violet-600">12+ mph W (250–290°) at summit → probability <strong>×2.0</strong></div>
            <div className="text-[10px] text-violet-600">Lead time: <strong>30 min</strong> · No trigger: probability <strong>×0.4</strong></div>
          </div>
        </div>
      </div>

      {/* KSLC→Lake Speed Correlation Table */}
      <div className="grid grid-cols-5 gap-4 mb-5">
        <div className="col-span-3 rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-extrabold text-slate-800">KSLC North Flow → Zig Zag Correlation</h3>
            <span className="text-[9px] text-slate-400 ml-auto">105,100 FPS observations · 363 days</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase text-left">KSLC Wind</th>
                <th className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase text-center">Speed</th>
                <th className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase text-center">Avg at Lake</th>
                <th className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase text-center">Foil Kite</th>
                <th className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase text-center">Twin-Tip</th>
              </tr>
            </thead>
            <tbody>
              <CorrelationRow upstream="Light" speed="4–6 mph" avgAtLake="6.2 mph" foilPct={22} ttPct={5} />
              <CorrelationRow upstream="Moderate" speed="6–8 mph" avgAtLake="9.4 mph" foilPct={38} ttPct={14} />
              <CorrelationRow upstream="Fresh" speed="8–10 mph" avgAtLake="12.6 mph" foilPct={56} ttPct={31} highlight />
              <CorrelationRow upstream="Strong" speed="10–15 mph" avgAtLake="15.5 mph" foilPct={81} ttPct={50} highlight />
              <CorrelationRow upstream="Gale" speed="15+ mph" avgAtLake="23.4 mph" foilPct={100} ttPct={100} />
            </tbody>
          </table>
        </div>

        {/* Hourly Probability Chart */}
        <div className="col-span-2 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-extrabold text-slate-800">Deer Creek Hourly Probability</h3>
          </div>
          <div className="text-[9px] text-slate-400 mb-2">Based on 1,216 thermal events · Jun–Aug 2025</div>
          <div className="flex items-end justify-between gap-0.5">
            {dcHourly.map(h => (
              <HourlyBar key={h.hour} hour={h.hour} prob={h.prob} peak={h.hour === peakHour} />
            ))}
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] font-bold text-sky-600">Peak: 1 PM — 28.4% probability</span>
          </div>
        </div>
      </div>

      {/* Wind Field Physics */}
      <div className="rounded-xl border border-slate-200 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          <h3 className="text-xs font-extrabold text-slate-800">Wind Field Physics Engine</h3>
          <span className="text-[9px] text-slate-400 ml-2">How upstream wind translates to your spot</span>
        </div>
        <FormulaBox formula="V(target) = V(upstream) × attenuation × channeling × translation" description="per-edge propagation" />
        <div className="grid grid-cols-4 gap-3 mt-3">
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-700">Attenuation</div>
            <div className="text-[9px] text-slate-500">Energy loss over distance — terrain friction, valley spreading (0.60–0.95)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-700">Channeling</div>
            <div className="text-[9px] text-slate-500">Canyon compression and venturi effects amplify speed (1.0–1.40)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-700">Translation</div>
            <div className="text-[9px] text-slate-500">Learned ratio of upstream → lake speed, derived from historical pairs (0.1–1.0)</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-bold text-slate-700">Superposition</div>
            <div className="text-[9px] text-slate-500">Multiple upstream paths blended by time-relevance weighting</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
            <div className="text-xs font-bold text-slate-700">KPVU → KHCR</div>
            <div className="text-[9px] text-slate-500">45 min · 0.60 × 1.40</div>
            <div className="text-[9px] text-sky-500 font-semibold">Provo Canyon venturi</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
            <div className="text-xs font-bold text-slate-700">UTOLY → UTALP</div>
            <div className="text-[9px] text-slate-500">15 min · 0.80 × 1.15</div>
            <div className="text-[9px] text-sky-500 font-semibold">Point of Mountain gap</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
            <div className="text-xs font-bold text-slate-700">UT1 → KFIR</div>
            <div className="text-[9px] text-slate-500">30 min · 0.85 × 1.10</div>
            <div className="text-[9px] text-sky-500 font-semibold">I-80 terrain channeling</div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <StatBox value="24%" label="Good SE Thermal Days" sublabel="Utah Lake annual avg" />
        <StatBox value="9.2%" label="Good Thermal Days" sublabel="Deer Creek annual" />
        <StatBox value="62.5%" label="Spanish Fork Predictor" sublabel="~2 hr lead accuracy" />
        <StatBox value="95%" label="Max Confidence" sublabel="When target station fires" accent />
        <StatBox value="60/40" label="Blend Ratio" sublabel="Statistical / NWS model" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-auto">
        <span className="text-[9px] text-slate-400">UtahWindFinder Technical Brief — Page 2 of 2</span>
        <span className="text-[9px] text-slate-400">Data: Synoptic PBC · NWS · UDOT RWIS · Weather Underground</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN EXPORT ─────────────────────────── */

export default function ScienceSheet() {
  return (
    <div className="science-sheet-root bg-slate-100 min-h-screen">
      <style>{`
        .page-sheet {
          width: 8.5in;
          min-height: 11in;
          max-width: 100%;
          margin: 0 auto;
          padding: 0.5in;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgb(0 0 0 / 0.08);
        }

        @media screen {
          .science-sheet-root {
            padding: 24px 12px;
          }
          .page-sheet {
            border-radius: 12px;
            margin-bottom: 24px;
          }
          .print-controls {
            display: flex;
          }
        }

        @media print {
          .science-sheet-root {
            background: white !important;
            padding: 0 !important;
          }
          .page-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0.4in !important;
            page-break-after: always;
            min-height: auto;
            height: 100vh;
          }
          .page-sheet:last-child {
            page-break-after: auto;
          }
          .print-controls {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Print Controls */}
      <div className="print-controls hidden items-center justify-center gap-3 mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm shadow-lg hover:bg-sky-600 transition-colors"
        >
          <Target className="w-4 h-4" />
          Print / Save as PDF
        </button>
        <button
          onClick={() => { window.location.hash = ''; }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-600 font-semibold text-sm border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Back to App
        </button>
      </div>

      <Page1 />
      <Page2 />
    </div>
  );
}
