import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

// Feather-style stroked icon wrapper. Defaults (size 18, stroke 2) are
// overridable via props. Ported from the prototype's inline SVGs.
function S(props: P, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---- storefront ---- */
export const IconCheck = (p: P) => S(p, <path d="M5 13l4 4L19 7" />);
export const IconTruck = (p: P) =>
  S(p, <><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>);
export const IconPhone = (p: P) =>
  S(p, <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />);
export const IconGlobe = (p: P) =>
  S(p, <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20" /></>);
export const IconSearch = (p: P) =>
  S(p, <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>);
export const IconUser = (p: P) =>
  S(p, <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>);
export const IconHeart = (p: P) =>
  S(p, <path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />);
export const IconCart = (p: P) =>
  S(p, <><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M2 3h3l2.4 12.4a2 2 0 002 1.6h8.7a2 2 0 002-1.6L23 7H6" /></>);
export const IconArrowRight = (p: P) => S(p, <path d="M5 12h14M13 6l6 6-6 6" />);
export const IconMenu = (p: P) => S(p, <path d="M3 12h18M3 6h18M3 18h18" />);
export const IconX = (p: P) => S(p, <path d="M18 6L6 18M6 6l12 12" />);
export const IconHelp = (p: P) =>
  S(p, <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01" /></>);
export const IconInstagram = (p: P) =>
  S(p, <><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>);
export const IconYoutube = (p: P) =>
  S(p, <><path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.5 12 5.5 12 5.5s-6 0-7.9.6A3 3 0 002 8.2 31 31 0 002 12a31 31 0 00.1 3.8 3 3 0 002.1 2.1c1.9.6 7.8.6 7.8.6s6 0 7.9-.6a3 3 0 002.1-2.1A31 31 0 0022 12a31 31 0 00-.1-3.8z" /><path d="M10 15l5-3-5-3z" fill="currentColor" /></>);
export const IconFacebook = (p: P) =>
  S(p, <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />);
export const IconWhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5a.5.5 0 000-.5L9 6.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3A2.8 2.8 0 006.3 8.7c0 1.2.8 2.3 1 2.5.1.2 1.8 2.7 4.3 3.8 2.6 1.1 2.6.7 3 .7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4M12 2a10 10 0 00-8.6 15l-1.1 4 4.2-1.1A10 10 0 1012 2z" />
  </svg>
);

/* ---- admin ---- */
export const IconDashboard = (p: P) =>
  S(p, <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>);
export const IconReports = (p: P) =>
  S(p, <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>);
export const IconBox = (p: P) =>
  S(p, <><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></>);
export const IconLayers = (p: P) =>
  S(p, <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />);
export const IconStar = (p: P) =>
  S(p, <path d="M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z" />);
export const IconBag = (p: P) =>
  S(p, <path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" />);
export const IconTag = (p: P) =>
  S(p, <><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4.8A2 2 0 014.8 2.8H12a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></>);
export const IconUsers = (p: P) =>
  S(p, <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>);
export const IconStore = (p: P) =>
  S(p, <path d="M3 9l1.5-5h15L21 9M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M3 9h18M9 20v-6h6v6" />);
export const IconEdit = (p: P) =>
  S(p, <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>);
export const IconCap = (p: P) =>
  S(p, <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" /></>);
export const IconTrophy = (p: P) =>
  S(p, <><path d="M6 9V2h12v7a6 6 0 01-12 0z" /><path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3M9 21h6M12 15v6" /></>);
export const IconCog = (p: P) =>
  S(p, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>);
export const IconBell = (p: P) =>
  S(p, <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />);
export const IconExternal = (p: P) =>
  S(p, <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />);

/** name → component map for config-driven nav (admin sidebar). */
export const ICON_MAP = {
  dashboard: IconDashboard,
  reports: IconReports,
  box: IconBox,
  layers: IconLayers,
  star: IconStar,
  bag: IconBag,
  tag: IconTag,
  users: IconUsers,
  store: IconStore,
  edit: IconEdit,
  cap: IconCap,
  trophy: IconTrophy,
  cog: IconCog,
} as const;
