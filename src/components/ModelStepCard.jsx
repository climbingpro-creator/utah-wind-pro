export default function ModelStepCard({ step, label, description, value, explanation, isGood, isBad, threshold }) {
  return (
    <div className={`rounded-lg p-3 border bg-[var(--bg-card)] ${
      isGood ? 'border-emerald-500/30' : isBad ? 'border-red-500/30' : 'border-[var(--border-color)]'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
          isGood ? 'bg-emerald-500/10 text-emerald-500' : isBad ? 'bg-red-500/10 text-red-500' : 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
        }`}>
          {step}
        </span>
        <span className="text-[var(--text-secondary)] font-medium text-xs">{label}</span>
      </div>
      <div className="font-mono text-xs text-[var(--text-tertiary)] mb-2">{description}</div>
      <div className={`data-number-sm ${
        isGood ? 'text-emerald-500' : isBad ? 'text-red-500' : 'text-amber-500'
      }`}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-secondary)] mt-1">{explanation}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] mt-1">{threshold}</div>
    </div>
  );
}
