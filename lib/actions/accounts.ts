"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncHoldingsFromTransactions } from "@/lib/holdings/syncHoldings";

export async function createAccountAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "broker").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  if (!name) throw new Error("Name required");

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    currency,
  });
  if (error) throw error;
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccountAction(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "").trim();
  if (!accountId) throw new Error("Missing account");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw error;
  await syncHoldingsFromTransactions(supabase, user.id);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
