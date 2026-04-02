import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Tx = Database["public"]["Tables"]["transactions"]["Row"];

function key(accountId: string, assetId: string) {
  return `${accountId}::${assetId}`;
}

/**
 * Rebuild holdings for a user from transactions (average-cost method, remaining lots).
 */
export async function syncHoldingsFromTransactions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("ts", { ascending: true });

  if (error) throw error;

  const map = new Map<
    string,
    { account_id: string; asset_id: string; qty: number; cost: number }
  >();

  for (const t of (txs ?? []) as Tx[]) {
    const k = key(t.account_id, t.asset_id);
    let row = map.get(k);
    if (!row) {
      row = { account_id: t.account_id, asset_id: t.asset_id, qty: 0, cost: 0 };
      map.set(k, row);
    }
    const q = Number(t.quantity);
    const price = Number(t.price);
    const fee = Number(t.fee);

    switch (t.type) {
      case "BUY":
      case "DEPOSIT": {
        row.cost += q * price + fee;
        row.qty += q;
        break;
      }
      case "SELL":
      case "WITHDRAWAL": {
        if (row.qty <= 0) break;
        const avg = row.cost / row.qty;
        const sellQty = Math.min(q, row.qty);
        row.cost -= sellQty * avg;
        row.qty -= sellQty;
        break;
      }
      case "DIVIDEND": {
        if (q > 0) {
          row.cost += q * price;
          row.qty += q;
        }
        break;
      }
      default:
        break;
    }
  }

  await supabase.from("holdings").delete().eq("user_id", userId);

  const inserts: Database["public"]["Tables"]["holdings"]["Insert"][] = [];
  for (const row of map.values()) {
    if (row.qty <= 0) continue;
    const avg = row.cost / row.qty;
    inserts.push({
      user_id: userId,
      account_id: row.account_id,
      asset_id: row.asset_id,
      quantity: String(row.qty),
      avg_buy_price: String(avg),
    });
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("holdings").insert(inserts);
    if (insErr) throw insErr;
  }
}
