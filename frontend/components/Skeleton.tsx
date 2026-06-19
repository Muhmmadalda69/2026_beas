// Skeleton loading primitives. `Skeleton` is a single shimmering block; the
// composed helpers below mirror the real content layouts so the page does not
// jump when data arrives. All blocks are aria-hidden — wrap a loading region in
// `SkeletonScreen` (or add your own role="status") to announce it to AT.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A loading region that announces "Memuat…" to screen readers. */
export function SkeletonScreen({
  label = "Memuat…",
  children,
  className = "",
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Page header skeleton: eyebrow + big title + subtitle line. */
export function HeaderSkeleton() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-full max-w-lg" />
      <Skeleton className="mt-2 h-5 w-2/3" />
    </div>
  );
}

/** A generic card placeholder used in the wiki / kuis grids. */
export function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-3/4" />
      <Skeleton className="mt-2 h-7 w-1/2" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <Skeleton className="mt-5 h-4 w-28" />
    </div>
  );
}

/** A horizontal row placeholder used in admin lists & leaderboard. */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-12 rounded-lg" />
    </div>
  );
}
