export type NavLink = { label: string; href: string };

export const STOREFRONT_NAV: NavLink[] = [
  { label: "Shop", href: "/shop" },
  { label: "Brands", href: "/brands" },
  { label: "Training", href: "/training" },
  { label: "Events", href: "/events" },
  { label: "Dealers", href: "/dealers" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export const FOOTER_SHOP: NavLink[] = [
  { label: "Air Rifles", href: "/shop?cat=air-rifles" },
  { label: "Air Pistols", href: "/shop?cat=air-pistols" },
  { label: "Targets", href: "/shop?cat=targets" },
  { label: "Pellets", href: "/shop?cat=pellets" },
  { label: "Accessories", href: "/shop?cat=accessories" },
  { label: "VSK Products", href: "/shop?cat=vsk" },
];

export const FOOTER_COMPANY: NavLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Brands", href: "/brands" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Help & FAQ", href: "/help" },
  { label: "Sitemap", href: "/sitemap" },
];

export const FOOTER_GROW: NavLink[] = [
  { label: "Training", href: "/training" },
  { label: "Events", href: "/events" },
  { label: "Become a Dealer", href: "/dealers" },
  { label: "Dealer Login", href: "/login" },
  { label: "Order Tracking", href: "/account#track" },
  { label: "My Account", href: "/account" },
];

export type AdminNavItem = {
  label: string;
  href: string;
  icon: keyof typeof import("@/components/icons").ICON_MAP;
  badge?: string;
  badgeMute?: boolean;
};

export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
      { label: "Reports", href: "/admin/reports", icon: "reports" },
    ],
  },
  {
    group: "CATALOG",
    items: [
      { label: "Products", href: "/admin/products", icon: "box" },
      { label: "Inventory", href: "/admin/inventory", icon: "layers", badge: "7", badgeMute: true },
      { label: "Reviews", href: "/admin/reviews", icon: "star", badge: "4" },
    ],
  },
  {
    group: "SALES",
    items: [
      { label: "Orders", href: "/admin/orders", icon: "bag", badge: "12" },
      { label: "Coupons", href: "/admin/coupons", icon: "tag" },
    ],
  },
  {
    group: "PEOPLE",
    items: [
      { label: "Customers", href: "/admin/customers", icon: "users" },
      { label: "Dealers", href: "/admin/dealers", icon: "store", badge: "5" },
    ],
  },
  {
    group: "CONTENT",
    items: [
      { label: "Blog", href: "/admin/blog", icon: "edit" },
      { label: "Training", href: "/admin/training", icon: "cap" },
      { label: "Events", href: "/admin/events", icon: "trophy" },
    ],
  },
  {
    group: "CONFIG",
    items: [{ label: "Settings", href: "/admin/settings", icon: "cog" }],
  },
];
