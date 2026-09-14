import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/bottom-nav";
import Emblem from "@/components/emblem";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[var(--bg)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3">
        <Emblem size={28} />
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-900)]">
          Bambanani
        </span>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
