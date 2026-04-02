import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";
import { priceCacheKey } from "./cacheKey";
import { cacheTtlSecondsForAsset, resolveQuoteForAsset } from "./resolveQuote";
import { getFXRate } from "./fxRates";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

export type PriceCacheUpdateResult = {
  updatedAssets: number;
  skippedFresh: number;
  errors: string[];
  fxPairsUpdated: number;
};

async function shouldRefresh(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  cacheSymbol: string,
  ttlSec: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("price_cache")
    .select("last_updated")
    .eq("symbol", cacheSymbol)
    .maybeSingle();
  if (!data?.last_updated) return true;
  const ageSec = (Date.now() - new Date(data.last_updated).getTime()) / 1000;
  return ageSec >= ttlSec;
}

async function upsertPrice(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  cacheSymbol: string,
  row: {
    price: number;
    currency: string;
    source: string;
  },
) {
  await supabase.from("price_cache").upsert(
    {
      symbol: cacheSymbol,
      price: String(row.price),
      currency: row.currency,
      source: row.source,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "symbol" },
  );
}

const FX_PAIRS: { base: string; target: string }[] = [
  { base: "USD", target: "NGN" },
  { base: "USD", target: "GHS" },
];

/**
 * Cron-compatible: refresh stale rows in price_cache for all referenced assets,
 * and refresh fx_rates (1h TTL). Requires SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export async function updatePriceCache(): Promise<PriceCacheUpdateResult> {
  const supabase = createSupabaseServiceClient();
  const errors: string[] = [];
  let updatedAssets = 0;
  let skippedFresh = 0;

  const [holdRes, txRes] = await Promise.all([
    supabase.from("holdings").select("asset_id").gt("quantity", 0),
    supabase.from("transactions").select("asset_id"),
  ]);
  if (holdRes.error) errors.push(holdRes.error.message);
  if (txRes.error) errors.push(txRes.error.message);

  const assetIds = [
    ...new Set([
      ...(holdRes.data ?? []).map((r) => r.asset_id),
      ...(txRes.data ?? []).map((r) => r.asset_id),
    ]),
  ];

  let assets: AssetRow[] = [];
  if (assetIds.length > 0) {
    const { data: a, error: aErr } = await supabase
      .from("assets")
      .select("*")
      .in("id", assetIds);
    if (aErr) {
      errors.push(aErr.message);
    } else {
      assets = (a ?? []) as AssetRow[];
    }
  }

  for (const asset of assets) {
    const key = priceCacheKey(asset);
    const ttl = cacheTtlSecondsForAsset(asset);
    try {
      const fresh = await shouldRefresh(supabase, key, ttl);
      if (!fresh) {
        skippedFresh += 1;
        continue;
      }
      const q = await resolveQuoteForAsset(asset);
      await upsertPrice(supabase, key, {
        price: q.price,
        currency: q.currency,
        source: q.source,
      });
      updatedAssets += 1;
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let fxPairsUpdated = 0;
  for (const pair of FX_PAIRS) {
    const sym = `${pair.base}${pair.target}`;
    try {
      const fresh = await shouldRefresh(supabase, sym, 3600);
      if (!fresh) continue;
      const q = await getFXRate(pair);
      await supabase.from("fx_rates").upsert(
        {
          base_currency: pair.base,
          target_currency: pair.target,
          rate: String(q.price),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "base_currency,target_currency" },
      );
      await upsertPrice(supabase, sym, {
        price: q.price,
        currency: pair.target,
        source: q.source,
      });
      fxPairsUpdated += 1;
    } catch (e) {
      errors.push(`FX ${sym}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { updatedAssets, skippedFresh, errors, fxPairsUpdated };
}
