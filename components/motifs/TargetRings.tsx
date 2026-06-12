/** Concentric target-ring motif (decorative). */
export function TargetRings({
  className,
  stroke = "#1B43C8",
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="210" cy="210" r="70" stroke={stroke} strokeWidth="1" />
      <circle cx="210" cy="210" r="130" stroke={stroke} strokeWidth="1" strokeOpacity=".5" />
      <circle cx="210" cy="210" r="195" stroke={stroke} strokeWidth="1" strokeOpacity=".28" />
    </svg>
  );
}
