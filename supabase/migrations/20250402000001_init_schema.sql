-- Portfolio tracker core schema (Supabase Postgres)
-- Run via Supabase CLI or SQL Editor after linking project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- accounts: broker / wallet / bank platforms
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- assets: normalized instruments (symbol + exchange + asset_type)
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  asset_type text not null,
  exchange text not null,
  currency text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assets_symbol_exchange_type_uniq unique (symbol, exchange, asset_type)
);

create index if not exists assets_symbol_idx on public.assets (symbol);
create index if not exists assets_exchange_idx on public.assets (exchange);

-- ---------------------------------------------------------------------------
-- holdings: derived from transactions (application-maintained)
-- ---------------------------------------------------------------------------
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete restrict,
  quantity numeric not null default 0,
  avg_buy_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holdings_account_asset_uniq unique (account_id, asset_id)
);

create index if not exists holdings_user_id_idx on public.holdings (user_id);

-- ---------------------------------------------------------------------------
-- transactions: source of truth for positions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null,
  quantity numeric not null default 0,
  price numeric not null default 0,
  fee numeric not null default 0,
  currency text not null,
  ts timestamptz not null default now(),
  constraint transactions_type_chk check (
    type in ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND')
  )
);

create index if not exists transactions_user_ts_idx on public.transactions (user_id, ts desc);
create index if not exists transactions_account_idx on public.transactions (account_id);

-- ---------------------------------------------------------------------------
-- price_cache: latest quotes (global)
-- ---------------------------------------------------------------------------
create table if not exists public.price_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  price numeric not null,
  currency text not null,
  source text not null,
  last_updated timestamptz not null default now(),
  constraint price_cache_symbol_uniq unique (symbol)
);

-- ---------------------------------------------------------------------------
-- fx_rates: global FX table
-- ---------------------------------------------------------------------------
create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  target_currency text not null,
  rate numeric not null,
  updated_at timestamptz not null default now(),
  constraint fx_rates_pair_uniq unique (base_currency, target_currency)
);

-- ---------------------------------------------------------------------------
-- portfolio_snapshots: historical NAV (FX-adjusted)
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null,
  net_worth_usd numeric not null,
  net_worth_ngn numeric not null,
  net_worth_ghs numeric not null,
  created_at timestamptz not null default now(),
  constraint portfolio_snapshots_user_date_uniq unique (user_id, snapshot_date)
);

create index if not exists portfolio_snapshots_user_date_idx
  on public.portfolio_snapshots (user_id, snapshot_date desc);

-- ---------------------------------------------------------------------------
-- portfolio_summary_cache: last computed summary for fast dashboard loads
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_summary_cache (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- optional future: manual FX overrides (architecture hook)
-- ---------------------------------------------------------------------------
create table if not exists public.fx_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  base_currency text not null,
  target_currency text not null,
  rate numeric not null,
  updated_at timestamptz not null default now(),
  constraint fx_overrides_user_pair_uniq unique (user_id, base_currency, target_currency)
);

create index if not exists fx_overrides_user_idx on public.fx_overrides (user_id);

-- Touch holdings.updated_at
create or replace function public.set_holdings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists holdings_set_updated_at on public.holdings;
create trigger holdings_set_updated_at
before update on public.holdings
for each row execute procedure public.set_holdings_updated_at();
