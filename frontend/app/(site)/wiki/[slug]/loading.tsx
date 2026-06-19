import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

export default function ArticleLoading() {
  return (
    <SkeletonScreen
      label="Memuat artikel…"
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
    >
      <Skeleton className="h-4 w-44" />

      <div className="mt-6 border-b border-border pb-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-10 w-full max-w-xl" />
        <Skeleton className="mt-2 h-10 w-1/2" />
        <Skeleton className="mt-4 h-7 w-2/3" />
        <Skeleton className="mt-5 h-4 w-32" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 ${i % 4 === 3 ? "w-1/2" : "w-full"}`}
          />
        ))}
      </div>
    </SkeletonScreen>
  );
}
