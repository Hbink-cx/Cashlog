import { useState, useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { SunburstChart, SankeyChart, BarChart, LineChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useApp } from '@/context/AppContext'
import { useCategoryTree, useMonthlyStats } from '@/hooks/useFinance'
import { getMonthRange, formatCurrency, currentYear, currentMonth } from '@/lib/utils'
import type { CategoryTreeNode } from '@/types'
import { cn } from '@/lib/utils'

echarts.use([SunburstChart, SankeyChart, BarChart, LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

export function Analysis() {
  const [analysisType, setAnalysisType] = useState<'sunburst' | 'sankey' | 'trend'>('sunburst')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-muted rounded-lg p-1">
          {([
            { id: 'sunburst' as const, label: '分类旭日图' },
            { id: 'sankey' as const, label: '收支桑基图' },
            { id: 'trend' as const, label: '趋势分析' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setAnalysisType(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                analysisType === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(analysisType === 'sunburst') && (
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setType('expense')}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", type === 'expense' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              支出
            </button>
            <button
              onClick={() => setType('income')}
              className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", type === 'income' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              收入
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto text-sm">
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value) || currentYear())}
            className="w-20 px-2 py-1 bg-background border rounded text-sm text-center"
          />
          <span className="text-muted-foreground">年</span>
          {analysisType !== 'trend' && (
            <>
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                className="px-2 py-1 bg-background border rounded text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="bg-card border rounded-xl p-4 min-h-[500px]">
        {analysisType === 'sunburst' && <SunburstView type={type} year={year} month={month} />}
        {analysisType === 'sankey' && <SankeyView year={year} month={month} />}
        {analysisType === 'trend' && <TrendView year={year} />}
      </div>
    </div>
  )
}

function SunburstView({ type, year, month }: { type: 'income' | 'expense'; year: number; month: number }) {
  const { state } = useApp()
  const tree = useCategoryTree(type)
  const range = getMonthRange(year, month)
  const { transactions, categories } = state.data

  const option = useMemo(() => {
    // Collect descendant ids for each node
    const descMap = new Map<string, Set<string>>()
    function collect(nodes: CategoryTreeNode[]) {
      nodes.forEach(n => {
        const set = new Set<string>([n.id])
        if (n.children.length > 0) {
          collect(n.children)
          n.children.forEach(c => {
            const childSet = descMap.get(c.id)
            if (childSet) childSet.forEach(id => set.add(id))
          })
        }
        descMap.set(n.id, set)
      })
    }
    collect(tree)

    // Compute values
    function computeValue(node: CategoryTreeNode): number {
      const ids = descMap.get(node.id) || new Set([node.id])
      let total = 0
      transactions.forEach(t => {
        if (t.date >= range.start && t.date <= range.end && ids.has(t.categoryId)) {
          total += t.amount
        }
      })
      return total
    }

    function toSunburst(nodes: CategoryTreeNode[]): any[] {
      return nodes.map(n => {
        const value = computeValue(n)
        const cat = categories.find(c => c.id === n.id)
        const item: any = {
          name: n.name,
          value: Math.round(value * 100) / 100,
          itemStyle: {
            color: cat?.color || (type === 'income' ? '#22c55e' : '#ef4444'),
          },
        }
        if (n.children.length > 0) {
          const children = toSunburst(n.children)
          // Only include if total > 0
          if (children.some((c: any) => c.value > 0) || value > 0) {
            item.children = children
          }
        }
        return item
      })
    }

    const data = toSunburst(tree)

    return {
      tooltip: {
        formatter: (params: any) => {
          const pct = params.value ? ` (${((params.value / (params.treePathInfo?.[0]?.value || 1)) * 100).toFixed(1)}%)` : ''
          return `<b>${params.name}</b><br/>${formatCurrency(params.value || 0)}${pct}`
        },
      },
      series: [{
        type: 'sunburst',
        data: data.length > 0 ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: '#e5e7eb' } }],
        radius: ['15%', '85%'],
        center: ['50%', '50%'],
        emphasis: {
          focus: 'ancestor',
        },
        levels: [
          {},
          { r0: '15%', r: '45%', label: { rotate: 'tangential', fontSize: 11 } },
          { r0: '45%', r: '62%', label: { rotate: 'tangential', fontSize: 10 } },
          { r0: '62%', r: '72%', label: { position: 'outside', padding: 3, fontSize: 9 } },
          { r0: '72%', r: '80%', label: { position: 'outside', padding: 3, fontSize: 8 } },
        ],
        label: {
          show: true,
          color: '#666',
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
        },
      }],
    }
  }, [tree, transactions, range, categories, type])

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">
        {type === 'expense' ? '支出' : '收入'}分类层级 — {year}年{month}月
      </h3>
      <ReactEChartsCore option={option} style={{ height: 480 }} notMerge />
    </div>
  )
}

function SankeyView({ year, month }: { year: number; month: number }) {
  const { state } = useApp()
  const treeIncome = useCategoryTree('income')
  const treeExpense = useCategoryTree('expense')
  const range = getMonthRange(year, month)
  const { transactions, categories } = state.data

  const option = useMemo(() => {
    const monthTxs = transactions.filter(t => t.date >= range.start && t.date <= range.end)
    const incomeTotal = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenseTotal = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    // Top-level income categories
    const incomeNodes = treeIncome
      .filter(n => {
        const ids = new Set<string>()
        const collect = (node: CategoryTreeNode) => { ids.add(node.id); node.children.forEach(collect) }
        collect(n)
        return monthTxs.some(t => t.type === 'income' && ids.has(t.categoryId))
      })

    // Top-level expense categories
    const expenseNodes = treeExpense
      .filter(n => {
        const ids = new Set<string>()
        const collect = (node: CategoryTreeNode) => { ids.add(node.id); node.children.forEach(collect) }
        collect(n)
        return monthTxs.some(t => t.type === 'expense' && ids.has(t.categoryId))
      })

    const nodes: any[] = []
    const links: any[] = []

    // Source: income categories -> Total Income -> Total Expense -> expense categories
    const totalIncomeId = 'node-total-income'
    const totalExpenseId = 'node-total-expense'

    nodes.push({ name: '总收入', itemStyle: { color: '#22c55e' } })
    nodes.push({ name: '总支出', itemStyle: { color: '#ef4444' } })

    const incomeCats = incomeNodes.map(n => {
      const ids = new Set<string>()
      const collect = (node: CategoryTreeNode) => { ids.add(node.id); node.children.forEach(collect) }
      collect(n)
      const total = monthTxs.filter(t => t.type === 'income' && ids.has(t.categoryId)).reduce((s, t) => s + t.amount, 0)
      const cat = categories.find(c => c.id === n.id)
      return { id: n.id, name: n.name, total, color: cat?.color }
    }).filter(x => x.total > 0)

    const expenseCats = expenseNodes.map(n => {
      const ids = new Set<string>()
      const collect = (node: CategoryTreeNode) => { ids.add(node.id); node.children.forEach(collect) }
      collect(n)
      const total = monthTxs.filter(t => t.type === 'expense' && ids.has(t.categoryId)).reduce((s, t) => s + t.amount, 0)
      const cat = categories.find(c => c.id === n.id)
      return { id: n.id, name: n.name, total, color: cat?.color }
    }).filter(x => x.total > 0)

    incomeCats.forEach(c => {
      nodes.push({ name: c.name, itemStyle: { color: c.color || '#4ade80' } })
      links.push({ source: c.name, target: '总收入', value: c.total })
    })

    expenseCats.forEach(c => {
      nodes.push({ name: c.name, itemStyle: { color: c.color || '#f87171' } })
      links.push({ source: '总支出', target: c.name, value: c.total })
    })

    // Connect total income to total expense (this shows the flow)
    const flow = Math.min(incomeTotal, expenseTotal)
    links.push({ source: '总收入', target: '总支出', value: flow || 1 })

    // Savings node
    if (incomeTotal > expenseTotal) {
      nodes.push({ name: '储蓄', itemStyle: { color: '#3b82f6' } })
      links.push({ source: '总收入', target: '储蓄', value: incomeTotal - expenseTotal })
    }

    return {
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `${params.data.source} → ${params.data.target}<br/>金额: ${formatCurrency(params.data.value || 0)}`
          }
          return `${params.name}`
        },
      },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        layoutIterations: 0,
        data: nodes,
        links: links,
        label: {
          fontSize: 11,
          color: '#666',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
      }],
    }
  }, [treeIncome, treeExpense, transactions, range, categories])

  if (transactions.filter(t => t.date >= range.start && t.date <= range.end).length === 0) {
    return (
      <div className="flex items-center justify-center h-[480px] text-muted-foreground">
        {year}年{month}月暂无交易数据
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">收支流向 — {year}年{month}月</h3>
      <ReactEChartsCore option={option} style={{ height: 500 }} notMerge />
    </div>
  )
}

function TrendView({ year }: { year: number }) {
  const monthlyStats = useMonthlyStats(year)
  const { state } = useApp()
  const categories = state.data.categories

  const option = useMemo(() => {
    const months = monthlyStats.map(s => `${s.month}月`)
    const income = monthlyStats.map(s => s.income)
    const expense = monthlyStats.map(s => s.expense)
    const balance = monthlyStats.map(s => s.balance)

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let html = `<b>${params[0]?.axisValue}</b><br/>`
          params.forEach((p: any) => {
            html += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value)}<br/>`
          })
          return html
        },
      },
      legend: {
        data: ['收入', '支出', '结余'],
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => val >= 10000 ? `${(val / 10000).toFixed(1)}万` : val.toString(),
          fontSize: 11,
        },
      },
      series: [
        {
          name: '收入',
          type: 'bar',
          data: income,
          itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] },
          barWidth: 20,
        },
        {
          name: '支出',
          type: 'bar',
          data: expense,
          itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
          barWidth: 20,
        },
        {
          name: '结余',
          type: 'line',
          data: balance,
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 8,
        },
      ],
    }
  }, [monthlyStats])

  const totalIncome = monthlyStats.reduce((s, m) => s + m.income, 0)
  const totalExpense = monthlyStats.reduce((s, m) => s + m.expense, 0)
  const totalBalance = totalIncome - totalExpense

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{year}年 月度收支趋势</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">年度总收入</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">年度总支出</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">年度结余</p>
          <p className={cn("text-lg font-bold", totalBalance >= 0 ? 'text-blue-600' : 'text-red-500')}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      <ReactEChartsCore option={option} style={{ height: 380 }} notMerge />
    </div>
  )
}
