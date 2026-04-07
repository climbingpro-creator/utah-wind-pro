/**
 * useCrossLocationPredictions
 * 
 * Fetches real predictions from UnifiedPredictor for multiple spots.
 * This uses the same prediction engine as the main dashboard - 
 * trained weights, sensor data, pattern recognition, the works.
 * 
 * NOT raw NWS data. Real microclimate predictions.
 */

import { useState, useEffect, useRef } from 'react';
import { weatherService, LAKE_CONFIGS } from '@utahwind/weather';
import { LakeState } from '@utahwind/weather';
import { getModelContext } from './useModelContext';

// Priority spots with validated sensor networks
const PRIORITY_SPOTS = [
  'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard', 'utah-lake-sandy',
  'deer-creek', 'willard-bay',
];

// Activity-specific spots (only spots with real sensor coverage)
const ACTIVITY_SPOTS = {
  kiting: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard', 'utah-lake-sandy',
    'deer-creek', 'willard-bay', 'jordanelle', 'sand-hollow',
  ],
  windsurfing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
    'deer-creek', 'willard-bay', 'jordanelle',
  ],
  sailing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'deer-creek', 'willard-bay', 'jordanelle',
  ],
  paragliding: [
    'potm-south', 'potm-north', 'inspo',
  ],
  snowkiting: [
    'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier', 'strawberry-view',
  ],
  boating: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
    'deer-creek', 'willard-bay', 'jordanelle', 'sand-hollow',
  ],
  paddling: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'deer-creek', 'willard-bay', 'jordanelle',
  ],
  fishing: [
    'strawberry-ladders', 'strawberry-bay', 'deer-creek', 'jordanelle',
  ],
};

/**
 * Fetch current conditions and run UnifiedPredictor for a single spot
 */
async function getPredictionForSpot(spotId, activity, modelContext) {
  try {
    // Fetch current sensor data for this spot
    const rawData = await weatherService.getDataForLake(spotId);
    const hasData = rawData.ambient || rawData.synoptic?.length > 0;
    
    if (!hasData) {
      return null;
    }

    // Build LakeState from raw sensor data
    const lakeState = LakeState.fromRawData(
      spotId,
      rawData.ambient,
      rawData.synoptic,
      null, // history
      rawData.wuPws
    );

    // Dynamically import UnifiedPredictor to avoid circular deps
    const { predict } = await import('../services/UnifiedPredictor');
    
    // Run the full prediction pipeline
    const prediction = predict(
      spotId,
      activity,
      lakeState?.wind?.stations || rawData.synoptic || [],
      lakeState?.config,
      modelContext
    );

    return {
      spotId,
      spotName: LAKE_CONFIGS[spotId]?.name || spotId,
      region: LAKE_CONFIGS[spotId]?.region || 'Utah',
      isPriority: PRIORITY_SPOTS.includes(spotId),
      prediction,
      lakeState,
      // Extract key metrics for ranking
      decision: prediction?.decision,
      confidence: prediction?.confidence,
      regime: prediction?.regime,
      windSpeed: prediction?.wind?.current?.speed || 0,
      windGust: prediction?.wind?.current?.gust,
      windDirection: prediction?.wind?.current?.dir,
      activityScore: prediction?.activities?.[activity]?.score || 0,
      activityStatus: prediction?.activities?.[activity]?.status,
      briefing: prediction?.briefing,
      propagation: prediction?.propagation,
    };
  } catch (err) {
    console.warn(`[CrossLocation] Failed to get prediction for ${spotId}:`, err.message);
    return null;
  }
}

/**
 * Rank spots by their prediction quality for the selected activity
 */
function rankSpots(predictions, _activity) {
  if (!predictions || predictions.length === 0) return [];

  // Filter to only spots with valid predictions
  const valid = predictions.filter(p => p && p.prediction);

  // Sort by: decision (GO first), then score, then priority
  valid.sort((a, b) => {
    // GO decisions first
    const decisionOrder = { GO: 0, WAIT: 1, PASS: 2 };
    const aDecision = decisionOrder[a.decision] ?? 3;
    const bDecision = decisionOrder[b.decision] ?? 3;
    if (aDecision !== bDecision) return aDecision - bDecision;

    // Then by activity score
    if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;

    // Then by priority spots
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;

    // Then by confidence
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return valid;
}

/**
 * Hook to fetch cross-location predictions
 */
export function useCrossLocationPredictions(activity) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    setLoading(true);
    setError(null);

    async function fetchAllPredictions() {
      try {
        const spots = ACTIVITY_SPOTS[activity] || ACTIVITY_SPOTS.kiting;
        const modelContext = getModelContext() || {};

        // Fetch predictions for all spots in parallel (with concurrency limit)
        const results = [];
        const batchSize = 4; // Don't hammer the API
        
        for (let i = 0; i < spots.length; i += batchSize) {
          if (abortRef.current) break;
          
          const batch = spots.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(spotId => getPredictionForSpot(spotId, activity, modelContext))
          );
          results.push(...batchResults);
        }

        if (abortRef.current) return;

        // Rank and set results
        const ranked = rankSpots(results.filter(Boolean), activity);
        
        setPredictions(ranked);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err) {
        console.error('[CrossLocation] Error fetching predictions:', err);
        if (!abortRef.current) {
          setError(err.message || 'Failed to load predictions');
          setLoading(false);
        }
      }
    }

    fetchAllPredictions();

    return () => {
      abortRef.current = true;
    };
  }, [activity]);

  return {
    predictions,
    loading,
    error,
    lastUpdated,
    // Convenience getters
    topSpots: predictions.slice(0, 5),
    goSpots: predictions.filter(p => p.decision === 'GO'),
    waitSpots: predictions.filter(p => p.decision === 'WAIT'),
  };
}

export { PRIORITY_SPOTS, ACTIVITY_SPOTS };
