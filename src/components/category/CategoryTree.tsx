import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { useCategoryTree, getDescendantIds } from '@/hooks/useFinance'
import type { Category, CategoryTreeNode } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899', '#64748b',
]

export function CategoryManager() {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')
  const tree = useCategoryTree(activeTab)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('expense')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === 'expense' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            支出分类
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === 'income' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            收入分类
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5">
        {tree.length === 0 ? (
          <EmptyState type={activeTab} />
        ) : (
          <div className="space-y-0.5">
            {tree.map(node => (
              <CategoryNode key={node.id} node={node} type={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ type }: { type: 'income' | 'expense' }) {
  const { addCategory } = useApp()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="text-center py-10">
      <FolderTree className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground mb-3">还没有{type === 'income' ? '收入' : '支出'}分类</p>
      {showForm ? (
        <CategoryFormModal
          type={type}
          parentId={null}
          onClose={() => setShowForm(false)}
          onSave={(c) => { addCategory(c); setShowForm(false) }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> 创建分类
        </button>
      )}
    </div>
  )
}

function CategoryNode({ node, type }: { node: CategoryTreeNode; type: 'income' | 'expense' }) {
  const [expanded, setExpanded] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const { addCategory, updateCategory, deleteCategory, state } = useApp()

  const hasChildren = node.children.length > 0
  const descendantIds = getDescendantIds(state.data.categories, node.id)
  const txCount = state.data.transactions.filter(t => descendantIds.has(t.categoryId)).length
  const budgetCount = state.data.budgets.filter(b => descendantIds.has(b.categoryId)).length

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 group transition-colors">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn("p-0.5 hover:bg-muted rounded transition-colors", !hasChildren && 'invisible')}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Color dot */}
        <div
          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: node.color || '#999' }}
        />

        {/* Name */}
        <span className="text-sm font-medium flex-1">{node.name}</span>

        {/* Stats */}
        <span className="text-xs text-muted-foreground">
          {txCount > 0 && `${txCount}笔`}
          {budgetCount > 0 && ` · ${budgetCount}预算`}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowForm(true)}
            className="p-1 hover:bg-muted rounded"
            title="添加子分类"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1 hover:bg-muted rounded"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              const msg = hasChildren
                ? `确定要删除"${node.name}"及其所有子分类吗？相关交易会被一同删除。`
                : `确定要删除"${node.name}"吗？`
              if (confirm(msg)) deleteCategory(node.id)
            }}
            className="p-1 hover:bg-destructive/10 rounded"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-5 border-l-2 border-muted pl-3">
          {node.children.map(child => (
            <CategoryNode key={child.id} node={child} type={type} />
          ))}
        </div>
      )}

      {/* Add child form */}
      {showForm && (
        <div className="ml-8 mt-1">
          <CategoryFormModal
            type={type}
            parentId={node.id}
            onClose={() => setShowForm(false)}
            onSave={(c) => { addCategory(c); setShowForm(false) }}
          />
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <CategoryFormModal
          type={type}
          parentId={node.parentId}
          category={node}
          onClose={() => setEditing(false)}
          onSave={(c) => { updateCategory({ ...node, ...c, id: node.id }); setEditing(false) }}
        />
      )}
    </div>
  )
}

function CategoryFormModal({
  type,
  parentId,
  category,
  onClose,
  onSave,
}: {
  type: 'income' | 'expense'
  parentId: string | null
  category?: Category
  onClose: () => void
  onSave: (c: Omit<Category, 'id'>) => void
}) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || PRESET_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), type, parentId, color })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-accent/30 border rounded-lg p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="分类名称"
        autoFocus
        className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div>
        <p className="text-xs text-muted-foreground mb-2">颜色</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all",
                color === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          {category ? '保存' : '创建'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-muted rounded-lg text-sm"
        >
          取消
        </button>
      </div>
    </form>
  )
}
