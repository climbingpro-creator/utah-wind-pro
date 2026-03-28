import { useState, useEffect, createElement } from 'react';
import { Bell, BellOff, Calendar, Sun, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { getFullForecast, FORECAST_STAGES } from '@utahwind/weather';

export function ForecastPanel({ lakeId, conditions, isLoading }) {
  const [forecast, setForecast] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  useEffect(() => {
    if (conditions) {
      const fullForecast = getFullForecast(lakeId, {
        pressureGradient: conditions.pressureGradient,
        eveningTemp: conditions.temperature,
        eveningWindSpeed: conditions.windSpeed,
        morningTemp: conditions.temperature,
        morningWindSpeed: conditions.windSpeed,
        morningWindDirection: conditions.windDirection,
        currentWindSpeed: conditions.windSpeed,
        currentWindDirection: conditions.windDirection,
        thermalDelta: conditions.thermalDelta,
      });
      setForecast(fullForecast);
    }
  }, [lakeId, conditions]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('notifications-enabled', 'true');
        }
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications-enabled', 'false');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('notifications-enabled');
    if (saved === 'true' && 'Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  if (isLoading || !forecast) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Extract data from forecast - handle both old and new format
  const currentStage = forecast.currentStage || FORECAST_STAGES.MORNING;
  const stages = forecast.stages || {};
  const currentForecast = stages[currentStage] || {
    probability: forecast.overall?.probability || 50,
    message: forecast.overall?.windType === 'north_flow' 
      ? 'North flow conditions expected' 
      : 'Thermal conditions developing',
    factors: [],
  };
  
  const stageIcons = {
    [FORECAST_STAGES.DAY_BEFORE]: Calendar,
    [FORECAST_STAGES.MORNING]: Sun,
    [FORECAST_STAGES.PRE_THERMAL]: Clock,
    [FORECAST_STAGES.IMMINENT]: AlertCircle,
    [FORECAST_STAGES.ACTIVE]: CheckCircle,
  };
  
  const stageLabels = {
    [FORECAST_STAGES.DAY_BEFORE]: 'Tomorrow\'s Outlook',
    [FORECAST_STAGES.MORNING]: 'Today\'s Forecast',
    [FORECAST_STAGES.PRE_THERMAL]: 'Pre-Thermal Update',
    [FORECAST_STAGES.IMMINENT]: 'Thermal Imminent',
    [FORECAST_STAGES.ACTIVE]: 'Thermal Active',
  };
  
  const StageIcon = stageIcons[currentStage] || Clock;
  
  const getProbabilityColor = (prob) => {
    if (prob >= 80) return 'text-green-400';
    if (prob >= 60) return 'text-emerald-400';
    if (prob >= 40) return 'text-yellow-400';
    if (prob >= 20) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getProbabilityBg = (prob) => {
    if (prob >= 80) return 'bg-green-500/20 border-green-500/30';
    if (prob >= 60) return 'bg-emerald-500/20 border-emerald-500/30';
    if (prob >= 40) return 'bg-yellow-500/20 border-yellow-500/30';
    if (prob >= 20) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-slate-200">Multi-Stage Forecast</h3>
        </div>
        <button
          onClick={toggleNotifications}
          className={`p-2 rounded-lg transition-colors ${
            notificationsEnabled 
              ? 'bg-cyan-500/20 text-cyan-400' 
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
          title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Stage Forecast */}
        <div className={`rounded-lg p-4 border ${getProbabilityBg(currentForecast.probability)}`}>
          <div className="flex items-center gap-2 mb-2">
            <StageIcon className={`w-5 h-5 ${getProbabilityColor(currentForecast.probability)}`} />
            <span className="font-medium text-slate-200">{stageLabels[currentStage]}</span>
            <span className={`ml-auto text-2xl font-bold ${getProbabilityColor(currentForecast.probability)}`}>
              {currentForecast.probability}%
            </span>
          </div>
          
          <p className={`text-sm ${getProbabilityColor(currentForecast.probability)}`}>
            {currentForecast.message}
          </p>
          
          {currentForecast.expectedPeakTime && (
            <p className="text-xs text-slate-400 mt-2">
              Expected peak: {currentForecast.expectedPeakTime}
            </p>
          )}
          
          {currentForecast.timeToThermal != null && currentForecast.timeToThermal > 0 && (
            <p className="text-xs text-cyan-400 mt-2">
              Thermal in ~{currentForecast.timeToThermal} minutes
            </p>
          )}
        </div>

        {/* Factors */}
        {currentForecast.factors && currentForecast.factors.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Key Factors</p>
            {currentForecast.factors.map((factor, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <span className={`w-2 h-2 rounded-full ${
                  factor.impact === 'positive' ? 'bg-green-400' : 
                  factor.impact === 'negative' ? 'bg-red-400' : 'bg-slate-500'
                }`} />
                <span className="text-slate-500">{factor.name}:</span>
                <span className="text-slate-300">{factor.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* All Stages Timeline */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Forecast Timeline</p>
          <div className="grid grid-cols-3 gap-2">
            <ForecastStageCard
              label="Evening"
              sublabel="Tomorrow"
              probability={stages[FORECAST_STAGES.DAY_BEFORE]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.DAY_BEFORE}
              icon={Calendar}
            />
            <ForecastStageCard
              label="Morning"
              sublabel="Today"
              probability={stages[FORECAST_STAGES.MORNING]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.MORNING}
              icon={Sun}
            />
            <ForecastStageCard
              label="Pre-Thermal"
              sublabel="1-2 hrs"
              probability={stages[FORECAST_STAGES.PRE_THERMAL]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.PRE_THERMAL}
              icon={Clock}
            />
          </div>
        </div>

        {/* Notification Settings */}
        {notificationsEnabled && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">
              <Bell className="w-3 h-3 inline mr-1" />
              You'll receive alerts when:
            </p>
            <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
              <li>• Evening: Tomorrow looks good (60%+)</li>
              <li>• Morning: Today's thermal likely (50%+)</li>
              <li>• Pre-thermal: 1 hour before peak (60%+)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ForecastStageCard({ label, sublabel, probability, isActive, icon }) {
  const getProbColor = (prob) => {
    if (prob >= 70) return 'text-green-400';
    if (prob >= 50) return 'text-yellow-400';
    return 'text-slate-400';
  };
  
  return (
    <div className={`rounded-lg p-2 text-center ${
      isActive ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-800/50'
    }`}>
      {icon ? createElement(icon, { className: `w-4 h-4 mx-auto mb-1 ${isActive ? 'text-cyan-400' : 'text-slate-500'}` }) : null}
      <p className={`text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[10px] text-slate-500">{sublabel}</p>
      <p className={`text-lg font-bold ${getProbColor(probability)}`}>{probability}%</p>
    </div>
  );
}
