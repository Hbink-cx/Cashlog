import { useState } from 'react'
import { createWorker } from 'tesseract.js'
import type { Transaction } from '@/types'
import { useApp } from '@/context/AppContext'
import { useFlatCategoryList } from '@/hooks/useFinance'
import { formatCurrency, todayStr, cn } from '@/lib/utils'
import { Camera, Loader2, Check, X, Sparkles, AlertCircle } from 'lucide-react'

// ── 商户 → 分类 关键词匹配表 ──
const MERCHANT_CATEGORIES: [string, string[]][] = [
  ['cat-e-food-out', ['外卖', '美团', '饿了么', '餐厅', '饭', '麻辣烫', '火锅', '烧烤', '奶茶', '咖啡', '肯德基', '麦当劳', '汉堡王', '必胜客', '小吃', '面', '米线', '包子', '饺子', '食堂']],
  ['cat-e-food-home', ['超市', '菜市场', '买菜', '盒马', '永辉', '沃尔玛', '大润发', '山姆', '叮咚', '朴朴', '日用']],
  ['cat-e-transport-metro', ['地铁', '公交', '巴士', 'Metro']],
  ['cat-e-transport-taxi', ['滴滴', '出租车', '打车', '曹操', '出行', 'T3']],
  ['cat-e-shopping', ['淘宝', '京东', '拼多多', '唯品会', '商城', '购买', '下单']],
  ['cat-e-entertainment', ['电影院', 'KTV', '游戏', '演出', '门票', '音乐会', '剧本杀', '密室', 'bilibili', '腾讯视频', '爱奇艺', '优酷', 'Netflix', 'Spotify']],
  ['cat-e-housing', ['房租', '物业', '水电', '天然气', '燃气', '暖气']],
]

function matchCategory(merchant: string, text: string): string | null {
  const combined = (merchant + text).toLowerCase()
  for (const [catId, keywords] of MERCHANT_CATEGORIES) {
    if (keywords.some(k => combined.includes(k.toLowerCase()))) return catId
  }
  return null
}

// ── 金额提取 ──
const AMOUNT_PATTERNS = [
  /(?:[¥￥]|RMB\s?|CNY\s?)\s*([0-9,]+\.[0-9]{1,2})/g,
  /(?:金额|付款|消费|支出|扣款)[^0-9]*([0-9,]+\.[0-9]{1,2})/g,
  /(?:-)\s*[¥￥]\s*([0-9,]+\.[0-9]{1,2})/g,
  /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g,
]

function extractAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0) {
      const raw = matches[0][1].replace(/,/g, '')
      const val = parseFloat(raw)
      if (val > 0 && val < 1000000) return val
    }
  }
  return null
}

// ── 商户名称提取 ──
function extractMerchant(text: string): string {
  const lines = text.split(/\n|，|,/).map(l => l.trim()).filter(Boolean)

  const patterns = [
    /(?:商户|收款方|对方|商品|商户名称|收款单位)[：:\s]+(.+)/,
    /(?:向|给)\s*(.+?)\s*(?:付款|支付|转账)/,
    /(?:美团|饿了么|滴滴|京东|淘宝|拼多多|肯德基|麦当劳)[^\n]*/,
  ]

  for (const p of patterns) {
    for (const line of lines) {
      const m = line.match(p)
      if (m && m[1] && m[1].length > 1 && m[1].length < 40) return m[1].trim()
    }
  }

  // Fallback：取前 20 个字符的第一行有意义文本
  for (const line of lines) {
    const cleaned = line.replace(/[¥￥\d\s*#@!.,;:：，。、！？·「」]/g, '').trim()
    if (cleaned.length >= 2 && cleaned.length < 30) {
      // 排除明显不是商户名的行
      if (!/(?:支付|微信|支付宝|余额|银行卡|快捷|付款|收款|账单)/.test(cleaned)) {
        return cleaned
      }
    }
  }

  return '未识别商户'
}

// ── 日期提取 ──
function extractDate(text: string): string {
  const dates = text.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/g)
  if (dates) {
    const cleaned = dates[0]
      .replace(/年/, '-')
      .replace(/月/, '-')
      .replace(/\//g, '-')
      .replace(/日$/, '')
    const parts = cleaned.split('-')
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    }
  }
  return todayStr()
}

// ── 识别来源 ──
function detectSource(text: string): 'wechat' | 'alipay' | 'bank' | 'unknown' {
  if (/微信|WeChat|零钱/.test(text)) return 'wechat'
  if (/支付宝|余额宝|花呗|借呗/.test(text)) return 'alipay'
  if (/银行|信用卡|储蓄卡|交易提醒|跨行/.test(text)) return 'bank'
  return 'unknown'
}

const SOURCE_ICONS: Record<string, string> = {
  wechat: '💚',
  alipay: '💙',
  bank: '🏦',
  unknown: '📷',
}

const SOURCE_NAMES: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  bank: '银行卡',
  unknown: '其他来源',
}

interface ParsedResult {
  amount: number | null
  merchant: string
  date: string
  source: string
  suggestedCategoryId: string | null
  rawText: string
}

export function ScreenshotImport({ onClose }: { onClose: () => void }) {
  const { addTransaction, state } = useApp()
  const { transactions, categories } = state.data
  const catList = useFlatCategoryList('expense')
  const [step, setStep] = useState<'select' | 'ocr' | 'confirm'>('select')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [error, setError] = useState('')
  const [confirmCategory, setConfirmCategory] = useState('')
  const [confirmAmount, setConfirmAmount] = useState('')
  const [confirmDate, setConfirmDate] = useState(todayStr())
  const [confirmDesc, setConfirmDesc] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStep('ocr')
    setProgress(0)
    setProgressText('正在加载 OCR 引擎...')

    try {
      // Use Chinese + English
      const worker = await createWorker('chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100)
            setProgress(pct)
            setProgressText(`识别中… ${pct}%`)
          } else if (m.status === 'loading tesseract core' || m.status === 'loading language traineddata') {
            setProgressText('加载中文识别引擎…')
          }
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

      const amount = extractAmount(text)
      const merchant = extractMerchant(text)
      const date = extractDate(text)
      const source = detectSource(text)
      const suggestedCat = matchCategory(merchant, text)

      // Dedup: check if similar transaction exists
      const dupExists = amount
        ? transactions.some(
            t => t.amount === amount && t.date === date && Math.abs(new Date(t.date).getTime() - new Date(date).getTime()) < 86400000
          )
        : false

      setParsed({
        amount,
        merchant,
        date,
        source,
        suggestedCategoryId: suggestedCat,
        rawText: text,
      })

      setConfirmAmount(amount ? amount.toFixed(2) : '')
      setConfirmCategory(suggestedCat || '')
      setConfirmDate(date)
      setConfirmDesc(`${SOURCE_NAMES[source]} · ${merchant}${dupExists ? ' ⚠️ 疑似重复' : ''}`)
      setStep('confirm')
    } catch (err: any) {
      setError(err.message || 'OCR 识别失败')
      setStep('select')
    }
  }

  const handleSave = () => {
    const amt = parseFloat(confirmAmount)
    if (!amt || amt <= 0 || !confirmCategory) return
    addTransaction({
      amount: amt,
      type: 'expense',
      categoryId: confirmCategory,
      date: confirmDate,
      description: confirmDesc || parsed?.merchant || '截图导入',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === 'select' ? '截图导入' : step === 'ocr' ? '识别中…' : '确认导入'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Step 1: Select */}
        {step === 'select' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center">
              <Camera className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold">拍摄支付截图</p>
              <p className="text-sm text-muted-foreground mt-1">
                支持微信支付、支付宝、银行交易截图
              </p>
            </div>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5" />
              选择截图
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              OCR 识别在手机本地完成，不上传图片
            </p>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: OCR */}
        {step === 'ocr' && (
          <div className="p-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <p className="font-semibold">{progressText}</p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">首次使用需下载中文识别包 (~9MB)</p>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && parsed && (
          <div className="p-5 space-y-4">
            {/* Detected source */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{SOURCE_ICONS[parsed.source]}</span>
              <span>{SOURCE_NAMES[parsed.source]}</span>
              {parsed.suggestedCategoryId && (
                <span className="ml-auto px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs">
                  已自动匹配分类
                </span>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">金额</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">¥</span>
                <input
                  type="number"
                  step="0.01"
                  value={confirmAmount}
                  onChange={e => setConfirmAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-background border rounded-xl text-2xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">分类</label>
              <select
                value={confirmCategory}
                onChange={e => setConfirmCategory(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">选择分类</option>
                {catList.map(c => (
                  <option key={c.id} value={c.id}>
                    {'　'.repeat(c.indent)}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">日期</label>
              <input
                type="date"
                value={confirmDate}
                onChange={e => setConfirmDate(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">描述</label>
              <input
                type="text"
                value={confirmDesc}
                onChange={e => setConfirmDesc(e.target.value)}
                className="w-full mt-1 px-3 py-3 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Raw text toggle */}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showRaw ? '收起' : '查看'}识别原文
            </button>
            {showRaw && (
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
                {parsed.rawText}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('select'); setParsed(null) }}
                className="flex-1 py-3 bg-muted rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                重新选择
              </button>
              <button
                onClick={handleSave}
                disabled={!confirmAmount || !confirmCategory}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                确认导入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
