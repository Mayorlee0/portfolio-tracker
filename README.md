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
- Live crypto prices from CoinGecko, stock prices via Yahoo Finance with Stooq fallback, and live FX rates from ExchangeRate API (with refresh button + periodic auto-refresh).
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

## Next steps

See `MVP_NEXT_STEPS.md` for the concrete build sequence to complete backend adapters, snapshots, and test hardening.


## Deployment

If your live Vercel site still shows an older UI, trigger a new deploy from the branch containing these commits in Vercel dashboard (Deployments -> Redeploy).
