import { generateCategorySitemap } from "@/lib/sitemap/generators";

export const revalidate = 3600;

export async function GET() {
  const xml = await generateCategorySitemap("natak", "nataks");
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
    },
  });
}
