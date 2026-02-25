# Portfolio Tracker MVP

A lightweight MVP based on `port.md` for tracking crypto, Nigerian stocks, and multi-currency cash positions.

## Features

- Manual transaction entry for buy/sell/deposit/withdraw.
- Symbol autocomplete with crypto/stock/cash suggestions and icon previews.
- Holdings aggregation with average cost and unrealized P&L.
- Realized P&L tracking from sell/withdraw transactions.
- Dashboard cards for total value, unrealized P&L, realized P&L, total P&L, and weighted 24h/7d/30d changes.
- Display currency toggle (USD/EUR/NGN/GHS).
- Editable latest prices table (used for valuation and period percentages).
- Supabase auth + DB-backed transactions when connected (local fallback remains for prototype continuity).

## Run

Because the app is static, you can open `index.html` directly, or run a local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Supabase setup

See `SUPABASE_SETUP.md` and execute `supabase/schema.sql` in your Supabase SQL editor.

## Notes

- This is still an MVP in progress: market data adapters, live FX jobs, and scheduled snapshots are pending.
- Price entries are still local in this phase; transactions and display currency are persisted to Supabase for authenticated users.

## Next steps

See `MVP_NEXT_STEPS.md` for the concrete build sequence to complete auth hardening, backend adapters, RLS verification, live FX, and snapshots.
