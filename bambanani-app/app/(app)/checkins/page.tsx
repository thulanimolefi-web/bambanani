"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PendingCheckIn = {
  id: string;
  status: string;
  wrong_attempts: number;
  created_at: string;
};

type MonitorContact = {
  id: string;
  owner_id: string;
  owner_name: string | null;
};

type HistoryItem = {
  id: string;
  status: string;
  created_at: string;
  owner_id: string;
  initiated_by: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting on response",
  responded_safe: "Confirmed safe",
  wrong_word: "Wrong safe word entered",
  escalated: "Escalated to contacts",
  resolved: "Resolved",
};

export default function CheckInsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCheckIn[]>([]);
  const [monitorContacts, setMonitorContacts] = useState<MonitorContact[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [safeWords, setSafeWords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // These three queries don't depend on each other, so fire them together
    // instead of waiting on each round trip in turn.
    const [{ data: pendingData }, { data: monitorRows }, { data: historyData }] = await Promise.all([
      supabase
        .from("check_ins")
        .select("id, status, wrong_attempts, created_at")
        .eq("owner_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      // People I can check in on: rows where *I* am the trusted contact_user_id
      // (not owner_id — that would be backwards, it's the person who added ME).
      supabase
        .from("trusted_contacts")
        .select("id, owner_id")
        .eq("contact_user_id", user.id)
        .eq("is_monitor", true)
        .eq("status", "accepted"),
      supabase
        .from("check_ins")
        .select("id, status, created_at, owner_id, initiated_by")
        .or(`owner_id.eq.${user.id},initiated_by.eq.${user.id}`)
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setPending(pendingData || []);

    const ownerIds = [...new Set((monitorRows || []).map((r) => r.owner_id))];
    let ownerNames: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      ownerNames = Object.fromEntries((profs || []).map((p) => [p.id, p.full_name || "Contact"]));
    }
    setMonitorContacts(
      (monitorRows || []).map((r) => ({
        id: r.id,
        owner_id: r.owner_id,
        owner_name: ownerNames[r.owner_id] || "Contact",
      }))
    );

    setHistory(historyData || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendCheckIn(ownerId: string) {
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("check_ins").insert({
      owner_id: ownerId,
      initiated_by: user.id,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Check-in sent.");
    load();
  }

  async function respondSafe(id: string) {
    const word = (safeWords[id] || "").trim();
    if (!word) {
      setErr("Enter your safe word.");
      return;
    }
    setErr(null);
    setMsg(null);
    setBusyId(id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("respond_check_in", {
      p_check_in_id: id,
      p_safe_word: word,
    });
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    if (data === "responded_safe") {
      setMsg("Marked as safe.");
    } else if (data === "wrong_word") {
      setErr("That didn't match your safe word. Try again.");
    } else if (data === "escalated") {
      setErr("Too many wrong attempts. This has been escalated to your trusted contacts.");
    }
    setSafeWords((prev) => ({ ...prev, [id]: "" }));
    load();
  }

  async function reportNotSafe(id: string) {
    setErr(null);
    setMsg(null);
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("report_not_safe", { p_check_in_id: id });
    setBusyId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Your trusted contacts have been alerted.");
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          Check-ins
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Are-you-safe check-ins between you and the contacts you've trusted to monitor you.
        </p>
      </div>

      {msg && <p className="text-sm text-[var(--teal-700)]">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--teal-700)]">Waiting on you</h2>
          {pending.map((ci) => (
            <div
              key={ci.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface)] p-4"
            >
              <p className="text-[14px] text-[var(--ink)]">
                A trusted contact is checking on you. Enter your safe word to confirm you're
                okay, or let them know you're not.
              </p>
              {ci.wrong_attempts > 0 && (
                <p className="text-[12px] font-semibold text-[var(--danger)]">
                  {ci.wrong_attempts} wrong attempt{ci.wrong_attempts === 1 ? "" : "s"} so far.
                  Escalates automatically at 3.
                </p>
              )}
              <input
                type="text"
                placeholder="Safe word"
                value={safeWords[ci.id] || ""}
                onChange={(e) => setSafeWords((prev) => ({ ...prev, [ci.id]: e.target.value }))}
                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => respondSafe(ci.id)}
                  disabled={busyId === ci.id}
                  className="rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-60"
                >
                  I'm safe
                </button>
                <button
                  onClick={() => reportNotSafe(ci.id)}
                  disabled={busyId === ci.id}
                  className="rounded-xl bg-[var(--danger)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  I'm not safe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--teal-700)]">People you can check on</h2>
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {!loading && monitorContacts.length === 0 && (
          <p className="text-[13px] text-[var(--muted)]">
            No one yet. Add a trusted contact and give them &ldquo;can check in&rdquo; permission,
            and once they've accepted (created their own account with the invited email) they'll
            show up here.
          </p>
        )}
        {monitorContacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-[15px] font-semibold text-[var(--ink)]">{c.owner_name}</p>
            <button
              onClick={() => sendCheckIn(c.owner_id)}
              className="rounded-lg bg-[var(--gold)] px-3.5 py-2 text-xs font-bold text-[var(--gold-ink)]"
            >
              Send check-in
            </button>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-[var(--teal-700)]">Recent history</h2>
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-[13px]"
            >
              <span className="text-[var(--muted)]">
                {h.owner_id === userId ? "You were checked on" : "You checked on someone"}
              </span>
              <span className="font-semibold text-[var(--ink)]">
                {STATUS_LABEL[h.status] || h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
