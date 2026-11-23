alter table public.listings
  add column if not exists status text not null default 'available'
  constraint listings_status_check check (status in ('available', 'sold')),
  add column if not exists sold_at timestamptz;

create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_seller_email_normalized
  on public.listings(lower(seller_email));

create table if not exists public.seller_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  stripe_account_id text not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  onboarding_completed boolean not null default false,
  readiness_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_accounts_stripe_id_format'
      and conrelid = 'public.seller_accounts'::regclass
  ) then
    alter table public.seller_accounts
      add constraint seller_accounts_stripe_id_format
      check (stripe_account_id like 'acct_%');
  end if;
end $$;

create unique index if not exists idx_seller_accounts_email
  on public.seller_accounts(lower(seller_email));
create unique index if not exists idx_seller_accounts_stripe_id
  on public.seller_accounts(stripe_account_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_email text,
  seller_email text not null,
  stripe_account_id text not null,
  checkout_session_id text not null,
  payment_intent_id text,
  amount integer not null check (amount > 0),
  currency text not null check (currency = upper(currency)),
  application_fee_amount integer not null check (application_fee_amount >= 0),
  seller_proceeds integer not null check (seller_proceeds >= 0),
  payment_status text not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists idx_orders_checkout_session
  on public.orders(checkout_session_id);
create unique index if not exists idx_orders_listing
  on public.orders(listing_id);
create index if not exists idx_orders_seller_email
  on public.orders(lower(seller_email));
create index if not exists idx_orders_payment_intent
  on public.orders(payment_intent_id)
  where payment_intent_id is not null;

create table if not exists public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  checkout_session_id text not null,
  payment_intent_id text,
  stripe_account_id text not null,
  buyer_email text,
  seller_email text not null,
  amount integer not null,
  currency text not null,
  application_fee_amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_payment_reconciliations_checkout
  on public.payment_reconciliations(checkout_session_id);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.seller_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.payment_reconciliations enable row level security;
alter table public.stripe_events enable row level security;

revoke all on table public.seller_accounts from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.payment_reconciliations from anon, authenticated;
revoke all on table public.stripe_events from anon, authenticated;

grant select, insert, update on table public.seller_accounts to service_role;
grant select on table public.orders to service_role;
grant select on table public.listings to service_role;

create or replace function public.complete_paid_listing_order(
  p_event_id text,
  p_listing_id uuid,
  p_buyer_email text,
  p_seller_email text,
  p_stripe_account_id text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_application_fee_amount integer,
  p_seller_proceeds integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_existing_order record;
begin
  if exists (select 1 from public.stripe_events where event_id = p_event_id) then
    return 'duplicate_event';
  end if;

  select * into v_existing_order
  from public.orders
  where checkout_session_id = p_checkout_session_id;

  if v_existing_order.id is not null then
    insert into public.stripe_events(event_id, event_type)
    values (p_event_id, 'checkout.session.completed');
    return 'duplicate_checkout';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if v_listing.id is null then
    return 'missing_listing';
  end if;

  if lower(v_listing.seller_email) <> lower(p_seller_email) then
    return 'seller_mismatch';
  end if;

  if v_listing.status = 'available' then
    insert into public.orders (
      listing_id, buyer_email, seller_email, stripe_account_id,
      checkout_session_id, payment_intent_id, amount, currency,
      application_fee_amount, seller_proceeds, payment_status, paid_at
    ) values (
      p_listing_id, p_buyer_email, lower(p_seller_email), p_stripe_account_id,
      p_checkout_session_id, p_payment_intent_id, p_amount, upper(p_currency),
      p_application_fee_amount, p_seller_proceeds, 'paid', now()
    );

    update public.listings
    set status = 'sold', sold_at = now(), updated_at = now()
    where id = p_listing_id;

    insert into public.stripe_events(event_id, event_type)
    values (p_event_id, 'checkout.session.completed');
    return 'sold';
  end if;

  insert into public.payment_reconciliations (
    listing_id, checkout_session_id, payment_intent_id, stripe_account_id,
    buyer_email, seller_email, amount, currency,
    application_fee_amount, reason
  ) values (
    p_listing_id, p_checkout_session_id, p_payment_intent_id, p_stripe_account_id,
    p_buyer_email, lower(p_seller_email), p_amount, upper(p_currency),
    p_application_fee_amount, 'listing_already_sold'
  )
  on conflict (checkout_session_id) do nothing;

  insert into public.stripe_events(event_id, event_type)
  values (p_event_id, 'checkout.session.completed')
  on conflict (event_id) do nothing;
  return 'reconciliation_required';
end;
$$;

grant execute on function public.complete_paid_listing_order(
  text, uuid, text, text, text, text, text, integer, text, integer, integer
) to service_role;

revoke all on function public.complete_paid_listing_order(
  text, uuid, text, text, text, text, text, integer, text, integer, integer
) from public, anon, authenticated;
