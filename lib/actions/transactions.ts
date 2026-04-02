"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncHoldingsFromTransactions } from "@/lib/holdings/syncHoldings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const txSchema = z.object({
  account_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  type: z.enum(["BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND"]),
  quantity: z.coerce.number().nonnegative(),
  price: z.coerce.number().nonnegative(),
  fee: z.coerce.number().nonnegative().optional().transform((v) => v ?? 0),
  currency: z.string().min(1),
  ts: z.string().optional(),
});

export async function createTransactionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const rawTs = formData.get("ts");
  let tsIso: string | undefined;
  if (rawTs && String(rawTs).trim()) {
    const d = new Date(String(rawTs));
    if (!Number.isNaN(d.getTime())) tsIso = d.toISOString();
  }

  const parsed = txSchema.safeParse({
    account_id: formData.get("account_id"),
    asset_id: formData.get("asset_id"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    price: formData.get("price"),
    fee: formData.get("fee") || 0,
    currency: formData.get("currency"),
    ts: tsIso,
  });
  if (!parsed.success) throw new Error(parsed.error.message);

  const v = parsed.data;
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: v.account_id,
    asset_id: v.asset_id,
    type: v.type,
    quantity: String(v.quantity),
    price: String(v.price),
    fee: String(v.fee),
    currency: v.currency.toUpperCase(),
    ts: v.ts ?? new Date().toISOString(),
  });
  if (error) throw error;

  await syncHoldingsFromTransactions(supabase, user.id);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/analytics");
}
