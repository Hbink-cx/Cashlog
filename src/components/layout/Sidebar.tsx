import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import type { ViewTab } from '@/types'
import {
  LayoutDashboard, Receipt, Tags, PiggyBank, BarChart3,
  Moon, Sun, Download, Upload, Menu, X
} from 'lucide-react'
import { exportData, importData } from '@/lib/storage'

const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '概览', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'transactions', label: '流水', icon: <Receipt className="w-5 h-5" /> },
  { id: 'categories', label: '分类', icon: <Tags className="w-5 h-5" /> },
  { id: 'budgets', label: '预算', icon: <PiggyBank className="w-5 h-5" /> },
  { id: 'analysis', label: '分析', icon: <BarChart3 className="w-5 h-5" /> },
]

export function Sidebar() {
  const { state, setTab, toggleDark, importData: importAppData } = useApp()
  const { activeTab, darkMode } = state
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleImport = async () => {
    try {
      const data = await importData()
      importAppData(data)
    } catch { /* user cancelled */ }
  }

  const navigateTo = (tab: ViewTab) => {
    setTab(tab)
    setMobileOpen(false)
  }

  const navContent = (
    <>
      <div className="p-5 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <span className="text-primary text-xl">💰</span> 理财助手
          </h1>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-accent rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">无限级分类管理</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigateTo(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t space-y-1">
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {darkMode ? '浅色模式' : '深色模式'}
        </button>
        <button
          onClick={() => exportData(state.data)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <Download className="w-4 h-4" />
          导出数据
        </button>
        <button
          onClick={handleImport}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <Upload className="w-4 h-4" />
          导入数据
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-card border rounded-lg shadow-md hover:bg-accent transition-colors"
        aria-label="打开菜单"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 border-r bg-card flex-col h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  )
}
