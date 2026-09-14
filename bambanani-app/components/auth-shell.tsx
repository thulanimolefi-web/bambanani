import Emblem from "./emblem";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg)] px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Emblem size={56} />
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--teal-900)]">
            {title}
          </h1>
          <p className="mt-1.5 text-[15px] text-[var(--muted)]">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
          If you&rsquo;re in immediate danger, call SAPS on <strong>10111</strong>.
          Bambanani is a community safety network, not an emergency service.
        </p>
      </div>
    </div>
  );
}
