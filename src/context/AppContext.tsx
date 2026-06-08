import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type { AppData, Category, Transaction, Budget, ViewTab } from '@/types'
import { loadData, saveData, seedDemoData } from '@/lib/storage'
import { generateId } from '@/lib/utils'

interface AppState {
  data: AppData
  activeTab: ViewTab
  darkMode: boolean
  initialized: boolean
}

type Action =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'SET_TAB'; payload: ViewTab }
  | { type: 'TOGGLE_DARK' }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'INIT_DEMO' }
  | { type: 'IMPORT_DATA'; payload: AppData }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload, initialized: true }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload }
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode }
    case 'ADD_CATEGORY':
      return { ...state, data: { ...state.data, categories: [...state.data.categories, action.payload] } }
    case 'UPDATE_CATEGORY':
      return { ...state, data: { ...state.data, categories: state.data.categories.map(c => c.id === action.payload.id ? action.payload : c) } }
    case 'DELETE_CATEGORY': {
      const id = action.payload
      const childrenIds = new Set<string>()
      const collect = (parentId: string) => {
        state.data.categories.filter(c => c.parentId === parentId).forEach(c => { childrenIds.add(c.id); collect(c.id) })
      }
      collect(id)
      childrenIds.add(id)
      return {
        ...state,
        data: {
          categories: state.data.categories.filter(c => !childrenIds.has(c.id)),
          transactions: state.data.transactions.filter(t => !childrenIds.has(t.categoryId)),
          budgets: state.data.budgets.filter(b => !childrenIds.has(b.categoryId)),
        },
      }
    }
    case 'ADD_TRANSACTION':
      return { ...state, data: { ...state.data, transactions: [...state.data.transactions, action.payload] } }
    case 'UPDATE_TRANSACTION':
      return { ...state, data: { ...state.data, transactions: state.data.transactions.map(t => t.id === action.payload.id ? action.payload : t) } }
    case 'DELETE_TRANSACTION':
      return { ...state, data: { ...state.data, transactions: state.data.transactions.filter(t => t.id !== action.payload) } }
    case 'ADD_BUDGET':
      return { ...state, data: { ...state.data, budgets: [...state.data.budgets, action.payload] } }
    case 'UPDATE_BUDGET':
      return { ...state, data: { ...state.data, budgets: state.data.budgets.map(b => b.id === action.payload.id ? action.payload : b) } }
    case 'DELETE_BUDGET':
      return { ...state, data: { ...state.data, budgets: state.data.budgets.filter(b => b.id !== action.payload) } }
    case 'INIT_DEMO': {
      const demo = seedDemoData()
      return { ...state, data: demo, initialized: true }
    }
    case 'IMPORT_DATA':
      return { ...state, data: action.payload, initialized: true }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (c: Category) => void
  deleteCategory: (id: string) => void
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: string) => void
  addBudget: (b: Omit<Budget, 'id'>) => void
  updateBudget: (b: Budget) => void
  deleteBudget: (id: string) => void
  setTab: (tab: ViewTab) => void
  toggleDark: () => void
  initDemo: () => void
  importData: (data: AppData) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    data: { categories: [], transactions: [], budgets: [] },
    activeTab: 'dashboard',
    darkMode: false,
    initialized: false,
  })

  // Load from localStorage on mount
  useEffect(() => {
    const data = loadData()
    if (data.categories.length > 0 || data.transactions.length > 0) {
      dispatch({ type: 'SET_DATA', payload: data })
    } else {
      // Auto-seed demo data for first-time users
      const demo = seedDemoData()
      dispatch({ type: 'SET_DATA', payload: demo })
    }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (state.initialized) {
      saveData(state.data)
    }
  }, [state.data, state.initialized])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode)
  }, [state.darkMode])

  const addCategory = useCallback((c: Omit<Category, 'id'>) => {
    dispatch({ type: 'ADD_CATEGORY', payload: { ...c, id: generateId() } })
  }, [])

  const updateCategory = useCallback((c: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: c })
  }, [])

  const deleteCategory = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id })
  }, [])

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...t, id: generateId() } })
  }, [])

  const updateTransaction = useCallback((t: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: t })
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
  }, [])

  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    dispatch({ type: 'ADD_BUDGET', payload: { ...b, id: generateId() } })
  }, [])

  const updateBudget = useCallback((b: Budget) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: b })
  }, [])

  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: id })
  }, [])

  const setTab = useCallback((tab: ViewTab) => {
    dispatch({ type: 'SET_TAB', payload: tab })
  }, [])

  const toggleDark = useCallback(() => {
    dispatch({ type: 'TOGGLE_DARK' })
  }, [])

  const initDemo = useCallback(() => {
    dispatch({ type: 'INIT_DEMO' })
  }, [])

  const importData = useCallback((data: AppData) => {
    dispatch({ type: 'IMPORT_DATA', payload: data })
  }, [])

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addCategory, updateCategory, deleteCategory,
      addTransaction, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      setTab, toggleDark, initDemo, importData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be within AppProvider')
  return ctx
}
