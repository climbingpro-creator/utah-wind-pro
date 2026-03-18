import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Database, RefreshCw, Download, Activity, Target, Zap } from 'lucide-react';
import { learningSystem } from '../services/LearningSystem';
import { dataCollector } from '../services/DataCollector';

const LearningDashboard = () => {
  const [stats, setStats] = useState(null);
  const [collectorStats, setCollectorStats] = useState(null);
  const [weights, setWeights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningInProgress, setLearningInProgress] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

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
                {(weights.pressureWeight * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Thermal</div>
              <div className="text-lg font-bold text-orange-400">
                {(weights.thermalWeight * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Convergence</div>
              <div className="text-lg font-bold text-green-400">
                {(weights.convergenceWeight * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {weights.speedBiasCorrection !== 0 && (
            <div className="text-xs text-gray-400 mb-2">
              Speed bias correction: {weights.speedBiasCorrection > 0 ? '+' : ''}{weights.speedBiasCorrection.toFixed(1)} mph
            </div>
          )}

          {Object.keys(weights.indicators || {}).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-2">Indicator Weights:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(weights.indicators).slice(0, 4).map(([key, data]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-white">{(data.weight * 100).toFixed(0)}%</span>
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

      {/* Learning Progress */}
      <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">How Learning Works</span>
        </div>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Every 15 min: Collects actual weather data from all stations</li>
          <li>• Every hour: Records predictions and verifies past ones</li>
          <li>• Every 6 hours: Analyzes indicator correlations</li>
          <li>• Every 24 hours: Runs learning cycle to improve model</li>
          <li>• Model improves as more data is collected over days/weeks</li>
        </ul>
        <div className="mt-3 text-xs text-purple-300">
          {stats?.totalPredictions < 10 
            ? `Need ${10 - (stats?.totalPredictions || 0)} more verified predictions before first learning cycle`
            : 'Model is actively learning from your data!'}
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
