import { TrendingDown, ArrowLeftRight, PlusCircle, BarChart2, Wallet, Repeat } from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Debts', Icon: TrendingDown },
  { id: 'activity', label: 'Activity', Icon: ArrowLeftRight },
  { id: 'add', label: 'Add', Icon: PlusCircle },
  { id: 'wealth', label: 'Wealth', Icon: Wallet },
  { id: 'recurring', label: 'Recurring', Icon: Repeat },
  { id: 'stats', label: 'Stats', Icon: BarChart2 },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-stone-200 z-50">
      <div className="max-w-md mx-auto flex items-center justify-around px-1 pb-safe">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1 py-3 px-2 min-w-0 flex-1"
          >
            <Icon
              size={21}
              strokeWidth={id === active ? 2.2 : 1.6}
              className={id === active ? 'text-stone-800' : 'text-stone-400'}
            />
            <span className={`text-[9px] font-medium tracking-wide ${id === active ? 'text-stone-800' : 'text-stone-400'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
      <div className="h-safe-bottom" />
    </nav>
  )
}
