import { getCryptoPrice } from "./crypto";
import { getGSEStockPrice } from "./ghanaStocks";
import { getNGXStockPrice } from "./nigeriaStocks";
import type { NormalizedPriceQuote } from "./types";
import { getUSStockPrice } from "./usStocks";
import type { Database } from "@/types/database";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

export async function resolveQuoteForAsset(asset: AssetRow): Promise<NormalizedPriceQuote> {
  const ex = asset.exchange.toUpperCase();
  const t = asset.asset_type.toLowerCase();

  if (t === "crypto" || ex === "CRYPTO") {
    return getCryptoPrice(asset.symbol);
  }
  if (ex === "NGX" || ex === "NSE") {
    return getNGXStockPrice(asset.symbol);
  }
  if (ex === "GSE") {
    return getGSEStockPrice(asset.symbol);
  }
  if (
    t === "stock" ||
    t === "etf" ||
    ex === "NYSE" ||
    ex === "NASDAQ" ||
    ex === "AMEX"
  ) {
    return getUSStockPrice(asset.symbol);
  }
  if (t === "fiat") {
    const cur = asset.currency.toUpperCase();
    return {
      symbol: asset.symbol,
      price: 1,
      currency: cur,
      timestamp: new Date().toISOString(),
      source: "fiat",
    };
  }
  throw new Error(`No pricing adapter for ${asset.symbol} (${ex}/${t})`);
}

export function cacheTtlSecondsForAsset(asset: AssetRow): number {
  const t = asset.asset_type.toLowerCase();
  if (t === "crypto") return 300;
  if (t === "fiat") return 86400;
  return 900;
}
