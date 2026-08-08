import type { MetadataRoute } from "next";
import { listDestinations } from "@/db/queries/destinations";
import { listAllBlogPostIds } from "@/db/queries/blog";
import { getAllRoutePairs } from "@/db/queries/trips";
import { slugify } from "@/lib/slug";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/destinations`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/stations`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/routes`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const [destinations, posts, routePairs] = await Promise.all([
    listDestinations(),
    listAllBlogPostIds(),
    getAllRoutePairs(),
  ]);

  const destinationRoutes: MetadataRoute.Sitemap = destinations.map((destination) => ({
    url: `${baseUrl}/destinations/${destination.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const newsRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/news/${post.id}`,
    lastModified: post.postDate,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const routeItineraryRoutes: MetadataRoute.Sitemap = routePairs.map((pair) => ({
    url: `${baseUrl}/routes/${slugify(pair.fromCity)}/${slugify(pair.toCity)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...destinationRoutes, ...newsRoutes, ...routeItineraryRoutes];
}
