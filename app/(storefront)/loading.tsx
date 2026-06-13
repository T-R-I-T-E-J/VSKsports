export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-7 py-16">
      <div className="h-9 w-56 animate-pulse rounded bg-paper-3" />
      <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-paper-3" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-line">
            <div className="aspect-[4/3] w-full animate-pulse bg-paper-3" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-paper-3" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-paper-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
