export default function MonkeyLogo({ size = 64, className = '' }) {
  return (
    <img
      src="/chimp-finance-logo.png"
      alt="Chimp Finance"
      className={`object-contain ${className}`}
      style={{
        height: size,
        width: 'auto',
        mixBlendMode: 'multiply',
      }}
    />
  )
}
