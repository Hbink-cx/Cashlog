import { AppProvider, useApp } from '@/context/AppContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { TransactionList } from '@/components/transaction/TransactionList'
import { CategoryManager } from '@/components/category/CategoryTree'
import { BudgetManager } from '@/components/budget/BudgetList'
import { Analysis } from '@/components/analysis/Analysis'

function AppContent() {
  const { state } = useApp()

  const renderPage = () => {
    switch (state.activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'transactions':
        return <TransactionList />
      case 'categories':
        return <CategoryManager />
      case 'budgets':
        return <BudgetManager />
      case 'analysis':
        return <Analysis />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {renderPage()}
        </main>
        <footer className="border-t py-2 lg:py-3 px-4 lg:px-6 text-center text-xs text-muted-foreground">
          个人理财助手 · 数据存储在本地浏览器 · 无限级分类管理
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
