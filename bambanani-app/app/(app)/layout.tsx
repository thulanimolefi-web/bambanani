import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/bottom-nav";
import Emblem from "@/components/emblem";
import QuickExit from "@/components/quick-exit";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: hasQuickExitPin } = await supabase.rpc("has_quick_exit_pin");

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-[var(--bg)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] bg-[var(--surface)] px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Emblem size={28} />
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--teal-900)]">
          Bambanani
        </span>
        <QuickExit enabled={!!hasQuickExitPin} />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 overflow-x-hidden px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
