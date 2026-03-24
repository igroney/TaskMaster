-- ============================================================
-- OpsBoard Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Organizations ─────────────────────────────────────────
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── Profiles (extends auth.users) ─────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Org Members ───────────────────────────────────────────
create table if not exists org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member',  -- 'owner' | 'admin' | 'member'
  created_at  timestamptz default now(),
  unique(org_id, user_id)
);

-- ── Categories ────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ── Tasks ─────────────────────────────────────────────────
create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  category_id   uuid references categories(id) on delete set null,
  title         text not null,
  description   text,
  status        text not null default 'active',   -- 'active' | 'waiting' | 'someday' | 'done'
  priority      text not null default 'normal',   -- 'urgent' | 'high' | 'normal' | 'low'
  due_date      date,
  assigned_to   uuid references auth.users(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  completed_at  timestamptz,
  sort_order    int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute procedure update_updated_at();

-- ── Row Level Security ────────────────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table org_members enable row level security;
alter table categories enable row level security;
alter table tasks enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Organizations: members can see their orgs
create policy "orgs_select" on organizations for select
  using (id in (select org_id from org_members where user_id = auth.uid()));

create policy "orgs_insert" on organizations for insert
  with check (owner_id = auth.uid());

-- Org members: members can see others in their org
create policy "org_members_select" on org_members for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "org_members_insert" on org_members for insert
  with check (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and role in ('owner','admin')
  ));

-- Categories: all org members can view; owners/admins can manage
create policy "categories_select" on categories for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "categories_insert" on categories for insert
  with check (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and role in ('owner','admin')
  ));

-- Tasks: all org members can view; assigned/creator can update
create policy "tasks_select" on tasks for select
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "tasks_insert" on tasks for insert
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "tasks_update" on tasks for update
  using (org_id in (select org_id from org_members where user_id = auth.uid()));

create policy "tasks_delete" on tasks for delete
  using (
    created_by = auth.uid()
    or org_id in (
      select org_id from org_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ── Realtime ─────────────────────────────────────────────
-- Enable realtime on tasks so the dashboard updates live
alter publication supabase_realtime add table tasks;

-- ── Seed Data ────────────────────────────────────────────
-- Run this AFTER you create your first user account.
-- Replace 'YOUR-USER-UUID' with your actual auth.users id
-- (find it in Supabase Dashboard > Authentication > Users)

/*
do $$
declare
  v_user_id   uuid := 'YOUR-USER-UUID';
  v_org_id    uuid := gen_random_uuid();
  v_cat_ab    uuid := gen_random_uuid();
  v_cat_ff    uuid := gen_random_uuid();
  v_cat_pgt   uuid := gen_random_uuid();
  v_cat_per   uuid := gen_random_uuid();
begin
  -- Create org
  insert into organizations (id, name, slug, owner_id)
  values (v_org_id, 'Ivan Roney', 'ivan-roney', v_user_id);

  -- Add owner as member
  insert into org_members (org_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  -- Create categories
  insert into categories (id, org_id, name, color, sort_order) values
    (v_cat_ab,  v_org_id, 'Abanteare LLC',    '#6366f1', 1),
    (v_cat_ff,  v_org_id, 'Farfield Systems', '#0ea5e9', 2),
    (v_cat_pgt, v_org_id, 'Punta Gorda Tide', '#f59e0b', 3),
    (v_cat_per, v_org_id, 'Personal',         '#10b981', 4);

  -- Seed active tasks
  insert into tasks (org_id, category_id, title, description, status, priority, due_date, created_by) values
    (v_org_id, v_cat_ab, 'DOJ ATF Federated Search RFI', 'MRAS RFI response. Enterprise info architecture, secure API integration, advanced data retrieval.', 'active', 'urgent', '2026-03-25', v_user_id),
    (v_org_id, v_cat_ab, 'DOE NNSA DNA-P RFI', 'MRAS RFI response. Data visualization/analytics platform.', 'active', 'high', '2026-03-26', v_user_id),
    (v_org_id, v_cat_ab, 'DOE Workload Analysis RFI', 'MRAS RFI response. WAPA office workload analysis.', 'active', 'high', '2026-03-26', v_user_id),
    (v_org_id, v_cat_ab, 'US DOL SWARAS Sources Sought', 'Capability response to Vickerman.James.P@dol.gov. O&M, FISMA Moderate, Agile SDLC, 508 compliance. 5-page limit.', 'active', 'high', '2026-03-27', v_user_id),
    (v_org_id, v_cat_ab, 'Review remaining MRAS RFIs', 'Navy NAVSUP Lucent, DHS USCG OTIS, NRC FISMA Audits, USSF Oracle, HHS Dual Eligible, GSA PQC, HHS ACF Baby FACES.', 'active', 'normal', null, v_user_id),
    (v_org_id, v_cat_ab, 'SAM Registration Renewal', 'Abanteare LLC SAM renewal is due. CAGE CODE RZ36RDN475S3.', 'active', 'high', null, v_user_id),
    (v_org_id, v_cat_ab, 'City of Lakeland proposal', 'GovPointe follow-up re: cloud-based budget software replacement. Ava Morales reached out.', 'active', 'normal', null, v_user_id),
    (v_org_id, v_cat_ab, 'Review GSA eBuy notices', 'High volume of eBuy bid notifications on contract 47QTCA25D00FJ. Triage for relevant opportunities.', 'active', 'normal', null, v_user_id),
    (v_org_id, v_cat_ff, 'Plan travel for SOFWERX event (Mar 31)', 'J2 ISP Autonomous Solutions CE in Tampa, FL. 9am-4pm ET at SOFWERX (1925 E 2nd Ave Suite 102). Book lodging, flights, etc.', 'active', 'high', '2026-03-31', v_user_id),
    (v_org_id, v_cat_ff, 'Review MOSA Innovation Challenge', 'Submissions close March 27. Evaluate if Farfield should apply.', 'active', 'high', '2026-03-27', v_user_id),
    (v_org_id, v_cat_ff, 'Complete Mercury banking application', 'Account connected via Plaid/BoA. Finish application.', 'active', 'normal', null, v_user_id),
    (v_org_id, v_cat_pgt, 'Resolve payment with David Tabb', 'Stripe payment links for team purchase & 2026 entry dues giving an error. Waiting on David to fix.', 'waiting', 'normal', null, v_user_id),
    (v_org_id, v_cat_pgt, 'Share Minor League registration link', 'Share with the community: https://swishtournaments.com/...', 'active', 'normal', null, v_user_id),
    (v_org_id, v_cat_per, 'VA disability claim', 'Working with Tracy Grigg at Anchored4Vets. Sent medical history summary, awaiting next steps.', 'active', 'normal', null, v_user_id);

  raise notice 'Seed complete. Org ID: %', v_org_id;
end $$;
*/
