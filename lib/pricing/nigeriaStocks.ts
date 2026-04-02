import { getNgxQuote } from "./providers/africa/ngxPulse";
import type { NormalizedPriceQuote } from "./types";

export async function getNGXStockPrice(symbol: string): Promise<NormalizedPriceQuote> {
  return getNgxQuote(symbol);
}
