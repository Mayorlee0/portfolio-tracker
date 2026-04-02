import { createTransactionAction } from "@/lib/actions/transactions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: accounts }, { data: assets }, { data: txs }] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
    supabase.from("assets").select("id, symbol, exchange").order("symbol"),
    supabase
      .from("transactions")
      .select("*, assets(symbol), accounts(name)")
      .eq("user_id", user.id)
      .order("ts", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Source of truth — holdings are recomputed after each insert.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Log transaction</h2>
        <form action={createTransactionAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="text-zinc-500">Account</span>
            <select
              name="account_id"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              <option value="">Select</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Asset</span>
            <select
              name="asset_id"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              <option value="">Select</option>
              {(assets ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} ({a.exchange})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Type</span>
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              {["BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Quantity</span>
            <input
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Price</span>
            <input
              name="price"
              type="number"
              step="any"
              min="0"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Fee</span>
            <input
              name="fee"
              type="number"
              step="any"
              min="0"
              defaultValue="0"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Currency</span>
            <input
              name="currency"
              defaultValue="USD"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Timestamp (ISO, optional)</span>
            <input
              name="ts"
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Qty</th>
                <th className="py-2 pr-4 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {(txs ?? []).map((t) => {
                const sym =
                  (t.assets as { symbol?: string } | null)?.symbol ?? "—";
                const acc =
                  (t.accounts as { name?: string } | null)?.name ?? "—";
                return (
                  <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(t.ts).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{acc}</td>
                    <td className="py-2 pr-4">{sym}</td>
                    <td className="py-2 pr-4">{t.type}</td>
                    <td className="py-2 pr-4 text-right">{t.quantity}</td>
                    <td className="py-2 pr-4 text-right">{t.price}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
