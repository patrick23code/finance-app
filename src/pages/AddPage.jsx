import { useState, useMemo } from 'react'
import { Bell, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { addDocument } from '../hooks/useFirestore'

const DEBT_TYPES = [
  { id: 'loan', label: 'Loan' },
  { id: 'credit_card', label: 'Credit card' },
  { id: 'personal', label: 'Personal' },
]

const ACCOUNT_TYPES = [
  { id: 'checking', label: 'Checking' },
  { id: 'savings', label: 'Savings' },
  { id: 'cash', label: 'Cash' },
]

export default function AddPage({ onNavigate }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const [debtType, setDebtType] = useState('loan')
  const [debtName, setDebtName] = useState('')
  const [debtBank, setDebtBank] = useState('')
  const [debtRemaining, setDebtRemaining] = useState('')
  const [debtOriginal, setDebtOriginal] = useState('')
  const [debtMonthly, setDebtMonthly] = useState('')
  const [debtApr, setDebtApr] = useState('')
  const [debtEndDate, setDebtEndDate] = useState('')
  const [debtDueDay, setDebtDueDay] = useState('')
  const [debtLast4, setDebtLast4] = useState('')
  const [debtCreditLimit, setDebtCreditLimit] = useState('')
  const [debtMinPayment, setDebtMinPayment] = useState('')
  const [debtPerson, setDebtPerson] = useState('')
  const [debtDirection, setDebtDirection] = useState('you_owe')
  const [debtFor, setDebtFor] = useState('')
  const [debtSince, setDebtSince] = useState(new Date().toISOString().split('T')[0])
  const [debtRemind, setDebtRemind] = useState(false)
  const [paymentReminder, setPaymentReminder] = useState(true)
  const [recurring, setRecurring] = useState(false)
  const [recurringFreq, setRecurringFreq] = useState('monthly')

  // mode: 'debt' | 'account'
  const [mode, setMode] = useState('debt')
  const [acctName, setAcctName] = useState('')
  const [acctBank, setAcctBank] = useState('')
  const [acctBalance, setAcctBalance] = useState('')
  const [acctType, setAcctType] = useState('checking')

  const payoffGoal = useMemo(() => {
    const remaining = parseFloat(debtRemaining)
    const apr = parseFloat(debtApr)
    const monthly = parseFloat(debtMonthly)
    if (!remaining || !apr || !monthly) return null
    const extra = 120
    const monthlyRate = apr / 100 / 12
    function monthsToPayoff(p) {
      if (p <= remaining * monthlyRate) return Infinity
      return Math.ceil(-Math.log(1 - (remaining * monthlyRate) / p) / Math.log(1 + monthlyRate))
    }
    const n = monthsToPayoff(monthly)
    const e = monthsToPayoff(monthly + extra)
    if (!isFinite(n)) return null
    const savedInterest = Math.max(0, Math.round((monthly * n - remaining) - ((monthly + extra) * e - remaining)))
    const savedMonths = n - e
    return { extra, savedInterest, savedMonths }
  }, [debtRemaining, debtApr, debtMonthly])

  async function handleSaveAccount() {
    if (!acctName || !acctBalance) return
    setSaving(true)
    try {
      await addDocument('accounts', user.uid, {
        name: acctName,
        bank: acctBank || null,
        balance: parseFloat(acctBalance),
        type: acctType,
      })
      onNavigate('overview')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (mode === 'account') return handleSaveAccount()
    const nameVal = debtType === 'personal' ? debtPerson : debtName
    if (!nameVal || !debtRemaining) return
    setSaving(true)
    try {
      await addDocument('debts', user.uid, {
        type: debtType,
        name: nameVal,
        bank: debtBank || null,
        remaining: parseFloat(debtRemaining),
        originalAmount: debtOriginal ? parseFloat(debtOriginal) : parseFloat(debtRemaining),
        monthly: debtType === 'credit_card'
          ? (debtMinPayment ? parseFloat(debtMinPayment) : null)
          : (debtMonthly ? parseFloat(debtMonthly) : null),
        apr: debtApr ? parseFloat(debtApr) : null,
        endDate: debtEndDate || null,
        dueDay: debtDueDay ? parseInt(debtDueDay) : null,
        last4: debtLast4 || null,
        creditLimit: debtCreditLimit ? parseFloat(debtCreditLimit) : null,
        person: debtPerson || null,
        direction: debtType === 'personal' ? debtDirection : null,
        for: debtFor || null,
        since: debtType === 'personal' ? debtSince : null,
        remind: debtType === 'personal' ? debtRemind : null,
        paymentReminder,
        recurring: debtType === 'loan' ? recurring : false,
        recurringFreq: debtType === 'loan' && recurring ? recurringFreq : null,
      })
      onNavigate('overview')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => onNavigate('overview')} className="text-stone-500 font-medium text-[15px]">
            Cancel
          </button>
          <h1 className="text-[17px] font-bold text-stone-800">{mode === 'account' ? 'New account' : 'New debt'}</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300"
          >
            Save
          </button>
        </div>

        {/* Mode: Debt vs Account */}
        <div className="bg-stone-200 rounded-2xl p-1 flex mb-3">
          <button onClick={() => setMode('debt')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'debt' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            Debt
          </button>
          <button onClick={() => setMode('account')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'account' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            Account
          </button>
        </div>

        {/* Debt Type Selector */}
        {mode === 'debt' && (
          <div className="bg-stone-200 rounded-2xl p-1 flex mb-5">
            {DEBT_TYPES.map(t => (
              <button key={t.id} onClick={() => setDebtType(t.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${debtType === t.id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {mode === 'account' && <div className="mb-5" />}

        <div className="flex flex-col gap-3">

          {/* Account Form */}
          {mode === 'account' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <DebtField label="Account name" value={acctName} onChange={setAcctName} placeholder="e.g. Chase Debit" />
              <DebtField label="Bank" value={acctBank} onChange={setAcctBank} placeholder="e.g. Chase" />
              <DebtField label="Balance" value={acctBalance} onChange={setAcctBalance} placeholder="5,000" type="number" prefix="$" last />
            </div>
          )}

          {/* Debt Fields */}
          {mode === 'debt' && (<div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {debtType === 'credit_card' ? (
              <>
                <DebtField label="Card name" value={debtName} onChange={setDebtName} placeholder="e.g. Sapphire Reserve" />
                <DebtField label="Issuer" value={debtBank} onChange={setDebtBank} placeholder="e.g. Chase" />
                <DebtField label="Last 4" value={debtLast4} onChange={setDebtLast4} placeholder="4821" type="number" />
                <DebtField label="Credit limit" value={debtCreditLimit} onChange={setDebtCreditLimit} placeholder="12,000" type="number" prefix="$" />
                <DebtField label="Current balance" value={debtRemaining} onChange={setDebtRemaining} placeholder="2,840" type="number" prefix="$" />
                <DebtField label="Min. payment" value={debtMinPayment} onChange={setDebtMinPayment} placeholder="85" type="number" prefix="$" />
                <DebtField label="APR" value={debtApr} onChange={setDebtApr} placeholder="21.9" type="number" suffix="%" last />
              </>
            ) : debtType === 'personal' ? (
              <>
                <DebtField label="Person" value={debtPerson} onChange={setDebtPerson} placeholder="e.g. Emre Y." />
                <DebtFieldSelect label="Direction" value={debtDirection} onChange={setDebtDirection}
                  options={[{ id: 'you_owe', label: 'You owe them' }, { id: 'they_owe', label: 'They owe you' }]} />
                <DebtField label="Amount" value={debtRemaining} onChange={setDebtRemaining} placeholder="320" type="number" prefix="$" />
                <DebtField label="For" value={debtFor} onChange={setDebtFor} placeholder="e.g. Concert tickets" />
                <DebtField label="Since" value={debtSince} onChange={setDebtSince} type="date" />
                <DebtFieldToggle label="Remind" value={debtRemind} onChange={setDebtRemind} last />
              </>
            ) : (
              <>
                <DebtField label="Name" value={debtName} onChange={setDebtName} placeholder="e.g. Home Mortgage" />
                <DebtField label="Bank" value={debtBank} onChange={setDebtBank} placeholder="e.g. First National" />
                <DebtField label="Remaining" value={debtRemaining} onChange={setDebtRemaining} placeholder="42,300" type="number" prefix="$" />
                <DebtField label="Original amount" value={debtOriginal} onChange={setDebtOriginal} placeholder="optional" type="number" prefix="$" />
                <DebtField label="Monthly" value={debtMonthly} onChange={setDebtMonthly} placeholder="1,280" type="number" prefix="$" />
                <DebtField label="APR" value={debtApr} onChange={setDebtApr} placeholder="5.2" type="number" suffix="%" />
                <DebtField label="End date" value={debtEndDate} onChange={setDebtEndDate} placeholder="Nov 2029" />
                <DebtField label="Due day" value={debtDueDay} onChange={setDebtDueDay} placeholder="15" type="number" />
                <DebtFieldToggle label="Recurring" value={recurring} onChange={setRecurring} last />
              </>
            )}
          </div>)}

          {/* Recurring frequency */}
          {mode === 'debt' && debtType === 'loan' && recurring && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Payment frequency</p>
              <div className="flex gap-2">
                {[
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'biweekly', label: 'Bi-weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ].map(f => (
                  <button key={f.id} onClick={() => setRecurringFreq(f.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${recurringFreq === f.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Reminder (not for personal, not for account) */}
          {mode === 'debt' && debtType !== 'personal' && (
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Bell size={18} className="text-stone-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800 text-[15px]">Payment reminder</p>
                <p className="text-xs text-stone-400">3 days before due date</p>
              </div>
              <button
                onClick={() => setPaymentReminder(!paymentReminder)}
                className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${paymentReminder ? 'bg-stone-700' : 'bg-stone-200'}`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${paymentReminder ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Payoff Goal */}
          {mode === 'debt' && payoffGoal && (
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Payoff Goal</p>
              <p className="font-bold text-stone-800 text-[17px]">Pay ${payoffGoal.extra} extra/month</p>
              <p className="text-sm text-stone-400 mt-0.5">
                Saves ${payoffGoal.savedInterest.toLocaleString()} in interest · ends {payoffGoal.savedMonths} months sooner
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DebtField({ label, value, onChange, placeholder = '', type = 'text', prefix, suffix, last }) {
  return (
    <>
      <div className="flex items-center px-4 py-3.5 gap-3">
        <p className="text-stone-400 text-[15px] w-32 flex-shrink-0">{label}</p>
        <div className="flex items-center gap-1 flex-1 justify-end">
          {prefix && <span className="text-stone-300 font-semibold">$</span>}
          <input
            type={type} inputMode={type === 'number' ? 'decimal' : 'text'}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="text-right font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-200 text-[15px] min-w-0 flex-1"
          />
          {suffix && <span className="text-stone-400 text-sm ml-1">{suffix}</span>}
        </div>
      </div>
      {!last && <div className="h-px bg-stone-100 mx-4" />}
    </>
  )
}

function DebtFieldSelect({ label, value, onChange, options, last }) {
  return (
    <>
      <div className="flex items-center px-4 py-3.5 gap-3">
        <p className="text-stone-400 text-[15px] w-32 flex-shrink-0">{label}</p>
        <div className="flex-1 flex justify-end">
          <select value={value} onChange={e => onChange(e.target.value)}
            className="font-semibold text-stone-800 bg-transparent outline-none text-[15px] text-right appearance-none">
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {!last && <div className="h-px bg-stone-100 mx-4" />}
    </>
  )
}

function DebtFieldToggle({ label, value, onChange, last }) {
  return (
    <>
      <div className="flex items-center px-4 py-3.5 gap-3">
        <p className="text-stone-400 text-[15px] w-32 flex-shrink-0">{label}</p>
        <div className="flex-1 flex justify-end items-center gap-3">
          <span className="text-[15px] font-semibold text-stone-800">{value ? 'On' : 'Off'}</span>
          <button onClick={() => onChange(!value)}
            className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-stone-700' : 'bg-stone-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      {!last && <div className="h-px bg-stone-100 mx-4" />}
    </>
  )
}
