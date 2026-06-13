export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-7 py-12">
      <div className="h-8 w-52 animate-pulse rounded bg-paper-3" />
      <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded bg-paper-3" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-lg border border-line bg-paper-3/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
