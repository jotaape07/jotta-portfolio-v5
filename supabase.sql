-- Execute no SQL Editor do SEU projeto Supabase.
create table if not exists public.site_config (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);
-- Evite expor este conteúdo via chave anon/public.
alter table public.site_config enable row level security;
-- Não crie policies de acesso público. O backend usa apenas service role.
