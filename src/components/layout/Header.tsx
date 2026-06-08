import { useApp } from '@/context/AppContext'
import { currentYear, currentMonth } from '@/lib/utils'

export function Header() {
  const { state } = useApp()
  const tabLabels: Record<string, string> = {
    dashboard: '概览',
    transactions: '流水',
    categories: '分类',
    budgets: '预算',
    analysis: '分析',
  }

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 ml-10 lg:ml-0">
        <h2 className="font-semibold text-base lg:text-lg">{tabLabels[state.activeTab] || ''}</h2>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="px-2.5 py-1 rounded-full bg-accent text-xs font-medium">
          {currentYear()}年{currentMonth()}月
        </span>
        <span className="text-xs hidden sm:inline">
          {state.data.transactions.length} 笔
        </span>
      </div>
    </header>
  )
}
