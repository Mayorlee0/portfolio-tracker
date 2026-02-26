# Portfolio Tracker MVP – What to Do Next

This is the concrete execution plan to move from local prototype to a secure, production-ready MVP.

## 1) Add authentication (Supabase Auth)

**Goal:** every user sees only their own data.

### Actions

1. Create a Supabase project.
2. Enable Auth (email/password or magic link).
3. In your frontend, add login/logout screens and store only the session token from Supabase.
4. Stop using browser-only `localStorage` as the source of truth for portfolio records.

### Definition of done

- A user can sign up and log in.
- Unauthenticated users cannot open dashboard data routes.

---

## 2) Move portfolio data to database + enforce RLS

**Goal:** protect data at DB level even if frontend has bugs.

### Actions

1. Create tables:
   - `profiles`
   - `assets`
   - `transactions`
   - `latest_prices_cache`
   - `fx_rates_cache`
   - `portfolio_snapshots`
2. Add `user_id` on user-owned rows.
3. Enable Row Level Security (RLS) on all user-owned tables.
4. Add policies so `auth.uid() = user_id` for select/insert/update/delete.
5. Migrate current local data shape to DB shape (keep field names close to current `app.js` model).

### Definition of done

- Direct SQL query by User A cannot read User B rows.
- App reads/writes transactions from DB, not local-only storage.

---

## 3) Add backend API/adapters for market data

**Goal:** avoid hardcoded prices and support real tracking.

### Actions

1. Build server-side adapters (never call providers directly from browser):
   - Crypto adapter (CoinGecko)
   - Stocks adapter (iTick/NGX provider)
   - FX adapter (daily + historical)
2. Add price normalization to one internal schema:
   - `symbol`, `price`, `currency`, `as_of`, `change24h`, `change7d`, `change30d`
3. Add cache TTLs and request coalescing.
4. Add retry/backoff and fallback behavior.

### Definition of done

- Price table can refresh from API in one click.
- Symbols used in UI map to provider IDs reliably.

---

## 4) Replace seeded FX with live FX pipeline

**Goal:** accurate cross-currency valuation.

### Actions

1. Add an FX fetch job (at least daily) to fill `fx_rates_cache`.
2. Convert all asset values through one canonical currency internally (USD recommended).
3. Recompute portfolio values in selected display currency at render time.
4. Keep a “stale FX” indicator if rates are older than 24h.

### Definition of done

- No hardcoded `FX_TO_USD` values are used for production calculations.

---

## 5) Add scheduled snapshots

**Goal:** stable and fast 7d/30d analytics.

### Actions

1. Create daily snapshot job writing `portfolio_snapshots` per user.
2. Make job idempotent (`upsert` per user/date).
3. Add basic monitoring/alerts for failed runs.

### Definition of done

- Dashboard 7d/30d uses snapshots, not expensive on-demand recomputation only.

---

## 6) Harden symbol quality and UX

**Goal:** prevent wrong ticker entries and bad valuations.

### Actions

1. Keep current autocomplete, but back it with provider IDs in `assets` table.
2. On transaction save, store both display symbol and provider-specific ID.
3. Block unknown symbols unless user explicitly creates custom asset.
4. Add an “unpriced asset” warning badge in holdings.

### Definition of done

- New assets are traceable to a valid upstream market data identifier.

---

## 7) Testing and release guardrails

**Goal:** safe iteration.

### Actions

1. Add unit tests for portfolio math:
   - buys/sells average cost
   - realized/unrealized P&L
   - oversell clipping behavior
   - multi-currency conversion paths
2. Add integration tests for auth + RLS access boundaries.
3. Add a staging deploy before production.

### Definition of done

- CI blocks merges on failed portfolio math or auth/RLS tests.

---

## Priority order (build this sequence)

1. Auth
2. DB + RLS
3. Market data adapters
4. Live FX rates
5. Snapshots
6. Hardening + tests

If you follow this order, you remove the biggest MVP risks first: privacy/security, then price correctness, then analytics reliability.
