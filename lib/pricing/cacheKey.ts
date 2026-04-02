import type { Database } from "@/types/database";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

export function priceCacheKey(asset: Pick<AssetRow, "symbol" | "exchange">): string {
  return `${asset.exchange}:${asset.symbol}`.toUpperCase();
}
