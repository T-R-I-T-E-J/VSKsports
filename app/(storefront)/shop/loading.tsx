export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-7 py-12">
      <div className="h-8 w-40 animate-pulse rounded bg-paper-3" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-4 lg:block">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-paper-3" />
          ))}
        </aside>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-line">
              <div className="aspect-[4/3] w-full animate-pulse bg-paper-3" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-paper-3" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-paper-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
