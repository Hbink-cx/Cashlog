import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { useFlatCategoryList } from '@/hooks/useFinance'
import { todayStr } from '@/lib/utils'
import {
  Camera, Loader2, X, Sparkles, AlertCircle, ImageIcon,
  Trash2, CheckCheck, TrendingUp, TrendingDown
} from 'lucide-react'

// ═══ 分类匹配 ═══
const EXPENSE_CAT: [string, string[]][] = [
  ['cat-e-food-out',   ['外卖','美团','饿了么','餐厅','麻辣烫','火锅','烧烤','奶茶','咖啡','肯德基','麦当劳','汉堡王','必胜客','面','米线','包子','饺子','食堂','蛋糕','披萨','沙县','黄焖鸡','酸菜鱼','瑞幸','星巴克','蜜雪冰城','茶百道','喜茶','奈雪','百果园','饭']],
  ['cat-e-food-home',  ['超市','买菜','盒马','永辉','沃尔玛','大润发','山姆','叮咚','朴朴','日用','水果','粮油','调料','生鲜']],
  ['cat-e-transport-metro', ['地铁','公交','巴士']],
  ['cat-e-transport-taxi',  ['滴滴','打车','曹操','T3','花小猪','高德','哈啰','出租车']],
  ['cat-e-shopping',   ['淘宝','京东','拼多多','唯品会','商城','天猫','苏宁','得物','闲鱼','抖音','快手']],
  ['cat-e-entertainment', ['电影院','KTV','游戏','演出','门票','音乐会','剧本杀','密室','bilibili','腾讯视频','爱奇艺','优酷','Netflix','Spotify','Steam','网易云','QQ音乐']],
  ['cat-e-housing',    ['房租','物业','水电','天然气','燃气','暖气','水费','电费']],
]
function matchCat(text: string): string | null {
  const s = text.toLowerCase()
  for (const [id, keys] of EXPENSE_CAT) { if (keys.some(k => s.includes(k.toLowerCase()))) return id }
  return null
}

// ═══ 预处理：灰度 + 对比度增强（不回退二值化，保留这个能识别的方案） ═══
function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const w = img.width, h = img.height
      // 自动切除顶部 8% 和底部 8%
      const cropTop = Math.floor(h * 0.08)
      const cropBot = Math.floor(h * 0.08)
      const ch = h - cropTop - cropBot
      if (ch < 40) {
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d')!.drawImage(img, 0, 0)
        resolve(c.toDataURL('image/png')); return
      }
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = ch
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, cropTop, w, ch, 0, 0, w, ch)

      const imageData = ctx.getImageData(0, 0, w, ch)
      const px = imageData.data
      for (let i = 0; i < px.length; i += 4) {
        const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
        const contrast = ((gray - 128) * 1.8 + 128)
        const v = Math.max(0, Math.min(255, contrast)) | 0
        px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = URL.createObjectURL(file)
  })
}

// ═══ 噪音过滤 + 解析 ═══
const NOISE = /^(添加标签|成功|已传输|已完成|详情|查看更多|更多|账单|明细|首页|我的|扫一扫|收付款|零钱|微信支付|支付|支付宝|全部|筛选|搜索|关闭|返回|查看|展开|收起|统计|图表|月账单|年账单|交易记录|扣费|免密|自动续费|加载中|没有更多)$/
const AMT_RE = /^[+\-]?\s?\d+(\.\d{2})?$/

interface BillItem { id: number; merchant: string; amount: number }

function parseBills(lines: { text: string }[]): BillItem[] {
  const items: BillItem[] = []
  let id = 0, pending = ''
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const txt = lines[i].text.trim()
    if (NOISE.test(txt) || txt.length < 2 || txt.length > 40) continue

    // 金额行：+/− 可选
    const amtMatch = txt.match(AMT_RE)
    if (amtMatch) {
      const raw = amtMatch[0].replace(/[^0-9.]/g, '')
      const val = parseFloat(raw)
      if (val <= 0.01 || val >= 1e6) continue

      let merchant = pending
      if (!merchant) {
        for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
          const up = lines[j].text.trim()
          if (!NOISE.test(up) && !AMT_RE.test(up) && up.length >= 2 && !/^\d/.test(up)) { merchant = up; break }
        }
      }
      pending = ''
      const dedup = `${merchant}-${val}`
      if (seen.has(dedup)) continue; seen.add(dedup)

      items.push({ id: id++, merchant: merchant || '未知商户', amount: val })
    } else {
      pending = txt
    }
  }
  return items
}

function detectSource(raw: string): 'wechat' | 'alipay' | 'unknown' {
  if (/零钱明细|微信支付|零钱通|微信/.test(raw)) return 'wechat'
  if (/支付宝|余额宝|花呗|借呗/.test(raw)) return 'alipay'
  return 'wechat'
}
const SRC_ICON: Record<string, string> = { wechat: '💚', alipay: '💙', unknown: '📷' }
const SRC_NAME: Record<string, string> = { wechat: '微信', alipay: '支付宝', unknown: '未知' }

// ═══ 编辑条目 ═══
interface EditItem extends BillItem {
  type: 'income' | 'expense'
  categoryId: string
  date: string
  desc: string
}

export function ScreenshotImport({ onClose }: { onClose: () => void }) {
  const { addTransaction } = useApp()
  const catExp = useFlatCategoryList('expense')
  const catInc = useFlatCategoryList('income')

  const [step, setStep] = useState<'select' | 'ocr' | 'review'>('select')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [source, setSource] = useState('unknown')
  const [editItems, setEditItems] = useState<EditItem[]>([])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setError(''); setStep('ocr'); setProgress(0)
    setProgressText('预处理图片…')
    try {
      const dataUrl = await preprocessImage(file)

      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('chi_sim+eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setProgress(Math.round((m.progress || 0) * 100))
          else setProgressText('加载 OCR 引擎…')
        },
      })
      setProgressText('识别中…')
      const { data } = await worker.recognize(dataUrl)
      await worker.terminate()

      const rawText = data.text || ''
      const lines = (data.lines || []).map((l: any) => ({ text: l.text }))
      const src = detectSource(rawText)
      setSource(src)

      const bills = parseBills(lines)
      if (bills.length === 0) {
        setError('未找到交易记录，请重新截取清晰的账单列表页面')
        setStep('select'); return
      }

      // 全默认：支出 + 今天 + 空分类（用户手动选）
      setEditItems(bills.map(b => ({
        ...b,
        type: 'expense' as const,
        categoryId: matchCat(b.merchant) || '',
        date: todayStr(),
        desc: `${SRC_NAME[src]} · ${b.merchant}`,
      })))
      setStep('review')
    } catch (err: any) {
      setError(err.message || '识别失败'); setStep('select')
    }
  }

  const update = (id: number, f: keyof EditItem, v: string | number) =>
    setEditItems(p => p.map(it => it.id === id ? { ...it, [f]: v } : it))
  const remove = (id: number) => setEditItems(p => p.filter(it => it.id !== id))
  const toggleType = (id: number) =>
    setEditItems(p => p.map(it => it.id === id ? {
      ...it,
      type: it.type === 'expense' ? 'income' as const : 'expense' as const,
      categoryId: '', /* 切换后清空分类，让用户重选 */
    } : it))

  const handleSaveAll = () => {
    let c = 0
    for (const it of editItems) {
      if (it.amount > 0 && it.categoryId) {
        addTransaction({ amount: it.amount, type: it.type, categoryId: it.categoryId, date: it.date, description: it.desc || it.merchant })
        c++
      }
    }
    if (c > 0) onClose()
  }

  const ok = editItems.filter(it => it.amount > 0 && it.categoryId).length
  const incN = editItems.filter(it => it.type === 'income').length
  const expN = editItems.filter(it => it.type === 'expense').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl mx-2 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card rounded-t-xl z-10">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{step === 'select' ? '截图导入' : step === 'ocr' ? '识别中…' : `${editItems.length} 笔交易`}</h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {step === 'select' && (
          <div className="p-6 space-y-4">
            <div className="w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center"><ImageIcon className="w-10 h-10 text-emerald-600" /></div>
            <div className="text-center">
              <p className="font-semibold text-base">导入微信/支付宝账单截图</p>
              <p className="text-sm text-muted-foreground mt-1">自动切除状态栏和导航栏 · 离线 OCR 识别</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground" /><span className="text-sm font-medium">拍照</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              </label>
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <ImageIcon className="w-8 h-8 text-muted-foreground" /><span className="text-sm font-medium">相册</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground text-center">完全本地运行 · 图片不上传</p>
            {error && <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>}
          </div>
        )}

        {step === 'ocr' && (
          <div className="p-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <p className="font-semibold">{progressText}</p>
            <div className="w-2/3 mx-auto bg-muted rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">首次下载中文识别包 ~9MB · 之后离线可用</p>
          </div>
        )}

        {step === 'review' && editItems.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="text-lg">{SRC_ICON[source]}</span>
              <span className="font-medium">{SRC_NAME[source]}账单</span>
              <span className="text-xs text-muted-foreground ml-2">每笔默认支出，点击 ↑↓ 切换</span>
              <div className="flex items-center gap-2 ml-auto text-xs">
                {incN > 0 && <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 rounded-full">收 {incN}</span>}
                {expN > 0 && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">支 {expN}</span>}
              </div>
            </div>

            <div className="space-y-2">
              {editItems.map(item => {
                const cats = item.type === 'income' ? catInc : catExp
                return (
                  <div key={item.id} className={cn("flex items-center gap-2 p-3 rounded-xl group border", item.type === 'income' ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/50" : "bg-red-50/60 dark:bg-red-950/20 border-red-200/50")}>
                    {/* 收支切换按钮：点一下就切换 */}
                    <button onClick={() => toggleType(item.id)}
                      className="flex-shrink-0 p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: item.type === 'income' ? '#dcfce7' : '#fecaca' }}
                      title="点击切换收入/支出">
                      {item.type === 'income'
                        ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                        : <TrendingDown className="w-4 h-4 text-red-500" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={item.merchant} onChange={e => update(item.id, 'merchant', e.target.value)}
                          className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-sm font-medium" placeholder="商户" />
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">¥</span>
                          <input type="number" step="0.01" value={item.amount || ''}
                            onChange={e => update(item.id, 'amount', parseFloat(e.target.value) || 0)}
                            className={cn("w-full pl-5 pr-2 py-1.5 bg-background border rounded-lg text-right font-mono font-bold text-sm focus:outline-none", item.type === 'income' ? 'text-emerald-600' : 'text-red-500')} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="date" value={item.date} onChange={e => update(item.id, 'date', e.target.value)}
                          className="w-32 px-2 py-1 bg-background border rounded-lg text-xs focus:outline-none" />
                        <select value={item.categoryId} onChange={e => update(item.id, 'categoryId', e.target.value)}
                          className="flex-1 px-2 py-1 bg-background border rounded-lg text-xs focus:outline-none">
                          <option value="">选择{ item.type === 'income' ? '收入' : '支出'}分类</option>
                          {cats.map(c => <option key={c.id} value={c.id}>{'　'.repeat(c.indent)}{c.name}</option>)}
                        </select>
                        <input type="text" value={item.desc} onChange={e => update(item.id, 'desc', e.target.value)}
                          className="w-36 px-2 py-1 bg-transparent text-xs text-muted-foreground hidden sm:block border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none" placeholder="备注" />
                      </div>
                    </div>
                    <button onClick={() => remove(item.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-3 sticky bottom-0 bg-card pb-1">
              <button onClick={() => { setStep('select'); setEditItems([]) }}
                className="flex-1 py-3 bg-muted rounded-xl font-medium hover:bg-muted/80">重新选择</button>
              <button onClick={handleSaveAll} disabled={ok === 0}
                className="flex items-center justify-center gap-2 flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50">
                <CheckCheck className="w-5 h-5" />批量导入 {ok > 0 ? `(${ok}笔)` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...args: (string | false | undefined)[]): string { return args.filter(Boolean).join(' ') }
