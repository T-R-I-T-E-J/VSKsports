import { cn } from "@/lib/cn";

/** Text input matching the design's field styling. */
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-line-2 bg-paper px-4 py-3 text-[15px] outline-none transition focus:border-blue-2",
        className,
      )}
      {...props}
    />
  );
}
