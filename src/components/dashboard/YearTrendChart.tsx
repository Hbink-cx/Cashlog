import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, TooltipComponent, GridComponent, CanvasRenderer])

/** 年度收支趋势 — 双向柱状图 + 结余线 */
function YearTrendChart({ data }: { data: { month: number; income: number; expense: number; balance: number }[] }) {
  const option = useMemo(() => {
    const months = data.map(d => `${d.month}月`)
    const incomeValues = data.map(d => d.income)
    const expenseValues = data.map(d => -d.expense) // 负值向下
    const balanceValues = data.map(d => d.balance)

    // 结余线颜色：正蓝负红，逐点着色
    const balanceColors = balanceValues.map(v => v >= 0 ? '#3b82f6' : '#ef4444')

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151', fontSize: 12 },
        formatter: (params: any) => {
          const month = params[0]?.axisValue || ''
          let income = ''
          let expense = ''
          let balance = ''
          params.forEach((p: any) => {
            if (p.seriesName === '收入') income = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#22c55e;margin-right:6px;"></span>收入 <b style="float:right;margin-left:20px;">¥${Math.abs(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</b><br/>`
            if (p.seriesName === '支出') expense = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;margin-right:6px;"></span>支出 <b style="float:right;margin-left:20px;">¥${Math.abs(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</b><br/>`
            if (p.seriesName === '结余') balance = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>结余 <b style="float:right;margin-left:20px;color:${p.color}">¥${p.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, signDisplay: 'always' })}</b><br/>`
          })
          return `<b style="font-size:14px;">${month}</b><br/>${income}${expense}${balance}`
        },
      },
      legend: {
        data: ['收入', '支出', '结余'],
        bottom: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 11, color: '#6b7280' },
      },
      grid: {
        left: '3%',
        right: '5%',
        top: '8%',
        bottom: '14%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: {
          fontSize: 11,
          color: '#9ca3af',
          margin: 10,
        },
        splitLine: { show: true, lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#9ca3af',
          formatter: (v: number) => {
            const abs = Math.abs(v)
            if (abs >= 10000) return `${(v / 10000).toFixed(1)}万`
            if (abs === 0) return '0'
            return v.toString()
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      },
      series: [
        {
          name: '收入',
          type: 'bar',
          data: incomeValues,
          itemStyle: {
            color: '#22c55e',
            borderRadius: [5, 5, 0, 0],
          },
          barWidth: 18,
          barGap: '35%',
          emphasis: {
            itemStyle: { color: '#16a34a' },
          },
        },
        {
          name: '支出',
          type: 'bar',
          data: expenseValues,
          itemStyle: {
            color: '#ef4444',
            borderRadius: [0, 0, 5, 5],
          },
          barWidth: 18,
          barGap: '35%',
          emphasis: {
            itemStyle: { color: '#dc2626' },
          },
        },
        {
          name: '结余',
          type: 'line',
          data: balanceValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: '#3b82f6', width: 2.5 },
          itemStyle: {
            color: (params: any) => {
              const v = balanceValues[params.dataIndex]
              return v >= 0 ? '#3b82f6' : '#ef4444'
            },
          },
          z: 10,
          emphasis: {
            symbolSize: 9,
            itemStyle: { borderWidth: 2, borderColor: '#fff' },
          },
        },
      ],
    }
  }, [data])

  return <ReactEChartsCore option={option} style={{ height: 320 }} notMerge />
}

export { YearTrendChart }
