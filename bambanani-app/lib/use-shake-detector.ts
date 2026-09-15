"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Confirmed design: 3 sharp shakes within ~1.5s triggers SOS. A short window is
// deliberate: real panic produces sharp, brief motion, not sustained motion, so a
// longer duration requirement would delay a genuine emergency exactly when it matters.
const SHAKE_THRESHOLD = 18; // m/s^2 of combined acceleration delta
const REQUIRED_SHAKES = 3;
const WINDOW_MS = 1500;
const DEBOUNCE_MS = 250; // ignore re-triggers from the same physical shake

type PermissionState = "unsupported" | "unrequested" | "granted" | "denied";

export function useShakeDetector(onShakeTriggered: () => void, active: boolean) {
  const [permission, setPermission] = useState<PermissionState>("unrequested");
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeAt = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });

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
    if (!active || permission !== "granted") return;
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [active, permission, handleMotion]);

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
