import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/vendor/", "/account/", "/book/", "/booking/", "/taxi/request/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
