"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_LEN = 6;

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState<"entry" | "unlocking">("entry");

  const press = useCallback(
    (d: string) => {
      if (stage !== "entry") return;
      setPin((prev) => (prev.length >= MAX_LEN ? prev : prev + d));
    },
    [stage]
  );

  const backspace = useCallback(() => {
    if (stage !== "entry") return;
    setPin((prev) => prev.slice(0, -1));
  }, [stage]);

  const submit = useCallback(async () => {
    if (pin.length < 4 || stage !== "entry") return;
    setStage("unlocking");

    let locationValue: string | null = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
        })
      );
      locationValue = `SRID=4326;POINT(${position.coords.longitude} ${position.coords.latitude})`;
    } catch {
      // proceed without location
    }

    const supabase = createClient();
    // Always the same call, same timing profile, same follow-on screen.
    // Whether the PIN matched the duress PIN or not is never observable.
    await supabase.rpc("activate_duress_pin", { p_pin: pin, p_location: locationValue });

    setTimeout(() => {
      router.replace("/home");
    }, 550);
  }, [pin, stage, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--teal-900)] px-6 text-white">
      <div className="text-center">
        <p className="text-sm font-medium text-white/70">Bambanani</p>
        <h1 className="mt-1 text-lg font-semibold">
          {stage === "entry" ? "Enter PIN to unlock" : "Unlocking…"}
        </h1>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: MAX_LEN }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full border border-white/40 ${
              i < pin.length ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
      </div>

      {stage === "entry" && (
        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold active:bg-white/20"
            >
              {d}
            </button>
          ))}
          <button
            onClick={backspace}
            className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold text-white/70"
          >
            ⌫
          </button>
          <button
            onClick={() => press("0")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold active:bg-white/20"
          >
            0
          </button>
          <button
            onClick={submit}
            disabled={pin.length < 4}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--teal-900)] disabled:opacity-30"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
