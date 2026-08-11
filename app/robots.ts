import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://vsksport.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/dealer", "/checkout", "/orders", "/profile", "/dev"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
