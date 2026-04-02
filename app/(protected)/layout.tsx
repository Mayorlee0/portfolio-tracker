import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <AppHeader email={user.email ?? undefined} />
      <DashboardNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
