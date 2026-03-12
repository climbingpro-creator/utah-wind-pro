import { useMemo } from 'react';

export function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = '#3b82f6',
  showDots = false,
  className = '' 
}) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return null;

    const values = data.filter((v) => v != null);
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y, value };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    return { pathD, points, min, max, latest: values[values.length - 1] };
  }, [data, width, height]);

  if (!pathData) {
    return (
      <div 
        className={`flex items-center justify-center text-slate-600 text-xs ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  const trend = pathData.points.length >= 2
    ? pathData.points[pathData.points.length - 1].value - pathData.points[0].value
    : 0;

  const trendColor = trend > 0.5 ? '#22c55e' : trend < -0.5 ? '#ef4444' : color;

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData.pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      
      {showDots && pathData.points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={i === pathData.points.length - 1 ? 2.5 : 1.5}
          fill={i === pathData.points.length - 1 ? trendColor : 'transparent'}
          stroke={trendColor}
          strokeWidth="1"
        />
      ))}
      
      <circle
        cx={pathData.points[pathData.points.length - 1].x}
        cy={pathData.points[pathData.points.length - 1].y}
        r="2"
        fill={trendColor}
      />
    </svg>
  );
}

export function WindSparkline({ history, stationId }) {
  const data = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    
    return history
      .slice(-20)
      .map((h) => h.windSpeed)
      .filter((v) => v != null);
  }, [history]);

  if (data.length < 2) {
    return <span className="text-slate-600 text-xs">No history</span>;
  }

  const latest = data[data.length - 1];
  const first = data[0];
  const trend = latest - first;

  return (
    <div className="flex items-center gap-2">
      <Sparkline 
        data={data} 
        width={60} 
        height={20} 
        color="#06b6d4"
      />
      <span className={`text-xs ${trend > 1 ? 'text-green-400' : trend < -1 ? 'text-red-400' : 'text-slate-500'}`}>
        {trend > 0 ? '+' : ''}{trend.toFixed(1)}
      </span>
    </div>
  );
}
