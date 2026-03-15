# Equallyy — Full Project Context

## What is Equallyy
An AI-powered expense splitting and trip planning app for friend groups in India.
Built with Next.js 15, Supabase, Claude API, Tailwind CSS, shadcn/ui.
Deployed on Vercel. Repo: github.com/prashantjan26/equallyy

## Tech Stack
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Hosting: Vercel
- Auth: Supabase Auth (Email + Google OAuth)

## Folder Structure
app/
  (auth)/login/page.tsx        -- Login + signup page
  dashboard/
    page.tsx                   -- Home dashboard
    layout.tsx                 -- Bottom nav layout (Home, Groups, Personal, Trips, Profile)
    groups/
      page.tsx                 -- Groups list
      new/page.tsx             -- Create new group
      [id]/
        page.tsx               -- Group detail (Expenses tab + Chat tab)
        add-expense/page.tsx   -- Add expense to group
        invite/page.tsx        -- Invite members (guest + invite link)
    personal/
      page.tsx                 -- Personal expenses list
      add/page.tsx             -- Add personal expense
    trips/
      page.tsx                 -- Trips list
      new/page.tsx             -- New trip + AI budget
    profile/page.tsx           -- User profile
  invite/[token]/page.tsx      -- Public invite link handler
  api/trip-budget/route.ts     -- Claude API for AI trip budget
lib/
  supabase.ts                  -- createClient() using @supabase/ssr
  auth.ts                      -- signUp, signIn, signOut, getUser helpers

## Database Schema (Supabase / PostgreSQL)

### auth.users (Supabase managed)
- id uuid (primary key)
- email text
- raw_user_meta_data jsonb (contains name, avatar_url from Google)

### public.users
- id uuid PK (references auth.users)
- name text
- email text unique
- phone text
- upi_id text
- avatar_url text
- created_at timestamptz

### public.groups
- id uuid PK default gen_random_uuid()
- name text NOT NULL
- type text default 'general' (trip/home/hangout/shopping/general)
- created_by uuid FK → users(id)
- created_at timestamptz

### public.group_members
- id uuid PK
- group_id uuid FK → groups(id) ON DELETE CASCADE
- user_id uuid FK → users(id) ON DELETE CASCADE (nullable for guests)
- role text default 'member' (admin/member)
- joined_at timestamptz
- guest_name text (for guests who don't have accounts)
- is_guest boolean default false
- invite_token text unique

### public.expenses
- id uuid PK
- group_id uuid FK → groups(id) ON DELETE CASCADE
- paid_by uuid FK → users(id)
- title text NOT NULL
- amount numeric NOT NULL
- category text default 'general'
- bill_image_url text
- created_at timestamptz

### public.expense_splits
- id uuid PK
- expense_id uuid FK → expenses(id) ON DELETE CASCADE
- user_id uuid FK → users(id) (nullable for guests)
- amount_owed numeric NOT NULL
- is_settled boolean default false
- settled_at timestamptz

### public.personal_expenses
- id uuid PK
- user_id uuid FK → users(id) ON DELETE CASCADE
- title text NOT NULL
- amount numeric NOT NULL
- category text default 'general'
- date date default current_date
- created_at timestamptz

### public.trips
- id uuid PK
- group_id uuid FK → groups(id) ON DELETE CASCADE
- destination text NOT NULL
- start_date date
- end_date date
- members_count integer
- ai_budget_estimate jsonb
- created_at timestamptz

### public.settlements
- id uuid PK
- from_user uuid FK → users(id)
- to_user uuid FK → users(id)
- group_id uuid FK → groups(id)
- amount numeric NOT NULL
- method text default 'manual'
- status text default 'pending'
- settled_at timestamptz

### public.group_messages
- id uuid PK
- group_id uuid FK → groups(id) ON DELETE CASCADE
- user_id uuid FK → users(id)
- content text NOT NULL
- type text default 'message' (message/expense_request/expense_added)
- is_resolved boolean default false
- expense_id uuid FK → expenses(id)
- created_at timestamptz

### public.group_invites
- id uuid PK
- group_id uuid FK → groups(id) ON DELETE CASCADE
- token text unique NOT NULL default gen_random_uuid()::text
- created_by uuid FK → users(id)
- expires_at timestamptz default now() + interval '7 days'
- is_active boolean default true
- created_at timestamptz

## Current RLS Policies

### groups
- INSERT: auth.uid() = created_by
- SELECT: created_by = auth.uid()

### group_members
- INSERT: true (allow all authenticated)
- SELECT: user_id = auth.uid() OR is_guest = true

### expenses
- INSERT: auth.uid() = paid_by
- SELECT: group_id in (select group_id from group_members where user_id = auth.uid())

### expense_splits
- INSERT: true
- SELECT: true

### personal_expenses
- ALL: auth.uid() = user_id

### group_messages
- INSERT: auth.uid() = user_id AND group_id in (select group_id from group_members where user_id = auth.uid())
- SELECT: group_id in (select group_id from group_members where user_id = auth.uid())

### group_invites
- INSERT: true
- SELECT: true

### users
- SELECT: auth.uid() = id
- INSERT: auth.uid() = id
- UPDATE: auth.uid() = id

## Auto-create user profile trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'name', new.email, new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

## Key Business Logic

### Guest Members
- Guests have is_guest=true, user_id=null, guest_name set
- They appear in expense splits with user_id=null
- They can claim their profile later when they join
- RLS allows inserting guests without user_id

### Expense Splitting
- Equal split: total amount / number of members
- Each split row: expense_id, user_id (null for guests), amount_owed
- Balances calculated by summing unsettled splits

### Invite Links
- Token stored in group_invites table
- Public URL: /invite/[token]
- On visit: if logged in → add to group, if not → redirect to login with redirect param

### AI Trip Budget
- POST /api/trip-budget
- Input: destination, startDate, endDate, members, budgetTier
- Uses ANTHROPIC_API_KEY env variable
- Returns JSON breakdown: flights, hotels, food, activities, total per person

## Environment Variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=

## Common Issues & Fixes
1. Infinite recursion in RLS: never reference group_members inside a group_members policy
2. Guest insert failing: make sure is_guest=true and user_id is not sent (null)
3. Foreign key violation on groups.created_by: user must exist in public.users first
4. expense_splits uses user_id not member_id
5. group_members has no created_at column — use joined_at instead