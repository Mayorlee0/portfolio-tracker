/**
 * Extension points (CSV import, manual FX override UI, dividends, alerts).
 * Wire these modules to new tables/routes without changing core analytics.
 */

export type CsvImportRow = {
  broker: string;
  raw: string;
};

export type PriceAlertDraft = {
  assetId: string;
  thresholdPercent: number;
};
