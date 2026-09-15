"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Instant-send design: 3 sharp shakes within ~1.5s fires the alert
// immediately — no arm-then-wait delay, no confirming shake. The
// fail-safe part lives on the other side of the send: SOS already
// has a one-tap "this was a false alarm" button for right after it
// fires, so cheap correction still exists without making someone
// wait through a countdown to be sure it went out. In a real
// emergency (phone knocked away, person overpowered) a delay window
// is exactly the moment it can get interrupted, so the fastest safe
// design is send-on-shake-3, correct-after-if-wrong.
//
// IMPORTANT LIMITATION: this only works while Bambanani is open on screen.
// iOS and Android both stop delivering motion-sensor events to a web page
// the moment it's backgrounded or the phone is locked — that's an OS-level
// privacy/battery restriction, not something a web app can opt out of. A
// version that works with the app closed or the phone locked needs a native
// app with a background-motion entitlement, which is a separate build.
const SHAKE_THRESHOLD = 18; // m/s^2 of combined acceleration delta
const REQUIRED_SHAKES = 3;
const WINDOW_MS = 1500;
const DEBOUNCE_MS = 250; // ignore re-triggers from the same physical shake

type PermissionState = "unsupported" | "unrequested" | "granted" | "denied";

export function useShakeDetector(
  onShakeTriggered: () => void,
  active: boolean
) {
  const [permission, setPermission] = useState<PermissionState>("unrequested");
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeAt = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });

  const reset = useCallback(() => {
    shakeTimestamps.current = [];
  }, []);

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

        shakeTimestamps.current = [...shakeTimestamps.current, now].filter(
          (t) => now - t <= WINDOW_MS
        );
        if (shakeTimestamps.current.length >= REQUIRED_SHAKES) {
          shakeTimestamps.current = [];
          onShakeTriggered();
        }
      }
    },
    [onShakeTriggered]
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
      reset();
      return;
    }
    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      reset();
    };
  }, [active, permission, handleMotion, reset]);

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

  return { permission, requestPermission };
}
