export type TaskStatus = 'active' | 'waiting' | 'someday' | 'done'
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type OrgRole = 'owner' | 'admin' | 'member'

export interface Organization {
  id: string
  name: string
  slug: string
  owner_id: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  created_at: string
  profile?: Profile
}

export interface Category {
  id: string
  org_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  org_id: string
  category_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to: string | null
  created_by: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  category?: Category | null
  assignee?: Profile
}

export interface TaskWithCategory extends Task {
  category: Category | null
}

// Supabase generated types stub — replace with `supabase gen types` output if desired
export type Database = {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> }
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      org_members: { Row: OrgMember; Insert: Partial<OrgMember>; Update: Partial<OrgMember> }
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Category color map (matches DB seed data)
export const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'Abanteare LLC':    { dot: '#6366f1', bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
  'Farfield Systems': { dot: '#0ea5e9', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  'Punta Gorda Tide': { dot: '#f59e0b', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'Personal':         { dot: '#10b981', bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '🔴 Urgent',
  high:   '🟠 High',
  normal: '⚪ Normal',
  low:    '🔵 Low',
}
