-- JOTTA STUDIOS VIP: executar uma única vez no SQL Editor do Supabase.
create table if not exists public.vip_orders(
 id uuid primary key,
 discord_user_id text not null,
 plan_id text not null check(plan_id in ('start','plus','elite','prime')),
 amount numeric(10,2) not null check(amount>0),
 preference_id text,
 status text not null default 'created',
 payment_id text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vip_orders_user_idx on public.vip_orders(discord_user_id,created_at desc);
create table if not exists public.vip_memberships(
 discord_user_id text primary key,
 plan_id text not null check(plan_id in ('start','plus','elite','prime')),
 valid_until timestamptz not null,
 last_payment_id text not null,
 updated_at timestamptz not null default now()
);
create index if not exists vip_memberships_expiry_idx on public.vip_memberships(valid_until);
alter table public.vip_orders enable row level security;
alter table public.vip_memberships enable row level security;
revoke all on public.vip_orders,public.vip_memberships from anon,authenticated;
grant all on public.vip_orders,public.vip_memberships to service_role;
create or replace function public.jotta_vip_approve(p_order uuid,p_payment text)
returns table(plan_id text,valid_until timestamptz)
language plpgsql security definer set search_path=public as $$
declare o public.vip_orders%rowtype; m public.vip_memberships%rowtype; until_date timestamptz;
begin
 select * into o from public.vip_orders where id=p_order for update;
 if not found then raise exception 'Pedido inexistente';end if;
 if o.status='approved' then
  return query select v.plan_id,v.valid_until from public.vip_memberships v where v.discord_user_id=o.discord_user_id;
  return;
 end if;
 if o.payment_id is not null and o.payment_id<>p_payment then raise exception 'Pagamento vinculado a outro pedido';end if;
 select * into m from public.vip_memberships where discord_user_id=o.discord_user_id for update;
 if found and m.plan_id=o.plan_id and m.valid_until>now() then
  until_date:=m.valid_until+interval '30 days';
 else
  until_date:=now()+interval '30 days';
 end if;
 update public.vip_orders set status='approved',payment_id=p_payment,updated_at=now() where id=o.id;
 insert into public.vip_memberships(discord_user_id,plan_id,valid_until,last_payment_id)
 values(o.discord_user_id,o.plan_id,until_date,p_payment)
 on conflict(discord_user_id) do update set
 plan_id=excluded.plan_id,valid_until=excluded.valid_until,last_payment_id=excluded.last_payment_id,updated_at=now();
 return query select o.plan_id,until_date;
end $$;
create or replace function public.jotta_vip_refund(p_order uuid)
returns void language plpgsql security definer set search_path=public as $$
declare o public.vip_orders%rowtype;
begin
 select * into o from public.vip_orders where id=p_order for update;
 if not found then return;end if;
 update public.vip_orders set status='refunded',updated_at=now() where id=p_order;
 update public.vip_memberships set valid_until=now(),updated_at=now()
 where discord_user_id=o.discord_user_id and last_payment_id=o.payment_id;
end $$;
revoke all on function public.jotta_vip_approve(uuid,text) from public,anon,authenticated;
revoke all on function public.jotta_vip_refund(uuid) from public,anon,authenticated;
grant execute on function public.jotta_vip_approve(uuid,text),public.jotta_vip_refund(uuid) to service_role;