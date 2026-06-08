import { useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { useCategorySummary, useMonthlyStats } from '@/hooks/useFinance'
import { formatCurrency, getMonthRange, currentYear, currentMonth } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { YearTrendChart } from './YearTrendChart'

function StatCard({
  title, value, icon, colorClass, subtitle
}: {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
  subtitle?: string
}) {
  return (
    <div className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", colorClass)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-lg", colorClass.replace('text-', 'bg-') + '/10')}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function BudgetAlert({ summaries }: { summaries: ReturnType<typeof useCategorySummary> }) {
  const warnings: { name: string; usage: number }[] = []

  function check(s: typeof summaries) {
    s.forEach(item => {
      if (item.budgetUsage !== undefined && item.budgetUsage >= 80) {
        warnings.push({ name: item.categoryName, usage: item.budgetUsage })
      }
      check(item.children)
    })
  }
  check(summaries)

  if (warnings.length === 0) return null

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
        <AlertCircle className="w-4 h-4" />
        预算预警
      </div>
      <div className="space-y-1">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-destructive/80">{w.name}</span>
            <span className={cn("font-mono font-bold", w.usage >= 100 ? 'text-destructive' : 'text-destructive/70')}>
              {w.usage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentTransactions() {
  const { state } = useApp()
  const transactions = [...state.data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  const catMap = new Map(state.data.categories.map(c => [c.id, c]))

  return (
    <div className="bg-card border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-3">最近交易</h3>
      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无交易记录</p>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const cat = catMap.get(tx.categoryId)
            return (
              <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat?.color || '#999' }}
                  />
                  <span className="truncate text-muted-foreground">{tx.description || cat?.name || '未知'}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn(
                    "font-mono font-semibold",
                    tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{tx.date.slice(5)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { state } = useApp()
  const summaries = useCategorySummary()
  const monthlyStats = useMonthlyStats()
  const y = currentYear()
  const m = currentMonth()
  const range = getMonthRange(y, m)

  const thisMonth = state.data.transactions.filter(t => t.date >= range.start && t.date <= range.end)
  const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthBalance = monthIncome - monthExpense

  const allIncome = state.data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const allExpense = state.data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="本月收入"
          value={formatCurrency(monthIncome)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          colorClass="text-emerald-600"
          subtitle={`累计: ${formatCurrency(allIncome)}`}
        />
        <StatCard
          title="本月支出"
          value={formatCurrency(monthExpense)}
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          colorClass="text-red-500"
          subtitle={`累计: ${formatCurrency(allExpense)}`}
        />
        <StatCard
          title="本月结余"
          value={formatCurrency(monthBalance)}
          icon={<Wallet className="w-5 h-5 text-blue-600" />}
          colorClass={monthBalance >= 0 ? 'text-blue-600' : 'text-red-500'}
          subtitle={monthIncome > 0 ? `收支比 ${((monthExpense / monthIncome) * 100).toFixed(0)}%` : '-'}
        />
        <StatCard
          title="净储蓄率"
          value={monthIncome > 0 ? `${((1 - monthExpense / monthIncome) * 100).toFixed(0)}%` : 'N/A'}
          icon={<ArrowRightLeft className="w-5 h-5 text-violet-600" />}
          colorClass="text-violet-600"
          subtitle="（收入 − 支出）/ 收入"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1">年度收支趋势</h3>
          <p className="text-xs text-muted-foreground mb-3">
            <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm mr-1 align-middle" /> 收入（上）
            <span className="inline-block w-3 h-3 bg-red-500 rounded-sm ml-3 mr-1 align-middle" /> 支出（下）
            <span className="inline-block w-0 h-0 ml-3 mr-1 align-middle" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid #3b82f6' }} /> 结余
          </p>
          <YearTrendChart data={monthlyStats} />
        </div>

        <BudgetAlert summaries={summaries} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown type="expense" title="本月支出分类" />
        <CategoryBreakdown type="income" title="本月收入分类" />
      </div>

      <RecentTransactions />
    </div>
  )
}

function CategoryBreakdown({ type, title }: { type: 'income' | 'expense'; title: string }) {
  const summaries = useCategorySummary()
  const { state } = useApp()

  const targetSummaries = useMemo(() => {
    const roots = summaries.filter(s => {
      const cat = state.data.categories.find(c => c.id === s.categoryId)
      return cat?.type === type && cat.parentId === null
    })
    return roots.map(r => ({
      ...r,
      total: r.children.reduce((s, c) => s + c.total, 0) + r.total
    }))
  }, [summaries, type, state.data.categories])

  const grandTotal = targetSummaries.reduce((s, r) => s + r.total, 0)

  if (grandTotal === 0) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground">本月暂无{type === 'income' ? '收入' : '支出'}</p>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-3">
        {targetSummaries.filter(r => r.total > 0).map(r => {
          const pct = (r.total / grandTotal) * 100
          const cat = state.data.categories.find(c => c.id === r.categoryId)
          return (
            <div key={r.categoryId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat?.color || '#999' }} />
                  <span>{r.categoryName}</span>
                </div>
                <span className="font-mono font-semibold">{formatCurrency(r.total)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: cat?.color || (type === 'income' ? '#22c55e' : '#ef4444'),
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
