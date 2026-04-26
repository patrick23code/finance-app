import { useState, useRef, useEffect } from 'react'
import { searchBanks } from '../data/banks'
import BankLogo from './BankLogo'
import { ChevronDown } from 'lucide-react'

export default function IssuerCombobox({ value, onChange, placeholder = 'Search bank…' }) {
  const [query, setQuery] = useState(value?.name || '')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = searchBanks(query)
  const showCustom = query.trim() && !results.find(b => b.name.toLowerCase() === query.toLowerCase())
  const totalOptions = results.length + (showCustom ? 1 : 0)

  useEffect(() => {
    setQuery(value?.name || '')
  }, [value])

  function selectBank(bank) {
    onChange(bank)
    setQuery(bank.name)
    setOpen(false)
  }

  function selectCustom() {
    const custom = { id: `custom-${query.trim().toLowerCase().replace(/\s+/g, '-')}`, name: query.trim() }
    onChange(custom)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, totalOptions - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted < results.length) selectBank(results[highlighted])
      else if (showCustom) selectCustom()
    }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        {value && <BankLogo bankId={value.id} bankName={value.name} size={22} />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setHighlighted(0) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(0) }}
          onKeyDown={handleKeyDown}
          className="text-right font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-200 text-[15px] flex-1 min-w-0"
        />
        <ChevronDown size={14} className="text-stone-300 flex-shrink-0" />
      </div>

      {open && totalOptions > 0 && (
        <div
          ref={listRef}
          className="absolute right-0 top-full mt-1 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50 animate-scale-in"
        >
          {results.map((bank, i) => (
            <button
              key={bank.id}
              onMouseDown={() => selectBank(bank)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                highlighted === i ? 'bg-stone-50' : ''
              }`}
              style={highlighted === i ? { borderLeft: `3px solid ${bank.brandColor || '#a8a29e'}` } : { borderLeft: '3px solid transparent' }}
            >
              <BankLogo bankId={bank.id} bankName={bank.name} size={24} />
              <span className="text-[15px] font-medium text-stone-800">{bank.name}</span>
            </button>
          ))}
          {showCustom && (
            <button
              onMouseDown={selectCustom}
              onMouseEnter={() => setHighlighted(results.length)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t border-stone-100 transition-colors ${
                highlighted === results.length ? 'bg-stone-50' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-500 text-xs font-bold">+</span>
              </div>
              <span className="text-[14px] text-stone-500">Use "<span className="font-semibold text-stone-700">{query.trim()}</span>"</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
