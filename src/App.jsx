import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useProcessRecurring } from './hooks/useProcessRecurring'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import ActivityPage from './pages/ActivityPage'
import AddPage from './pages/AddPage'
import AddTransactionPage from './pages/AddTransactionPage'
import StatsPage from './pages/StatsPage'
import WealthPage from './pages/WealthPage'
import RecurringPage from './pages/RecurringPage'
import DebtDetailPage from './pages/DebtDetailPage'
import BottomNav from './components/BottomNav'

function AppShell() {
  const { user } = useAuth()
  useProcessRecurring()
  const [tab, setTab] = useState('overview')
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [editTransaction, setEditTransaction] = useState(null)

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]">
        <div className="w-8 h-8 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (selectedDebt) {
    return (
      <div className="relative min-h-svh">
        <DebtDetailPage
          debt={selectedDebt}
          onBack={() => setSelectedDebt(null)}
          onEditTransaction={setEditTransaction}
        />
        <BottomNav active={tab} onChange={t => { setSelectedDebt(null); setTab(t) }} />
      </div>
    )
  }

  return (
    <div className="relative min-h-svh">
      {tab === 'overview' && <OverviewPage onNavigate={setTab} onDebtClick={setSelectedDebt} />}
      {tab === 'activity' && (
        <ActivityPage
          onNavigate={setTab}
          onEditTransaction={setEditTransaction}
        />
      )}
      {tab === 'add' && <AddPage onNavigate={setTab} />}
      {tab === 'add-transaction' && (
        <AddTransactionPage
          onNavigate={setTab}
          editTransaction={editTransaction}
          onDone={() => { setEditTransaction(null); setTab('activity') }}
        />
      )}
      {tab === 'wealth' && <WealthPage onNavigate={setTab} onAccountClick={setSelectedDebt} />}
      {tab === 'recurring' && <RecurringPage />}
      {tab === 'stats' && <StatsPage />}
      <BottomNav active={tab} onChange={setTab} />

      {/* Edit Transaction Sheet */}
      {editTransaction && (
        <EditTransactionSheet
          transaction={editTransaction}
          onClose={() => setEditTransaction(null)}
        />
      )}
    </div>
  )
}

import EditTransactionSheet from './components/EditTransactionSheet'

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
