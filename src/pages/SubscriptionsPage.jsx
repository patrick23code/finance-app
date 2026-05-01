import { useMemo } from 'react'
import { Plus, PlaySquare, Music, Globe, Cpu, CreditCard, Calendar, ArrowRight, Zap, Play, LayoutGrid } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'

const TECH_ICONS = {
  youtube: PlaySquare,
  music: Music,
  web: Globe,
  tech: Cpu,
  card: CreditCard,
  stream: Play,
  app: LayoutGrid,
  zap: Zap
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 
  'bg-emerald-500', 'bg-sky-500', 'bg-[#9E76F4]', 'bg-rose-500'
]

export default function SubscriptionsPage({ onAdd, onEdit }) {
  const { user } = useAuth()
  const { data: subscriptions, loading } = useCollection('subscriptions', user?.uid)

  const totalMonthly = useMemo(() => {
    return subscriptions.reduce((sum, sub) => sum + (parseFloat(sub.price) || 0), 0)
  }, [subscriptions])

  if (loading) {
    return (
      <div className="min-h-svh finance-dashboard-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E9E3F3] border-t-[#180B3D] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-svh finance-dashboard-bg pb-28 relative overflow-hidden">
      {/* Background Decorative Logos */}
      <div className="absolute top-10 -left-10 opacity-10 rotate-12 scale-150">
        <PlaySquare size={120} />
      </div>
      <div className="absolute top-40 -right-10 opacity-10 -rotate-12 scale-150">
        <Cpu size={120} />
      </div>
      <div className="absolute bottom-40 -left-20 opacity-10 rotate-45 scale-150">
        <Music size={150} />
      </div>
      <div className="absolute bottom-10 -right-10 opacity-10 -rotate-12 scale-150">
        <Zap size={100} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-12 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 text-[#24143F]">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Subscriptions</h1>
            <p className="text-[#7F7198] text-sm font-medium mt-1">
              You have {subscriptions.length} active plans
            </p>
          </div>
          <button
            onClick={onAdd}
            className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center border border-[#E9E3F3] active:scale-90 transition-all shadow-[0_16px_36px_rgba(49,28,96,0.12)]"
          >
            <Plus size={24} className="text-[#24143F]" />
          </button>
        </div>

        {/* Total Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 mb-8 border border-[#E9E3F3] shadow-[0_18px_42px_rgba(49,28,96,0.10)] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-[#9E76F4]">
            <LayoutGrid size={60} />
          </div>
          <p className="text-[#9E76F4] bg-[#F2EEF8] inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            Total Monthly Spend
          </p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-[#170A34]">${totalMonthly.toFixed(2)}</span>
            <span className="text-[#7F7198] text-sm font-medium mb-1">/mo</span>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <h2 className="text-[#7F7198] text-xs font-bold uppercase tracking-[0.2em] px-1">Active Subscriptions</h2>
          
          {subscriptions.length === 0 ? (
            <div className="bg-white/90 border border-[#E9E3F3] rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#F2EEF8] rounded-2xl flex items-center justify-center mb-4">
                <Plus className="text-[#9E76F4]" />
              </div>
              <p className="text-[#7F7198] text-sm font-medium">No subscriptions yet.<br/>Tap + to add one!</p>
            </div>
          ) : (
            subscriptions.map((sub, idx) => {
              const Icon = TECH_ICONS[sub.icon] || TECH_ICONS.app
              const colorClass = sub.color || COLORS[idx % COLORS.length]
              
              return (
                <div
                  key={sub.id}
                  onClick={() => onEdit(sub)}
                  className="bg-white rounded-[28px] p-4 flex items-center gap-4 shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-inner`}>
                    <Icon size={28} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-[#24143F] text-lg leading-tight">{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar size={12} className="text-[#7F7198]" />
                      <span className="text-[#8F889B] text-xs font-medium">Next: Day {sub.day}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[#8F889B] text-xs font-medium capitalize">{sub.card || 'Card'}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-lg">${sub.price}</p>
                    <p className="text-[10px] font-bold text-[#7F7198] uppercase tracking-tighter">{sub.frequency || 'Monthly'}</p>
                  </div>
                  
                  <div className="ml-1 text-[#4B376E] group-hover:text-[#7F7198] transition-colors">
                    <ArrowRight size={18} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
