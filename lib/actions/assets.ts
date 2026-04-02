"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function upsertAssetAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? symbol).trim();
  const asset_type = String(formData.get("asset_type") ?? "stock").trim().toLowerCase();
  const exchange = String(formData.get("exchange") ?? "NASDAQ").trim().toUpperCase();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();

  if (!symbol) throw new Error("Symbol required");

  const { error } = await supabase.from("assets").upsert(
    {
      symbol,
      name,
      asset_type,
      exchange,
      currency,
      metadata: {},
    },
    { onConflict: "symbol,exchange,asset_type" },
  );
  if (error) throw error;
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}
