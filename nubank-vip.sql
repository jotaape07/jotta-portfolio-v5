-- JOTTA STUDIOS — PIX NUBANK MANUAL
-- Execute no SQL Editor do Supabase com seus responsáveis.
-- Não armazena comprovante, CPF, nome do pagador ou dados bancários.
-- Conteúdo público do portfólio, migrado para banco persistente.
-- IMPORTANTE: exporte o backup JSON do painel ANTES de configurar o Supabase,
-- depois importe e publique o backup para preservar alterações.
create table if not exists public.site_config (
 id text primary key,
 content jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
revoke all on public.site_config from anon,authenticated;
grant all on public.site_config to service_role;

create table if not exists public.vip_memberships (
 discord_user_id text primary key check (discord_user_id ~ '^[0-9]{16,22}$'),
 plan_id text not null check(plan_id in ('start','plus','elite','prime')),
 valid_until timestamptz not null,
 last_payment_id text not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.vip_manual_orders (
 id uuid primary key,
 discord_user_id text not null check (discord_user_id ~ '^[0-9]{16,22}$'),
 plan_id text not null check(plan_id in ('start','plus','elite','prime')),
 amount numeric(10,2) not null check(amount between 1 and 1000),
 status text not null default 'awaiting_payment'
   check(status in ('awaiting_payment','awaiting_review','approved','rejected','cancelled')),
 bank_reference text unique,
 buyer_reference text,
 reviewed_at timestamptz,
 role_synced boolean not null default false,
 terms_version text not null default '2026-10-28',
 terms_accepted_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vip_manual_user_idx on public.vip_manual_orders(discord_user_id,created_at desc);
create unique index if not exists vip_manual_one_pending_idx on public.vip_manual_orders(discord_user_id) where status in ('awaiting_payment','awaiting_review');
create index if not exists vip_manual_review_idx on public.vip_manual_orders(status,created_at desc);
create index if not exists vip_memberships_expiry_idx on public.vip_memberships(valid_until);
alter table public.vip_manual_orders enable row level security;
alter table public.vip_memberships enable row level security;
revoke all on public.vip_manual_orders, public.vip_memberships from anon,authenticated;
grant all on public.vip_manual_orders, public.vip_memberships to service_role;

-- A transação só é aprovada pelo endpoint administrativo autenticado,
-- após conferência real do crédito no Nubank.
create or replace function public.jotta_manual_vip_approve(p_order uuid,p_reference text)
returns table(plan_id text, valid_until timestamptz)
language plpgsql security definer set search_path=public as $$
declare o public.vip_manual_orders%rowtype;
        m public.vip_memberships%rowtype;
        expiry timestamptz;
        reference_clean text;
begin
 reference_clean:=trim(p_reference);
 if length(reference_clean)<8 or length(reference_clean)>120 then
  raise exception 'Referência bancária inválida.';
 end if;
 select * into o from public.vip_manual_orders where id=p_order for update;
 if not found then raise exception 'Pedido não encontrado'; end if;
 if o.status='approved' then
  if o.bank_reference is distinct from reference_clean then
   raise exception 'Pedido já aprovado com outra transação';
  end if;
  return query select v.plan_id,v.valid_until from public.vip_memberships v where v.discord_user_id=o.discord_user_id;
  return;
 end if;
 if o.status<>'awaiting_review' then
  raise exception 'O cliente ainda não enviou o pedido para conferência';
 end if;
 -- Evita concorrência em compras do mesmo usuário.
 perform pg_advisory_xact_lock(hashtext(o.discord_user_id));
 select * into m from public.vip_memberships where discord_user_id=o.discord_user_id for update;
 if found and m.plan_id=o.plan_id and m.valid_until>now() then
  expiry:=m.valid_until+interval '30 days';
 else
  expiry:=now()+interval '30 days';
 end if;
 update public.vip_manual_orders set status='approved',bank_reference=reference_clean,
  reviewed_at=now(),updated_at=now(),role_synced=false where id=o.id;
 insert into public.vip_memberships(discord_user_id,plan_id,valid_until,last_payment_id)
  values(o.discord_user_id,o.plan_id,expiry,reference_clean)
 on conflict(discord_user_id) do update set plan_id=excluded.plan_id,
  valid_until=excluded.valid_until,last_payment_id=excluded.last_payment_id,updated_at=now();
 return query select o.plan_id,expiry;
end $$;
revoke all on function public.jotta_manual_vip_approve(uuid,text) from public,anon,authenticated;
grant execute on function public.jotta_manual_vip_approve(uuid,text) to service_role;

-- Atualiza o cache das tabelas do PostgREST após alterações executadas no SQL Editor.
notify pgrst, 'reload schema';
