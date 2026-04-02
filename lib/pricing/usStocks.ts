import type { NormalizedPriceQuote } from "./types";

const AV_BASE = "https://www.alphavantage.co/query";

export async function getUSStockPrice(symbol: string): Promise<NormalizedPriceQuote> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) {
    throw new Error("Missing ALPHAVANTAGE_API_KEY");
  }
  const u = new URL(AV_BASE);
  u.searchParams.set("function", "GLOBAL_QUOTE");
  u.searchParams.set("symbol", symbol.trim().toUpperCase());
  u.searchParams.set("apikey", key);

  const res = await fetch(u.toString(), {
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    "Global Quote"?: Record<string, string>;
    Note?: string;
    Information?: string;
  };
  if (data.Note || data.Information) {
    throw new Error(data.Note ?? data.Information ?? "Alpha Vantage rate limit");
  }
  const q = data["Global Quote"];
  if (!q) {
    throw new Error(`Alpha Vantage: no quote for ${symbol}`);
  }
  const price = Number(q["05. price"]);
  if (!Number.isFinite(price)) {
    throw new Error(`Alpha Vantage: invalid price for ${symbol}`);
  }
  return {
    symbol: (q["01. symbol"] ?? symbol).trim().toUpperCase(),
    price,
    currency: "USD",
    timestamp: new Date().toISOString(),
    source: "Alpha Vantage",
  };
}
