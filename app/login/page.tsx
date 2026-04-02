import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col px-4 py-16">
      <div className="mx-auto w-full max-w-md text-center">
        <Link href="/" className="text-lg font-semibold">
          Portfolio tracker
        </Link>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          NGX · US · Ghana · Crypto · Multi-currency
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
