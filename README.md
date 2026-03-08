# Portfolio Tracker MVP

A lightweight MVP based on `port.md` for tracking crypto, Nigerian stocks, and multi-currency cash positions.

## Features

- Manual transaction entry for buy/sell/deposit/withdraw.
- Symbol autocomplete with crypto/stock/cash suggestions and icon previews.
- Holdings filters (all/crypto/stock/cash) and estimated-price badges for assets without direct quotes.
- Holdings aggregation with average cost and unrealized P&L.
- Realized P&L tracking from sell/withdraw transactions.
- Dashboard cards for total value, unrealized P&L, realized P&L, total P&L, and weighted 24h/7d/30d changes, including period tabs.
- Display currency toggle (USD/EUR/NGN/GHS).
- Live crypto prices from CoinPaprika (free, no-key) with CoinGecko fallback, stock prices via Yahoo Finance with Stooq fallback, and live FX rates from ExchangeRate API (with refresh button + periodic auto-refresh).
- Supabase backend connection is automatic in code (URL + anon key), with no Supabase config/sign-in controls shown in UI.

## Run

Because the app is static, you can open `index.html` directly, or run a local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- Transactions and prices are no longer persisted to localStorage; portfolio data is intended to be backend-sourced.
- Crypto and FX prices are fetched live at runtime; fallback cached values are used if network calls fail.
- Stock prices use Yahoo first, then Stooq, then AlphaVantage demo fallback when available; provider/rate-limit restrictions may cause partial stock refresh warnings.
- Browser-safe Supabase keys only (URL + anon key). Never expose service role keys or DB passwords in frontend code.
- New Supabase projects start with an empty `public` schema; run `supabase/schema.sql` and then `supabase/verify.sql` before expecting backend transaction reads/writes.
- If backend auth still fails after enabling anonymous sign-ins, test with URL overrides: `?supabaseUrl=https://<project-ref>.supabase.co&supabaseAnonKey=<anon-key>` to ensure the frontend is targeting the same Supabase project.

## Next steps

See `MVP_NEXT_STEPS.md` for the concrete build sequence to complete backend adapters, snapshots, and test hardening.


## Deployment

If your live Vercel site still shows an older UI, the most common issue is branch/environment mismatch:

- Vercel **Production** deploys from the configured production branch (usually `main`), not from a random feature branch preview.
- URLs like `*-git-<branch>-<team>.vercel.app` are **preview deployments** tied to that branch/commit and can legitimately look older/newer than production.
- In Vercel dashboard, open **Project -> Settings -> Git** and confirm the Production Branch.
- Merge your PR into that branch, then redeploy Production (or push directly to that branch).
- Use the header build badge in this app (`build 2026.03.08-b`) to verify the deployed artifact version quickly.

If you still see old UI, clear browser cache and load once with a cache-buster (e.g. `?v=force-refresh`).
