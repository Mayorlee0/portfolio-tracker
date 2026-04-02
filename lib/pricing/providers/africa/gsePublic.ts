import type { NormalizedPriceQuote } from "../../types";

/**
 * Ghana Stock Exchange public data fallback.
 * Set GSE_STOCKS_URL to a JSON endpoint returning { symbol, price, ... }[]
 * or extend this adapter when a stable public API is available.
 */
const DEFAULT_GSE_URL =
  process.env.GSE_STOCKS_URL ??
  "https://www.gse.com.gh/json/stockdata.json";

type GseRow = {
  symbol?: string;
  ticker?: string;
  price?: number;
  last_price?: number;
  close?: number;
  date?: string;
};

function pickSymbol(row: GseRow): string | undefined {
  return row.symbol ?? row.ticker;
}

function pickPrice(row: GseRow): number | undefined {
  const p = row.price ?? row.last_price ?? row.close;
  return typeof p === "number" ? p : p != null ? Number(p) : undefined;
}

export async function getGseQuote(symbol: string): Promise<NormalizedPriceQuote> {
  const upper = symbol.trim().toUpperCase();
  const res = await fetch(DEFAULT_GSE_URL, {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GSE feed HTTP ${res.status} — set GSE_STOCKS_URL if needed`);
  }
  const body: unknown = await res.json();
  const rows: GseRow[] = Array.isArray(body)
    ? (body as GseRow[])
    : (body as { data?: GseRow[] }).data ?? [];
  const row = rows.find(
    (r) => pickSymbol(r)?.toUpperCase() === upper,
  );
  if (!row || pickPrice(row) == null || !Number.isFinite(pickPrice(row)!)) {
    throw new Error(`GSE symbol not found or invalid: ${upper}`);
  }
  return {
    symbol: pickSymbol(row)!,
    price: pickPrice(row)!,
    currency: "GHS",
    timestamp: new Date(row.date ?? Date.now()).toISOString(),
    source: "GSE (public)",
  };
}
