import { createAccountAction, deleteAccountAction } from "@/lib/actions/accounts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accountTypes = [
  "Binance",
  "Trove",
  "Bamboo",
  "Risevest",
  "Wallet",
  "Bank",
  "Broker",
  "Other",
];

export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Platforms such as brokers, wallets, and banks.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">New account</h2>
        <form action={createAccountAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-zinc-500">Name</span>
            <input
              name="name"
              required
              placeholder="Trove USD"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Type</span>
            <select
              name="type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              {accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Currency</span>
            <select
              name="currency"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              {["USD", "NGN", "GHS"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Your accounts</h2>
        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-900">
          {(accounts ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-zinc-500">
                  {a.type} · {a.currency}
                </p>
              </div>
              <form action={deleteAccountAction}>
                <input type="hidden" name="account_id" value={a.id} />
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        {!accounts?.length ? (
          <p className="mt-4 text-sm text-zinc-500">No accounts yet.</p>
        ) : null}
      </section>
    </div>
  );
}
