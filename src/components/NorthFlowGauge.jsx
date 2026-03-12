import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

/**
 * North Flow / Prefrontal Gauge
 * 
 * Shows the pressure gradient and indicates whether conditions favor:
 * - NORTH FLOW (prefrontal, gradient wind) - positive gradient (SLC > Provo)
 * - THERMAL (lake breeze) - negative gradient (Provo > SLC)
 * - NEUTRAL - near zero gradient
 */
export function NorthFlowGauge({ gradient, size = 160 }) {
  const radius = (size - 20) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Gradient typically ranges from -4 to +4 mb
  // Normalize to -100 to +100 for display
  const normalizedValue = gradient != null 
    ? Math.max(-100, Math.min(100, gradient * 25)) 
    : 0;
  
  // Determine flow type
  let flowType = 'neutral';
  let flowLabel = 'Neutral';
  let flowColor = 'text-slate-400';
  let arcColor = '#64748b';
  
  if (gradient != null) {
    if (gradient > 1.5) {
      flowType = 'north-strong';
      flowLabel = 'Strong North';
      flowColor = 'text-blue-400';
      arcColor = '#3b82f6';
    } else if (gradient > 0.5) {
      flowType = 'north';
      flowLabel = 'North Flow';
      flowColor = 'text-cyan-400';
      arcColor = '#22d3ee';
    } else if (gradient > -0.5) {
      flowType = 'neutral';
      flowLabel = 'Neutral';
      flowColor = 'text-slate-400';
      arcColor = '#64748b';
    } else if (gradient > -1.5) {
      flowType = 'thermal';
      flowLabel = 'Thermal';
      flowColor = 'text-green-400';
      arcColor = '#22c55e';
    } else {
      flowType = 'thermal-strong';
      flowLabel = 'Strong Thermal';
      flowColor = 'text-emerald-400';
      arcColor = '#10b981';
    }
  }

  // Arc parameters (semi-circle from left to right)
  const startAngle = 180;
  const endAngle = 0;
  const arcLength = 180;
  
  // Calculate needle position
  // -100 = full left (thermal), +100 = full right (north)
  const needleAngle = 180 - ((normalizedValue + 100) / 200) * 180;
  const needleLength = radius - 15;
  const needleX = centerX + needleLength * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = centerY - needleLength * Math.sin((needleAngle * Math.PI) / 180);

  // Arc path
  const arcPath = (r, start, end) => {
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = centerX + r * Math.cos(startRad);
    const y1 = centerY - r * Math.sin(startRad);
    const x2 = centerX + r * Math.cos(endRad);
    const y2 = centerY - r * Math.sin(endRad);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={arcPath(radius, startAngle, endAngle)}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Gradient colored sections */}
        {/* Thermal side (left - green) */}
        <path
          d={arcPath(radius, 180, 135)}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d={arcPath(radius, 135, 110)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* Neutral (center - gray) */}
        <path
          d={arcPath(radius, 110, 70)}
          fill="none"
          stroke="#64748b"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* North side (right - blue) */}
        <path
          d={arcPath(radius, 70, 45)}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d={arcPath(radius, 45, 0)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* Active arc indicator */}
        {gradient != null && (
          <path
            d={arcPath(radius, normalizedValue < 0 ? 180 : 90, normalizedValue < 0 ? 90 + (normalizedValue / 100) * 90 : 90 - (normalizedValue / 100) * 90)}
            fill="none"
            stroke={arcColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={arcColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="6" fill={arcColor} />
        <circle cx={centerX} cy={centerY} r="3" fill="#0f172a" />
        
        {/* Labels */}
        <text x="15" y={centerY + 20} fill="#22c55e" fontSize="10" fontWeight="bold">
          THERMAL
        </text>
        <text x={size - 55} y={centerY + 20} fill="#3b82f6" fontSize="10" fontWeight="bold">
          NORTH
        </text>
      </svg>
      
      {/* Value display */}
      <div className="text-center -mt-2">
        <div className={`text-2xl font-bold ${flowColor}`}>
          {gradient != null ? `${gradient > 0 ? '+' : ''}${gradient.toFixed(2)}` : '--'}
          <span className="text-sm text-slate-500 ml-1">mb</span>
        </div>
        <div className={`text-sm font-medium ${flowColor} flex items-center justify-center gap-1`}>
          {flowType.includes('north') && <ArrowDown className="w-4 h-4" />}
          {flowType.includes('thermal') && <ArrowUp className="w-4 h-4" />}
          {flowType === 'neutral' && <Minus className="w-4 h-4" />}
          {flowLabel}
        </div>
      </div>
    </div>
  );
}
