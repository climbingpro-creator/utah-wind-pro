import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wind, Sun, Cloud, CloudRain, Thermometer, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getForecastSummary } from '../services/ForecastService';

const WeatherForecast = ({ locationId = 'utah-lake' }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const data = await getForecastSummary(locationId);
        setForecast(data);
        setError(null);
      } catch (err) {
        setError('Failed to load forecast');
        console.error(err);
      }
      setLoading(false);
    };

    fetchForecast();
    const interval = setInterval(fetchForecast, 30 * 60 * 1000); // Refresh every 30 min
    return () => clearInterval(interval);
  }, [locationId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const getKiteabilityColor = (kiteability) => {
    switch (kiteability) {
      case 'excellent': return 'text-green-400';
      case 'good_afternoon': return 'text-green-300';
      case 'good_gusty': return 'text-yellow-400';
      case 'possible': return 'text-yellow-300';
      case 'caution_strong': return 'text-orange-400';
      case 'poor_light': return 'text-gray-400';
      case 'poor_gusty': return 'text-orange-500';
      case 'poor_weather': return 'text-red-400';
      case 'dangerous': return 'text-red-500';
      default: return 'text-gray-300';
    }
  };

  const getKiteabilityLabel = (kiteability) => {
    switch (kiteability) {
      case 'excellent': return 'Excellent';
      case 'good_afternoon': return 'Good (Afternoon)';
      case 'good_gusty': return 'Good (Gusty)';
      case 'possible': return 'Possible';
      case 'caution_strong': return 'Caution - Strong';
      case 'poor_light': return 'Too Light';
      case 'poor_gusty': return 'Too Gusty';
      case 'poor_weather': return 'Bad Weather';
      case 'dangerous': return 'Dangerous';
      default: return 'Unknown';
    }
  };

  const getWindTypeIcon = (type) => {
    switch (type) {
      case 'north_flow': return '🌬️';
      case 'thermal': return '☀️';
      default: return '💨';
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        7-Day Wind Forecast
      </h3>

      {/* Active Alerts */}
      {forecast?.hasActiveAlert && (
        <div className="mb-4 space-y-2">
          {forecast.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                alert.severityInfo?.level >= 3
                  ? 'bg-red-900/30 border-red-500'
                  : alert.severityInfo?.level >= 2
                  ? 'bg-yellow-900/30 border-yellow-500'
                  : 'bg-blue-900/30 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                  alert.severityInfo?.level >= 3 ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <div>
                  <p className="font-semibold text-white">{alert.event}</p>
                  <p className="text-sm text-gray-300 mt-1">{alert.headline}</p>
                  {alert.windInfo?.speed && (
                    <p className="text-sm text-gray-400 mt-1">
                      Expected: {alert.windInfo.direction} wind {alert.windInfo.speed} mph
                      {alert.windInfo.gust && `, gusts to ${alert.windInfo.gust} mph`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.onset).toLocaleString()} - {new Date(alert.ends).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Kite Window */}
      {forecast?.nextKiteWindow && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getWindTypeIcon(forecast.nextKiteWindow.type)}</span>
            <div>
              <p className="text-green-400 font-semibold">Next Kite Window</p>
              <p className="text-white">
                {new Date(forecast.nextKiteWindow.start).toLocaleDateString('en-US', { weekday: 'short' })} {formatTime(forecast.nextKiteWindow.start)} - {formatTime(forecast.nextKiteWindow.end)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-300">
              <Wind className="w-4 h-4 inline mr-1" />
              {forecast.nextKiteWindow.avgSpeed?.toFixed(0)} mph {forecast.nextKiteWindow.direction}
            </span>
            <span className="text-gray-300">
              <Clock className="w-4 h-4 inline mr-1" />
              {forecast.nextKiteWindow.hours} hours
            </span>
            {forecast.nextKiteWindow.foilOnly && (
              <span className="text-yellow-400">Foil recommended</span>
            )}
          </div>
        </div>
      )}

      {/* Day by Day Forecast */}
      <div className="space-y-2">
        {forecast?.daySummaries?.slice(0, 5).map((day, idx) => (
          <div key={idx} className="bg-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-700/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">{day.date}</span>
                <div className="flex items-center gap-2">
                  {day.day?.shortForecast?.toLowerCase().includes('sun') ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : day.day?.shortForecast?.toLowerCase().includes('rain') ? (
                    <CloudRain className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Cloud className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-gray-300 text-sm">{day.day?.shortForecast}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {day.hasKiteableWind ? (
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    🪁 {day.kiteWindows.length} window{day.kiteWindows.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">No kite wind</span>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Wind className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{day.day?.windSpeed}</span>
                  <span className="text-gray-500">{day.day?.windDirection}</span>
                </div>
                
                <div className="flex items-center gap-1 text-sm">
                  <Thermometer className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{day.day?.temperature}°</span>
                </div>
                
                {expandedDay === idx ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedDay === idx && (
              <div className="px-3 pb-3 border-t border-gray-600">
                {/* Wind Analysis */}
                {day.day?.windAnalysis && (
                  <div className="mt-3 p-2 bg-gray-800/50 rounded">
                    <p className="text-sm text-gray-400 mb-1">Wind Analysis</p>
                    <div className="flex items-center gap-3">
                      {day.day.windAnalysis.pattern && (
                        <span className="text-sm text-blue-400 capitalize">
                          {day.day.windAnalysis.pattern.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className={`text-sm ${getKiteabilityColor(day.day.windAnalysis.kiteability)}`}>
                        {getKiteabilityLabel(day.day.windAnalysis.kiteability)}
                      </span>
                    </div>
                    {day.day.windAnalysis.notes?.length > 0 && (
                      <ul className="mt-1 text-xs text-gray-500">
                        {day.day.windAnalysis.notes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                {/* Kite Windows */}
                {day.kiteWindows.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-400 mb-2">Kite Windows</p>
                    <div className="space-y-2">
                      {day.kiteWindows.map((window, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-3 p-2 bg-green-900/20 rounded">
                          <span className="text-lg">{getWindTypeIcon(window.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm text-white">
                              {formatTime(window.start)} - {formatTime(window.end)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {window.avgSpeed?.toFixed(0)} mph {window.direction} • {window.hours}h
                            </p>
                          </div>
                          <div className="text-right">
                            {window.foilOnly ? (
                              <span className="text-xs text-yellow-400">Foil</span>
                            ) : (
                              <span className="text-xs text-green-400">All kites</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Detailed Forecast */}
                <div className="mt-3 text-sm text-gray-400">
                  <p>{day.day?.detailedForecast}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;
