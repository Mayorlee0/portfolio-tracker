import { upsertAssetAction } from "@/lib/actions/assets";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AssetsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .order("symbol", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Normalize with symbol, exchange, and asset type (e.g. ACCESS | NGX | stock).
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Add or update asset</h2>
        <form action={upsertAssetAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="text-zinc-500">Symbol</span>
            <input
              name="symbol"
              required
              placeholder="AAPL"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-zinc-500">Name</span>
            <input
              name="name"
              placeholder="Apple Inc."
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Asset type</span>
            <select
              name="asset_type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              {["stock", "crypto", "fiat", "etf"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Exchange</span>
            <input
              name="exchange"
              defaultValue="NASDAQ"
              placeholder="NGX, NASDAQ, CRYPTO"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Currency</span>
            <input
              name="currency"
              defaultValue="USD"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save asset
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Catalog</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Exchange</th>
                <th className="py-2 pr-4">CCY</th>
              </tr>
            </thead>
            <tbody>
              {(assets ?? []).map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4 font-medium">{a.symbol}</td>
                  <td className="py-2 pr-4">{a.name}</td>
                  <td className="py-2 pr-4">{a.asset_type}</td>
                  <td className="py-2 pr-4">{a.exchange}</td>
                  <td className="py-2 pr-4">{a.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
