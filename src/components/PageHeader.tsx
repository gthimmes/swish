"use client";

export function PageHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <header
      className="flex flex-wrap items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {count != null && (
          <span className="text-sm" style={{ color: "var(--text-faint)" }}>
            {count}
          </span>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </header>
  );
}
