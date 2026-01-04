import BlogPage, { BlogPost } from "./BlogPage";

async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    // Fetch from our own API route to reuse the logic
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/blog`, { next: { revalidate: 3600 } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.posts || [];
  } catch {
    return [];
  }
}

export default async function Blog() {
  const posts = await fetchBlogPosts();
  return <BlogPage initialPosts={posts} />;
}