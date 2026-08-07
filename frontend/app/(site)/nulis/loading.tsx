import { SkeletonScreen, HeaderSkeleton } from "@/components/Skeleton";

export default function NulisLoading() {
  return (
    <SkeletonScreen
      label="Memuat latihan menulis…"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
    >
      <HeaderSkeleton />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
        <div className="skeleton aspect-[3/4] rounded-2xl" />
      </div>
    </SkeletonScreen>
  );
}
