import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/audit", "/login", "/signup"],
      disallow: [
        "/results/",
        "/overview",
        "/subscriptions",
        "/vendors",
        "/renewals",
        "/reports",
        "/import",
        "/insights",
        "/analytics",
        "/savings",
        "/admin/",
        "/api/",
      ],
    },
    sitemap: "https://spendlens.demo/sitemap.xml",
  };
}

