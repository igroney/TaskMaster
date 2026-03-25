'use client'

import { useState } from 'react'
import type { Task, Category } from '@/lib/types'
import { CategoryBadge } from './CategoryBadge'
import { createClient } from '@/lib/supabase/client'

interface Props {
  task: Task & { category: Category | null }
  onUpdate: () => void
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444', bar: 'bg-red-500' },
  high:   { label: 'High',   color: '#f97316', bar: 'bg-orange-400' },
  normal: { label: '',       color: '',        bar: '' },
  low:    { label: 'Low',    color: '#94a3b8', bar: 'bg-slate-400' },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return { label: 'Today', urgent: true }
  if (diff === 1) return { label: 'Tomorrow', urgent: true }
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, urgent: true }
  return { label: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }), urgent: false }
}

export function TaskCard({ task, onUpdate }: Props) {
  const [completing, setCompleting] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const supabase = createClient()
  const due = formatDate(task.due_date)
  const priority = PRIORITY_CONFIG[task.priority]
  const dotColor = task.category?.color ?? '#888'
  const isUrgent = task.priority === 'urgent' || due?.urgent

  async function toggleDone() {
    setCompleting(true)
    const newStatus = task.status === 'done' ? 'active' : 'done'
    const sb = supabase.from('tasks') as any
    await sb.update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', task.id)
    onUpdate()
    setCompleting(false)
  }

  async function dismiss() {
    setDismissing(true)
    const sb = supabase.from('tasks') as any
    await sb.update({ status: 'dismissed' }).eq('id', task.id)
    onUpdate()
    setDismissing(false)
  }

  async function undismiss() {
    setDismissing(true)
    const sb = supabase.from('tasks') as any
    await sb.update({ status: 'active' }).eq('id', task.id)
    onUpdate()
    setDismissing(false)
  }

  const isDone = task.status === 'done'
  const isDismissed = task.status === 'dismissed'

  return (
    <div
      className={`card p-4 mb-2 flex gap-3 items-start group transition-opacity ${isDone || isDismissed ? 'opacity-60' : ''}`}
      style={{ borderLeft: `4px solid ${isUrgent ? '#ef4444' : dotColor}` }}
    >
      {/* Checkbox */}
      <button
        onClick={toggleDone}
        disabled={completing || isDismissed}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isDone
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-[var(--border)] hover:border-indigo-400'
        }`}
        title={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone && <span className="text-xs leading-none">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`font-semibold text-sm ${isDone || isDismissed ? 'line-through text-[var(--muted)]' : ''}`}>
            {task.title}
          </span>
          {priority.label && (
            <span className="text-xs font-semibold" style={{ color: priority.color }}>
              {priority.label}
            </span>
          )}
          {due && (
            <span className={`text-xs font-medium ${due.urgent ? 'text-red-500' : 'text-[var(--muted)]'}`}>
              📅 {due.label}
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{task.description}</p>
        )}
        <div className="mt-2">
          <CategoryBadge category={task.category} />
        </div>
      </div>

      {/* Dismiss / Undismiss button */}
      {isDismissed ? (
        <button
          onClick={undismiss}
          disabled={dismissing}
          className="flex-shrink-0 text-xs text-[var(--muted)] hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded"
          title="Restore task"
        >
          ↩
        </button>
      ) : (
        <button
          onClick={dismiss}
          disabled={dismissing}
          className="flex-shrink-0 text-xs text-[var(--muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950"
          title="Dismiss task"
        >
          ✕
        </button>
      )}
    </div>
  )
}
