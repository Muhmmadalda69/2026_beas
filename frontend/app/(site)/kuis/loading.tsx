import {
  SkeletonScreen,
  HeaderSkeleton,
  CardSkeleton,
} from "@/components/Skeleton";

export default function KuisLoading() {
  return (
    <SkeletonScreen
      label="Memuat level kuis…"
      className="mx-auto max-w-5xl px-4 py-12 sm:px-6"
    >
      <HeaderSkeleton />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
