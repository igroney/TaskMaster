'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, TaskPriority, TaskStatus } from '@/lib/types'

interface Props {
  orgId: string
  categories: Category[]
  onClose: () => void
  onCreated: () => void
}

export function AddTaskModal({ orgId, categories, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [status, setStatus] = useState<TaskStatus>('active')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      org_id: orgId,
      category_id: categoryId || null,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      created_by: user?.id,
    } as any)
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">New Task</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg">×</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Title *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to get done?" autoFocus required />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Details</label>
            <textarea className="input resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Any context, links, or notes…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="normal">⚪ Normal</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                <option value="active">Active</option>
                <option value="waiting">Waiting On</option>
                <option value="someday">Someday</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Due Date</label>
              <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
