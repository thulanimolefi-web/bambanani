"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShakeDetector } from "@/lib/use-shake-detector";

const HOLD_MS = 1200;

type SosState = "idle" | "holding" | "sending" | "sent" | "error";

export default function SosPage() {
  const [state, setState] = useState<SosState>("idle");
  const [holdProgress, setHoldProgress] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [shakeArmed, setShakeArmed] = useState(false);
  const holdStart = useRef<number | null>(null);
  const holdRaf = useRef<number | null>(null);

  const triggerSos = useCallback(async (triggerType: "button" | "shake") => {
    setState("sending");
    const supabase = createClient();

    // Location and auth don't depend on each other, so run them at the same
    // time instead of stacking their latency.
    const [positionResult, userResult] = await Promise.all([
      new Promise<GeolocationPosition | null>((resolve) =>
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
          enableHighAccuracy: true,
          timeout: 8000,
        })
      ),
      supabase.auth.getUser(),
    ]);

    const locationValue = positionResult
      ? `SRID=4326;POINT(${positionResult.coords.longitude} ${positionResult.coords.latitude})`
      : null;

    const {
      data: { user },
    } = userResult;
    if (!user) {
      setState("error");
      return;
    }

    const { data, error } = await supabase
      .from("sos_events")
      .insert({
        user_id: user.id,
        trigger_type: triggerType,
        location: locationValue,
      })
      .select("id")
      .single();

    if (triggerType === "shake" && "vibrate" in navigator) {
      navigator.vibrate([120, 60, 120, 60, 120]);
    }

    if (error) {
      setState("error");
      return;
    }
    setEventId(data.id);
    setState("sent");
  }, []);

  const { permission, requestPermission } = useShakeDetector(
    () => triggerSos("shake"),
    shakeArmed
  );

  const cancelAlert = useCallback(async () => {
    if (!eventId) return;
    const supabase = createClient();
    await supabase.from("sos_events").update({ status: "false_alarm" }).eq("id", eventId);
    setState("idle");
    setEventId(null);
  }, [eventId]);

  const stopHold = useCallback(() => {
    if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
    holdStart.current = null;
    setHoldProgress(0);
    if (state === "holding") setState("idle");
  }, [state]);

  const startHold = useCallback(() => {
    setState("holding");
    holdStart.current = performance.now();
    const tick = (t: number) => {
      if (!holdStart.current) return;
      const elapsed = t - holdStart.current;
      const pct = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(pct);
      if (pct >= 1) {
        holdStart.current = null;
        triggerSos("button");
        return;
      }
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  }, [triggerSos]);

  useEffect(() => () => {
    if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
  }, []);

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 pt-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--danger)] text-white">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          Alert sent
        </h1>
        <p className="max-w-xs text-[15px] text-[var(--muted)]">
          Your trusted contacts are being notified with your location. Stay safe.
        </p>
        <button
          onClick={cancelAlert}
          className="mt-4 rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--muted)]"
        >
          This was a false alarm
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-6">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--teal-900)]">
          SOS / duress
        </h1>
        <p className="mt-1 max-w-xs text-[14px] text-[var(--muted)]">
          Hold the button for a second and a half to send an alert with your location to your
          trusted contacts.
        </p>
      </div>

      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        disabled={state === "sending"}
        className="relative flex h-40 w-40 select-none items-center justify-center rounded-full bg-[var(--danger)] text-lg font-bold text-white shadow-lg active:scale-[0.98]"
        style={{
          boxShadow:
            state === "holding"
              ? `0 0 0 ${6 + holdProgress * 10}px rgba(192,67,58,${0.12 + holdProgress * 0.15})`
              : undefined,
        }}
      >
        {state === "sending" ? "Sending…" : "Hold for SOS"}
      </button>

      <div className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-bold text-[var(--teal-700)]">Shake to trigger</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
          For when you can&rsquo;t look at your phone: 3 sharp shakes sends the same alert. Only
          works while Bambanani is open on screen.
        </p>
        {permission === "unsupported" && (
          <p className="mt-3 text-[13px] text-[var(--muted)]">Not supported on this device.</p>
        )}
        {permission !== "unsupported" && permission !== "granted" && (
          <button
            onClick={async () => {
              const ok = await requestPermission();
              if (ok) setShakeArmed(true);
            }}
            className="mt-3 rounded-xl bg-[var(--teal-900)] px-4 py-2.5 text-sm font-bold text-[var(--bg)]"
          >
            Enable shake detection
          </button>
        )}
        {permission === "granted" && (
          <label className="mt-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <input
              type="checkbox"
              checked={shakeArmed}
              onChange={(e) => setShakeArmed(e.target.checked)}
            />
            Shake detection armed
          </label>
        )}
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed text-[var(--muted)]">
        The silent duress PIN is set up from your profile, and check-ins auto-escalate after
        60 minutes. This screen already sends real alerts to your trusted contacts.
      </p>
    </div>
  );
}
