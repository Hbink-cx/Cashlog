import { useApp } from '@/context/AppContext'
import { currentYear, currentMonth } from '@/lib/utils'

export function Header() {
  const { state } = useApp()
  const tabLabels: Record<string, string> = {
    dashboard: '概览仪表盘',
    transactions: '交易流水',
    categories: '分类管理',
    budgets: '预算管理',
    analysis: '可视化分析',
  }

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h2 className="font-semibold text-lg">{tabLabels[state.activeTab] || ''}</h2>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="px-3 py-1 rounded-full bg-accent text-xs font-medium">
          {currentYear()}年{currentMonth()}月
        </span>
        <span className="text-xs">
          {state.data.transactions.length} 笔记录
        </span>
      </div>
    </header>
  )
}
