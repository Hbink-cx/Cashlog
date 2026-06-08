import { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { useFlatCategoryList } from '@/hooks/useFinance'
import { formatCurrency, formatDate, todayStr, currentYear, currentMonth, getMonthRange, cn } from '@/lib/utils'
import type { Transaction } from '@/types'
import { Plus, Pencil, Trash2, Search, Filter, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { ScreenshotImport } from '@/components/transaction/ScreenshotImport'

export function TransactionList() {
  const { state, deleteTransaction } = useApp()
  const { transactions, categories } = state.data
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showScreenshot, setShowScreenshot] = useState(false)

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const range = getMonthRange(year, month)

  const filtered = useMemo(() => {
    const catMap = new Map(categories.map(c => [c.id, c]))
    return transactions
      .filter(t => t.date >= range.start && t.date <= range.end)
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => selectedCategory === 'all' || t.categoryId === selectedCategory)
      .filter(t => {
        if (!search) return true
        const q = search.toLowerCase()
        const cat = catMap.get(t.categoryId)
        return (
          (t.description || '').toLowerCase().includes(q) ||
          (cat?.name || '').toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [transactions, range, typeFilter, selectedCategory, search])

  const monthIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const rootCategories = categories.filter(c => c.parentId === null)

  const handleEdit = (tx: Transaction) => {
    setEditing(tx)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-lg min-w-[120px] text-center">
            {year}年{month}月
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setYear(currentYear()); setMonth(currentMonth()) }}
            className="text-xs text-primary hover:underline ml-2"
          >
            今天
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScreenshot(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> 截图导入
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 记一笔
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索交易..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">全部类型</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-[200px]"
        >
          <option value="all">全部分类</option>
          {rootCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm bg-card border rounded-lg px-4 py-3">
        <div>
          <span className="text-muted-foreground">收入 </span>
          <span className="font-mono font-semibold text-emerald-600">{formatCurrency(monthIncome)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">支出 </span>
          <span className="font-mono font-semibold text-red-500">{formatCurrency(monthExpense)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">结余 </span>
          <span className={cn("font-mono font-semibold", monthIncome - monthExpense >= 0 ? 'text-blue-600' : 'text-red-500')}>
            {formatCurrency(monthIncome - monthExpense)}
          </span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} 笔</div>
      </div>

      {/* Transaction list */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无匹配的交易记录</p>
          </div>
        ) : (
          <div>
            {filtered.map((tx, idx) => {
              const cat = catMap.get(tx.categoryId)
              return (
                <div
                  key={tx.id}
                  className={cn(
                    "flex items-center justify-between px-5 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors",
                    idx % 2 === 0 && 'bg-card/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat?.color || '#999' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || cat?.name || '未分类'}
                      </p>
                      {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {cat?.name} · {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={cn(
                      "font-mono font-semibold text-sm",
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这条交易吗？')) deleteTransaction(tx.id)
                        }}
                        className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionFormModal
          transaction={editing}
          onClose={handleCloseForm}
        />
      )}
      {showScreenshot && (
        <ScreenshotImport onClose={() => setShowScreenshot(false)} />
      )}
    </div>
  )
}

function TransactionFormModal({
  transaction,
  onClose,
}: {
  transaction: Transaction | null
  onClose: () => void
}) {
  const { addTransaction, updateTransaction, state } = useApp()
  const categories = useFlatCategoryList()
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense')
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [date, setDate] = useState(transaction?.date || todayStr())
  const [description, setDescription] = useState(transaction?.description || '')
  const [note, setNote] = useState(transaction?.note || '')

  const filteredCats = categories.filter(c => {
    const cat = state.data.categories.find(x => x.id === c.id)
    return cat?.type === type
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    if (!categoryId) return

    if (transaction) {
      updateTransaction({
        ...transaction,
        amount: amt,
        type,
        categoryId,
        date,
        description: description || undefined,
        note: note || undefined,
      })
    } else {
      addTransaction({
        amount: amt,
        type,
        categoryId,
        date,
        description: description || undefined,
        note: note || undefined,
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg">
            {transaction ? '编辑交易' : '新增交易'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId('') }}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                type === 'expense' ? 'bg-background shadow-sm text-red-500' : 'text-muted-foreground'
              )}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId('') }}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                type === 'income' ? 'bg-background shadow-sm text-emerald-600' : 'text-muted-foreground'
              )}
            >
              收入
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium">金额</label>
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

          {/* Category */}
          <div>
            <label className="text-sm font-medium">分类</label>
            <select
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">选择分类</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>
                  {'　'.repeat(c.indent)}{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium">日期</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">描述</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例如：午餐外卖"
              className="w-full mt-1 px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium">备注（可选）</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="备忘录..."
              className="w-full mt-1 px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {transaction ? '保存修改' : '添加交易'}
          </button>
        </form>
      </div>
    </div>
  )
}
