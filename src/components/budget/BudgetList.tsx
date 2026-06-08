import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { useFlatCategoryList, getDescendantIds } from '@/hooks/useFinance'
import { formatCurrency, getMonthRange, currentYear, currentMonth, cn } from '@/lib/utils'
import type { Budget } from '@/types'
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle } from 'lucide-react'

export function BudgetManager() {
  const { state, addBudget, updateBudget, deleteBudget } = useApp()
  const { budgets, categories, transactions } = state.data
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const flatCats = useFlatCategoryList()
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())

  const range = getMonthRange(year, month)

  // Calculate actual spending for each budget
  const budgetStatuses = budgets.map(b => {
    const descendantIds = getDescendantIds(categories, b.categoryId)
    let actual = 0
    if (b.period === 'monthly') {
      actual = transactions
        .filter(t => descendantIds.has(t.categoryId) && t.date >= range.start && t.date <= range.end)
        .reduce((s, t) => s + t.amount, 0)
    } else {
      // Yearly — filter by year
      actual = transactions
        .filter(t => descendantIds.has(t.categoryId) && t.date >= `${year}-01-01` && t.date <= `${year}-12-31`)
        .reduce((s, t) => s + t.amount, 0)
    }
    const cat = categories.find(c => c.id === b.categoryId)
    return {
      ...b,
      categoryName: cat?.name || '未知分类',
      categoryColor: cat?.color || '#999',
      actual,
      usage: (actual / b.amount) * 100,
    }
  })

  const handleEdit = (b: Budget) => {
    setEditing(b)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">{year}年{month}月 预算</span>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建预算
        </button>
      </div>

      {budgetStatuses.length === 0 ? (
        <div className="bg-card border rounded-xl p-10 text-center">
          <PiggyBank className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-3">还没有设置预算</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 创建第一个预算
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetStatuses.map(bs => (
            <div key={bs.id} className="bg-card border rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: bs.categoryColor }}
                  />
                  <div>
                    <p className="font-semibold text-sm">{bs.categoryName}</p>
                    <p className="text-xs text-muted-foreground">
                      {bs.period === 'monthly' ? '月度预算' : '年度预算'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(bs)}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (confirm('删除此预算？')) deleteBudget(bs.id) }}
                    className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    已用 {formatCurrency(bs.actual)} / {formatCurrency(bs.amount)}
                  </span>
                  <span className={cn(
                    "font-mono font-semibold",
                    bs.usage >= 100 ? 'text-destructive' : bs.usage >= 80 ? 'text-amber-500' : 'text-muted-foreground'
                  )}>
                    {bs.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      bs.usage >= 100 ? 'bg-destructive' : bs.usage >= 80 ? 'bg-amber-500' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(bs.usage, 100)}%` }}
                  />
                </div>
                {bs.usage >= 80 && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs",
                    bs.usage >= 100 ? 'text-destructive' : 'text-amber-600'
                  )}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {bs.usage >= 100 ? '已超出预算！' : '接近预算上限'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BudgetFormModal
          budget={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function BudgetFormModal({
  budget,
  onClose,
}: {
  budget: Budget | null
  onClose: () => void
}) {
  const { addBudget, updateBudget } = useApp()
  const flatCats = useFlatCategoryList()
  const [categoryId, setCategoryId] = useState(budget?.categoryId || '')
  const [amount, setAmount] = useState(budget?.amount?.toString() || '')
  const [period, setPeriod] = useState<'monthly' | 'yearly'>(budget?.period || 'monthly')
  const [year, setYear] = useState(budget?.year ?? currentYear())
  const [month, setMonth] = useState(budget?.month ?? currentMonth())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !categoryId) return

    const data = {
      categoryId,
      amount: amt,
      period,
      year,
      month: period === 'monthly' ? month : undefined,
    }

    if (budget) {
      updateBudget({ ...budget, ...data })
    } else {
      addBudget(data)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold text-lg mb-5">
          {budget ? '编辑预算' : '新建预算'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">分类</label>
            <select
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">选择分类</option>
              {flatCats.map(c => (
                <option key={c.id} value={c.id}>
                  {'　'.repeat(c.indent)}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">预算金额</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 bg-background border rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">周期</label>
            <div className="flex bg-muted rounded-lg p-1 mt-1">
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  period === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                月度
              </button>
              <button
                type="button"
                onClick={() => setPeriod('yearly')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  period === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                年度
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">年份</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || currentYear())}
                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {period === 'monthly' && (
              <div>
                <label className="text-sm font-medium">月份</label>
                <select
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {budget ? '保存修改' : '创建预算'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
