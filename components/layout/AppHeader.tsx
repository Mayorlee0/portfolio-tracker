import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

export function AppHeader({ email }: { email?: string }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Portfolio
        </Link>
        {email ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
        ) : null}
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
