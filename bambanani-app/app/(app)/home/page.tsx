import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

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

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-center">
        <p className="text-[14px] leading-relaxed text-[var(--muted)]">
          The local community board — sightings, watchlist updates, and neighbourhood
          notices — lands here next. For now, set up your trusted contacts so SOS alerts
          have somewhere to go.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--teal-700)]">
            SOS / duress
          </span>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Hold-to-confirm or 3-shake trigger, live now.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--teal-700)]">
            Are-you-safe
          </span>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Safe-word check-ins are coming in the next build.
          </p>
        </div>
      </div>
    </div>
  );
}
