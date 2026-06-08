import type { AppData } from '@/types'

const STORAGE_KEY = 'finance-app-data'

const defaultData: AppData = {
  categories: [],
  transactions: [],
  budgets: [],
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData
    const data = JSON.parse(raw) as AppData
    return {
      categories: data.categories || [],
      transactions: data.transactions || [],
      budgets: data.budgets || [],
    }
  } catch {
    return defaultData
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { reject(new Error('No file')); return }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as AppData
          resolve(data)
        } catch {
          reject(new Error('Invalid JSON'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}

export function seedDemoData(): AppData {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const cExpenseRoot: AppData['categories'][number] = { id: 'cat-e-root', name: '支出', type: 'expense', parentId: null, color: '#ef4444' }
  const cFood: AppData['categories'][number] = { id: 'cat-e-food', name: '餐饮', type: 'expense', parentId: 'cat-e-root', color: '#f97316' }
  const cFoodOut: AppData['categories'][number] = { id: 'cat-e-food-out', name: '外食', type: 'expense', parentId: 'cat-e-food', color: '#fb923c' }
  const cFoodHome: AppData['categories'][number] = { id: 'cat-e-food-home', name: '居家做饭', type: 'expense', parentId: 'cat-e-food', color: '#fdba74' }
  const cTransport: AppData['categories'][number] = { id: 'cat-e-transport', name: '交通', type: 'expense', parentId: 'cat-e-root', color: '#8b5cf6' }
  const cTransportMetro: AppData['categories'][number] = { id: 'cat-e-transport-metro', name: '地铁', type: 'expense', parentId: 'cat-e-transport', color: '#a78bfa' }
  const cTransportTaxi: AppData['categories'][number] = { id: 'cat-e-transport-taxi', name: '打车', type: 'expense', parentId: 'cat-e-transport', color: '#c4b5fd' }
  const cShopping: AppData['categories'][number] = { id: 'cat-e-shopping', name: '购物', type: 'expense', parentId: 'cat-e-root', color: '#ec4899' }
  const cEntertainment: AppData['categories'][number] = { id: 'cat-e-entertainment', name: '娱乐', type: 'expense', parentId: 'cat-e-root', color: '#06b6d4' }
  const cHousing: AppData['categories'][number] = { id: 'cat-e-housing', name: '住房', type: 'expense', parentId: 'cat-e-root', color: '#64748b' }

  const cIncomeRoot: AppData['categories'][number] = { id: 'cat-i-root', name: '收入', type: 'income', parentId: null, color: '#22c55e' }
  const cSalary: AppData['categories'][number] = { id: 'cat-i-salary', name: '工资', type: 'income', parentId: 'cat-i-root', color: '#16a34a' }
  const cSide: AppData['categories'][number] = { id: 'cat-i-side', name: '副业', type: 'income', parentId: 'cat-i-root', color: '#4ade80' }
  const cInvest: AppData['categories'][number] = { id: 'cat-i-invest', name: '投资', type: 'income', parentId: 'cat-i-root', color: '#86efac' }
  const cOtherIncome: AppData['categories'][number] = { id: 'cat-i-other', name: '其他收入', type: 'income', parentId: 'cat-i-root', color: '#bbf7d0' }

  const categories = [
    cExpenseRoot, cFood, cFoodOut, cFoodHome,
    cTransport, cTransportMetro, cTransportTaxi,
    cShopping, cEntertainment, cHousing,
    cIncomeRoot, cSalary, cSide, cInvest, cOtherIncome,
  ]

  const transactions: AppData['transactions'] = []
  const pad = (n: number) => String(n).padStart(2, '0')

  // 工资
  for (let mon = 1; mon <= m; mon++) {
    transactions.push({
      id: `tx-salary-${mon}`,
      amount: 15000 + Math.floor(Math.random() * 2000),
      type: 'income',
      categoryId: 'cat-i-salary',
      date: `${y}-${pad(mon)}-10`,
      description: `${mon}月工资`,
    })
  }

  // 副业
  for (let mon = 1; mon <= m; mon++) {
    if (Math.random() > 0.3) {
      transactions.push({
        id: `tx-side-${mon}`,
        amount: 1000 + Math.floor(Math.random() * 3000),
        type: 'income',
        categoryId: 'cat-i-side',
        date: `${y}-${pad(mon)}-${pad(15 + Math.floor(Math.random() * 10))}`,
        description: ' freelance',
      })
    }
  }

  // 支出 — generate 8-15 per month
  for (let mon = 1; mon <= m; mon++) {
    const count = 8 + Math.floor(Math.random() * 8)
    for (let i = 0; i < count; i++) {
      const day = pad(1 + Math.floor(Math.random() * 28))
      const expenseCats = [
        { id: 'cat-e-food-out', min: 15, max: 80, desc: '外卖' },
        { id: 'cat-e-food-out', min: 30, max: 200, desc: '聚餐' },
        { id: 'cat-e-food-home', min: 20, max: 150, desc: '买菜' },
        { id: 'cat-e-transport-metro', min: 3, max: 10, desc: '地铁通勤' },
        { id: 'cat-e-transport-taxi', min: 15, max: 60, desc: '打车' },
        { id: 'cat-e-shopping', min: 50, max: 500, desc: '购物' },
        { id: 'cat-e-entertainment', min: 30, max: 300, desc: '娱乐' },
        { id: 'cat-e-housing', min: 2000, max: 2000, desc: '房租' },
      ]
      const cat = expenseCats[Math.floor(Math.random() * expenseCats.length)]
      // 房租每月只一次
      if (cat.id === 'cat-e-housing') {
        const exists = transactions.find(t => t.categoryId === 'cat-e-housing' && t.date.startsWith(`${y}-${pad(mon)}`))
        if (exists) continue
      }
      transactions.push({
        id: `tx-exp-${mon}-${i}`,
        amount: cat.min + Math.floor(Math.random() * (cat.max - cat.min)),
        type: 'expense',
        categoryId: cat.id,
        date: `${y}-${pad(mon)}-${day}`,
        description: cat.desc,
      })
    }
  }

  // budgets
  const budgets: AppData['budgets'] = [
    { id: 'bud-1', categoryId: 'cat-e-food', amount: 3000, period: 'monthly', year: y, month: m },
    { id: 'bud-2', categoryId: 'cat-e-transport', amount: 800, period: 'monthly', year: y, month: m },
    { id: 'bud-3', categoryId: 'cat-e-entertainment', amount: 1500, period: 'monthly', year: y, month: m },
    { id: 'bud-4', categoryId: 'cat-e-shopping', amount: 2000, period: 'monthly', year: y, month: m },
  ]

  return { categories, transactions, budgets }
}
