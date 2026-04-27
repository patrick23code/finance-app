export default function MonkeyLogo({ size = 56, showText = true, className = '' }) {
  const height = size
  const width = showText ? size * 3.4 : size

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 70"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      {/* Chimp Head Group */}
      <g>
        {/* Left Ear */}
        <ellipse cx="14" cy="38" rx="8" ry="12" />
        <ellipse cx="14" cy="38" rx="4" ry="7" fill="white" opacity="0.25" />

        {/* Right Ear */}
        <ellipse cx="62" cy="38" rx="8" ry="12" />
        <ellipse cx="62" cy="38" rx="4" ry="7" fill="white" opacity="0.25" />

        {/* Hair tuft (left) */}
        <path d="M20 12 Q 22 5 28 8 Q 30 12 28 16 Z" />
        {/* Hair tuft (middle) */}
        <path d="M30 8 Q 38 0 42 5 Q 44 12 40 14 Z" />
        {/* Hair tuft (right) */}
        <path d="M44 8 Q 52 5 54 12 Q 52 16 48 14 Z" />

        {/* Head shape */}
        <path d="M38 12 C 22 12 14 22 14 35 C 14 40 16 44 18 47 C 16 50 16 54 18 57 C 22 64 30 67 38 67 C 46 67 54 64 58 57 C 60 54 60 50 58 47 C 60 44 62 40 62 35 C 62 22 54 12 38 12 Z" />

        {/* Inner face (muzzle area) */}
        <ellipse cx="38" cy="48" rx="18" ry="16" fill="#F8FAFC" />

        {/* Eyebrow ridge - heavy intense brow */}
        <path d="M20 30 Q 38 23 56 30 L 56 34 Q 38 28 20 34 Z" />

        {/* Left Eye */}
        <ellipse cx="29" cy="38" rx="3" ry="3" />
        {/* Right Eye */}
        <ellipse cx="47" cy="38" rx="3" ry="3" />

        {/* Nose */}
        <path d="M34 47 Q 38 44 42 47 Q 40 51 38 51 Q 36 51 34 47 Z" />

        {/* Mouth - subtle */}
        <path d="M32 58 Q 38 61 44 58" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Bow tie */}
        <path d="M30 67 L 38 64 L 46 67 L 38 70 Z" />
        <rect x="36" y="65" width="4" height="4" />
      </g>

      {/* Text */}
      {showText && (
        <>
          <text
            x="84"
            y="32"
            fontSize="22"
            fontWeight="900"
            letterSpacing="1"
            fontFamily="system-ui, -apple-system, 'Helvetica Neue', sans-serif"
          >
            CHIMP
          </text>
          <text
            x="84"
            y="55"
            fontSize="13"
            fontWeight="500"
            letterSpacing="3"
            fontFamily="system-ui, -apple-system, 'Helvetica Neue', sans-serif"
            opacity="0.85"
          >
            FINANCE
          </text>
        </>
      )}
    </svg>
  )
}
