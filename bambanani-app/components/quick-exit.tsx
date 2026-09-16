"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Stealth exit: tapping the header button instantly covers the whole app
// with a real, working calculator. Nothing about it hints a safety app is
// underneath. Typing the Quick Exit PIN (set in Profile) and pressing "="
// drops back into Bambanani exactly where you left off. Wrong PIN just
// shows a calculation result like any calculator would, no error, no
// hint that anything unusual happened, deliberately, the same way the
// duress PIN screen never reveals whether it matched.
export default function QuickExit({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const entry = useRef("");
  const pendingOp = useRef<{ value: number; op: string } | null>(null);

  const reset = useCallback(() => {
    setDisplay("0");
    entry.current = "";
    pendingOp.current = null;
  }, []);

  const openDecoy = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  // Escape hatch so this never becomes a dead end even before a PIN is set:
  // long-pressing the display for ~2s always returns to the real app. It's
  // not advertised anywhere in visible copy.
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startLongPress = useCallback(() => {
    longPress.current = setTimeout(() => setOpen(false), 2000);
  }, []);
  const cancelLongPress = useCallback(() => {
    if (longPress.current) clearTimeout(longPress.current);
  }, []);

  const pressDigit = useCallback((d: string) => {
    entry.current = entry.current === "0" ? d : entry.current + d;
    setDisplay(entry.current || "0");
  }, []);

  const pressOp = useCallback((op: string) => {
    const current = parseFloat(entry.current || display) || 0;
    pendingOp.current = { value: current, op };
    entry.current = "";
  }, [display]);

  const pressClear = useCallback(() => {
    reset();
  }, [reset]);

  const pressEquals = useCallback(async () => {
    const typed = entry.current;

    if (typed.length >= 4 && typed.length <= 6) {
      const supabase = createClient();
      const { data } = await supabase.rpc("verify_quick_exit_pin", { pin: typed });
      if (data === true) {
        setOpen(false);
        reset();
        return;
      }
    }

    // Behaves like a normal calculator either way, nothing gives away
    // that a PIN check just happened.
    if (pendingOp.current) {
      const b = parseFloat(typed || "0") || 0;
      const { value: a, op } = pendingOp.current;
      let result = b;
      if (op === "+") result = a + b;
      if (op === "-") result = a - b;
      if (op === "×") result = a * b;
      if (op === "÷") result = b !== 0 ? a / b : 0;
      setDisplay(String(Math.round(result * 1e10) / 1e10));
      entry.current = String(Math.round(result * 1e10) / 1e10);
      pendingOp.current = null;
    }
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    // Block the app underneath from scrolling while the decoy is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={openDecoy}
        aria-label="Quick exit"
        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1c1e] pt-[env(safe-area-inset-top)]">
          <div
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            className="flex flex-1 items-end justify-end px-6 pb-4"
          >
            <span className="max-w-full truncate text-5xl font-light text-white">{display}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {[
              ["C", "op"],
              ["÷", "op"],
              ["×", "op"],
              ["-", "op"],
              ["7", "d"],
              ["8", "d"],
              ["9", "d"],
              ["+", "op"],
              ["4", "d"],
              ["5", "d"],
              ["6", "d"],
              ["=", "eq"],
              ["1", "d"],
              ["2", "d"],
              ["3", "d"],
              ["0", "d"],
            ].map(([label, kind], i) => (
              <button
                key={i}
                onClick={() => {
                  if (kind === "d") pressDigit(label);
                  else if (kind === "op" && label === "C") pressClear();
                  else if (kind === "op") pressOp(label);
                  else pressEquals();
                }}
                className={`flex h-16 items-center justify-center rounded-full text-xl font-medium ${
                  kind === "eq"
                    ? "bg-orange-500 text-white"
                    : kind === "op"
                    ? "bg-[#3a3a3c] text-orange-400"
                    : "bg-[#333336] text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
