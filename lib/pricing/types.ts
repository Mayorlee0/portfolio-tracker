export type NormalizedPriceQuote = {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  source: string;
};

export type FXPair = {
  base: string;
  target: string;
};
