# Deep analysis and Codex prompt for improving Mayorlee0/portfolio-tracker

## Current project reality and why it feels “scattered”

Your repo (Mayorlee0/portfolio-tracker) is an MVP-style **static** portfolio tracker: you manually enter transactions and prices, the app aggregates holdings and displays totals/changes, and persistence is “local-first” (browser storage). That design is completely valid for a prototype, but it’s the root cause of the problems you’re feeling now:

If your portfolio is spread across multiple apps (brokerage apps, crypto exchanges, bank apps), then your tracker must become the “source of truth” and be available across devices. A browser-only local store cannot provide that. The MVP also hardcodes FX assumptions and relies on manually-entered prices, which means it can’t become “aware” of your live portfolio without a market-data layer.

The repo already contains Supabase-oriented planning (schema + RLS and instructions), but the actual running dashboard still needs to be rewired so Supabase becomes the persistent store and live data becomes a reliable, cached service (not a per-page-load free-for-all).

## What “portfolio awareness” should mean for your use case

Based on what you described (crypto + Nigeria stocks + US stocks, plus fiat balances in NGN and GHS), the “aware” system should do four things continuously and consistently:

It should treat **transactions as the source of truth** (buys/sells/deposits/withdrawals). Live prices should only be used to value holdings and compute unrealised P&L.

It should produce **multi-currency valuation** (for example: canonical USD valuation internally, then display in NGN/GHS/USD). This requires an FX pipeline and a clear stance on which FX rate you’re using (official vs parallel; most free FX feeds are “official” style rates).

It should support **multiple “accounts/platforms”** so you can stop feeling scattered: “this holding is on Broker A”, “this crypto is on Exchange B”, “this cash is in Bank C”. Even if you don’t automate imports yet, modelling accounts gives you immediate clarity and makes future automation possible.

It should separate three different “price problems”:
Crypto pricing, stock pricing (with market/exchange distinctions like NG vs US), and FX rates. Each needs its own provider strategy and caching rules.

## Free/open data sources that fit your requirements

### Nigeria + US stocks via iTick

For a single API that can cover **Nigeria and US equities**, iTick is one of the more practical options, especially for a personal project using free tiers and caching.

The iTick **free plan** states it is for personal use and includes **REST API 5 calls/minute**, limited connections, and a maximum number of subscription products—so you must design around rate limits and batch calls. citeturn25view0

For live equity quotes, iTick documents endpoints like:
* `GET /stock/quote` for a single symbol and
* `GET /stock/quotes` for batch quotes,
with a required `region` parameter that includes **Nigeria** and **US stocks** among supported markets. citeturn3view0turn4view3

For historical candles (needed to compute 7d/30d change if a provider doesn’t give it directly), iTick provides batch K-line endpoints such as `GET /stock/klines` with `kType` supporting daily/weekly/monthly intervals. citeturn22view3turn9search0

Critically, iTick’s **own Nigeria guide** explicitly uses `region=NG` for Nigeria stocks and shows `GET https://api.itick.org/stock/quote` and `GET https://api.itick.org/stock/kline` usage. citeturn32view0

Also note iTick’s site-wide restriction: they state the data is informational-only and you “may not redistribute” it—so build this as a personal dashboard, not a public data redistribution service. citeturn25view0turn3view0turn32view0

### Crypto via CoinGecko

CoinGecko is widely used for crypto portfolio pricing. Their materials make two key points relevant to your build:

CoinGecko’s **Public API** rate limit is described as roughly **5–15 calls per minute**, and they suggest using a “Demo account” for a more stable rate (30 calls/min). citeturn28view0

CoinGecko’s API marketing page states the **Demo API plan** is usable at zero cost with a **stable 30 calls/min** and **10,000 calls/month cap**, which is helpful for caching and budgeting. citeturn27view0turn27view1

CoinGecko’s API Terms include an explicit attribution requirement: you must prominently display “Powered by CoinGecko” (the terms specify font sizing guidance). citeturn0search5turn26view0

### FX rates for NGN and GHS via fawazahmed0/exchange-api

For FX, many previously-free “forex APIs” now require keys. A genuinely lightweight approach for a personal tool is to consume a CDN-hosted dataset.

The `fawazahmed0/exchange-api` project describes a **free exchange rates API** with **200+ currencies**, **daily updates**, and **no rate limits**. It is accessible via jsDelivr and also provides a Cloudflare fallback domain, and it explicitly recommends building a fallback mechanism in your code. citeturn24view0turn2search4

This is a strong fit for NGN/GHS display conversions, with the important caveat that you’re using the dataset’s rate source (not necessarily your bank’s or parallel-market rate).

### Ghana stocks as “best-effort” (optional)

Ghana Stock Exchange market data is not as universally available via mainstream free market data APIs as US equities. You have two practical paths:

A third-party “GSE-API” at `dev.kwayisi.org` documents endpoints like:
* `GET /live` and `GET /live/{symbol}` for “real-time trading data” objects, and
* `GET /equities` and `GET /equities/{symbol}` for listings and company details,
and claims it is free to use with no registration. citeturn23search0turn7search7  
This can work as an optional adapter, but you should treat it as “community infrastructure” (no guarantees, no SLA).

If you decide you need a more formal data feed later, Ghana Stock Exchange has historically distributed real-time data through vendors (for example, Bloomberg has carried GSE data per GSE communications). citeturn5search3  
That tends to move you away from “free/open”, so it’s better to treat Ghana stocks as optional/manual unless you confirm a dependable feed you’re comfortable with.

## Supabase as the durable source of truth

### Why Supabase solves your “scattered across apps” problem

A Supabase-backed tracker gives you: cross-device sync, access control, and the ability to run scheduled refresh jobs (prices, FX, snapshots) without relying on a user leaving a browser tab open.

You already have the right direction: Supabase RLS policies can enforce that each user only sees their own portfolio rows. Supabase explains RLS as effectively applying a policy-driven filter (“like adding a WHERE clause”) on each request, and also highlights that once RLS is enabled, data is not accessible via the API until policies exist. citeturn22view6turn8search1

### Edge Functions + scheduled jobs for pricing and analytics

To keep API keys safe and to respect rate limits, your app should avoid calling stock providers directly from the browser when tokens are required.

Supabase supports invoking Edge Functions from clients (using `supabase.functions.invoke(...)`). citeturn11search0turn30view1

Supabase also documents scheduling Edge Functions using `pg_cron` plus `pg_net`, and recommends storing secrets for scheduled invocations securely (for example in Supabase Vault). citeturn22view7turn30view0

Supabase Cron guidance notes that jobs can run SQL or make HTTP requests (such as invoking an Edge Function), and provides operational constraints like limiting concurrent jobs and job runtime. citeturn29view0

### Your Supabase URL and what still needs to be supplied

You shared your Supabase project URL: `https://pdzdhjftbpjareclhknp.supabase.co`. That’s enough to wire the client endpoint, but Codex should be instructed to keep all secrets out of git and out of frontend JavaScript.

You will still need to provide:
The Supabase **anon key** (safe to use in browser code) and, if you implement server-side inserts/updates for price caches, either Edge Function secrets or service role usage in a secure environment (never in frontend).

Supabase CLI docs include a `supabase secrets set` command family for storing secrets as environment variables available to Edge Functions. citeturn8search2turn30view2

## Recommended design changes before you ask Codex to implement

These are the changes that will make the project significantly more useful without turning it into “enterprise software”.

### Add an accounts/platform dimension

Because you explicitly said your portfolio is scattered across apps, you should store an `accounts` table and attach each transaction to an account:

Example conceptually:
* accounts: “Trove”, “Bamboo”, “Binance”, “Luno”, “GTBank”, “Ecobank”, “Cash Wallet”
* each transaction points to one account
* holdings can be aggregated by symbol, by asset class, and by account (which is the “anti-scattered” view)

This is a small schema change but a huge UX win.

### Normalise asset identifiers across providers

For live pricing, “ticker symbols” alone are not enough long-term (tickers can collide across markets). Your database should store:
* a human symbol (e.g., `DANGCEM`, `AAPL`, `BTC`)
* a provider + provider_asset_id (e.g., iTick region+code, CoinGecko coin id)

This prevents ambiguity and makes refresh jobs deterministic.

### Use caches + TTLs everywhere

Given iTick free tier limits (5 calls/min) citeturn25view0 and CoinGecko public/demo limits citeturn28view0turn27view0, the only viable approach is:

Prices and FX are refreshed into shared cache tables with timestamps.
UI reads cached values, displays freshness (“updated X minutes ago”), and supports a “Refresh” button that triggers a throttled refresh function.

### Compute 7d/30d changes from candles for stocks

iTick’s real-time quote endpoints expose daily change/percentage change, but your dashboard wants 7d/30d windows. For stocks, compute these from daily candles using `GET /stock/klines` (daily kType) in batch. citeturn22view3turn9search0

### Make Ghana stocks explicitly optional

Support Ghana stocks via Kwayisi GSE-API as an optional adapter (behind a feature flag). The endpoints are documented and easy to integrate, but you want to be transparent in UX that it’s a best-effort community feed. citeturn23search0turn7search7

## Codex prompt to implement your requested improvements

```text
You are Codex working inside the GitHub repo: Mayorlee0/portfolio-tracker.

Goal
- Upgrade this static, localStorage MVP into a Supabase-backed personal portfolio tracker that:
  1) stores transactions and settings in Supabase (not localStorage as the source of truth),
  2) supports multi-currency valuation with NGN and GHS cash balances,
  3) fetches and caches live prices for crypto + Nigeria stocks + US stocks using free/open APIs,
  4) optionally supports Ghana stocks via a best-effort free API adapter,
  5) is secure (no secret keys in frontend code, enforce Supabase RLS).

Important constraints
- Do NOT commit any secrets to git.
- Only SUPABASE_URL and SUPABASE_ANON_KEY may be used in browser code. All other provider tokens/keys must be stored as server-side secrets (Supabase Edge Function secrets).
- Keep the app runnable as a simple web app (still works with a basic static server), but add modern JS modules if needed.
- Prefer batch endpoints and caching to respect free-tier rate limits.

Supabase details
- Use this Supabase Project URL as the default: https://pdzdhjftbpjareclhknp.supabase.co
- Read SUPABASE_ANON_KEY from a user-provided config (either a local config file excluded from git, or a “Connect Supabase” UI that stores it in localStorage).
- Use the existing schema file at supabase/schema.sql as a baseline, but improve it where necessary (see below).
- Implement authentication using Supabase Auth (email+password OR magic link). Provide login/logout UI. Do not show the dashboard until authenticated.

Schema changes to implement in Supabase
1) Start from supabase/schema.sql and apply improvements:
  - Add accounts table:
      accounts(id uuid pk default gen_random_uuid(), user_id uuid not null, name text not null, type text, currency text, created_at timestamptz default now())
    Enable RLS and policies so auth.uid() = user_id for CRUD.
  - Update transactions table to include account_id uuid references accounts(id) (nullable for back-compat but used by UI).
  - Add updated_at columns and triggers (or a simple approach) for profiles/accounts/transactions if reasonable.
  - Ensure display currency supports USD, NGN, GHS (keep EUR if already present).

Frontend refactor (index.html + app.js)
- Convert to ES modules (script type="module") and create small modules:
  - supabaseClient.js: creates Supabase client from SUPABASE_URL + anon key.
  - db.js: CRUD for profiles, accounts, transactions.
  - pricing.js: reads cached prices + triggers refresh.
  - fx.js: reads cached fx rates + conversion helper.
- Replace localStorage “source of truth”:
  - localStorage can remain ONLY for (a) supabase anon key config storage and (b) non-sensitive UI preferences.
  - transactions must load from Supabase on login and save to Supabase on create/delete.
  - display currency should persist to Supabase profiles table.
- Add an account selector to the “Add Transaction” form and show holdings by account + overall.
- Keep current holdings aggregation logic, but adjust it to:
  - use DB transactions
  - value holdings using latest_prices_cache + fx_rates_cache
  - show “stale price/FX” indicators when caches are old.

Market data layer (server-side via Supabase Edge Functions)
Create Supabase Edge Functions (supabase/functions/*) to safely call providers and update cache tables:
1) refresh_fx
  - Fetch FX rates using fawazahmed0 currency-api (jsdelivr with Cloudflare fallback).
  - Store USD->NGN, USD->GHS, NGN->USD, GHS->USD (and optionally EUR) in fx_rates_cache with as_of date.
2) refresh_prices
  - For crypto: use CoinGecko (respect attribution requirements by adding “Powered by CoinGecko” in footer or Prices section).
  - For stocks Nigeria + US: use iTick REST endpoints:
      - Real-time batch quote endpoint for current price.
      - Daily klines endpoint to compute 7d/30d changes (close vs close N trading days ago).
    Use region=NG for Nigeria and region=US for US stocks.
  - OPTIONAL Ghana stocks adapter:
      - Use dev.kwayisi.org/apIs/gse (/live or /live/{symbol}) to fetch GSE prices in GHS.
      - Mark these price rows provider="kwayisi_gse" and do not compute 7d/30d unless you have data.
  - Upsert latest_prices_cache with as_of timestamp, currency, and computed change windows.

Rate limiting and caching rules
- Implement TTL logic in the refresh functions:
  - Do not refetch a symbol if it was refreshed recently (e.g., < 2 minutes for iTick, < 5 minutes for CoinGecko; make these constants).
  - Use batch endpoints where possible.
- Add error handling: partial failures should not crash the whole refresh, and UI should show which symbols failed.

Scheduling (optional but recommended)
- Add SQL snippets/docs to schedule refresh_fx daily and refresh_prices periodically using Supabase Cron + pg_net (document how to install + configure).
- Provide a “Refresh now” button in UI that invokes refresh_prices and refresh_fx functions using supabase.functions.invoke.

Acceptance criteria
- I can sign up/log in.
- After login, my transactions load from Supabase and are visible on any device.
- Adding/deleting a transaction persists in Supabase and enforces RLS (user A cannot see user B).
- Prices and FX can be refreshed via a button; holdings update using cached values.
- Nigeria and US stocks are supported via iTick; crypto via CoinGecko; Ghana stocks optional.
- No secrets are committed; only anon/public keys in frontend.

Deliverables
- Code changes with clear file structure.
- Updated README explaining setup (Supabase schema, anon key config, deploying edge functions).
- A short SECURITY section reminding to rotate leaked keys and never expose service_role keys in frontend.
```

### Small but important “extra” changes I strongly suggest Codex also applies

Make the pricing UI explicit about its data sources and legal constraints: iTick and CoinGecko both treat licensing/attribution seriously (CoinGecko requires “Powered by CoinGecko”; iTick warns against redistribution). citeturn0search5turn26view0turn25view0

Document your FX source and its limitations: if you use the CDN-based currency API, keep the fallback mechanism they recommend (jsDelivr + Cloudflare fallback) so your app doesn’t break when one endpoint is down. citeturn24view0turn2search4

Implement scheduled snapshots once the above is stable: your repo’s Supabase approach already anticipates snapshots. Supabase Cron + scheduled Edge Functions allows daily snapshotting without user interaction, and Supabase recommends keeping cron concurrency controlled. citeturn29view0turn30view0