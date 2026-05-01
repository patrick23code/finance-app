import { Home, ArrowLeftRight, Settings, BarChart2, Wallet } from 'lucide-react'

const tabs = [
  { id: 'overview',  label: 'Debts',       Icon: Home },
  { id: 'activity',  label: 'Transaction',  Icon: ArrowLeftRight },
  { id: 'settings',  label: 'Settings',     Icon: Settings },
  { id: 'stats',     label: 'Analytics',    Icon: BarChart2 },
  { id: 'wealth',    label: 'Account',      Icon: Wallet },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-tab-shell pointer-events-none">
      <div className="max-w-md mx-auto px-5">
        <div className="h-[74px] rounded-full bg-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(64,39,118,0.18)] pointer-events-auto border border-[#E9E3F3]">
          <div className="grid grid-cols-5 items-center h-full px-3">
            {tabs.map(({ id, label, Icon }) => (
              <NavButton key={id} id={id} label={label} Icon={Icon} active={active} onChange={onChange} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavButton({ id, label, Icon, active, onChange }) {
  const isActive = id === active
  return (
    <button
      onClick={() => onChange(id)}
      className="min-w-0 h-[58px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
    >
      <span className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#9E76F4]/15' : ''}`}>
        <Icon
          size={20}
          strokeWidth={isActive ? 2.5 : 1.9}
          className={isActive ? 'text-[#9E76F4]' : 'text-[#8F889B]'}
        />
      </span>
      <span className={`text-[10px] font-semibold leading-none tracking-normal ${isActive ? 'text-[#9E76F4]' : 'text-[#8F889B]'}`}>
        {label}
      </span>
    </button>
  )
}
