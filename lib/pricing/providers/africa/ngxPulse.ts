import type { NormalizedPriceQuote } from "../../types";

const NGX_PULSE_URL = "https://ngxpulse.ng/api/ngxdata/stocks";

type NgxStock = {
  symbol: string;
  name: string;
  current_price: number;
  trade_date: string;
};

type NgxResponse = {
  stocks?: NgxStock[];
};

let memoryCache: { at: number; list: NgxStock[] } | null = null;
const MEMORY_TTL_MS = 60_000;

export async function fetchNgxPulseStocks(): Promise<NgxStock[]> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache.list;
  }
  const res = await fetch(NGX_PULSE_URL, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`NGX Pulse HTTP ${res.status}`);
  }
  const body = (await res.json()) as NgxResponse;
  const list = body.stocks ?? [];
  memoryCache = { at: now, list };
  return list;
}

export async function getNgxQuote(symbol: string): Promise<NormalizedPriceQuote> {
  const upper = symbol.trim().toUpperCase();
  const stocks = await fetchNgxPulseStocks();
  const row = stocks.find((s) => s.symbol.toUpperCase() === upper);
  if (!row) {
    throw new Error(`NGX symbol not found: ${upper}`);
  }
  return {
    symbol: row.symbol,
    price: Number(row.current_price),
    currency: "NGN",
    timestamp: new Date(row.trade_date || Date.now()).toISOString(),
    source: "NGX Pulse",
  };
}
