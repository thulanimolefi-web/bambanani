"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A believable incoming call you can trigger on a delay, to help get out of
// a situation before it becomes one that needs an SOS at all. Everything
// here is client-only, no network calls, no data saved, it's just a UI and
// a synthesized ringtone (no audio asset to source or license).
type Stage = "idle" | "ringing" | "in-call";

function useRingtone(playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!playing) {
      stopRef.current?.();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;
    let cancelled = false;

    const ringOnce = () => {
      if (cancelled) return;
      [880, 1108].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.35);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.001);
        osc.stop(ctx.currentTime + 0.4);
      });
    };

    ringOnce();
    const interval = setInterval(ringOnce, 1000);
    if ("vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 400]);
    const vibrateInterval = setInterval(() => {
      if ("vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 400]);
    }, 1000);

    stopRef.current = () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(vibrateInterval);
      ctx.close().catch(() => {});
    };
    return () => stopRef.current?.();
  }, [playing]);
}

export default function FakeCall() {
  const [stage, setStage] = useState<Stage>("idle");
  const [callerName, setCallerName] = useState("Mom");
  const [seconds, setSeconds] = useState(0);
  const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useRingtone(stage === "ringing");

  useEffect(() => {
    if (stage !== "in-call") {
      if (tickRef.current) clearInterval(tickRef.current);
      setSeconds(0);
      return;
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [stage]);

  const schedule = useCallback(
    (delayMs: number) => {
      if (scheduled.current) clearTimeout(scheduled.current);
      scheduled.current = setTimeout(() => setStage("ringing"), delayMs);
    },
    []
  );

  useEffect(() => () => {
    if (scheduled.current) clearTimeout(scheduled.current);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-bold text-[var(--teal-700)]">Fake incoming call</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
        A realistic incoming call, on a delay, so you have a reason to step away or end a
        conversation before things escalate.
      </p>
      <input
        type="text"
        value={callerName}
        onChange={(e) => setCallerName(e.target.value)}
        placeholder="Caller name"
        className="mt-3 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--teal-500)]"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setStage("ringing")}
          className="flex-1 rounded-xl bg-[var(--teal-900)] px-3 py-2.5 text-sm font-bold text-[var(--bg)]"
        >
          Now
        </button>
        <button
          onClick={() => schedule(15000)}
          className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)]"
        >
          In 15s
        </button>
        <button
          onClick={() => schedule(30000)}
          className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)]"
        >
          In 30s
        </button>
      </div>

      {stage !== "idle" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0b0b0c] pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] text-white">
          {stage === "ringing" ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-white/60">Mobile</p>
                <h2 className="text-3xl font-semibold">{callerName || "Unknown"}</h2>
                <p className="mt-1 text-white/50">incoming call…</p>
              </div>
              <div className="flex w-full items-center justify-center gap-16 px-10">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setStage("idle")}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl"
                  >
                    ✕
                  </button>
                  <span className="text-xs text-white/60">Decline</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setStage("in-call")}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-2xl"
                  >
                    ✆
                  </button>
                  <span className="text-xs text-white/60">Accept</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-3xl font-semibold">{callerName || "Unknown"}</h2>
                <p className="mt-1 font-mono text-white/60">{fmt(seconds)}</p>
              </div>
              <button
                onClick={() => setStage("idle")}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
