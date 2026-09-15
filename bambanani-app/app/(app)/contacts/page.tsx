"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  invite_name: string | null;
  invite_email: string | null;
  is_ice: boolean;
  is_monitor: boolean;
  status: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isIce, setIsIce] = useState(true);
  const [isMonitor, setIsMonitor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("trusted_contacts")
      .select("id, invite_name, invite_email, is_ice, is_monitor, status")
      .eq("owner_id", user.id)
      .neq("status", "removed")
      .order("invited_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isIce && !isMonitor) {
      setError("Pick at least one role for this contact.");
      return;
    }
    if (contacts.length >= 5) {
      setError("You've reached the limit of 5 trusted contacts.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("trusted_contacts").insert({
      owner_id: user.id,
      invite_name: name,
      invite_email: email,
      is_ice: isIce,
      is_monitor: isMonitor,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setEmail("");
    load();
  }

  async function removeContact(id: string) {
    const supabase = createClient();
    await supabase.from("trusted_contacts").update({ status: "removed" }).eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          Trusted contacts
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Up to 5 people. Each one can be notified on your SOS, monitor you with check-ins, or
          both. It's one directional, you choose who.
        </p>
      </div>

      <form
        onSubmit={addContact}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <input
          type="text"
          placeholder="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <div className="flex gap-4 text-sm font-medium text-[var(--ink)]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isIce} onChange={(e) => setIsIce(e.target.checked)} />
            Notify on my SOS
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isMonitor}
              onChange={(e) => setIsMonitor(e.target.checked)}
            />
            Can check in on me
          </label>
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-bold text-[var(--gold-ink)] disabled:opacity-60"
        >
          {saving ? "Sending invite..." : "Send invite"}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
        {!loading && contacts.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No trusted contacts yet.</p>
        )}
        {contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <p className="text-[15px] font-semibold text-[var(--ink)]">{c.invite_name}</p>
              <p className="text-[13px] text-[var(--muted)]">
                {[c.is_ice && "SOS contact", c.is_monitor && "Can check in"]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                · {c.status === "accepted" ? "Accepted" : "Invite pending"}
              </p>
            </div>
            <button
              onClick={() => removeContact(c.id)}
              className="text-xs font-semibold text-[var(--danger)]"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
