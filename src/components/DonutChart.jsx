import { useEffect, useState } from 'react'

export default function DonutChart({ segments, size = 140, strokeWidth = 14, centerLabel, centerValue }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setProgress(1), 120)
    return () => clearTimeout(t)
  }, [])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  let cumulative = 0
  const segs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0
    const len = circumference * pct
    const offset = circumference * cumulative * -1
    cumulative += pct
    return { ...seg, len, offset, pct }
  })

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {segs.map((seg, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${seg.len * progress} ${circumference}`}
            strokeDashoffset={seg.offset}
            style={{
              transition: 'stroke-dasharray 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transitionDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide">{centerLabel}</p>}
          {centerValue && <p className="text-xl font-bold text-slate-900 tracking-tight">{centerValue}</p>}
        </div>
      )}
    </div>
  )
}
