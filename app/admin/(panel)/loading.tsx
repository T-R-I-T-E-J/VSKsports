export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-7 w-48 animate-pulse rounded bg-paper-3" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-line bg-paper-3/50"
          />
        ))}
      </div>
      <div className="mt-6 h-80 animate-pulse rounded-lg border border-line bg-paper-3/40" />
    </div>
  );
}
