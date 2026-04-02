"use server";

import { revalidatePath } from "next/cache";
import { updatePriceCache } from "@/lib/pricing/updatePriceCache";

export type PriceRefreshState = {
  ok: boolean;
  message: string;
} | null;

export async function refreshPricesAction(
  _prev: PriceRefreshState | null,
  _formData: FormData,
): Promise<PriceRefreshState> {
  try {
    const r = await updatePriceCache();
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    const msg = `Assets updated: ${r.updatedAssets}, FX pairs: ${r.fxPairsUpdated}, skipped (fresh): ${r.skippedFresh}${
      r.errors.length ? `. Warnings: ${r.errors.slice(0, 3).join("; ")}` : ""
    }`;
    return { ok: true, message: msg };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Price refresh failed (check server keys).";
    return { ok: false, message };
  }
}
