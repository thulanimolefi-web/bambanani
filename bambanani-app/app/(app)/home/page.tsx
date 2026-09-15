import { createClient } from "@/lib/supabase/server";
import IncidentFeed from "@/components/incident-feed";

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

      <IncidentFeed />
    </div>
  );
}
