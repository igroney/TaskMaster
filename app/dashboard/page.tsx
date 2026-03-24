'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Category, Organization } from '@/lib/types'
import { TaskCard } from '@/components/TaskCard'
import { AddTaskModal } from '@/components/AddTaskModal'
import { CategoryBadge } from '@/components/CategoryBadge'

type TaskWithCategory = Task & { category: Category | null }
type GroupedTasks = Record<string, TaskWithCategory[]>

const STATUS_SECTIONS = [
  { key: 'active',   label: 'Active',      icon: '🎯' },
  { key: 'waiting',  label: 'Waiting On',  icon: '⏳' },
  { key: 'someday',  label: 'Someday',     icon: '🌱' },
  { key: 'done',     label: 'Completed',   icon: '✅' },
]

export default function DashboardPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<TaskWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [activeSection, setActiveSection] = useState<string>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const supabase = createClient()

  // Dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('opsboard-dark')
    if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark') }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('opsboard-dark', String(next))
  }

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get org membership
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (!membership) { setLoading(false); return }

    // Get org
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.org_id)
      .single()
    setOrg(orgData)

    // Get categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('org_id', membership.org_id)
      .order('sort_order')
    setCategories(cats ?? [])

    // Get tasks with categories
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*, category:categories(*)')
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })
    setTasks((taskData ?? []) as TaskWithCategory[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()

    // Realtime subscription
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData, supabase])

  // Filtering
  const visibleTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.category?.name === filter)

  const tasksByStatus: GroupedTasks = {}
  for (const s of STATUS_SECTIONS) {
    tasksByStatus[s.key] = visibleTasks.filter(t => t.status === s.key)
  }

  // Stats
  const activeCount = tasks.filter(t => t.status === 'active').length
  const urgentCount = tasks.filter(t => t.status === 'active' && (t.priority === 'urgent' || isDueSoon(t.due_date))).length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)] animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!org) {
    return <NoOrgSetup />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg)] border-b border-[var(--border)] backdrop-blur-sm bg-opacity-90">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">⬡</div>
            <div>
              <h1 className="font-bold text-sm leading-tight">OpsBoard</h1>
              <p className="text-xs text-[var(--muted)] hidden sm:block">{today}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">
                🔴 {urgentCount} urgent
              </span>
            )}
            <button
              onClick={toggleDark}
              className="btn-ghost px-2.5 py-1.5 text-base"
              title="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5">
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Task</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Active</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{urgentCount}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Urgent</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{doneCount}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Done</div>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-indigo-400'
            }`}
          >
            All ({tasks.filter(t => t.status === 'active').length})
          </button>
          {categories.map(cat => {
            const count = tasks.filter(t => t.status === 'active' && t.category?.id === cat.id).length
            const isActive = filter === cat.name
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(isActive ? 'all' : cat.name)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5"
                style={{
                  background: isActive ? cat.color : undefined,
                  color: isActive ? '#fff' : cat.color,
                  borderColor: cat.color + (isActive ? 'ff' : '66'),
                }}
              >
                <span className="w-2 h-2 rounded-full bg-current inline-block" />
                {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
          {STATUS_SECTIONS.filter(s => s.key !== 'done').map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                activeSection === s.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {s.icon} {s.label}
              {tasksByStatus[s.key].length > 0 && (
                <span className="ml-1 opacity-70">({tasksByStatus[s.key].length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div>
          {tasksByStatus[activeSection].length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)]">
              <div className="text-4xl mb-3">
                {activeSection === 'active' ? '🎉' : activeSection === 'waiting' ? '👍' : '✨'}
              </div>
              <p className="font-medium">
                {activeSection === 'active' ? 'Nothing active — add a task!' : 'Nothing here'}
              </p>
            </div>
          ) : (
            tasksByStatus[activeSection].map(task => (
              <TaskCard key={task.id} task={task} onUpdate={loadData} />
            ))
          )}
        </div>

        {/* Done section toggle */}
        <div className="mt-8">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors font-medium"
          >
            <span className={`transition-transform ${showDone ? 'rotate-90' : ''}`}>▶</span>
            Completed ({tasksByStatus.done.length})
          </button>
          {showDone && (
            <div className="mt-3">
              {tasksByStatus.done.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={loadData} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && org && (
        <AddTaskModal
          orgId={org.id}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function isDueSoon(dateStr: string | null) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  return d <= new Date(today.getTime() + 86400000)
}

function NoOrgSetup() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name, slug, owner_id: user.id })
      .select()
      .single()

    if (org) {
      await supabase.from('org_members').insert({ org_id: org.id, user_id: user.id, role: 'owner' })

      // Create default categories
      await supabase.from('categories').insert([
        { org_id: org.id, name: 'Abanteare LLC',    color: '#6366f1', sort_order: 1 },
        { org_id: org.id, name: 'Farfield Systems', color: '#0ea5e9', sort_order: 2 },
        { org_id: org.id, name: 'Punta Gorda Tide', color: '#f59e0b', sort_order: 3 },
        { org_id: org.id, name: 'Personal',         color: '#10b981', sort_order: 4 },
      ])
      window.location.reload()
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">⬡</div>
        <h2 className="text-xl font-bold mb-2">Set up your workspace</h2>
        <p className="text-sm text-[var(--muted)] mb-6">Give your workspace a name to get started.</p>
        <form onSubmit={createOrg} className="space-y-3">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ivan Roney" required />
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Creating…' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  )
}
