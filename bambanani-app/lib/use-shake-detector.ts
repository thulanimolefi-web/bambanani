"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Fail-safe design, modeled on Apple Watch fall detection: 3 sharp shakes
// within ~1.5s ARMS the alert (with a buzz so you can feel it without
// looking), then it SENDS AUTOMATICALLY a few seconds later unless you
// actively cancel. If more shaking happens while armed, it sends right away
// instead of waiting out the timer.
//
// This deliberately does NOT require a further confirming shake to send.
// An earlier version did, and it had a dangerous failure mode: if the phone
// gets knocked away, or the person is overpowered, right after the 3rd
// shake, a confirm-to-send design produces silence — arguably the most
// likely way a shake trigger gets interrupted, since shake exists precisely
// for when someone can't operate the screen. Defaulting to "send unless
// cancelled" means the worst case is a false alarm (cheap: one tap to
// clear), not a missed real emergency (unrecoverable). That asymmetry is
// why the default leans toward sending.
//
// IMPORTANT LIMITATION: this only works while Bambanani is open on screen.
// iOS and Android both stop delivering motion-sensor events to a web page
// the moment it's backgrounded or the phone is locked — that's an OS-level
// privacy/battery restriction, not something a web app can opt out of. A
// version that works with the app closed or the phone locked needs a native
// app with a background-motion entitlement, which is a separate build.
const SHAKE_THRESHOLD = 18; // m/s^2 of combined acceleration delta
const REQUIRED_SHAKES_TO_ARM = 3;
const ARM_WINDOW_MS = 1500;
const AUTO_SEND_MS = 3000; // grace period to cancel before it sends itself
const DEBOUNCE_MS = 250; // ignore re-triggers from the same physical shake

type PermissionState = "unsupported" | "unrequested" | "granted" | "denied";
export type ShakeStage = "idle" | "armed";

export function useShakeDetector(
  onArmed: () => void,
  onShakeTriggered: () => void,
  active: boolean
) {
  const [permission, setPermission] = useState<PermissionState>("unrequested");
  const [stage, setStage] = useState<ShakeStage>("idle");
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeAt = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const armedRef = useRef(false);
  const armTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(onShakeTriggered);
  triggeredRef.current = onShakeTriggered;

  const disarm = useCallback(() => {
    armedRef.current = false;
    setStage("idle");
    shakeTimestamps.current = [];
    if (armTimeout.current) clearTimeout(armTimeout.current);
  }, []);

  // Exposed so the UI can offer an explicit "Cancel" during the grace window.
  const cancelArm = disarm;

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

      const delta =
        Math.abs(accel.x - lastAccel.current.x) +
        Math.abs(accel.y - lastAccel.current.y) +
        Math.abs(accel.z - lastAccel.current.z);
      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      const now = Date.now();
      if (delta > SHAKE_THRESHOLD && now - lastShakeAt.current > DEBOUNCE_MS) {
        lastShakeAt.current = now;

        if (armedRef.current) {
          // Still shaking while armed — don't make them wait out the timer.
          disarm();
          onShakeTriggered();
          return;
        }

        shakeTimestamps.current = [...shakeTimestamps.current, now].filter(
          (t) => now - t <= ARM_WINDOW_MS
        );
        if (shakeTimestamps.current.length >= REQUIRED_SHAKES_TO_ARM) {
          shakeTimestamps.current = [];
          armedRef.current = true;
          setStage("armed");
          if ("vibrate" in navigator) navigator.vibrate([60, 40, 60]);
          onArmed();
          if (armTimeout.current) clearTimeout(armTimeout.current);
          // Fail-safe: sends on its own unless cancelArm() is called first.
          armTimeout.current = setTimeout(() => {
            armedRef.current = false;
            setStage("idle");
            triggeredRef.current();
          }, AUTO_SEND_MS);
        }
      }
    },
    [onArmed, onShakeTriggered, disarm]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setPermission("unsupported");
      return;
    }
    // Most Android browsers never require an explicit permission prompt.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceMotionEvent as any).requestPermission !== "function") {
      setPermission("granted");
    }
  }, []);

  useEffect(() => {
    if (!active || permission !== "granted") {
      disarm();
      return;
    }
    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      disarm();
    };
  }, [active, permission, handleMotion, disarm]);

  const requestPermission = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (DeviceMotionEvent as any).requestPermission;
    if (typeof req !== "function") {
      setPermission("granted");
      return true;
    }
    try {
      const result = await req();
      setPermission(result === "granted" ? "granted" : "denied");
      return result === "granted";
    } catch {
      setPermission("denied");
      return false;
    }
  }, []);

  return { permission, requestPermission, stage, cancelArm };
}
