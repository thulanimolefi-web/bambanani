"use client";

import { useEffect, useState } from "react";

type Coords = { lat: number; lon: number };

// Best-effort, silent location grab for sorting/filtering the feed by
// proximity. Never blocks the page and never prompts loudly — if the user
// has already granted location (e.g. for SOS) this resolves fast; if they
// haven't or say no, callers just fall back to showing everything by
// recency, so nobody is stuck with an empty screen over a permission dialog.
export function useProximity() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<"pending" | "available" | "unavailable">("pending");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("available");
      },
      () => {
        if (!cancelled) setStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, status };
}

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 950) return `${Math.round(meters / 50) * 50}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}
