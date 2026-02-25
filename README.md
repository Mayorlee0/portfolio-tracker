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
- Local-first persistence via browser `localStorage`.

## Run

Because the app is static, you can open `index.html` directly, or run a local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- This is an MVP prototype and does not yet include authentication, backend APIs, RLS, or scheduled snapshots.
- FX rates are seeded constants in `app.js` and should be replaced with live adapters in the next milestone.
