import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Database, RefreshCw, Download, Activity, Target, Zap } from 'lucide-react';
import { learningSystem } from '@utahwind/weather';
import { dataCollector } from '../services/DataCollector';
import { safeToFixed } from '../utils/safeToFixed';

const LearningDashboard = () => {
  const [stats, setStats] = useState(null);
  const [collectorStats, setCollectorStats] = useState(null);
  const [weights, setWeights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningInProgress, setLearningInProgress] = useState(false);

  const loadData = async () => {
    try {
      const [accuracyStats, learnedWeights] = await Promise.all([
        learningSystem.getAccuracyStats(),
        learningSystem.getLearnedWeights(),
      ]);
      
      setStats(accuracyStats);
      setWeights(learnedWeights);
      setCollectorStats(dataCollector.getStats());
    } catch (error) {
      console.error('Error loading learning data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleForceLearning = async () => {
    setLearningInProgress(true);
    try {
      await dataCollector.forceLearning();
      await loadData();
    } catch (error) {
      console.error('Error forcing learning:', error);
    }
    setLearningInProgress(false);
  };

  const handleForceCollection = async () => {
    try {
      await dataCollector.forceCollection();
      await loadData();
    } catch (error) {
      console.error('Error forcing collection:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await learningSystem.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utahwindfinder-learning-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 60) return 'text-yellow-400';
    if (accuracy >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Learning System
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleForceCollection}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            Collect Now
          </button>
          <button
            onClick={handleForceLearning}
            disabled={learningInProgress}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${learningInProgress ? 'animate-spin' : ''}`} />
            {learningInProgress ? 'Learning...' : 'Learn Now'}
          </button>
          <button
            onClick={handleExportData}
            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Accuracy Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Model Accuracy</div>
          <div className={`text-2xl font-bold ${stats?.avgAccuracy ? getAccuracyColor(stats.avgAccuracy) : 'text-gray-500'}`}>
            {stats?.avgAccuracy != null ? `${stats.avgAccuracy}%` : '--'}
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getTrendIcon(stats?.trend)}
            <span className={`text-xs ${getTrendColor(stats?.trend)}`}>
              {stats?.trend === 'improving' ? 'Improving' : 
               stats?.trend === 'declining' ? 'Declining' : 'Stable'}
            </span>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Last 7 Days</div>
          <div className={`text-2xl font-bold ${stats?.lastWeekAccuracy ? getAccuracyColor(stats.lastWeekAccuracy) : 'text-gray-500'}`}>
            {stats?.lastWeekAccuracy != null ? `${stats.lastWeekAccuracy}%` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">accuracy</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Predictions</div>
          <div className="text-2xl font-bold text-blue-400">
            {stats?.totalPredictions || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">verified</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Model Version</div>
          <div className="text-lg font-bold text-purple-400">
            {weights?.version === 'default' ? 'Default' : 
             `v${String(weights?.version).slice(-6)}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {weights?.basedOnSamples ? `${weights.basedOnSamples} samples` : 'baseline'}
          </div>
        </div>
      </div>

      {/* Collection Status */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className={`w-4 h-4 ${collectorStats?.isRunning ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-sm font-medium text-white">
            Data Collection {collectorStats?.isRunning ? 'Active' : 'Stopped'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400">Actuals Collected:</span>
            <span className="text-white ml-2">{collectorStats?.actualsCollected || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Predictions:</span>
            <span className="text-white ml-2">{collectorStats?.predictionsRecorded || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Verifications:</span>
            <span className="text-white ml-2">{collectorStats?.verificationsRun || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Learning Cycles:</span>
            <span className="text-white ml-2">{collectorStats?.learningCyclesRun || 0}</span>
          </div>
        </div>

        {collectorStats?.lastCollection && (
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {collectorStats.lastCollection.actuals && (
                <div>Last actuals: {new Date(collectorStats.lastCollection.actuals).toLocaleTimeString()}</div>
              )}
              {collectorStats.lastCollection.predictions && (
                <div>Last predictions: {new Date(collectorStats.lastCollection.predictions).toLocaleTimeString()}</div>
              )}
              {collectorStats.lastCollection.learning && (
                <div>Last learning: {new Date(collectorStats.lastCollection.learning).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        )}

        {collectorStats?.lastError && (
          <div className="mt-2 text-xs text-red-400">
            Last error: {collectorStats.lastError}
          </div>
        )}
      </div>

      {/* Learned Weights */}
      {weights && weights.version !== 'default' && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Learned Model Weights</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Pressure</div>
              <div className="text-lg font-bold text-blue-400">
                {((weights.pressureWeight ?? 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Thermal</div>
              <div className="text-lg font-bold text-orange-400">
                {((weights.thermalWeight ?? 0) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Convergence</div>
              <div className="text-lg font-bold text-green-400">
                {((weights.convergenceWeight ?? 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {weights.speedBiasCorrection != null && weights.speedBiasCorrection !== 0 && (
            <div className="text-xs text-gray-400 mb-2">
              Speed bias correction: {weights.speedBiasCorrection > 0 ? '+' : ''}{safeToFixed(weights.speedBiasCorrection, 1)} mph
            </div>
          )}

          {Object.keys(weights.indicators || {}).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-2">Indicator Weights:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(weights.indicators).slice(0, 4).map(([key, data]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-white">{((data.weight ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            Last updated: {weights.createdAt ? new Date(weights.createdAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}

      {/* Pattern Insights */}
      {weights?.patternInsights && Object.keys(weights.patternInsights).length > 0 && (
        <div className="bg-gray-700/30 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Discovered Patterns</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {weights.patternInsights.peakHour != null && (
              <div className="bg-gray-600/30 p-2 rounded">
                <span className="text-gray-400">Peak Wind Hour:</span>
                <span className="text-cyan-400 font-bold ml-2">
                  {weights.patternInsights.peakHour > 12 
                    ? `${weights.patternInsights.peakHour - 12} PM` 
                    : `${weights.patternInsights.peakHour} AM`}
                </span>
                <span className="text-gray-500 ml-1">
                  ({((weights.patternInsights.peakHourConfidence ?? 0) * 100).toFixed(0)}% conf)
                </span>
              </div>
            )}
            {weights.patternInsights.dominantWindType && (
              <div className="bg-gray-600/30 p-2 rounded">
                <span className="text-gray-400">Dominant Type:</span>
                <span className="text-cyan-400 font-bold ml-2 capitalize">
                  {weights.patternInsights.dominantWindType.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wind Event Patterns */}
      {weights?.windEventPatterns && Object.keys(weights.windEventPatterns).length > 0 && (
        <div className="bg-gray-700/30 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Wind Event Intelligence</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {weights.windEventPatterns.north_flow && (
              <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded">
                <div className="text-blue-400 font-bold mb-1">⬇️ North Flow Events</div>
                <div className="text-gray-300">
                  Avg duration: {safeToFixed(weights.windEventPatterns.north_flow.avgDuration, 1)} hrs
                </div>
                <div className="text-gray-300">
                  Avg speed: {safeToFixed(weights.windEventPatterns.north_flow.avgSpeed, 0)} mph
                </div>
                <div className="text-gray-400">
                  {weights.windEventPatterns.north_flow.eventCount ?? 0} events recorded
                </div>
              </div>
            )}
            {weights.windEventPatterns.thermal && (
              <div className="bg-orange-900/20 border border-orange-500/20 p-3 rounded">
                <div className="text-orange-400 font-bold mb-1">🔥 Thermal Events</div>
                <div className="text-gray-300">
                  Avg duration: {safeToFixed(weights.windEventPatterns.thermal.avgDuration, 1)} hrs
                </div>
                <div className="text-gray-400">
                  {weights.windEventPatterns.thermal.eventCount ?? 0} events recorded
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confidence & Data Health */}
      <div className="bg-gray-700/30 rounded-lg p-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Data Health</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-400">Confidence Level:</span>
            <div className="mt-1 h-2 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (weights?.confidenceScalar || 0) * 100)}%` }} 
              />
            </div>
            <span className="text-gray-500 mt-0.5 block">
              {weights?.confidenceScalar ? `${(weights.confidenceScalar * 100).toFixed(0)}%` : 'Building...'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Learning Threshold:</span>
            <span className={`ml-2 font-bold ${(stats?.totalPredictions || 0) >= 5 ? 'text-green-400' : 'text-yellow-400'}`}>
              {stats?.totalPredictions || 0} / 5 min
            </span>
          </div>
        </div>
        {weights?.userFeedbackSamples > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            User session reports: <span className="text-white">{weights.userFeedbackSamples}</span>
          </div>
        )}
      </div>

      {/* Server-Side 24/7 Learning */}
      {weights?.serverMeta && (
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">24/7 Server Learning</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">ALWAYS ON</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Server Predictions</span>
              <div className="text-white font-bold">{weights.serverMeta.totalPredictions?.toLocaleString() || 0}</div>
            </div>
            <div>
              <span className="text-gray-400">Server Accuracy</span>
              <div className="text-white font-bold">
                {weights.serverMeta.overallAccuracy ? `${(weights.serverMeta.overallAccuracy * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Learning Cycles</span>
              <div className="text-white font-bold">{weights.serverMeta.totalCycles || 0}</div>
            </div>
          </div>
          {weights.serverMeta.eventAccuracy && (
            <div className="mt-2 space-y-1">
              {Object.entries(weights.serverMeta.eventAccuracy).filter(([,v]) => v).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-[10px]">
                  <span className="text-gray-400 w-24 truncate">{key.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${val.accuracy > 0.6 ? 'bg-green-500' : val.accuracy > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, val.accuracy * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-300 w-10 text-right">{((val.accuracy ?? 0) * 100).toFixed(0)}%</span>
                  <span className="text-gray-500 w-8 text-right">n={val.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learning Progress */}
      <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">Learning Pipeline</span>
        </div>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• <span className="text-blue-300">Server runs 24/7</span> — predict, verify, learn every 15 min</li>
          <li>• Collects data from <span className="text-white">35+ locations</span> across all of Utah</li>
          <li>• Records thermal, frontal, north flow, glass, and clearing wind predictions</li>
          <li>• Verifies predictions against actual station readings</li>
          <li>• Server weights merge with local weights on app open</li>
          <li>• User session feedback refines location-specific speed bias</li>
        </ul>
        <div className="mt-3 text-xs text-purple-300">
          {weights?.serverMeta
            ? 'Server model is learning around the clock — weights sync on every app open'
            : (stats?.totalPredictions || 0) < 5
              ? `Need ${5 - (stats?.totalPredictions || 0)} more verified predictions before first learning cycle`
              : 'Model is actively learning from your data!'}
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
