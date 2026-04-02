import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type FxTable = Map<string, number>;

type FxRow = Database["public"]["Tables"]["fx_rates"]["Row"];

type OverrideRow = Database["public"]["Tables"]["fx_overrides"]["Row"];

/** Build cross-rates; keys like "USD:NGN" meaning 1 USD = rate NGN */
export async function loadFxRates(
  supabase: SupabaseClient<Database>,
  userId?: string,
): Promise<FxTable> {
  const { data } = await supabase.from("fx_rates").select("*");
  const rows = (data ?? []) as FxRow[];
  const m: FxTable = new Map();
  m.set("USD:USD", 1);
  m.set("NGN:NGN", 1);
  m.set("GHS:GHS", 1);
  for (const r of rows) {
    const base = r.base_currency.toUpperCase();
    const tgt = r.target_currency.toUpperCase();
    m.set(`${base}:${tgt}`, Number(r.rate));
    const rev = Number(r.rate) > 0 ? 1 / Number(r.rate) : 0;
    m.set(`${tgt}:${base}`, rev);
  }
  const usdNgn = m.get("USD:NGN");
  const usdGhs = m.get("USD:GHS");
  if (usdNgn && usdGhs && usdNgn > 0 && usdGhs > 0) {
    const ngnPerGhs = usdNgn / usdGhs;
    const ghsPerNgn = usdGhs / usdNgn;
    if (!m.has("NGN:GHS")) m.set("NGN:GHS", ghsPerNgn);
    if (!m.has("GHS:NGN")) m.set("GHS:NGN", ngnPerGhs);
  }

  if (userId) {
    const { data: ov } = await supabase
      .from("fx_overrides")
      .select("*")
      .eq("user_id", userId);
    for (const o of (ov ?? []) as OverrideRow[]) {
      const base = o.base_currency.toUpperCase();
      const tgt = o.target_currency.toUpperCase();
      const rate = Number(o.rate);
      m.set(`${base}:${tgt}`, rate);
      if (rate > 0) m.set(`${tgt}:${base}`, 1 / rate);
    }
  }

  return m;
}

export function convertToUsd(amount: number, currency: string, fx: FxTable): number {
  const c = currency.toUpperCase();
  if (c === "USD") return amount;
  const direct = fx.get(`${c}:USD`);
  if (direct != null && direct > 0) return amount * direct;
  const viaUsd = fx.get(`USD:${c}`);
  if (viaUsd != null && viaUsd > 0) return amount / viaUsd;
  /* NGN -> USD via USD:NGN */
  const usdNgn = fx.get("USD:NGN");
  if (c === "NGN" && usdNgn && usdNgn > 0) return amount / usdNgn;
  const usdGhs = fx.get("USD:GHS");
  if (c === "GHS" && usdGhs && usdGhs > 0) return amount / usdGhs;
  return amount;
}

export function convertFromUsd(amountUsd: number, target: string, fx: FxTable): number {
  const t = target.toUpperCase();
  if (t === "USD") return amountUsd;
  const rate = fx.get(`USD:${t}`);
  if (rate != null && rate > 0) return amountUsd * rate;
  return amountUsd;
}
