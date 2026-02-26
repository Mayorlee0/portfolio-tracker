# Supabase setup (Step 1 + Step 2 kickoff)

This repo now includes auth wiring in the frontend and SQL schema with RLS.

## 1) Create project and get credentials

1. Create a Supabase project.
2. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
3. In the app UI, paste those values in **Connect Supabase + Sign in** and click **Connect**.

## 2) Run schema SQL

1. Open Supabase SQL editor.
2. Paste `supabase/schema.sql` and execute.
3. Confirm tables exist:
   - `profiles`, `assets`, `transactions`, `latest_prices_cache`, `fx_rates_cache`, `portfolio_snapshots`

## 3) Enable Auth users

1. Go to **Authentication → Providers**.
2. Enable Email/Password.
3. Optionally disable email confirmation for local MVP speed.

## 4) Verify RLS

1. Create two users (A, B).
2. Sign in as A and create a transaction.
3. Sign in as B and confirm A’s transaction is not visible.

## Notes

- The app now hides the main dashboard until you are authenticated.
- Transaction create/delete and display currency persistence use Supabase when connected.
- Prices remain local for now (next milestone: `latest_prices_cache` adapter).
