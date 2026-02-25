# MVP Plan for a Personal Portfolio Tracker for Crypto, Nigerian Stocks, and Multi-Currency Cash

## Product scope and MVP success criteria

The MVP is a private, transaction-led portfolio tracker (similar in interaction style to a portfolio tracker on entity["company","CoinGecko","crypto data company"]) that lets you manually record buys/sells (and cash movements), then continuously values the resulting holdings using free (or free-tier) market data sources, producing a clean dashboard with profit/loss (P&L) and period changes (24h, 7d, 30d, etc.). citeturn23view0turn19view0

For *MVP*, “success” should be defined in terms of whether it reliably answers your day-to-day questions in under ~5 seconds per page load:

- **Can I enter/edit a trade quickly and see my holdings update immediately?**
- **Can I see total portfolio value in USD (or any chosen currency) and switch display currency with a toggle?**
- **Can I see P&L and changes over 24h / 7d / 30d for the whole portfolio and per asset?**
- **Is my data private (only accessible by my account), even if the frontend has bugs?** (This is where database-level access controls matter.) citeturn18search0

To keep scope tight, the MVP should intentionally *not* attempt:
- Automated syncing from crypto exchanges or broker accounts (manual entry only).
- Tax lots across jurisdictions, tax reports, or realised P&L matching that must satisfy accountants across multiple base currencies.
- Corporate actions/dividends automation for stocks (record manually later if needed).

## Data sources and constraints for crypto, Nigerian stocks, and FX

### Crypto pricing and history
A pragmatic MVP choice is the **CoinGecko Demo API plan**: it is described as accessible “at zero cost” with a **stable rate limit of 30 calls/min** and a **monthly cap of 10,000 calls**, and it supports both live and historical endpoints. citeturn23view0

Two important operational implications:

- You’ll want a **server-side proxy/caching layer** so your browser never calls CoinGecko directly (protect your key, control rate, centralise retries). CoinGecko itself recommends storing API keys securely in your backend and using a proxy to insert the key. citeturn23view1turn19view0  
- You must comply with **attribution requirements**. CoinGecko’s API Terms require that you “display prominently” a “Powered by CoinGecko” message (with specific legibility guidance). citeturn19view0

For 24h/7d/30d changes, your MVP can either:
- Use CoinGecko endpoints that return *current price + change percentages* (simpler), or  
- Compute changes from historical series. CoinGecko documents how historical granularity changes by lookback window (e.g., 1–90 days uses hourly data). citeturn23view0

### Nigerian stocks pricing and history: free-tier vs official API
For **Nigerian equities**, there are two viable tracks:

**Track A (free-tier, fastest to MVP):** entity["company","iTick","market data api provider"]  
- iTick offers a **Free plan ($0/month) explicitly described as “for personal use only”** with **REST API 5 calls/min** and a limit on subscription products. citeturn24view0  
- iTick’s docs show **batch endpoints** that are *ideal for rate-limited free tiers*:
  - `GET /stock/quotes` for multi-symbol real-time quotes, with “Nigeria” listed among supported regions. citeturn28view0  
  - `GET /stock/klines` for multi-symbol OHLCV candlesticks (also listing “Nigeria” among regions) with kline intervals including daily/weekly/monthly that map well onto 7d/30d reporting. citeturn29view0  
- iTick also states that you **may not redistribute** the information it provides (relevant if you ever make this website public or multi-user). citeturn24view0turn28view0

**Track B (official NGX market data, not free):** entity["organization","Nigerian Exchange Limited","securities exchange operator nigeria"]  
- The NGX MarketData API documentation states you **must register** and are entitled to products attached to the **package you subscribed to**, and it recommends contacting NGX to purchase a subscription. citeturn27view0  
- It is also explicit about using an access token (`_t`) and warns “do not expose your data access token on the client side.” citeturn27view0

**MVP recommendation:** Build the MVP against iTick first (so you can ship quickly with a free tier), but design your backend with a “provider adapter” interface so you can swap to NGX official later if you decide you want the authoritative source and are willing to subscribe. citeturn24view0turn27view0turn28view0turn29view0

### FX rates for NGN, GHS, EUR, USD, and “display currency toggle”
You mentioned using **XE**. The key research finding is: **Xe’s Currency Data API is positioned as a paid subscription product** (including help documentation about annual billing/subscription terms). citeturn15search1turn15search20  
So for a truly “free” MVP, you should use an alternative.

Two strong “free” paths:

**Path A (simple, daily refresh): ExchangeRate-API Open Access endpoint**  
- No API key required, **updates once per day**, is rate limited, and **requires attribution**, while explicitly allowing caching and disallowing redistribution. citeturn31view0  

**Path B (very developer-friendly, includes historical by date): fawazahmed0 currency-api dataset**  
- GitHub project describes **no rate limits**, **200+ currencies**, **daily updated**, date-based URLs (e.g., `@latest` or `@YYYY-MM-DD`), and provides a Cloudflare fallback domain. citeturn22view0  

**MVP recommendation:** Use Path B for *historical daily FX* (so you can value transactions “as of trade date” if you want), and optionally keep Path A as an additional fallback provider with attribution in your footer/settings. citeturn22view0turn31view0

## Architecture on Vercel with Supabase as the system of record

You stated this will run on entity["company","Vercel","cloud platform for web apps"], and that entity["company","Supabase","backend as a service"] configuration should be seamless. A good MVP architecture is:

**Frontend + server routes**
- **Next.js on Vercel**, using Route Handlers/Functions for server-side fetching and aggregation. Vercel documents that functions in a Next.js App Router project can live under `app/api/.../route.ts` and are deployed as Vercel Functions. citeturn20search26turn20search24  

**Database and auth**
- Supabase Postgres as the source of truth.
- Supabase Auth (email magic link is often simplest for personal tools). Supabase documents passwordless email methods (Magic Link/OTP) and the default behaviour/limits. citeturn18search2  
- Database-level *Row Level Security* for all user data so that even if you make a frontend mistake, another user cannot read your rows. Supabase emphasises RLS as a Postgres primitive that provides “defense in depth.” citeturn18search0  

**Environment variables**
- Use Vercel Project Environment Variables for API tokens and Supabase secrets. Vercel documents environment variable management and the importance of framework prefixes like `NEXT_PUBLIC_` when variables must be exposed to the client (most secrets should **not** be client-exposed). citeturn20search1turn20search5  
- For “seamless” setup, use the Supabase↔Vercel integration/template flow: the official Vercel template notes that after installing the integration, relevant Supabase env vars are assigned automatically; Supabase’s integration guide describes pulling env vars via `vercel env pull`. citeturn20search9turn20search8  

**Scheduled refresh (prices, FX, snapshots)**
You have two scheduling options:

- **Vercel Cron Jobs**: Supported on all plans, but be aware of Hobby constraints (cron jobs only once per day, and invocation can occur any time within the specified hour; more frequent/precise scheduling may require Pro). Vercel also warns about concurrency and duplicate events, recommending idempotency and locks. citeturn20search10turn20search2turn20search4  
- **Supabase Cron / Scheduled Edge Functions**: Supabase supports scheduling functions via the `pg_cron` extension and calling Edge Functions via `pg_net`, which is a clean way to run scheduled jobs without relying on Vercel plan limits. citeturn18search1turn18search6  

**MVP recommendation:** Use **Supabase Cron + an Edge Function** to refresh cached prices/rates and write daily snapshots. This keeps your scheduled tasks close to the database and avoids Vercel Hobby timing constraints. citeturn18search1turn20search2  

## Supabase schema and calculation model for holdings and P&L

### Core data model
Design around the principle: **transactions are the only user-entered truth**; everything else is derived (holdings, valuation, P&L, charts).

A minimal schema (conceptual, not SQL yet):

**profiles**
- `user_id` (uuid, matches Supabase auth user)
- `display_currency` (e.g., USD, EUR, NGN)
- `created_at`, `updated_at`

**assets**
- `asset_id`
- `asset_type` enum: `crypto`, `stock`, `cash`
- `symbol` (e.g., BTC, ETH, DANGCEM, NGN)
- `name`
- `provider` enum: `coingecko`, `itick`, `manual_cash`, later `ngx_official`
- `provider_ref` (e.g., CoinGecko coin id; iTick code)
- `native_currency` (stocks typically NGN; crypto pricing typically USD depending on endpoint)
- timestamps

**transactions**
- `tx_id`
- `user_id`
- `asset_id`
- `tx_type` enum: `buy`, `sell`, `deposit`, `withdrawal`, `fee`  
- `quantity` (positive for buy/deposit, negative for sell/withdrawal; fees either separate rows or embedded)
- `price_per_unit` (in `tx_currency`)
- `tx_currency` (e.g., NGN / USD / USDT)
- `executed_at` (datetime, crucial for historical snapshots)
- optional: `fee_amount`, `fee_currency`, `notes`

**latest_prices_cache**
- `asset_id`
- `price`
- `price_currency`
- `as_of`
- `source` (provider)

**fx_rates_cache**
- `base_currency`
- `quote_currency`
- `rate`
- `as_of`
- `source`

**portfolio_snapshots**
- `user_id`
- `as_of` (daily is enough for MVP, plus “latest”)
- `total_value_usd` (or another canonical currency)
- optional: breakdown fields

### Security baseline
Every user-owned table should have RLS enabled, with policies like:

- SELECT/INSERT/UPDATE/DELETE allowed only when `user_id = auth.uid()`.

Supabase’s RLS docs emphasise that RLS policies act as a Postgres-level security control and can be combined with Supabase Auth for end-to-end security. citeturn18search0turn18search10  

### Calculation approach that fits your MVP goals

**Holdings**
- Holdings per asset = sum of transaction quantities (with consistent sign convention).  
- For cash assets (NGN, USD, EUR, GHS), treat “price” as 1 unit of that currency; value comes from FX conversion into your chosen display currency.

**Unrealised P&L**
- MVP-friendly approach: **average cost** per asset.
  - `avg_cost = total_cost / total_quantity_bought` (ignoring realised lots and fees initially, or treating fees as increasing cost basis).
- Unrealised P&L = `current_value - remaining_cost_basis`.

**Realised P&L**
- MVP approach: average-cost realised P&L (not FIFO lots yet).
- Realised P&L (on sells) = `sell_proceeds - (sell_quantity * current_avg_cost_at_sale_time)`.

This is not perfect tax accounting, but it is consistent, easy to implement, and sufficient for a personal dashboard MVP.

**Period changes (24h / 7d / 30d)**
You have two options; pick one clearly for MVP to avoid endless edge cases:

- **Option 1 (simplest to explain): “Market movement on current holdings”**  
  Revalue *current holdings* using price at *now* vs price at *T-period-ago* and take the difference.  
  This matches how many dashboards present “24h change” (it’s about market movement, not cashflows).

- **Option 2 (more correct): “Portfolio value then vs now using holdings then”**  
  Reconstruct holdings as-of the earlier time, value them, compare to now.  
  This integrates cash deposits/withdrawals and trading activity, but requires more historical reconstruction.

**MVP recommendation:** Start with Option 1 for 24h/7d/30d (clear, predictable, fewer edge cases), and add Option 2 later as “time-weighted return” or “true performance.” To implement Option 1, you mostly need historical prices, not historical holdings.

On the data side, you can support your time windows using:
- CoinGecko’s historical endpoints and documented granularity rules for crypto. citeturn23view0  
- iTick batch klines for stocks (daily/weekly/monthly) across multiple symbols at once, including Nigeria coverage, which keeps you inside free-tier rate limits. citeturn29view0turn28view0turn24view0  

## UX design modelled on a transaction-led portfolio tracker

The MVP should prioritise speed of entry and clarity of results.

A good screen set (minimal but complete):

**Dashboard**
- Total portfolio value (in selected display currency).
- Tabs for 24h / 7d / 30d / 90d (MVP can ship with 24h/7d/30d).
- Breakdown: Crypto / Nigerian stocks / Cash.
- A bottom-positioned **display currency toggle** (dropdown or “bottom sheet” selector) that switches the entire UI between USD/EUR/NGN/GHS (and later “any ISO currency”).

**Holdings**
- One unified list with filters: All / Crypto / Stocks / Cash.
- Each row: quantity, current price, current value, unrealised P&L, and period change.

**Transactions**
- Add/edit/delete transactions:
  - Asset selector (searchable).
  - Type (buy/sell/deposit/withdraw/fee).
  - Quantity, price, currency, date/time.
- “Edit” should preserve immutability expectations: editing a transaction is effectively rewriting history, so after edit you should recompute snapshots.

**Settings**
- Default display currency.
- Data source settings:
  - Store provider keys securely server-side.
  - Show attribution requirements and whether the tracker is “personal only” for a provider.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["CoinGecko portfolio tracker interface screenshot","portfolio tracker dashboard UI dark mode","Supabase dashboard Postgres tables","Vercel dashboard cron jobs interface"],"num_per_query":1}

Two UX details that matter for this project specifically:

- **Attribution in the UI**:  
  If you use CoinGecko data, you must show “Powered by CoinGecko” as required by their API Terms. citeturn19view0  
  If you use ExchangeRate-API Open Access, their docs require attribution and allow caching while forbidding redistribution. citeturn31view0  

- **Data visibility**:  
  Providers like iTick explicitly state you may not redistribute their data. Keep the MVP as a private authenticated tool, not a public market-data site. citeturn28view0turn24view0  

## Build milestones and Codex-ready implementation checklist

### Engineering milestones
A practical MVP sequence on Vercel + Supabase:

**Foundation milestone**
- Create Supabase project: Auth enabled, Postgres tables created, RLS policies written and tested. Supabase docs strongly position RLS as a primary defence-in-depth control. citeturn18search0  
- Deploy a Next.js skeleton to Vercel; install Supabase integration so env vars are wired automatically where possible. citeturn20search9turn20search8  
- Add a minimal “Account” page (login, logout, profile preference: display currency). Supabase Auth supports passwordless email methods (Magic Link/OTP). citeturn18search2  

**Core portfolio milestone**
- Implement transactions CRUD (server-validated).
- Implement holdings aggregation query (SQL view or server-side aggregation).
- Implement a unified valuation pipeline:
  - Latest price lookup (stocks + crypto).
  - FX conversion into canonical currency (USD recommended internally) and then into user display currency.

**Market data milestone**
- Add server-side adapters:
  - Crypto adapter using CoinGecko Demo plan limits; enforce caching and request coalescing to remain inside 30 calls/min and 10k/month. citeturn23view0turn19view0  
  - Nigerian stocks adapter using iTick batch endpoints (`/stock/quotes`, `/stock/klines`) to minimise calls under free plan limits. citeturn24view0turn28view0turn29view0  
  - FX adapter using fawazahmed0 currency-api (daily updated, date-based URLs, no rate limits; implement fallback domain). citeturn22view0  

**Jobs and snapshots milestone**
- Add daily snapshot generation:
  - Compute total portfolio value daily and store to `portfolio_snapshots`.
  - This makes 7d/30d comparisons fast and stable.
- Schedule snapshots:
  - Prefer Supabase Cron + Edge Function scheduling (pg_cron + pg_net). citeturn18search1turn18search6  
  - If you also use Vercel Cron, implement idempotency/locking because Vercel warns about concurrency and potential duplicate events. citeturn20search2turn20search0  

### Codex-ready prompts and work packages

You said you’ll build this using Codex. Codex is described by entity["company","OpenAI","ai research and product company"] as an AI coding agent that helps you “write, review, and ship code faster,” and it can be used via app/CLI/cloud depending on your setup. citeturn30search4turn30search2turn30search9  

Below are “work packages” you can hand to Codex as separate tasks (keep them separate so it can finish one cleanly at a time):

**Work package: Supabase schema + RLS**
- Prompt: “Create SQL migrations for tables: profiles, assets, transactions, latest_prices_cache, fx_rates_cache, portfolio_snapshots. Enable RLS on all user-owned tables and add policies so only auth.uid() can access rows. Provide seed rows for cash assets (USD, EUR, NGN, GHS). Also add indexes for (user_id, executed_at) on transactions.”

**Work package: Market data adapters**
- Prompt: “Implement server-side TypeScript modules: coingeckoAdapter, itickAdapter, fxAdapter. Each must have (getLatestPrices(assetRefs[]), getHistoricalPrices(assetRefs[], window)) returning a normalised format. Enforce caching and rate limit guards. CoinGecko must support Demo plan constraints; iTick must use batch endpoints /stock/quotes and /stock/klines. FX should use fawazahmed0 currency-api with jsDelivr primary and Cloudflare fallback.”

**Work package: Portfolio calculation engine**
- Prompt: “Implement a portfolio engine that: loads user transactions, aggregates holdings, computes average cost, unrealised P&L, realised P&L, and computes 24h/7d/30d change using current holdings valued at now vs valued at period-ago prices. Output a JSON structure for Dashboard + Holdings list. Include unit tests for edge cases (sell more than holdings, negative cash, empty portfolio).”

**Work package: UI**
- Prompt: “Build Next.js pages: /dashboard, /holdings, /transactions, /settings. Add a bottom currency selector that updates display_currency in profiles and re-renders values. Dashboard shows total portfolio value + tabs for 24h/7d/30d. Holdings table supports filters (crypto/stocks/cash). Transactions page supports add/edit/delete.”

**Work package: Scheduled snapshots**
- Prompt: “Create a Supabase Edge Function that computes and writes daily portfolio snapshots for each user. Add Supabase Cron scheduling using pg_cron/pg_net. Ensure the job is idempotent (if snapshot for date exists, update it rather than insert duplicate).”

### Practical MVP risk controls

These are small “non-negotiables” that prevent the project from breaking later:

- **Never expose provider tokens to the browser.** NGX documentation explicitly warns against exposing tokens client-side, and CoinGecko recommends storing API keys securely in your backend/proxying. citeturn27view0turn23view1  
- **Build caching from day one.** CoinGecko Demo has a monthly cap; iTick free tier is 5 calls/min; without caching you will hit limits quickly. citeturn23view0turn24view0  
- **Treat scheduled jobs as unreliable and potentially duplicated.** Vercel explicitly notes no retries on failure and warns that events may be delivered more than once; design idempotent snapshot writes and use locks. citeturn20search2turn20search0  
- **Respect provider “no redistribution” clauses.** Both CoinGecko and iTick restrict redistribution/syndication in their terms/notices; keep the MVP personal/private. citeturn19view0turn24view0turn31view0