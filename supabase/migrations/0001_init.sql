-- TDI Guestbook schema
-- Run this in the Supabase SQL editor, or via `supabase db push` after linking your project.

-- =====================
-- Extensions
-- =====================
create extension if not exists "pgcrypto";

-- =====================
-- Tables
-- =====================

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(message) between 1 and 2000),
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false
);

-- One like per visitor per post (visitor_id is a random id stored in localStorage)
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

-- All emails collected from post submissions + explicit subscribers
create table if not exists public.subscribers (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text,
  source text not null default 'guestpost',
  created_at timestamptz not null default now(),
  unsubscribed boolean not null default false
);

-- Simple pageview analytics
create table if not exists public.analytics_events (
  id bigserial primary key,
  event text not null,             -- 'pageview', 'post_view', 'like', 'comment', etc.
  path text,
  referrer text,
  visitor_id text,
  user_agent text,
  country text,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists analytics_created_at_idx on public.analytics_events (created_at desc);

-- =====================
-- View: post with counts
-- =====================
create or replace view public.posts_with_counts as
select
  p.*,
  coalesce((select count(*) from public.likes l where l.post_id = p.id), 0) as like_count,
  coalesce((select count(*) from public.comments c where c.post_id = p.id and not c.is_hidden), 0) as comment_count
from public.posts p;

-- =====================
-- Storage bucket for media
-- =====================
insert into storage.buckets (id, name, public)
values ('guestbook-media', 'guestbook-media', true)
on conflict (id) do nothing;

-- =====================
-- Row Level Security
-- =====================
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.subscribers enable row level security;
alter table public.analytics_events enable row level security;

-- Public read of non-hidden posts and comments
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts
  for select using (not is_hidden);

drop policy if exists "public read comments" on public.comments;
create policy "public read comments" on public.comments
  for select using (not is_hidden);

drop policy if exists "public read likes" on public.likes;
create policy "public read likes" on public.likes
  for select using (true);

-- Anonymous inserts (the site allows guests to post)
drop policy if exists "anon insert posts" on public.posts;
create policy "anon insert posts" on public.posts
  for insert with check (true);

drop policy if exists "anon insert comments" on public.comments;
create policy "anon insert comments" on public.comments
  for insert with check (true);

drop policy if exists "anon insert likes" on public.likes;
create policy "anon insert likes" on public.likes
  for insert with check (true);

drop policy if exists "anon delete likes" on public.likes;
create policy "anon delete likes" on public.likes
  for delete using (true); -- unlike: restricted further in app logic by visitor_id

drop policy if exists "anon insert subscribers" on public.subscribers;
create policy "anon insert subscribers" on public.subscribers
  for insert with check (true);

drop policy if exists "anon insert analytics" on public.analytics_events;
create policy "anon insert analytics" on public.analytics_events
  for insert with check (true);

-- Admin operations all run with the service-role key from the server,
-- which bypasses RLS. No extra policies needed for admin.

-- Storage bucket policies (public read, anon insert)
drop policy if exists "public read guestbook media" on storage.objects;
create policy "public read guestbook media" on storage.objects
  for select using (bucket_id = 'guestbook-media');

drop policy if exists "anon upload guestbook media" on storage.objects;
create policy "anon upload guestbook media" on storage.objects
  for insert with check (bucket_id = 'guestbook-media');
