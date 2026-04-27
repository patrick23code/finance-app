export default function MonkeyLogo({ size = 64, className = '' }) {
  return (
    <img
      src="/chimp-finance-logo.png"
      alt="Chimp Finance"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
