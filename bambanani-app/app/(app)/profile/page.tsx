"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string | null;
  sa_id_number: string | null;
  trust_score: number;
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
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");

    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, sa_id_number, trust_score")
      .eq("id", user.id)
      .single();
    if (p) {
      setProfile(p);
      setSaId(p.sa_id_number || "");
    }

    const { data: sw } = await supabase.rpc("has_safe_word");
    setHasSafeWord(!!sw);
    const { data: dp } = await supabase.rpc("has_duress_pin");
    setHasDuressPin(!!dp);
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

      <form
        onSubmit={saveSaId}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-sm font-bold text-[var(--teal-700)]">SA ID number</h2>
        <p className="text-[13px] text-[var(--muted)]">
          Format-checked only for now — used later to unlock verified-voter status on the
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
          Required to close an &ldquo;are-you-safe&rdquo; check-in — so a tap alone can&rsquo;t
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
      </form>

      <button
        onClick={signOut}
        className="mt-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)]"
      >
        Sign out
      </button>
    </div>
  );
}
