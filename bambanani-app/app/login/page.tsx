"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Email not confirmed"
          ? "Please verify your email first — check your inbox for the confirmation link."
          : "Incorrect email or password."
      );
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to Bambanani">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            autoComplete="current-password"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        New to Bambanani?{" "}
        <Link href="/signup" className="font-semibold text-[var(--teal-700)]">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
