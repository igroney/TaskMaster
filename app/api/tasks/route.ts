/**
 * OpsBoard Task API — called by Claude (remote/dispatch) or any trusted client
 *
 * Auth: Bearer token via CLAUDE_API_KEY env var
 *       Set the same key in your Claude MCP / remote function config
 *
 * GET  /api/tasks           — list tasks (filter by status, category)
 * POST /api/tasks           — create a task
 * PATCH /api/tasks          — update a task (pass id in body)
 * DELETE /api/tasks?id=...  — delete a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { TaskStatus, TaskPriority } from '@/lib/types'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorize(req: NextRequest): boolean {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) return false
  const auth = req.headers.get('authorization') ?? ''
  const key = req.headers.get('x-api-key') ?? ''
  return auth === `Bearer ${apiKey}` || key === apiKey
}

// ── GET /api/tasks ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')         // filter by status
  const category = searchParams.get('category')     // filter by category name
  const orgSlug = searchParams.get('org') ?? null   // optional org slug

  const supabase = getServiceClient()
  let query = supabase
    .from('tasks')
    .select('*, category:categories(name, color)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  if (orgSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()
    if (org) query = query.eq('org_id', org.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by category name if requested
  const filtered = category
    ? data?.filter(t => (t.category as { name: string } | null)?.name?.toLowerCase().includes(category.toLowerCase()))
    : data

  return NextResponse.json({ tasks: filtered, count: filtered?.length ?? 0 })
}

// ── POST /api/tasks ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title,
    description,
    category,       // category name (we'll look up the ID)
    priority = 'normal',
    status = 'active',
    due_date,
    assigned_to_email,
    org_slug,
  } = body

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const supabase = getServiceClient()

  // Resolve org — use first org or find by slug
  let orgId: string | null = null
  if (org_slug) {
    const { data } = await supabase.from('organizations').select('id').eq('slug', org_slug).single()
    orgId = data?.id ?? null
  } else {
    const { data } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = data?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

  // Resolve category
  let categoryId: string | null = null
  if (category) {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('org_id', orgId)
    const match = cats?.find(c => c.name.toLowerCase().includes(category.toLowerCase()))
    categoryId = match?.id ?? null
  }

  // Resolve assigned user
  let assignedTo: string | null = null
  if (assigned_to_email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', assigned_to_email)
      .single()
    assignedTo = profile?.id ?? null
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      org_id: orgId,
      category_id: categoryId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
      due_date: due_date ?? null,
      assigned_to: assignedTo,
    })
    .select('*, category:categories(name, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task, message: `Task "${task.title}" created successfully` }, { status: 201 })
}

// ── PATCH /api/tasks ─────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = getServiceClient()

  // If marking done, set completed_at
  if (updates.status === 'done') updates.completed_at = new Date().toISOString()
  if (updates.status && updates.status !== 'done') updates.completed_at = null

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select('*, category:categories(name, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task, message: `Task updated` })
}

// ── DELETE /api/tasks ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

  const supabase = getServiceClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Task deleted' })
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  })
}
