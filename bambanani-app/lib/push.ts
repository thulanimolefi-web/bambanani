"use client";

import { createClient } from "@/lib/supabase/client";

// The VAPID public key is safe to expose client-side by design, it's how
// the browser proves to the push service which server is allowed to send
// to a given subscription. Set in Vercel as NEXT_PUBLIC_VAPID_PUBLIC_KEY.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

export async function getPushSubscriptionState(): Promise<"unsupported" | "subscribed" | "unsubscribed"> {
  if (!pushSupported()) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "subscribed" : "unsubscribed";
  } catch {
    return "unsupported";
  }
}

// Turns push on for this browser: asks permission if needed, subscribes
// via the service worker, and saves the subscription against this user so
// the edge functions can find it later. Safe to call again, on conflict it
// just leaves the existing row alone rather than erroring.
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;

  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return false;
  }
  if (Notification.permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) return false;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh, auth },
      { onConflict: "endpoint" }
    );
  return !error;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
