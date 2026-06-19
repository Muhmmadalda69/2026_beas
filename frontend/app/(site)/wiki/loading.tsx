import {
  Skeleton,
  SkeletonScreen,
  HeaderSkeleton,
  CardSkeleton,
} from "@/components/Skeleton";

export default function WikiLoading() {
  return (
    <SkeletonScreen
      label="Memuat artikel…"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
    >
      <HeaderSkeleton />
      {/* Category filter chips */}
      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
