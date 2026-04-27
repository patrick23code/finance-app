export default function MonkeyLogo({ size = 64, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Maymun Kafası ve Şekillendirme */}
      <path d="M50 10C35 10 22 20 22 35c0 5 1.5 9.5 4 13-4 5-6 11-6 18 0 13 14 24 30 24s30-11 30-24c0-7-2-13-6-18 2.5-3.5 4-8 4-13 0-15-13-25-28-25zm0 15c7 0 12 5 12 12s-5 12-12 12-12-5-12-12 5-12 12-12zm-30 45c0-10 10-18 30-18s30 8 30 18-10 18-30 18-30-8-30-18z" opacity="0.6"/>
      {/* Gözler */}
      <path d="M50 30c-4 0-8 3-8 7s4 7 8 7 8-3 8-7-4-7-8-7z" />
      {/* Ağız/Gülümseme */}
      <path d="M35 65c0-3 15-5 15-5s15 2 15 5c0 5-15 10-15 10s-15-5-15-10z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* Finansal Detay: Gözlerdeki vurgu */}
      <path d="M42 45v10m16-10v10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
