import type { SupabaseClient } from "@supabase/supabase-js";
import { priceCacheKey } from "@/lib/pricing/cacheKey";
import type { PortfolioSummary, HoldingLine } from "@/types/portfolio";
import type { Database } from "@/types/database";
import { convertFromUsd, convertToUsd, loadFxRates } from "./fx";

type BaseCurrency = "USD" | "NGN" | "GHS";

export async function getPortfolioSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts?: { baseCurrency?: BaseCurrency; preferCache?: boolean },
): Promise<PortfolioSummary> {
  const baseCurrency = opts?.baseCurrency ?? "USD";

  if (opts?.preferCache) {
    const { data: cached } = await supabase
      .from("portfolio_summary_cache")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (cached?.payload && typeof cached.payload === "object") {
      const p = cached.payload as PortfolioSummary;
      return { ...p, fromCache: true, asOf: cached.updated_at };
    }
  }

  const fx = await loadFxRates(supabase, userId);

  const [{ data: holdings }, { data: accounts }, { data: assets }, { data: prices }] =
    await Promise.all([
      supabase.from("holdings").select("*").eq("user_id", userId),
      supabase.from("accounts").select("*").eq("user_id", userId),
      supabase.from("assets").select("*"),
      supabase.from("price_cache").select("*"),
    ]);

  const assetById = new Map((assets ?? []).map((a) => [a.id, a]));
  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const priceBySymbol = new Map((prices ?? []).map((p) => [p.symbol, p]));

  const lines: HoldingLine[] = [];
  let totalUsd = 0;
  let costUsd = 0;

  const byAccount = new Map<string, number>();
  const byClass = new Map<string, number>();

  for (const h of holdings ?? []) {
    const asset = assetById.get(h.asset_id);
    const account = accountById.get(h.account_id);
    if (!asset || !account) continue;

    const qty = Number(h.quantity);
    if (qty <= 0) continue;

    const pk = priceCacheKey(asset);
    const pc = priceBySymbol.get(pk);
    const mktPrice = pc ? Number(pc.price) : Number(h.avg_buy_price);
    const mktCur = (pc?.currency ?? asset.currency).toUpperCase();

    const marketValueNative = qty * mktPrice;
    const marketUsd = convertToUsd(marketValueNative, mktCur, fx);

    const costNative = qty * Number(h.avg_buy_price);
    const costNativeCur = asset.currency.toUpperCase();
    const costLineUsd = convertToUsd(costNative, costNativeCur, fx);

    const pnlUsd = marketUsd - costLineUsd;
    const pnlPct = costLineUsd > 0 ? (pnlUsd / costLineUsd) * 100 : 0;

    /* Intraday change: approximate via previous_close not in cache — use 0 */
    const dayChangeUsd = 0;

    lines.push({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.asset_type,
      exchange: asset.exchange,
      quantity: qty,
      avgBuyPrice: Number(h.avg_buy_price),
      marketPrice: mktPrice,
      marketValueUsd: marketUsd,
      costBasisUsd: costLineUsd,
      pnlUsd,
      pnlPercent: pnlPct,
      dayChangeUsd,
    });

    totalUsd += marketUsd;
    costUsd += costLineUsd;

    byAccount.set(account.id, (byAccount.get(account.id) ?? 0) + marketUsd);
    byClass.set(asset.asset_type, (byClass.get(asset.asset_type) ?? 0) + marketUsd);
  }

  const topGainers = [...lines]
    .filter((l) => l.pnlPercent > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)
    .slice(0, 5);
  const topLosers = [...lines]
    .filter((l) => l.pnlPercent < 0)
    .sort((a, b) => a.pnlPercent - b.pnlPercent)
    .slice(0, 5);

  const byAccountArr = [...byAccount.entries()].map(([accountId, valueUsd]) => ({
    accountId,
    accountName: accountById.get(accountId)?.name ?? "Account",
    valueUsd,
    percent: totalUsd > 0 ? (valueUsd / totalUsd) * 100 : 0,
  }));

  const byAssetClass = [...byClass.entries()].map(([assetType, valueUsd]) => ({
    assetType,
    valueUsd,
    percent: totalUsd > 0 ? (valueUsd / totalUsd) * 100 : 0,
  }));

  const allocationPercentages: Record<string, number> = {};
  for (const b of byAssetClass) {
    allocationPercentages[b.assetType] = b.percent;
  }

  const { data: snapToday } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(2);

  let dailyPnLUsd = 0;
  if (snapToday && snapToday.length >= 2) {
    const prev = Number(snapToday[1].net_worth_usd);
    dailyPnLUsd = totalUsd - prev;
  } else if (snapToday?.length === 1) {
    const prev = Number(snapToday[0].net_worth_usd);
    dailyPnLUsd = totalUsd - prev;
  }

  const lifetimePnLUsd = totalUsd - costUsd;
  const asOf = new Date().toISOString();

  const summary: PortfolioSummary = {
    baseCurrency,
    totalValueUsd: totalUsd,
    totalValueNgn: convertFromUsd(totalUsd, "NGN", fx),
    totalValueGhs: convertFromUsd(totalUsd, "GHS", fx),
    netWorthUsd: totalUsd,
    netWorthNgn: convertFromUsd(totalUsd, "NGN", fx),
    netWorthGhs: convertFromUsd(totalUsd, "GHS", fx),
    byAccount: byAccountArr,
    byAssetClass,
    allocationPercentages,
    dailyPnLUsd,
    lifetimePnLUsd,
    topGainers,
    topLosers,
    asOf,
    fromCache: false,
  };

  await supabase.from("portfolio_summary_cache").upsert({
    user_id: userId,
    payload: summary as unknown as Database["public"]["Tables"]["portfolio_summary_cache"]["Row"]["payload"],
    updated_at: asOf,
  });

  return summary;
}
