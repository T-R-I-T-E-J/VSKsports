import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vsksport.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/shop",
    "/brands",
    "/training",
    "/events",
    "/dealers",
    "/blog",
    "/about",
    "/contact",
    "/help",
    "/policies",
    "/electronic-target",
    "/sitemap",
    "/login",
    "/register",
  ];
  return paths.map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
}
