"use server";

import { revalidatePath } from "next/cache";
import { getPortfolioSummary } from "@/lib/analytics/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Persist end-of-day NAV for daily P&L charts (call from cron or manually). */
export async function recordPortfolioSnapshotAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const summary = await getPortfolioSummary(supabase, user.id, { preferCache: false });
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("portfolio_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: today,
      net_worth_usd: String(summary.netWorthUsd),
      net_worth_ngn: String(summary.netWorthNgn),
      net_worth_ghs: String(summary.netWorthGhs),
    },
    { onConflict: "user_id,snapshot_date" },
  );
  if (error) throw error;
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}
