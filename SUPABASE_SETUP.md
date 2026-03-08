# Supabase setup (backend auto-connect mode)

This repo now auto-connects to Supabase in code using the public URL + anon key.

## 1) Run schema SQL

1. Open Supabase SQL editor.
2. Paste `supabase/schema.sql` and execute.
3. Confirm tables exist:
   - `profiles`, `assets`, `transactions`, `latest_prices_cache`, `fx_rates_cache`, `portfolio_snapshots`
4. Run `supabase/verify.sql` to get PASS/FAIL checks for tables, indexes, RLS, and policies.

## Why your Supabase table editor may look empty

If you just created a new Supabase project, seeing **no tables** in `public` is expected.
The app does not auto-create DB schema from the browser.
You must run the SQL migration manually:

1. Open **SQL Editor** in Supabase.
2. Run `supabase/schema.sql` from this repo.
3. Then run `supabase/verify.sql` and confirm checks return `PASS`.

Until this is done, backend status in the app can show relation/table errors.

## 2) Decide auth mode for DB writes

Current app attempts `signInAnonymously()` for DB-backed transaction writes.

- If anonymous auth is **enabled**, transactions are written to Supabase.
- If anonymous auth is **disabled**, app uses local transaction fallback and still fetches live market prices.

To enable anonymous auth in Supabase:

1. Go to **Authentication → Providers**.
2. Enable **Anonymous sign-ins**.

## 3) Verify runtime status in UI

In the app, check:

- `backendStatus`: should indicate backend connected or fallback reason.
- `marketStatus`: should indicate live market refresh success.

## Important security note

- Never expose `service_role`, `secret`, `JWT secret`, or DB passwords in frontend code.
- If those values were ever shared publicly, rotate them immediately (see `SECURITY_ALERT.md`).


If `overall` returns `FAIL`, re-run `supabase/schema.sql` first, then `supabase/verify.sql` again.
