export type AssetClassBreakdown = {
  assetType: string;
  valueUsd: number;
  percent: number;
};

export type AccountBreakdown = {
  accountId: string;
  accountName: string;
  valueUsd: number;
  percent: number;
};

export type HoldingLine = {
  assetId: string;
  symbol: string;
  name: string;
  assetType: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  marketPrice: number;
  marketValueUsd: number;
  costBasisUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  dayChangeUsd: number;
};

export type PortfolioSummary = {
  baseCurrency: "USD" | "NGN" | "GHS";
  totalValueUsd: number;
  totalValueNgn: number;
  totalValueGhs: number;
  netWorthUsd: number;
  netWorthNgn: number;
  netWorthGhs: number;
  byAccount: AccountBreakdown[];
  byAssetClass: AssetClassBreakdown[];
  allocationPercentages: Record<string, number>;
  dailyPnLUsd: number;
  lifetimePnLUsd: number;
  topGainers: HoldingLine[];
  topLosers: HoldingLine[];
  asOf: string;
  /** When true, summary was read from portfolio_summary_cache */
  fromCache?: boolean;
};

/** Reserved for CSV import, price alerts, etc. */
export type FutureFeatureFlags = {
  csvImport?: boolean;
  manualFxOverride?: boolean;
  dividendTracking?: boolean;
  priceAlerts?: boolean;
};
