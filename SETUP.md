# OpsBoard — Setup Guide

## What you have
- **Next.js 15** app with App Router + TypeScript + Tailwind CSS
- **Supabase** for database, auth, and real-time updates
- **Vercel**-ready (auto-deploys from GitHub)
- **PWA** — installs on iPhone from Safari, no App Store needed
- **Claude API endpoint** at `/api/tasks` for remote task creation

---

## Step 1 — Run the Supabase schema

1. Open your Supabase project: https://ohuezxanactnsamrepva.supabase.co
2. Go to **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`

---

## Step 2 — Get your Supabase keys

In your Supabase project go to **Settings → API**:
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## Step 3 — Push to GitHub

```bash
cd opsboard
git init
git add .
git commit -m "Initial OpsBoard setup"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

---

## Step 4 — Deploy to Vercel

1. Go to https://vercel.com → **New Project** → import your GitHub repo
2. Add these **Environment Variables** in Vercel project settings:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ohuezxanactnsamrepva.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from Supabase Settings → API)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase Settings → API, keep secret)* |
| `CLAUDE_API_KEY` | *(any random string — run `openssl rand -hex 32`)* |

3. Click **Deploy**. Vercel auto-deploys every time you push to GitHub.

---

## Step 5 — Create your account & seed data

1. Visit your Vercel URL → you'll be redirected to `/login`
2. Sign up with your email
3. Go to Supabase **Authentication → Users**, copy your new user's UUID
4. In the SQL Editor, uncomment the seed block at the bottom of `schema.sql`,
   replace `'YOUR-USER-UUID'` with your actual UUID, and run it
5. Refresh the dashboard — your tasks will appear, color-coded and ready

---

## Step 6 — Install as iPhone app (PWA)

1. Open your Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add** — OpsBoard installs like a native app, no App Store needed

---

## Step 7 — Connect Claude (remote task creation)

The `/api/tasks` endpoint accepts requests from Claude's remote/dispatch system.

**Base URL:** `https://your-app.vercel.app/api/tasks`
**Auth header:** `x-api-key: YOUR_CLAUDE_API_KEY`

### Example: create a task
```json
POST /api/tasks
{
  "title": "Follow up with Ava Morales on Lakeland proposal",
  "category": "Abanteare",
  "priority": "high",
  "due_date": "2026-03-28"
}
```

### Example: list active tasks
```
GET /api/tasks?status=active
```

### Example: mark task done
```json
PATCH /api/tasks
{
  "id": "task-uuid-here",
  "status": "done"
}
```

---

## Inviting team members

1. Have them visit your Vercel URL and sign up
2. In Supabase SQL Editor, run:
```sql
insert into org_members (org_id, user_id, role)
values ('YOUR-ORG-ID', 'THEIR-USER-UUID', 'member');
```
They'll immediately see the shared task board. Owners/admins can add tasks for anyone.

---

## Local development

```bash
cd opsboard
cp .env.local.example .env.local
# Fill in your keys in .env.local
npm install
npm run dev
# Open http://localhost:3000
```
