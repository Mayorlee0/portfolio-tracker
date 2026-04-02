import type { NormalizedPriceQuote } from "./types";

const COINGECKO_SIMPLE = "https://api.coingecko.com/api/v3/simple/price";

/** Map common tickers to CoinGecko ids */
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
};

function coingeckoId(symbol: string): string {
  const u = symbol.trim().toUpperCase();
  return SYMBOL_TO_ID[u] ?? symbol.trim().toLowerCase();
}

export async function getCryptoPrice(symbol: string): Promise<NormalizedPriceQuote> {
  const id = coingeckoId(symbol);
  const url = new URL(COINGECKO_SIMPLE);
  url.searchParams.set("ids", id);
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_last_updated_at", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }
  const data = (await res.json()) as Record<
    string,
    { usd?: number; last_updated_at?: number }
  >;
  const row = data[id];
  if (!row?.usd) {
    throw new Error(`CoinGecko: unknown id or price for ${symbol}`);
  }
  const ts = row.last_updated_at
    ? new Date(row.last_updated_at * 1000).toISOString()
    : new Date().toISOString();
  return {
    symbol: symbol.trim().toUpperCase(),
    price: row.usd,
    currency: "USD",
    timestamp: ts,
    source: "CoinGecko",
  };
}
