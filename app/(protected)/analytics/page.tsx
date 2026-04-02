import { AllocationPie } from "@/components/charts/AllocationPie";
import { getPortfolioSummary } from "@/lib/analytics/portfolio";
import { recordPortfolioSnapshotAction } from "@/lib/actions/snapshot";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const summary = await getPortfolioSummary(supabase, user.id, { preferCache: false });

  const { data: snaps } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(14);

  const pieData = summary.byAssetClass.map((b) => ({
    name: b.assetType,
    value: b.percent,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            FX-adjusted net worth and allocation (USD / NGN / GHS).
          </p>
        </div>
        <form action={recordPortfolioSnapshotAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Save today&apos;s snapshot
          </button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase text-zinc-500">USD</p>
          <p className="mt-1 text-xl font-semibold">{fmtUsd(summary.netWorthUsd)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase text-zinc-500">NGN</p>
          <p className="mt-1 text-xl font-semibold">
            {summary.netWorthNgn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase text-zinc-500">GHS</p>
          <p className="mt-1 text-xl font-semibold">
            {summary.netWorthGhs.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">By asset class</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.byAssetClass.map((b) => (
              <li key={b.assetType} className="flex justify-between">
                <span>{b.assetType}</span>
                <span>
                  {b.percent.toFixed(1)}% · {fmtUsd(b.valueUsd)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Allocation chart</h2>
          <AllocationPie data={pieData} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Recent NAV snapshots</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4 text-right">USD</th>
                <th className="py-2 pr-4 text-right">NGN</th>
                <th className="py-2 pr-4 text-right">GHS</th>
              </tr>
            </thead>
            <tbody>
              {(snaps ?? []).map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4">{s.snapshot_date}</td>
                  <td className="py-2 pr-4 text-right">
                    {fmtUsd(Number(s.net_worth_usd))}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {Number(s.net_worth_ngn).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {Number(s.net_worth_ghs).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!snaps?.length ? (
            <p className="mt-4 text-sm text-zinc-500">
              Save a snapshot to start history for daily P&amp;L.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
