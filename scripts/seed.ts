/**
 * Example seed: inserts canonical assets (requires authenticated RLS or service role).
 *
 * Run (Node 20+):
 *   npx tsx --env-file=.env.local scripts/seed.ts
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for global asset rows.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedAssets: Database["public"]["Tables"]["assets"]["Insert"][] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    asset_type: "stock",
    exchange: "NASDAQ",
    currency: "USD",
    metadata: {},
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    asset_type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    metadata: {},
  },
  {
    symbol: "ACCESSCORP",
    name: "Access Holdings Plc",
    asset_type: "stock",
    exchange: "NGX",
    currency: "NGN",
    metadata: {},
  },
  {
    symbol: "GCB",
    name: "GCB Bank (example)",
    asset_type: "stock",
    exchange: "GSE",
    currency: "GHS",
    metadata: { note: "Replace with live GSE symbol mapping" },
  },
  {
    symbol: "USD",
    name: "US Dollar cash",
    asset_type: "fiat",
    exchange: "CASH",
    currency: "USD",
    metadata: {},
  },
  {
    symbol: "NGN",
    name: "Nigerian Naira cash",
    asset_type: "fiat",
    exchange: "CASH",
    currency: "NGN",
    metadata: {},
  },
];

async function main() {
  const { error } = await supabase.from("assets").upsert(seedAssets, {
    onConflict: "symbol,exchange,asset_type",
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("Seeded", seedAssets.length, "assets");
}

main();
