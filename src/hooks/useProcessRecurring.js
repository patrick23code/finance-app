import { useEffect, useRef } from 'react'
import { useCollection, addDocument, updateDocument } from './useFirestore'
import { useAuth } from '../context/AuthContext'

export function useProcessRecurring() {
  const { user } = useAuth()
  const { data: recurring } = useCollection('recurring', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const processing = useRef(new Set())

  useEffect(() => {
    if (!user || !recurring.length) return

    const today = new Date()
    const todayDay = today.getDate()
    const currentYear = today.getFullYear()
    const currentMonthNum = today.getMonth() + 1
    const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`

    const unprocessed = recurring.filter(item =>
      item.lastProcessedMonth !== currentMonth &&
      todayDay >= item.dueDay &&
      !processing.current.has(item.id)
    )

    if (!unprocessed.length) return

    unprocessed.forEach(item => processing.current.add(item.id))

    async function processItem(item) {
      const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(item.dueDay).padStart(2, '0')}`
      try {
        await addDocument('transactions', user.uid, {
          type: 'expense',
          amount: item.amount,
          name: item.name,
          category: item.category || 'other',
          cardName: item.cardName || null,
          sourceId: item.sourceId || null,
          sourceType: item.sourceType || null,
          date: dateStr,
          isRecurring: true,
          recurringId: item.id,
        })

        if (item.sourceId && item.sourceType) {
          if (item.sourceType === 'card') {
            const card = debts.find(d => d.id === item.sourceId)
            if (card) {
              await updateDocument('debts', item.sourceId, {
                remaining: (card.remaining || 0) + item.amount
              })
            }
          } else if (item.sourceType === 'account') {
            const account = accounts.find(a => a.id === item.sourceId)
            if (account) {
              await updateDocument('accounts', item.sourceId, {
                balance: Math.max(0, (account.balance || 0) - item.amount)
              })
            }
          }
        }

        await updateDocument('recurring', item.id, { lastProcessedMonth: currentMonth })
      } catch (e) {
        console.warn('Failed to process recurring:', item.id, e)
        processing.current.delete(item.id)
      }
    }

    unprocessed.forEach(processItem)
  }, [recurring, user, debts, accounts])
}
