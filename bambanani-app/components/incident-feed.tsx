"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Broadcast = {
  id: string;
  source_type: string;
  radius_m: number;
  status: string;
  created_at: string;
};

type Post = {
  id: string;
  category: string;
  body: string;
  is_anonymous: boolean;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  sos: "SOS alert nearby",
  checkin_escalation: "Missed check-in escalation",
  watchlist: "Watchlist entry confirmed by the community",
};

// What we show when someone taps an alert. We deliberately never show who
// triggered it or their exact location here — that stays private to their
// own trusted contacts (see sos_events RLS). This is the public, anonymised
// view: enough for the area to stay alert and act, not enough to identify
// or locate anyone.
const SOURCE_DETAIL: Record<string, string> = {
  sos: "Someone nearby triggered an SOS alert. Their trusted contacts have already been notified directly with their exact location, so help is already on the way. We don't show who or exactly where here to protect their safety. If you're in this area, stay alert, and if you see anything that looks like it could be related, post a sighting on the Watchlist so the community can connect the dots.",
  checkin_escalation: "Someone missed a scheduled safety check-in and it's been escalated to their trusted contacts, who've been notified directly. If you're in this area and notice anything concerning, post it to the Watchlist.",
  watchlist: "A watchlist report in this area has been confirmed by 3 or more community members. Check the Watchlist tab for the full report and to add anything you've seen.",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const CATEGORY_LABEL: Record<string, string> = {
  watchlist: "Watchlist",
  missing_person: "Missing person",
  sighting: "Sighting",
  safety_advisory: "Safety advisory",
  lost_pet: "Lost pet",
  road_closure: "Road closure",
  community_notice: "Community notice",
};

const GOVERNED = new Set(["watchlist", "missing_person", "sighting"]);
const OPEN_CATEGORIES = ["safety_advisory", "lost_pet", "road_closure", "community_notice"];

export default function IncidentFeed() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("community_notice");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBroadcast, setOpenBroadcast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase
        .from("broadcasts")
        .select("id, source_type, radius_m, status, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("incident_posts")
        .select("id, category, body, is_anonymous, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setBroadcasts(b || []);
    setPosts(p || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (body.trim().length < 3) {
      setError("Say a bit more.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("incident_posts").insert({
      author_id: anonymous ? null : user.id,
      is_anonymous: anonymous,
      category,
      body: body.trim(),
    });
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        setError(
          "This category requires a verified account (confirmed email, SA ID on file, account 7+ days old)."
        );
      } else {
        setError(error.message);
      }
      return;
    }
    setBody("");
    setShowForm(false);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {broadcasts.length > 0 && (
        <div className="flex flex-col gap-2">
          {broadcasts.map((b) => {
            const isOpen = openBroadcast === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setOpenBroadcast(isOpen ? null : b.id)}
                className="w-full rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--danger)]">
                      {SOURCE_LABEL[b.source_type] || "Community alert"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                      Within {(b.radius_m / 1000).toFixed(1)}km · {timeAgo(b.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-[var(--danger)]">
                    {isOpen ? "Hide" : "Details"}
                  </span>
                </div>
                {isOpen && (
                  <div className="mt-3 border-t border-[var(--danger)]/20 pt-3">
                    <p className="text-[12.5px] leading-relaxed text-[var(--ink)]">
                      {SOURCE_DETAIL[b.source_type] ||
                        "A safety alert was triggered in this area. Their trusted contacts have already been notified directly."}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--teal-700)]">Community board</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-[var(--gold)] px-3.5 py-1.5 text-xs font-bold text-[var(--gold-ink)]"
          >
            + Post
          </button>
        )}
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {showForm && (
        <form
          onSubmit={submitPost}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
          >
            {OPEN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
            {["missing_person", "sighting"].map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]} (verified accounts only)
              </option>
            ))}
          </select>
          <textarea
            placeholder="What's happening?"
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
          />
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-60"
            >
              {saving ? "Posting…" : "Post"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2.5">
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Nothing posted yet. Be the first.</p>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[var(--teal-100)] px-2.5 py-1 text-[11px] font-bold text-[var(--teal-700)]">
                {CATEGORY_LABEL[p.category] || p.category}
                {GOVERNED.has(p.category) ? " · verified" : ""}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-[var(--ink)]">{p.body}</p>
            {p.is_anonymous && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">Posted anonymously</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
