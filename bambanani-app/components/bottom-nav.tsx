"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Feed" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/sos", label: "SOS" },
  { href: "/checkins", label: "Check-ins" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const isSos = tab.href === "/sos";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[12px] font-semibold"
            >
              <span
                className={
                  isSos
                    ? "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--danger)] text-white"
                    : `flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-[var(--teal-100)]" : ""}`
                }
              >
                <span className={isSos ? "text-white" : active ? "text-[var(--teal-700)]" : "text-[var(--muted)]"}>
                  {tab.label[0]}
                </span>
              </span>
              <span className={isSos ? "text-[var(--danger)]" : active ? "text-[var(--teal-700)]" : "text-[var(--muted)]"}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
