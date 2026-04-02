import { getGseQuote } from "./providers/africa/gsePublic";
import type { NormalizedPriceQuote } from "./types";

export async function getGSEStockPrice(symbol: string): Promise<NormalizedPriceQuote> {
  return getGseQuote(symbol);
}
