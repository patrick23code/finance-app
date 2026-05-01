import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useProcessRecurring } from './hooks/useProcessRecurring'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import ActivityPage from './pages/ActivityPage'
import AddPage from './pages/AddPage'
import AddTransactionPage from './pages/AddTransactionPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import AddSubscriptionPage from './pages/AddSubscriptionPage'
import WealthPage from './pages/WealthPage'
import RecurringPage from './pages/RecurringPage'
import DebtDetailPage from './pages/DebtDetailPage'
import BottomNav from './components/BottomNav'
import EditTransactionSheet from './components/EditTransactionSheet'

function AppShell() {
  const { user } = useAuth()
  useProcessRecurring()
  const [tab, setTab] = useState('overview')
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [editTransaction, setEditTransaction] = useState(null)
  const [editSubscription, setEditSubscription] = useState(null)
  const [addDefaults, setAddDefaults] = useState({ mode: 'debt', debtType: 'loan', key: 0 })
  const [recurringStartKey, setRecurringStartKey] = useState(0)

  function openAddPage(defaults = {}) {
    setAddDefaults(prev => ({
      mode: defaults.mode || 'debt',
      debtType: defaults.debtType || 'loan',
      key: prev.key + 1,
    }))
    setTab('add')
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-svh finance-dashboard-bg">
        <div className="w-8 h-8 border-2 border-[#E9E3F3] border-t-[#180B3D] rounded-full animate-spin" />
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
      {tab === 'overview' && (
        <div key="overview" className="animate-fade-in-up">
          <OverviewPage
            onNavigate={setTab}
            onDebtClick={setSelectedDebt}
            onAddDebtType={debtType => openAddPage({ mode: 'debt', debtType })}
          />
        </div>
      )}
      {tab === 'activity' && (
        <div key="activity" className="animate-fade-in-up">
          <ActivityPage
            onNavigate={setTab}
            onEditTransaction={setEditTransaction}
          />
        </div>
      )}
      {tab === 'add' && (
        <div key={`add-${addDefaults.key}`} className="animate-fade-in-up">
          <AddPage
            onNavigate={setTab}
            initialMode={addDefaults.mode}
            initialDebtType={addDefaults.debtType}
          />
        </div>
      )}
      {tab === 'add-transaction' && (
        <div key="add-tx" className="animate-fade-in-up">
          <AddTransactionPage
            onNavigate={setTab}
            editTransaction={editTransaction}
            onDone={() => { setEditTransaction(null); setTab('activity') }}
          />
        </div>
      )}
      {tab === 'wealth' && (
        <div key="wealth" className="animate-fade-in-up">
          <WealthPage onNavigate={setTab} onAccountClick={setSelectedDebt} />
        </div>
      )}
      {tab === 'settings' && (
        <div key="settings" className="animate-fade-in-up">
          <SettingsPage
            onNavigate={setTab}
            onDebtClick={debt => { setSelectedDebt(debt); setTab('overview') }}
          />
        </div>
      )}
      {tab === 'recurring' && (
        <div key="recurring" className="animate-fade-in-up">
          <RecurringPage startOpenKey={recurringStartKey} />
        </div>
      )}
      {tab === 'stats' && <div key="stats" className="animate-fade-in-up"><StatsPage /></div>}
      {tab === 'subs' && (
        <div key="subs" className="animate-fade-in-up">
          <SubscriptionsPage
            onAdd={() => setTab('add-subscription')}
            onEdit={(s) => { setEditSubscription(s); setTab('add-subscription') }}
          />
        </div>
      )}
      {tab === 'add-subscription' && (
        <div key="add-sub" className="animate-fade-in-up">
          <AddSubscriptionPage
            onNavigate={setTab}
            editSubscription={editSubscription}
            onDone={() => { setEditSubscription(null); setTab('subs') }}
          />
        </div>
      )}

      <BottomNav active={tab} onChange={setTab} />

      {editTransaction && (
        <EditTransactionSheet
          transaction={editTransaction}
          onClose={() => setEditTransaction(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
