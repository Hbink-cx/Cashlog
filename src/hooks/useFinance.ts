import { useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import type { Category, CategoryTreeNode, CategorySummary } from '@/types'
import { getMonthRange, currentYear, currentMonth } from '@/lib/utils'

export function useCategoryTree(type?: 'income' | 'expense'): CategoryTreeNode[] {
  const { state } = useApp()
  const { categories } = state.data

  return useMemo(() => {
    const filtered = type ? categories.filter(c => c.type === type) : categories
    const map = new Map<string, CategoryTreeNode>()
    const roots: CategoryTreeNode[] = []

    filtered.forEach(c => {
      map.set(c.id, { ...c, children: [], depth: 0, path: [c.name] })
    })

    filtered.forEach(c => {
      const node = map.get(c.id)!
      if (c.parentId && map.has(c.parentId)) {
        const parent = map.get(c.parentId)!
        node.depth = parent.depth + 1
        node.path = [...parent.path, c.name]
        parent.children.push(node)
      } else if (!c.parentId) {
        roots.push(node)
      } else {
        roots.push(node) // parent not in filtered set — treat as root
      }
    })

    return roots
  }, [categories, type])
}

export function useCategoryMap(): Map<string, Category> {
  const { state } = useApp()
  return useMemo(() => {
    const map = new Map<string, Category>()
    state.data.categories.forEach(c => map.set(c.id, c))
    return map
  }, [state.data.categories])
}

export function useFlatCategoryList(type?: 'income' | 'expense'): { id: string; name: string; indent: number }[] {
  const tree = useCategoryTree(type)

  return useMemo(() => {
    const result: { id: string; name: string; indent: number }[] = []
    function walk(nodes: CategoryTreeNode[]) {
      nodes.forEach(n => {
        result.push({ id: n.id, name: n.name, indent: n.depth })
        walk(n.children)
      })
    }
    walk(tree)
    return result
  }, [tree])
}

export function getDescendantIds(categories: Category[], categoryId: string): Set<string> {
  const ids = new Set<string>([categoryId])
  const collect = (parentId: string) => {
    categories.filter(c => c.parentId === parentId).forEach(c => { ids.add(c.id); collect(c.id) })
  }
  collect(categoryId)
  return ids
}

export function useCategorySummary(year?: number, month?: number): CategorySummary[] {
  const { state } = useApp()
  const { categories, transactions, budgets } = state.data
  const tree = useCategoryTree()

  return useMemo(() => {
    const y = year ?? currentYear()
    const m = month ?? currentMonth()
    const range = getMonthRange(y, m)

    const relevant = transactions.filter(t => t.date >= range.start && t.date <= range.end)

    function buildSummary(nodes: CategoryTreeNode[]): CategorySummary[] {
      return nodes.map(node => {
        const descendantIds = getDescendantIds(categories, node.id)
        let total = 0
        let count = 0
        relevant.forEach(t => {
          if (descendantIds.has(t.categoryId)) {
            total += t.amount
            count++
          }
        })

        const budget = budgets.find(b => {
          if (b.categoryId !== node.id) return false
          if (b.period === 'monthly') return b.year === y && b.month === m
          return b.year === y
        })

        return {
          categoryId: node.id,
          categoryName: node.name,
          total,
          count,
          children: buildSummary(node.children),
          budget: budget?.amount,
          budgetUsage: budget ? (total / budget.amount) * 100 : undefined,
        }
      })
    }

    return buildSummary(tree)
  }, [categories, transactions, budgets, tree, year, month])
}

export function useMonthlyStats(year?: number) {
  const { state } = useApp()
  const { transactions } = state.data
  const y = year ?? currentYear()

  return useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const range = getMonthRange(y, i + 1)
      const monthTxs = transactions.filter(t => t.date >= range.start && t.date <= range.end)
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { month: i + 1, income, expense, balance: income - expense }
    })
    return months
  }, [transactions, y])
}
