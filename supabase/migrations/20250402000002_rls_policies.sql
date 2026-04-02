-- Row Level Security

alter table public.accounts enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.portfolio_summary_cache enable row level security;
alter table public.fx_overrides enable row level security;
alter table public.assets enable row level security;
alter table public.price_cache enable row level security;
alter table public.fx_rates enable row level security;

-- accounts
create policy "accounts_select_own"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "accounts_insert_own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "accounts_update_own"
  on public.accounts for update
  using (auth.uid() = user_id);

create policy "accounts_delete_own"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- holdings
create policy "holdings_select_own"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "holdings_insert_own"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "holdings_update_own"
  on public.holdings for update
  using (auth.uid() = user_id);

create policy "holdings_delete_own"
  on public.holdings for delete
  using (auth.uid() = user_id);

-- transactions
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- portfolio_snapshots
create policy "portfolio_snapshots_select_own"
  on public.portfolio_snapshots for select
  using (auth.uid() = user_id);

create policy "portfolio_snapshots_insert_own"
  on public.portfolio_snapshots for insert
  with check (auth.uid() = user_id);

create policy "portfolio_snapshots_update_own"
  on public.portfolio_snapshots for update
  using (auth.uid() = user_id);

create policy "portfolio_snapshots_delete_own"
  on public.portfolio_snapshots for delete
  using (auth.uid() = user_id);

-- portfolio_summary_cache
create policy "portfolio_summary_cache_select_own"
  on public.portfolio_summary_cache for select
  using (auth.uid() = user_id);

create policy "portfolio_summary_cache_upsert_own"
  on public.portfolio_summary_cache for insert
  with check (auth.uid() = user_id);

create policy "portfolio_summary_cache_update_own"
  on public.portfolio_summary_cache for update
  using (auth.uid() = user_id);

create policy "portfolio_summary_cache_delete_own"
  on public.portfolio_summary_cache for delete
  using (auth.uid() = user_id);

-- fx_overrides
create policy "fx_overrides_select_own"
  on public.fx_overrides for select
  using (auth.uid() = user_id);

create policy "fx_overrides_insert_own"
  on public.fx_overrides for insert
  with check (auth.uid() = user_id);

create policy "fx_overrides_update_own"
  on public.fx_overrides for update
  using (auth.uid() = user_id);

create policy "fx_overrides_delete_own"
  on public.fx_overrides for delete
  using (auth.uid() = user_id);

-- assets: readable by any authenticated user; writes for onboarding new symbols
create policy "assets_select_authenticated"
  on public.assets for select
  to authenticated
  using (true);

create policy "assets_insert_authenticated"
  on public.assets for insert
  to authenticated
  with check (true);

-- Updates to the global catalog should go through admin/service tooling only.

-- price_cache: public read-only (anon + authenticated)
create policy "price_cache_select_public"
  on public.price_cache for select
  using (true);

-- fx_rates: public read-only
create policy "fx_rates_select_public"
  on public.fx_rates for select
  using (true);

-- Note: INSERT/UPDATE on price_cache and fx_rates have no policies for anon/authenticated,
-- so only the service role (bypasses RLS) can refresh quotes from secure server jobs.
