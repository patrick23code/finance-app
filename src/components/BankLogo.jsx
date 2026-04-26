import { useState } from 'react'
import { getBank } from '../data/banks'

export default function BankLogo({ bankId, bankName, size = 32 }) {
  const [imgError, setImgError] = useState(false)
  const bank = bankId ? getBank(bankId) : null
  const displayName = bank?.name || bankName || ''
  const initial = displayName.charAt(0).toUpperCase() || '?'
  const bgColor = bank?.brandColor || '#a8a29e'
  const logoUrl = !imgError && bank?.domain
    ? `https://logo.clearbit.com/${bank.domain}`
    : null

  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={displayName}
        style={style}
        className="object-contain bg-white border border-stone-100"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      style={{ ...style, backgroundColor: bgColor }}
      className="flex items-center justify-center text-white font-bold"
    >
      <span style={{ fontSize: size * 0.4 }}>{initial}</span>
    </div>
  )
}
