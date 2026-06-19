import {
  SkeletonScreen,
  HeaderSkeleton,
  RowSkeleton,
} from "@/components/Skeleton";

export default function PeringkatLoading() {
  return (
    <SkeletonScreen
      label="Memuat papan peringkat…"
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
    >
      <HeaderSkeleton />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
