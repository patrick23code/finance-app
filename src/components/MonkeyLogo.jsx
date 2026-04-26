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
      <circle cx="50" cy="40" r="28" fill="#333333" />
      <circle cx="50" cy="40" r="20" fill="#555555" />
      <circle cx="50" cy="40" r="12" fill="#f5f5f5" />

      {/* Right Ear */}
      <circle cx="150" cy="40" r="28" fill="#333333" />
      <circle cx="150" cy="40" r="20" fill="#555555" />
      <circle cx="150" cy="40" r="12" fill="#f5f5f5" />

      {/* Head */}
      <circle cx="100" cy="100" r="70" fill="#333333" />
      <circle cx="100" cy="105" r="65" fill="#444444" />

      {/* Face base */}
      <ellipse cx="100" cy="115" rx="55" ry="60" fill="#555555" />

      {/* Snout */}
      <ellipse cx="100" cy="125" rx="42" ry="38" fill="#f5f5f5" />

      {/* Left Eye White */}
      <circle cx="75" cy="85" r="16" fill="white" />
      {/* Right Eye White */}
      <circle cx="125" cy="85" r="16" fill="white" />

      {/* Left Eye Dollar Sign */}
      <text x="75" y="95" fontSize="20" fontWeight="bold" fill="#000000" textAnchor="middle" dominantBaseline="middle">
        $
      </text>
      {/* Right Eye Dollar Sign */}
      <text x="125" y="95" fontSize="20" fontWeight="bold" fill="#000000" textAnchor="middle" dominantBaseline="middle">
        $
      </text>

      {/* Left Eyebrow - angry/boss */}
      <path
        d="M 60 70 Q 75 65 90 68"
        stroke="#f5f5f5"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right Eyebrow - angry/boss */}
      <path
        d="M 110 68 Q 125 65 140 70"
        stroke="#f5f5f5"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Nose */}
      <ellipse cx="100" cy="120" rx="10" ry="12" fill="#333333" />
      <path d="M 100 120 L 97 130 M 100 120 L 103 130" stroke="#333333" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Mouth - evil grin */}
      <path
        d="M 100 130 Q 85 142 70 135"
        stroke="#333333"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 100 130 Q 115 142 130 135"
        stroke="#333333"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Mouth inner */}
      <path
        d="M 70 135 Q 85 145 100 147 Q 115 145 130 135"
        fill="#333333"
        opacity="0.3"
      />

      {/* Cheeks - darker */}
      <circle cx="55" cy="110" r="13" fill="#333333" opacity="0.5" />
      <circle cx="145" cy="110" r="13" fill="#333333" opacity="0.5" />

      {/* Top knot / Boss tuft */}
      <circle cx="100" cy="30" r="18" fill="#333333" />
      <circle cx="95" cy="20" r="12" fill="#555555" />
      <circle cx="105" cy="20" r="12" fill="#555555" />

      {/* Shine on snout */}
      <ellipse cx="100" cy="105" rx="15" ry="12" fill="white" opacity="0.2" />
    </svg>
  )
}
