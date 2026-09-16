import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import IncidentFeed from "@/components/incident-feed";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase.rpc("list_my_pending_invites"),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const inviteCount = invites?.length || 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          Hi, {firstName}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Here&rsquo;s what&rsquo;s happening near you.
        </p>
      </div>

      {inviteCount > 0 && (
        <Link
          href="/contacts"
          className="flex items-center justify-between rounded-2xl border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-4 py-3.5"
        >
          <span className="text-[14px] font-semibold text-[var(--ink)]">
            {inviteCount === 1
              ? "Someone wants to add you as a trusted contact"
              : `${inviteCount} people want to add you as a trusted contact`}
          </span>
          <span className="shrink-0 text-[var(--teal-700)]">→</span>
        </Link>
      )}

      <IncidentFeed />
    </div>
  );
}
