"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for observability; replace with your error reporter.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 py-20">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-red">
          System Error
        </p>
        <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-ink sm:text-4xl">
          Something misfired
        </h1>
        <p className="mt-4 text-[17px] text-steel">
          An unexpected error occurred on our end. Try again, or head back to
          safer ground.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-mute">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-md bg-blue px-6 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-blue-2"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-line px-6 py-3 font-medium text-ink transition hover:bg-paper-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
