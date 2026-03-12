import { useMemo } from 'react';

export function ConfidenceGauge({ value, size = 200 }) {
  const rotation = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(100, value));
    return (clampedValue / 100) * 180 - 90;
  }, [value]);

  const getColor = (val) => {
    if (val >= 80) return '#22c55e';
    if (val >= 60) return '#10b981';
    if (val >= 40) return '#f59e0b';
    if (val >= 20) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(value);

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative"
        style={{ width: size, height: size / 2 + 10 }}
      >
        <svg
          viewBox="0 0 200 110"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#334155"
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180 - 180;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 70 * Math.cos(rad);
            const y1 = 100 + 70 * Math.sin(rad);
            const x2 = 100 + 60 * Math.cos(rad);
            const y2 = 100 + 60 * Math.sin(rad);
            const textX = 100 + 50 * Math.cos(rad);
            const textY = 100 + 50 * Math.sin(rad);
            
            return (
              <g key={tick}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#64748b"
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <polygon
              points="100,35 96,100 104,100"
              fill={color}
              className="drop-shadow-lg"
            />
            <circle cx="100" cy="100" r="6" fill={color} />
            <circle cx="100" cy="100" r="3" fill="#1e293b" />
          </g>
        </svg>
      </div>
      
      {/* Value below the gauge */}
      <div 
        className="text-4xl font-black drop-shadow-lg -mt-1"
        style={{ 
          color: '#fff',
          textShadow: `0 0 20px ${color}, 0 2px 4px rgba(0,0,0,0.8)`,
        }}
      >
        {value}
        <span className="text-2xl">%</span>
      </div>
      
      <p className="text-slate-300 text-sm mt-1 font-medium">Thermal Confidence Score</p>
    </div>
  );
}
