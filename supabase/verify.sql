-- Portfolio tracker schema verification (PASS/FAIL)

with required_tables(name) as (values
  ('profiles'),('assets'),('transactions'),('latest_prices_cache'),('fx_rates_cache'),('portfolio_snapshots')
), missing as (
  select r.name from required_tables r
  left join information_schema.tables t on t.table_schema='public' and t.table_name=r.name
  where t.table_name is null
)
select 'tables_exist' as check_name, case when exists(select 1 from missing) then 'FAIL' else 'PASS' end as status, coalesce((select json_agg(name) from missing),'[]'::json) as details;

with required_indexes(name) as (values
  ('idx_transactions_user_date'),
  ('idx_snapshots_user_date')
), missing as (
  select r.name
  from required_indexes r
  left join pg_indexes i on i.schemaname='public' and i.indexname=r.name
  where i.indexname is null
)
select 'indexes_exist' as check_name, case when exists(select 1 from missing) then 'FAIL' else 'PASS' end as status, coalesce((select json_agg(name) from missing),'[]'::json) as details;

with required_rls(name) as (values
  ('profiles'),('transactions'),('portfolio_snapshots'),('assets'),('latest_prices_cache'),('fx_rates_cache')
), off_tables as (
  select r.name
  from required_rls r
  left join pg_class c on c.relname=r.name
  left join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
  where coalesce(c.relrowsecurity,false)=false
)
select 'rls_enabled' as check_name, case when exists(select 1 from off_tables) then 'FAIL' else 'PASS' end as status, coalesce((select json_agg(name) from off_tables),'[]'::json) as details;

with required_policies(policy, tbl) as (values
  ('profiles_own_rows','profiles'),
  ('transactions_own_rows','transactions'),
  ('snapshots_own_rows','portfolio_snapshots'),
  ('assets_read_authenticated','assets'),
  ('prices_read_authenticated','latest_prices_cache'),
  ('fx_read_authenticated','fx_rates_cache')
), missing as (
  select r.policy, r.tbl
  from required_policies r
  left join pg_policies p on p.schemaname='public' and p.tablename=r.tbl and p.policyname=r.policy
  where p.policyname is null
)
select 'policies_exist' as check_name, case when exists(select 1 from missing) then 'FAIL' else 'PASS' end as status, coalesce((select json_agg(json_build_object('policy',policy,'table',tbl)) from missing),'[]'::json) as details;

with checks as (
  select case when count(*)=6 then 'PASS' else 'FAIL' end as status
  from information_schema.tables
  where table_schema='public' and table_name in ('profiles','assets','transactions','latest_prices_cache','fx_rates_cache','portfolio_snapshots')

  union all

  select case when count(*)=2 then 'PASS' else 'FAIL' end as status
  from pg_indexes
  where schemaname='public' and indexname in ('idx_transactions_user_date','idx_snapshots_user_date')

  union all

  select case when count(*)=6 then 'PASS' else 'FAIL' end as status
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('profiles','transactions','portfolio_snapshots','assets','latest_prices_cache','fx_rates_cache') and c.relrowsecurity

  union all

  select case when count(*)=6 then 'PASS' else 'FAIL' end as status
  from pg_policies
  where schemaname='public' and policyname in ('profiles_own_rows','transactions_own_rows','snapshots_own_rows','assets_read_authenticated','prices_read_authenticated','fx_read_authenticated')
)
select 'overall' as check_name, case when bool_and(status='PASS') then 'PASS' else 'FAIL' end as status, json_agg(status) as details from checks;
