"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProximity, formatDistance } from "@/lib/use-proximity";

type Entry = {
  id: string;
  subject_name: string | null;
  subject_description: string;
  status: string;
  dispute_status: string;
  votes_count: number;
  reporter_id: string;
  created_at: string;
  is_missing_person: boolean;
  distance_m?: number | null;
};

type Post = {
  id: string;
  category: string;
  body: string;
  created_at: string;
  linked_watchlist_entry_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  disputed: "Disputed, frozen pending review",
  resolved: "Resolved",
  false: "Marked false",
};

const CATEGORY_ORDER = [
  "missing_person",
  "watchlist",
  "sighting",
  "safety_advisory",
  "lost_pet",
  "road_closure",
  "community_notice",
];

const CATEGORY_LABEL: Record<string, string> = {
  watchlist: "Watchlist mentions",
  missing_person: "Missing persons",
  sighting: "Sightings",
  safety_advisory: "Safety advisories",
  lost_pet: "Lost pets",
  road_closure: "Road closures",
  community_notice: "Community notices",
};

export default function WatchlistPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useLocation, setUseLocation] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [isMissingPerson, setIsMissingPerson] = useState(false);
  const [noteDraftFor, setNoteDraftFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const { coords, status: locStatus } = useProximity();

  const load = useCallback(async () => {
    const supabase = createClient();
    const entriesQuery = coords
      ? supabase.rpc("nearby_watchlist_entries", {
          p_lat: coords.lat,
          p_lon: coords.lon,
          p_radius_m: 15000,
          p_limit: 50,
        })
      : supabase
          .from("watchlist_entries")
          .select(
            "id, subject_name, subject_description, status, dispute_status, votes_count, reporter_id, created_at, is_missing_person"
          )
          .neq("status", "false")
          .order("created_at", { ascending: false })
          .limit(50);

    const [{ data: { user } }, entriesResult, postsResult] = await Promise.all([
      supabase.auth.getUser(),
      entriesQuery,
      supabase
        .from("incident_posts")
        .select("id, category, body, created_at, linked_watchlist_entry_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(150),
    ]);
    setUserId(user?.id ?? null);
    // The RPC already orders by missing-person-first then distance; the plain
    // fallback query needs the same missing-person priority applied client-side.
    const sortedEntries = coords
      ? ((entriesResult.data || []) as Entry[])
      : ((entriesResult.data || []) as Entry[]).slice().sort((a: Entry, b: Entry) => {
          if (a.is_missing_person !== b.is_missing_person) return a.is_missing_person ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    setEntries(sortedEntries);
    setPosts(postsResult.data || []);

    if (user) {
      const { data: votes } = await supabase
        .from("watchlist_votes")
        .select("watchlist_entry_id")
        .eq("voter_id", user.id);
      setVotedIds(new Set((votes || []).map((v) => v.watchlist_entry_id)));
    }
    setLoading(false);
  }, [coords]);

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [posts]);

  const notesByEntry = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.linked_watchlist_entry_id) continue;
      const list = map.get(p.linked_watchlist_entry_id) || [];
      list.push(p);
      map.set(p.linked_watchlist_entry_id, list);
    }
    return map;
  }, [posts]);

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (description.trim().length < 5) {
      setError("Add a bit more description.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    let locationValue: string | null = null;
    if (useLocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
          })
        );
        locationValue = `SRID=4326;POINT(${position.coords.longitude} ${position.coords.latitude})`;
      } catch {
        // continue without location
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("watchlist_entries").insert({
      reporter_id: user.id,
      subject_name: name.trim() || null,
      subject_description: description.trim(),
      location: locationValue,
      is_missing_person: isMissingPerson,
    });
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        setError(
          "Reporting requires a verified account: a confirmed email, your SA ID number saved on your profile, and an account that's at least 7 days old."
        );
      } else {
        setError(error.message);
      }
      return;
    }
    setName("");
    setDescription("");
    setIsMissingPerson(false);
    setShowForm(false);
    setNotice(
      isMissingPerson
        ? "Reported as a missing person. This is pinned to the top of the watchlist."
        : "Reported. It'll alert nearby community members once 3 people confirm it."
    );
    load();
  }

  async function submitNote(entryId: string, category: "missing_person" | "sighting") {
    if (noteText.trim().length < 2) {
      setError("Add a bit more detail to the note.");
      return;
    }
    setSavingNote(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingNote(false);
      return;
    }
    const { error } = await supabase.from("incident_posts").insert({
      author_id: user.id,
      is_anonymous: false,
      category,
      body: noteText.trim(),
      linked_watchlist_entry_id: entryId,
    });
    setSavingNote(false);
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        setError("Adding a note requires a verified account (see reporting requirements above).");
      } else {
        setError(error.message);
      }
      return;
    }
    setNoteText("");
    setNoteDraftFor(null);
    load();
  }

  async function confirmEntry(id: string) {
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("watchlist_votes").insert({
      watchlist_entry_id: id,
      voter_id: user.id,
    });
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        setError("Confirming a sighting requires a verified account (see reporting requirements above).");
      } else if (error.message.toLowerCase().includes("duplicate")) {
        setError("You've already confirmed this one.");
      } else {
        setError(error.message);
      }
      return;
    }
    setVotedIds((prev) => new Set(prev).add(id));
    load();
  }

  async function disputeEntry(id: string) {
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("dispute_watchlist_entry", { p_entry_id: id });
    if (error) {
      setError(error.message);
      return;
    }
    setNotice("Disputed. This entry is now frozen pending review.");
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          Watchlist
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Person reports the community has confirmed, plus a quick summary of what's been
          posted in the feed by category.
        </p>
      </div>

      {notice && <p className="text-sm text-[var(--teal-700)]">{notice}</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--teal-700)]">People reported</h2>
            {locStatus === "available" && (
              <p className="text-[11px] text-[var(--muted)]">Missing persons first, then nearest to you</p>
            )}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-[var(--gold)] px-3.5 py-1.5 text-xs font-bold text-[var(--gold-ink)]"
            >
              + Report someone
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={submitEntry}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
            />
            <textarea
              placeholder="Description: what happened, what they look like, where"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
            />
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
              />
              Attach my current location
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-[var(--danger)]/5 p-2.5 text-sm font-semibold text-[var(--danger)]">
              <input
                type="checkbox"
                checked={isMissingPerson}
                onChange={(e) => setIsMissingPerson(e.target.checked)}
              />
              This is a missing person report (pinned to the top)
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-60"
              >
                {saving ? "Submitting…" : "Submit report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsMissingPerson(false);
                }}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2.5">
          {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No watchlist reports yet.</p>
          )}
          {entries.map((entry) => {
            const voted = votedIds.has(entry.id);
            const isMine = entry.reporter_id === userId;
            const isDisputed = entry.dispute_status !== "none";
            const notes = notesByEntry.get(entry.id) || [];
            const draftOpen = noteDraftFor === entry.id;
            return (
              <div
                key={entry.id}
                className={`flex flex-col gap-2 rounded-2xl border p-4 ${
                  entry.is_missing_person
                    ? "border-[var(--danger)]/40 bg-[var(--danger)]/5"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {entry.is_missing_person && (
                      <span className="mb-1 inline-block rounded-full bg-[var(--danger)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Missing person · Priority 1
                      </span>
                    )}
                    {entry.subject_name && (
                      <p className="text-[15px] font-semibold text-[var(--ink)]">{entry.subject_name}</p>
                    )}
                    <p className="text-[14px] text-[var(--ink)]">{entry.subject_description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      isDisputed
                        ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                        : "bg-[var(--teal-100)] text-[var(--teal-700)]"
                    }`}
                  >
                    {STATUS_LABEL[entry.status] || entry.status}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--muted)]">
                  {entry.votes_count} confirmation{entry.votes_count === 1 ? "" : "s"}
                  {formatDistance(entry.distance_m) && ` · ${formatDistance(entry.distance_m)}`}
                </p>
                {entry.status === "active" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => confirmEntry(entry.id)}
                      disabled={voted}
                      className="rounded-lg bg-[var(--teal-900)] px-3.5 py-2 text-xs font-bold text-[var(--bg)] disabled:opacity-50"
                    >
                      {voted ? "Confirmed" : "Confirm sighting"}
                    </button>
                    {!isMine && (
                      <button
                        onClick={() => disputeEntry(entry.id)}
                        className="rounded-lg border border-[var(--line)] px-3.5 py-2 text-xs font-semibold text-[var(--muted)]"
                      >
                        Dispute
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNoteDraftFor(draftOpen ? null : entry.id);
                        setNoteText("");
                      }}
                      className="rounded-lg border border-[var(--line)] px-3.5 py-2 text-xs font-semibold text-[var(--teal-700)]"
                    >
                      {draftOpen ? "Cancel note" : "Add a note"}
                    </button>
                  </div>
                )}

                {draftOpen && (
                  <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
                    <textarea
                      placeholder="What did you see? Add a sighting or update…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--teal-500)]"
                    />
                    <button
                      onClick={() =>
                        submitNote(entry.id, entry.is_missing_person ? "missing_person" : "sighting")
                      }
                      disabled={savingNote}
                      className="self-start rounded-lg bg-[var(--teal-900)] px-3.5 py-2 text-xs font-bold text-[var(--bg)] disabled:opacity-60"
                    >
                      {savingNote ? "Posting…" : "Post note"}
                    </button>
                  </div>
                )}

                {notes.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-2">
                    {notes.map((n) => (
                      <div key={n.id} className="text-[13px] text-[var(--ink)]">
                        <span className="text-[var(--muted)]">
                          {new Date(n.created_at).toLocaleDateString()} ·{" "}
                        </span>
                        {n.body}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--teal-700)]">By category</h2>
        <p className="-mt-2 text-[13px] text-[var(--muted)]">
          A summary of what's been posted to the community feed, grouped by category.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_ORDER.map((cat) => {
            const items = byCategory.get(cat) || [];
            const isOpen = openCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="flex flex-col items-start gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--teal-700)]">
                  {CATEGORY_LABEL[cat]}
                </span>
                <span className="text-2xl font-semibold text-[var(--ink)]">{items.length}</span>
                <span className="text-[12px] text-[var(--muted)]">
                  {items.length === 0 ? "Nothing yet" : isOpen ? "Tap to collapse" : "Tap to view"}
                </span>
              </button>
            );
          })}
        </div>

        {openCategory && (
          <div className="flex flex-col gap-2.5">
            {(byCategory.get(openCategory) || []).length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                Nothing posted in {CATEGORY_LABEL[openCategory].toLowerCase()} yet.
              </p>
            )}
            {(byCategory.get(openCategory) || []).map((p) => (
              <div key={p.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-[14px] text-[var(--ink)]">{p.body}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
