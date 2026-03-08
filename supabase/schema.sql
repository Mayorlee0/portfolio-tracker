-- Portfolio Tracker MVP schema (Auth + DB + RLS)

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_currency text not null default 'USD' check (display_currency in ('USD','EUR','NGN','GHS')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_asset_id text not null,
  symbol text not null,
  name text not null,
  asset_class text not null check (asset_class in ('crypto','stock','cash')),
  created_at timestamptz not null default now(),
  unique(provider, provider_asset_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references public.assets(id),
  executed_at date not null,
  tx_type text not null check (tx_type in ('buy','sell','deposit','withdraw')),
  asset_class text not null check (asset_class in ('crypto','stock','cash')),
  symbol text not null,
  quantity numeric not null check (quantity >= 0),
  price numeric not null check (price >= 0),
  currency text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.latest_prices_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_asset_id text not null,
  symbol text not null,
  price numeric not null,
  currency text not null,
  change24h numeric,
  change7d numeric,
  change30d numeric,
  as_of timestamptz not null,
  created_at timestamptz not null default now(),
  unique(provider, provider_asset_id)
);

create table if not exists public.fx_rates_cache (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric not null,
  as_of date not null,
  created_at timestamptz not null default now(),
  unique(base_currency, quote_currency, as_of)
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value_usd numeric not null,
  created_at timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, executed_at desc);
create index if not exists idx_snapshots_user_date on public.portfolio_snapshots(user_id, snapshot_date desc);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.portfolio_snapshots enable row level security;

create policy "profiles_own_rows" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_own_rows" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "snapshots_own_rows" on public.portfolio_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assets/prices/fx tables are read-only for authenticated users in MVP.
alter table public.assets enable row level security;
alter table public.latest_prices_cache enable row level security;
alter table public.fx_rates_cache enable row level security;

create policy "assets_read_authenticated" on public.assets
  for select to authenticated using (true);

create policy "prices_read_authenticated" on public.latest_prices_cache
  for select to authenticated using (true);

create policy "fx_read_authenticated" on public.fx_rates_cache
  for select to authenticated using (true);
