import { NextResponse } from "next/server";
import { updatePriceCache } from "@/lib/pricing/updatePriceCache";

export const runtime = "nodejs";

/**
 * Vercel Cron / external scheduler: GET /api/cron/update-prices
 * Set header Authorization: Bearer $CRON_SECRET or x-cron-secret
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const ok =
    secret &&
    (auth === `Bearer ${secret}` || headerSecret === secret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await updatePriceCache();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update failed" },
      { status: 500 },
    );
  }
}
