import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("blog");
  const data = posts.map((p) => ({
    title: p.data.title,
    description: p.data.description,
    slug: p.id,
    tags: p.data.tags,
    body: (p.body ?? "").slice(0, 5000),
  }));
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
