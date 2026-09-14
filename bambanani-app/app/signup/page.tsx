"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth-shell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="Almost there">
        <p className="text-[15px] leading-relaxed text-[var(--muted)]">
          We sent a confirmation link to <strong className="text-[var(--ink)]">{email}</strong>.
          Open it on this device to verify your account, then come back and sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-[var(--teal-900)] px-5 py-3 text-[15px] font-bold text-[var(--bg)]"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join Bambanani" subtitle="Every safety feature is free, forever">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--teal-700)]">
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--teal-500)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--teal-700)]">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--teal-500)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--teal-700)]">
          Password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--teal-500)]"
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-[15px] font-bold text-[var(--gold-ink)] disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already on Bambanani?{" "}
        <Link href="/login" className="font-semibold text-[var(--teal-700)]">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
