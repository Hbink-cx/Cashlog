import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { useFlatCategoryList } from '@/hooks/useFinance'
import { todayStr } from '@/lib/utils'
import { Camera, Loader2, X, Sparkles, AlertCircle, Image, Trash2, CheckCheck, TrendingUp, TrendingDown } from 'lucide-react'

// ── 支出分类 → 关键词 ──
const EXPENSE_KEYWORDS: [string, string[]][] = [
  ['cat-e-food-out', ['外卖', '美团', '饿了么', '餐厅', '饭', '麻辣烫', '火锅', '烧烤', '奶茶', '咖啡', '肯德基', '麦当劳', '汉堡王', '必胜客', '小吃', '面', '米线', '包子', '饺子', '食堂', '蛋糕', '披萨', '沙县', '黄焖鸡', '酸菜鱼', '瑞幸', '星巴克', '蜜雪冰城', '茶百道', '喜茶', '奈雪']],
  ['cat-e-food-home', ['超市', '菜', '买菜', '盒马', '永辉', '沃尔玛', '大润发', '山姆', '叮咚', '朴朴', '日用', '水果', '粮油', '调料']],
  ['cat-e-transport-metro', ['地铁', '公交', '巴士']],
  ['cat-e-transport-taxi', ['滴滴', '出租车', '打车', '曹操', '出行', 'T3', '花小猪', '高德', '哈啰']],
  ['cat-e-shopping', ['淘宝', '京东', '拼多多', '唯品会', '商城', '购买', '下单', '天猫', '苏宁', '得物', '闲鱼', '抖音电商', '快手小店']],
  ['cat-e-entertainment', ['电影院', 'KTV', '游戏', '演出', '门票', '音乐会', '剧本杀', '密室', 'bilibili', '腾讯视频', '爱奇艺', '优酷', 'Netflix', 'Spotify', 'Steam', '网易云', 'QQ音乐']],
  ['cat-e-housing', ['房租', '物业', '水电', '天然气', '燃气', '暖气', '水费', '电费']],
]

// ── 收入分类 → 关键词 ──
const INCOME_KEYWORDS: [string, string[]][] = [
  ['cat-i-salary', ['工资', '薪酬', '奖金', '年终奖', '绩效', '津贴', '补贴', '加班费', '基本工资', '岗位工资']],
  ['cat-i-side', ['副业', '外包', 'freelance', '兼职', '稿费', '设计', '翻译', '咨询', '讲课', '佣金']],
  ['cat-i-invest', ['理财', '基金', '股票', '分红', '利息', '股息', '收益', '赎回', '增值']],
  ['cat-i-other', ['红包', '转账', '退款', '报销', '退款入账', '转入', '收款', '存入', '提现到账', '别人转']],
]

// ── 收入检测关键词（行扫描用） ──
const INCOME_SIGNALS = [
  '退款', '入账', '转入', '工资', '奖金', '报销', '红包', '收入', '存入', '收款',
  '提现到账', '退款到账', '别人转', '转账收入', '收钱', '到账', '+¥', '+￥',
]

function detectType(line: string, rawText: string): 'income' | 'expense' {
  const combined = (line + rawText).toLowerCase()
  for (const sig of INCOME_SIGNALS) {
    if (combined.includes(sig.toLowerCase())) return 'income'
  }
  return 'expense'
}

function matchCategory(text: string, type: 'income' | 'expense'): string | null {
  const s = text.toLowerCase()
  const keywords = type === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS
  for (const [catId, keys] of keywords) {
    if (keys.some(k => s.includes(k.toLowerCase()))) return catId
  }
  return null
}

// ── 批量解析引擎 ──
interface ParsedItem {
  id: number; merchant: string; amount: number
  type: 'income' | 'expense'; suggestedCategoryId: string | null
}

function parseTransactions(rawText: string): { items: ParsedItem[]; date: string; source: string } {
  const lines = rawText.split(/\n/).map(l => l.trim()).filter(Boolean)

  let date = todayStr()
  const dateMatch = rawText.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/)
  if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`

  let source = 'unknown'
  if (/微信|WeChat|零钱/.test(rawText)) source = 'wechat'
  else if (/支付宝|余额宝|花呗|借呗/.test(rawText)) source = 'alipay'
  else if (/银行|信用卡|储蓄卡|交易提醒|跨行/.test(rawText)) source = 'bank'

  const items: ParsedItem[] = []
  const seen = new Set<string>()
  let id = 0

  for (const line of lines) {
    if (/^(合计|总计|小计|支付|付款方式|当前状态|交易时间|商户单号|对方|收单|微信|支付宝)/.test(line)) continue
    if (/^(快捷支付|零钱通|余额宝|花呗|借呗|储蓄卡|信用卡)$/.test(line)) continue
    if (line.length < 2 || line.length > 80) continue
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(line)) continue

    const amountRegex = /(?:¥|￥|RMB|CNY)?\s*([0-9,]+\.[0-9]{1,2})\s*$/g
    const amountRegex2 = /(?:[-¥￥]\s*)([0-9,]+\.[0-9]{1,2})/g

    let foundAmount = false
    for (const regex of [amountRegex, amountRegex2]) {
      const matches = [...line.matchAll(regex)]
      for (const m of matches) {
        const raw = m[1].replace(/,/g, '')
        const val = parseFloat(raw)
        if (val <= 0 || val >= 1000000) continue

        let merchant = line
          .replace(/[-¥￥]\s*[0-9,]+\.[0-9]{1,2}/g, '')
          .replace(/[0-9:,.]/g, '')
          .replace(/^\s*[-]+/, '')
          .trim().slice(0, 40).trim()

        if (!merchant || merchant.length < 1) merchant = '未知商户'

        const dedupKey = `${merchant}-${val}`
        if (seen.has(dedupKey)) continue
        seen.add(dedupKey)

        const txType = detectType(line, rawText)
        items.push({
          id: id++,
          merchant,
          amount: val,
          type: txType,
          suggestedCategoryId: matchCategory(merchant, txType),
        })
        foundAmount = true
      }
      if (foundAmount) break
    }
  }

  return { items, date, source }
}

const SOURCE_ICONS: Record<string, string> = { wechat: '💚', alipay: '💙', bank: '🏦', unknown: '📷' }
const SOURCE_NAMES: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '银行卡', unknown: '其他来源' }

interface EditingItem extends ParsedItem {
  categoryId: string
  desc: string
}

export function ScreenshotImport({ onClose }: { onClose: () => void }) {
  const { addTransaction } = useApp()
  const catListExpense = useFlatCategoryList('expense')
  const catListIncome = useFlatCategoryList('income')
  const [step, setStep] = useState<'select' | 'ocr' | 'review'>('select')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [rawText, setRawText] = useState('')
  const [source, setSource] = useState('unknown')
  const [date, setDate] = useState(todayStr())
  const [editItems, setEditItems] = useState<EditingItem[]>([])
  const [showRaw, setShowRaw] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStep('ocr')
    setProgress(0)
    setProgressText('正在加载 OCR 引擎...')

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('chi_sim+eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100)
            setProgress(pct)
            setProgressText(`识别中… ${pct}%`)
          } else setProgressText('加载中文识别引擎…')
        },
      })
      const { data } = await worker.recognize(file)
      await worker.terminate()

      const text = data.text || ''
      if (text.trim().length < 5) {
        setError('图片未识别到文字，请重新拍摄清晰画面')
        setStep('select')
        return
      }

      setRawText(text)
      const result = parseTransactions(text)
      setSource(result.source)
      setDate(result.date)

      if (result.items.length === 0) {
        setError('未找到交易记录，请确认截图包含金额和商户信息')
        setStep('select')
        return
      }

      const edits: EditingItem[] = result.items.map(item => ({
        ...item,
        categoryId: item.suggestedCategoryId || '',
        desc: `${SOURCE_NAMES[result.source]} · ${item.merchant}`,
      }))
      setEditItems(edits)
      setStep('review')
    } catch (err: any) {
      console.error('OCR failed:', err)
      setError(err.message || 'OCR 识别失败，请重试')
      setStep('select')
    }
  }

  const updateItem = (id: number, field: keyof EditingItem, value: string | number) => {
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  const removeItem = (id: number) => setEditItems(prev => prev.filter(it => it.id !== id))

  const toggleType = (id: number) => {
    setEditItems(prev => prev.map(it => {
      if (it.id !== id) return it
      const newType = it.type === 'expense' ? 'income' : 'expense'
      return { ...it, type: newType, categoryId: '' }
    }))
  }

  const handleSaveAll = () => {
    let count = 0
    for (const item of editItems) {
      if (item.amount > 0 && item.categoryId) {
        addTransaction({
          amount: item.amount,
          type: item.type,
          categoryId: item.categoryId,
          date,
          description: item.desc || item.merchant,
        })
        count++
      }
    }
    if (count > 0) onClose()
  }

  const savedCount = editItems.filter(it => it.amount > 0 && it.categoryId).length
  const incomeCount = editItems.filter(it => it.type === 'income').length
  const expenseCount = editItems.filter(it => it.type === 'expense').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl mx-2 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card rounded-t-xl z-10">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === 'select' ? '截图导入' : step === 'ocr' ? '识别中…' : `找到 ${editItems.length} 笔交易`}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {step === 'select' && (
          <div className="p-6 space-y-4">
            <div className="w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center">
              <Image className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base">导入支付截图</p>
              <p className="text-sm text-muted-foreground mt-1">
                支持微信账单、支付宝账单、银行交易截图，自动识别收支和分类
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">拍照</span>
                <span className="text-xs text-muted-foreground">直接拍摄账单</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              </label>
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Image className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">相册</span>
                <span className="text-xs text-muted-foreground">从相册选择截图</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground text-center">OCR 识别在本地完成，图片不上传服务器</p>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === 'ocr' && (
          <div className="p-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <p className="font-semibold">{progressText}</p>
            <div className="w-2/3 mx-auto bg-muted rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">首次使用需下载中文识别包 (~9MB)，之后离线可用</p>
          </div>
        )}

        {step === 'review' && editItems.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="text-lg">{SOURCE_ICONS[source]}</span>
              <span className="font-medium">{SOURCE_NAMES[source]}</span>
              <div className="flex items-center gap-2 ml-auto text-xs">
                {incomeCount > 0 && <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">收 {incomeCount}</span>}
                {expenseCount > 0 && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">支 {expenseCount}</span>}
              </div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="px-2 py-1 bg-background border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="space-y-2">
              {editItems.map(item => {
                const catList = item.type === 'income' ? catListIncome : catListExpense
                return (
                  <div key={item.id} className={cn(
                    "flex items-center gap-2 p-3 rounded-xl group transition-colors",
                    item.type === 'income'
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30"
                      : "bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30"
                  )}>
                    {/* Type toggle */}
                    <button
                      onClick={() => toggleType(item.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: item.type === 'income' ? '#dcfce7' : '#fecaca' }}
                      title="点击切换收入/支出"
                    >
                      {item.type === 'income'
                        ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                        : <TrendingDown className="w-4 h-4 text-red-500" />
                      }
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={item.merchant}
                          onChange={e => updateItem(item.id, 'merchant', e.target.value)}
                          className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-sm font-medium"
                          placeholder="商户名称"
                        />
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">¥</span>
                          <input type="number" step="0.01" value={item.amount || ''}
                            onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                            className={cn(
                              "w-full pl-5 pr-2 py-1.5 bg-background border rounded-lg text-right font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                              item.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={item.categoryId} onChange={e => updateItem(item.id, 'categoryId', e.target.value)}
                          className="flex-1 px-2 py-1 bg-background border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">选择{ item.type === 'income' ? '收入' : '支出'}分类</option>
                          {catList.map(c => (
                            <option key={c.id} value={c.id}>{'　'.repeat(c.indent)}{c.name}</option>
                          ))}
                        </select>
                        <input type="text" value={item.desc}
                          onChange={e => updateItem(item.id, 'desc', e.target.value)}
                          className="w-40 px-2 py-1 bg-transparent text-xs text-muted-foreground border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none hidden sm:block"
                          placeholder="备注"
                        />
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                )
              })}
            </div>

            <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showRaw ? '收起' : '查看'}识别原文
            </button>
            {showRaw && (
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                {rawText}
              </div>
            )}

            <div className="flex gap-3 pt-3 sticky bottom-0 bg-card pb-1">
              <button onClick={() => { setStep('select'); setEditItems([]); setRawText('') }}
                className="flex-1 py-3 bg-muted rounded-xl font-medium hover:bg-muted/80 transition-colors">
                重新选择
              </button>
              <button onClick={handleSaveAll} disabled={savedCount === 0}
                className="flex items-center justify-center gap-2 flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                <CheckCheck className="w-5 h-5" />
                批量导入 {savedCount > 0 ? `(${savedCount}笔)` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
