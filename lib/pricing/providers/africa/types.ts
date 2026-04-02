export type AfricaEquityQuote = {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  source: string;
  exchange: "NGX" | "GSE" | "OTHER";
};
