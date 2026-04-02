# Portfolio Tracker

Track crypto, Nigerian and Ghana stocks, US equities, and multi-currency cash. Built with [Next.js](https://nextjs.org) and Supabase (auth, RLS, data).

## Features

- Supabase authentication and protected dashboard routes.
- Manual transaction entry for buy/sell/deposit/withdraw.
- Symbol suggestions with icons; holdings filters and P&L views.
- Live pricing (crypto, stocks, FX) with caching and refresh.
- Display currency options (USD/EUR/NGN/GHS and related FX).

## Run locally

Copy `.env.example` to `.env.local` and set your Supabase (and any provider) variables. Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy on [Vercel](https://vercel.com/new); set the same env vars in the project settings. If the live site looks stale, redeploy from the latest `main` in the Vercel dashboard.

## Security

Use only publishable Supabase keys in client-side code. Never commit service role keys or database passwords.
