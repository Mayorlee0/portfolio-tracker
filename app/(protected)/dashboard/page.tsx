import Link from "next/link";
import { AllocationPie } from "@/components/charts/AllocationPie";
import { PriceRefreshForm } from "@/components/dashboard/PriceRefreshForm";
import { getPortfolioSummary } from "@/lib/analytics/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNgn(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtGhs(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const summary = await getPortfolioSummary(supabase, user.id, { preferCache: true });

  const { data: recentTx } = await supabase
    .from("transactions")
    .select("id, type, quantity, price, fee, currency, ts, assets(symbol), accounts(name)")
    .eq("user_id", user.id)
    .order("ts", { ascending: false })
    .limit(8);

  const pieData = summary.byAssetClass.map((b) => ({
    name: b.assetType,
    value: b.percent,
  }));

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Unified view across NGX, US equities, crypto, and fiat.
            {summary.fromCache ? " Loaded cached summary." : ""}
          </p>
        </div>
        <PriceRefreshForm />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Net worth (USD)</p>
          <p className="mt-1 text-2xl font-semibold">{fmtUsd(summary.netWorthUsd)}</p>
          <p className="mt-2 text-xs text-zinc-500">
            NGN {fmtNgn(summary.netWorthNgn)} · GHS {fmtGhs(summary.netWorthGhs)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Daily P&amp;L (USD)</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              summary.dailyPnLUsd >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {fmtUsd(summary.dailyPnLUsd)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Vs last stored snapshot</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Lifetime P&amp;L (USD)</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              summary.lifetimePnLUsd >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {fmtUsd(summary.lifetimePnLUsd)}
          </p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Allocation</h2>
          <AllocationPie data={pieData} />
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Account balances (USD)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.byAccount.map((a) => (
              <li key={a.accountId} className="flex justify-between gap-4">
                <span>{a.accountName}</span>
                <span className="font-medium">{fmtUsd(a.valueUsd)}</span>
              </li>
            ))}
            {!summary.byAccount.length ? (
              <li className="text-zinc-500">
                No accounts yet.{" "}
                <Link href="/accounts" className="underline">
                  Create one
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Top gainers</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.topGainers.map((g) => (
              <li key={g.assetId} className="flex justify-between">
                <span>
                  {g.symbol}{" "}
                  <span className="text-zinc-500">({g.exchange})</span>
                </span>
                <span className="text-emerald-600">+{g.pnlPercent.toFixed(1)}%</span>
              </li>
            ))}
            {!summary.topGainers.length ? (
              <li className="text-zinc-500">Add transactions to see movers.</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Top losers</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.topLosers.map((g) => (
              <li key={g.assetId} className="flex justify-between">
                <span>
                  {g.symbol}{" "}
                  <span className="text-zinc-500">({g.exchange})</span>
                </span>
                <span className="text-red-600">{g.pnlPercent.toFixed(1)}%</span>
              </li>
            ))}
            {!summary.topLosers.length ? (
              <li className="text-zinc-500">No losing positions.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Recent transactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {(recentTx ?? []).map((t) => {
                const sym =
                  (t.assets as { symbol?: string } | null)?.symbol ?? "—";
                const acc =
                  (t.accounts as { name?: string } | null)?.name ?? "—";
                return (
                  <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-4">
                      {new Date(t.ts).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{acc}</td>
                    <td className="py-2 pr-4">{sym}</td>
                    <td className="py-2 pr-4">{t.type}</td>
                    <td className="py-2 pr-4 text-right">{t.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!recentTx?.length ? (
            <p className="mt-4 text-sm text-zinc-500">
              No activity yet.{" "}
              <Link href="/transactions" className="underline">
                Log a trade
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
