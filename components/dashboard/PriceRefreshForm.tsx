"use client";

import { useActionState } from "react";
import {
  refreshPricesAction,
  type PriceRefreshState,
} from "@/lib/actions/prices";

export function PriceRefreshForm() {
  const [state, formAction, isPending] = useActionState(
    refreshPricesAction,
    null as PriceRefreshState,
  );
  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "Refreshing…" : "Refresh prices"}
        </button>
      </form>
      {state ? (
        <p
          className={`max-w-md text-xs ${
            state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
