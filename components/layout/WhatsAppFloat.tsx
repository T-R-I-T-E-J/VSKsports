import { IconWhatsApp } from "@/components/icons";

/** Floating WhatsApp contact button (bottom-right). */
export function WhatsAppFloat() {
  return (
    <a
      href="#"
      aria-label="Chat on WhatsApp"
      className="fixed right-3 bottom-3 z-40 grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-3)] transition-transform hover:-translate-y-1 sm:right-5 sm:bottom-5 sm:h-14 sm:w-14"
    >
      <IconWhatsApp width={26} height={26} />
    </a>
  );
}
