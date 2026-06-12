import { IconWhatsApp } from "@/components/icons";

/** Floating WhatsApp contact button (bottom-right). */
export function WhatsAppFloat() {
  return (
    <a
      href="#"
      aria-label="Chat on WhatsApp"
      className="fixed right-5 bottom-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-3)] transition-transform hover:-translate-y-1"
    >
      <IconWhatsApp width={26} height={26} />
    </a>
  );
}
