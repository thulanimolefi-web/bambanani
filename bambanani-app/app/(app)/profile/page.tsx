"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enablePush, disablePush, getPushSubscriptionState, pushSupported } from "@/lib/push";

type Profile = {
  full_name: string | null;
  sa_id_number: string | null;
  trust_score: number;
  premier_interest_at: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saId, setSaId] = useState("");
  const [safeWord, setSafeWord] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [hasSafeWord, setHasSafeWord] = useState(false);
  const [hasDuressPin, setHasDuressPin] = useState(false);
  const [hasQuickExitPin, setHasQuickExitPin] = useState(false);
  const [quickExitPin, setQuickExitPin] = useState("");
  const [pushState, setPushState] = useState<"unsupported" | "subscribed" | "unsubscribed">("unsubscribed");
  const [pushBusy, setPushBusy] = useState(false);
  const [premierInterested, setPremierInterested] = useState(false);
  const [premierSaving, setPremierSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");

    const [{ data: p }, { data: sw }, { data: dp }, { data: qe }, ps] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, sa_id_number, trust_score, premier_interest_at")
        .eq("id", user.id)
        .single(),
      supabase.rpc("has_safe_word"),
      supabase.rpc("has_duress_pin"),
      supabase.rpc("has_quick_exit_pin"),
      getPushSubscriptionState(),
    ]);
    if (p) {
      setProfile(p);
      setSaId(p.sa_id_number || "");
      setPremierInterested(!!p.premier_interest_at);
    }
    setHasSafeWord(!!sw);
    setHasDuressPin(!!dp);
    setHasQuickExitPin(!!qe);
    setPushState(ps);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSaId(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!/^[0-9]{13}$/.test(saId)) {
      setErr("SA ID number must be exactly 13 digits.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ sa_id_number: saId })
      .eq("id", user.id);
    if (error) setErr(error.message);
    else setMsg("ID number saved.");
  }

  async function saveSafeWord(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_safe_word", { word: safeWord });
    if (error) setErr(error.message);
    else {
      setMsg("Safe word set. Share it with your trusted contacts in person.");
      setSafeWord("");
      setHasSafeWord(true);
    }
  }

  async function saveDuressPin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_duress_pin", { pin: duressPin });
    if (error) setErr(error.message);
    else {
      setMsg("Duress PIN set. Keep it separate from your safe word.");
      setDuressPin("");
      setHasDuressPin(true);
    }
  }

  async function saveQuickExitPin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_quick_exit_pin", { pin: quickExitPin });
    if (error) setErr(error.message);
    else {
      setMsg("Quick exit PIN set. Type it into the decoy screen, then press “=”, to get back in.");
      setQuickExitPin("");
      setHasQuickExitPin(true);
    }
  }

  async function togglePush() {
    setErr(null);
    setMsg(null);
    setPushBusy(true);
    try {
      if (pushState === "subscribed") {
        await disablePush();
        setPushState("unsubscribed");
      } else {
        const ok = await enablePush();
        if (ok) {
          setPushState("subscribed");
          setMsg("Push notifications are on for this device.");
        } else {
          setErr("Couldn't turn on push notifications. Check your browser's notification permission.");
        }
      }
    } finally {
      setPushBusy(false);
    }
  }

  async function togglePremierInterest() {
    setErr(null);
    setMsg(null);
    setPremierSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPremierSaving(false);
      return;
    }
    const nextValue = !premierInterested;
    const { error } = await supabase
      .from("profiles")
      .update({ premier_interest_at: nextValue ? new Date().toISOString() : null })
      .eq("id", user.id);
    setPremierSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPremierInterested(nextValue);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          {profile?.full_name || "Your profile"}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">{email}</p>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--teal-700)]">
          Trust score
        </span>
        <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
          {profile?.trust_score ?? 100}
        </p>
      </div>

      {msg && <p className="text-sm text-[var(--teal-700)]">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      {pushState !== "unsupported" && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div>
            <h2 className="text-sm font-bold text-[var(--teal-700)]">Push notifications</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
              So an SOS or check-in escalation reaches you the instant it happens, even if you're
              not in the app or checking email.
            </p>
          </div>
          <button
            onClick={togglePush}
            disabled={pushBusy}
            className={
              pushState === "subscribed"
                ? "shrink-0 rounded-xl border border-[var(--teal-500)] px-4 py-2.5 text-sm font-bold text-[var(--teal-700)] disabled:opacity-60"
                : "shrink-0 rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-60"
            }
          >
            {pushState === "subscribed" ? "On" : "Turn on"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--gold)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold-ink)]">
            COMING SOON
          </span>
          <h2 className="text-sm font-bold text-[var(--teal-700)]">Bambanani Premier</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--muted)]">
          An optional paid tier: no ads, an extended alert radius, and a portion of every
          subscription going toward a gender-based violence support organisation. Core safety
          features stay free forever either way.
        </p>
        <button
          onClick={togglePremierInterest}
          disabled={premierSaving}
          className={
            premierInterested
              ? "self-start rounded-xl border border-[var(--teal-500)] px-4 py-2.5 text-sm font-bold text-[var(--teal-700)] disabled:opacity-60"
              : "self-start rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] disabled:opacity-60"
          }
        >
          {premierInterested ? "You're on the list ✓" : "Notify me when it's ready"}
        </button>
      </div>

      <form
        onSubmit={saveSaId}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-bold text-[var(--teal-700)]">SA ID number</h2>
        <p className="text-[13px] text-[var(--muted)]">
          Format-checked only for now. Used later to unlock verified-voter status on the
          watchlist.
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={13}
          value={saId}
          onChange={(e) => setSaId(e.target.value.replace(/\D/g, ""))}
          placeholder="13 digits"
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <button
          type="submit"
          className="self-start rounded-xl bg-[var(--teal-900)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
        >
          Save
        </button>
      </form>

      <form
        onSubmit={saveSafeWord}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-bold text-[var(--teal-700)]">
          Safe word {hasSafeWord && <span className="text-[var(--muted)] font-normal">(set)</span>}
        </h2>
        <p className="text-[13px] text-[var(--muted)]">
          Required to close an &ldquo;are-you-safe&rdquo; check-in, so a tap alone can&rsquo;t
          dismiss it for you.
        </p>
        <input
          type="text"
          value={safeWord}
          onChange={(e) => setSafeWord(e.target.value)}
          placeholder={hasSafeWord ? "Change safe word" : "Choose a safe word"}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <button
          type="submit"
          className="self-start rounded-xl bg-[var(--teal-900)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
        >
          Save
        </button>
      </form>

      <form
        onSubmit={saveDuressPin}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-bold text-[var(--teal-700)]">
          Duress PIN {hasDuressPin && <span className="text-[var(--muted)] font-normal">(set)</span>}
        </h2>
        <p className="text-[13px] text-[var(--muted)]">
          A separate 4&ndash;6 digit PIN to silently signal you&rsquo;re not safe while looking
          compliant. Keep it different from your safe word.
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={duressPin}
          onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ""))}
          placeholder={hasDuressPin ? "Change PIN" : "4-6 digits"}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <button
          type="submit"
          className="self-start rounded-xl bg-[var(--teal-900)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
        >
          Save
        </button>
        {hasDuressPin && (
          <Link href="/pin" className="text-[13px] font-semibold text-[var(--teal-700)] underline">
            Open silent PIN entry screen →
          </Link>
        )}
      </form>

      <form
        onSubmit={saveQuickExitPin}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-bold text-[var(--teal-700)]">
          Quick exit {hasQuickExitPin && <span className="text-[var(--muted)] font-normal">(set)</span>}
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--muted)]">
          A separate PIN, nothing to do with your safe word or duress PIN. Once it&rsquo;s set, a
          quiet exit button appears at the top of every screen. Tap it and the app instantly
          becomes a working calculator. Type this PIN into it, then press &ldquo;=&rdquo;, to get
          straight back to Bambanani.
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={quickExitPin}
          onChange={(e) => setQuickExitPin(e.target.value.replace(/\D/g, ""))}
          placeholder={hasQuickExitPin ? "Change PIN" : "4-6 digits"}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
        />
        <button
          type="submit"
          className="self-start rounded-xl bg-[var(--teal-900)] px-4 py-2 text-sm font-bold text-[var(--bg)]"
        >
          Save
        </button>
      </form>

      <Link
        href="/contacts"
        className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <div>
          <h2 className="text-sm font-bold text-[var(--teal-700)]">Trusted contacts</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Manage who gets your SOS alerts and who can check in on you.
          </p>
        </div>
        <span className="text-[var(--teal-700)]">→</span>
      </Link>

      <button
        onClick={signOut}
        className="mt-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)]"
      >
        Sign out
      </button>
    </div>
  );
}
