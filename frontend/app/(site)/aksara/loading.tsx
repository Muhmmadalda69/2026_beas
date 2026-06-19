import { Skeleton, SkeletonScreen, HeaderSkeleton } from "@/components/Skeleton";

export default function AksaraLoading() {
  return (
    <SkeletonScreen
      label="Memuat tabel aksara…"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
    >
      <HeaderSkeleton />
      <div className="mt-10 space-y-12">
        {Array.from({ length: 2 }).map((_, s) => (
          <section key={s}>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5"
                >
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="mt-3 h-4 w-12" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SkeletonScreen>
  );
}
