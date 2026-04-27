import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'

const HIDDEN_KEY = 'monkeyboss_hidden_categories'
const CUSTOM_EXPENSE_KEY = 'monkeyboss_custom_expense'
const CUSTOM_INCOME_KEY = 'monkeyboss_custom_income'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function useCategories() {
  const [hidden, setHidden] = useState(() => load(HIDDEN_KEY, []))
  const [customExpense, setCustomExpense] = useState(() => load(CUSTOM_EXPENSE_KEY, []))
  const [customIncome, setCustomIncome] = useState(() => load(CUSTOM_INCOME_KEY, []))

  useEffect(() => save(HIDDEN_KEY, hidden), [hidden])
  useEffect(() => save(CUSTOM_EXPENSE_KEY, customExpense), [customExpense])
  useEffect(() => save(CUSTOM_INCOME_KEY, customIncome), [customIncome])

  const expenseCategories = [
    ...EXPENSE_CATEGORIES.filter(c => !hidden.includes(c.id)),
    ...customExpense,
  ]
  const incomeCategories = [
    ...INCOME_CATEGORIES.filter(c => !hidden.includes(c.id)),
    ...customIncome,
  ]

  function hideCategory(id) {
    setHidden(prev => prev.includes(id) ? prev : [...prev, id])
  }

  function unhideCategory(id) {
    setHidden(prev => prev.filter(x => x !== id))
  }

  function deleteCustom(id, type) {
    if (type === 'expense') setCustomExpense(prev => prev.filter(c => c.id !== id))
    else setCustomIncome(prev => prev.filter(c => c.id !== id))
  }

  function addCustom(category, type) {
    if (type === 'expense') setCustomExpense(prev => [...prev.filter(c => c.id !== category.id), category])
    else setCustomIncome(prev => [...prev.filter(c => c.id !== category.id), category])
  }

  function isBuiltIn(id) {
    return EXPENSE_CATEGORIES.some(c => c.id === id) || INCOME_CATEGORIES.some(c => c.id === id)
  }

  return {
    expenseCategories,
    incomeCategories,
    hidden,
    customExpense,
    customIncome,
    hideCategory,
    unhideCategory,
    deleteCustom,
    addCustom,
    isBuiltIn,
  }
}
