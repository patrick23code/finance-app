export default function MonkeyLogo({ size = 64 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      {/* Left Ear */}
      <circle cx="50" cy="40" r="28" fill="#8B6F47" />
      <circle cx="50" cy="40" r="20" fill="#A0826D" />
      <circle cx="50" cy="40" r="12" fill="#C9B9A8" />

      {/* Right Ear */}
      <circle cx="150" cy="40" r="28" fill="#8B6F47" />
      <circle cx="150" cy="40" r="20" fill="#A0826D" />
      <circle cx="150" cy="40" r="12" fill="#C9B9A8" />

      {/* Head */}
      <circle cx="100" cy="100" r="70" fill="#A0826D" />
      <circle cx="100" cy="105" r="65" fill="#B8956A" />

      {/* Face base */}
      <ellipse cx="100" cy="115" rx="55" ry="60" fill="#D4A574" />

      {/* Snout */}
      <ellipse cx="100" cy="125" rx="42" ry="38" fill="#E8C9A0" />

      {/* Left Eye White */}
      <circle cx="75" cy="90" r="14" fill="white" />
      {/* Right Eye White */}
      <circle cx="125" cy="90" r="14" fill="white" />

      {/* Left Pupil */}
      <circle cx="78" cy="93" r="8" fill="#1a1a1a" />
      <circle cx="80" cy="91" r="3" fill="white" />
      {/* Right Pupil */}
      <circle cx="128" cy="93" r="8" fill="#1a1a1a" />
      <circle cx="130" cy="91" r="3" fill="white" />

      {/* Left Eyebrow - angry/confident */}
      <path
        d="M 65 75 Q 75 70 85 72"
        stroke="#8B6F47"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right Eyebrow - angry/confident */}
      <path
        d="M 115 72 Q 125 70 135 75"
        stroke="#8B6F47"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Nose */}
      <ellipse cx="100" cy="115" rx="8" ry="10" fill="#8B6F47" />
      <path d="M 100 115 L 98 122 M 100 115 L 102 122" stroke="#8B6F47" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Mouth - confident smile */}
      <path
        d="M 100 125 Q 90 135 75 130"
        stroke="#8B6F47"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 100 125 Q 110 135 125 130"
        stroke="#8B6F47"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Mouth inner color */}
      <path
        d="M 75 130 Q 85 138 100 140 Q 115 138 125 130"
        fill="#D4997D"
        opacity="0.6"
      />

      {/* Cheeks */}
      <circle cx="55" cy="110" r="12" fill="#C9B9A8" opacity="0.4" />
      <circle cx="145" cy="110" r="12" fill="#C9B9A8" opacity="0.4" />

      {/* Crown/Boss accessory */}
      <g>
        {/* Crown base */}
        <path
          d="M 70 50 L 85 25 L 100 15 L 115 25 L 130 50 Z"
          fill="#FFD700"
          stroke="#DAA520"
          strokeWidth="2"
        />
        {/* Crown shine */}
        <circle cx="85" cy="30" r="4" fill="#FFED4E" />
        <circle cx="100" cy="18" r="5" fill="#FFED4E" />
        <circle cx="115" cy="30" r="4" fill="#FFED4E" />
      </g>

      {/* Chin definition */}
      <ellipse cx="100" cy="165" rx="35" ry="12" fill="#A0826D" opacity="0.3" />
    </svg>
  )
}
