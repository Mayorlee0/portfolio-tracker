import type { FXPair, NormalizedPriceQuote } from "./types";

const FCS_LATEST = "https://api-v4.fcsapi.com/forex/latest";

function pairToSymbol(base: string, target: string): string {
  return `${base.trim().toUpperCase()}${target.trim().toUpperCase()}`;
}

export async function getFXRate(pair: FXPair): Promise<NormalizedPriceQuote> {
  const key = process.env.FCS_API_KEY;
  if (!key) {
    throw new Error("Missing FCS_API_KEY");
  }
  const symbol = pairToSymbol(pair.base, pair.target);
  const url = new URL(FCS_LATEST);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("access_key", key);

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`FCS API HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    response?: Array<{
      s?: string;
      c?: number;
      price?: number;
      t?: number;
      tm?: string;
    }>;
    msg?: string;
  };
  if (data.msg && !data.response?.length) {
    throw new Error(data.msg);
  }
  const row = data.response?.[0];
  const price = row?.c ?? row?.price;
  if (price == null || !Number.isFinite(Number(price))) {
    throw new Error(`FCS API: no rate for ${symbol}`);
  }
  return {
    symbol,
    price: Number(price),
    currency: pair.target.toUpperCase(),
    timestamp: row?.tm
      ? new Date(row.tm).toISOString()
      : new Date((row?.t ?? Date.now() / 1000) * 1000).toISOString(),
    source: "FCS API",
  };
}
