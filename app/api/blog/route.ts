import { NextResponse } from 'next/server';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  htmlHighlight?: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
  karma?: number;
}

async function fetchLessWrongPosts(): Promise<BlogPost[]> {
  try {
    // Use view: "tagRelevance" with tagId to get posts tagged with secular-solstice
    // Tag ID for "secular-solstice" is stable: vtozKm5BZ8gf6zd45
    const SECULAR_SOLSTICE_TAG_ID = 'vtozKm5BZ8gf6zd45';
    const query = `
      query GetTaggedPosts($tagId: String!) {
        posts(input: { terms: { view: "tagRelevance", tagId: $tagId, limit: 100 } }) {
          results { 
            _id 
            title 
            slug 
            postedAt 
            baseScore
            tagRelevance
            user { displayName } 
            contents {
              htmlHighlight
            }
          }
        }
      }
    `;
    const gqlResponse = await fetch('https://www.lesswrong.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { tagId: SECULAR_SOLSTICE_TAG_ID } }),
      next: { revalidate: 3600 }
    });
    if (!gqlResponse.ok) throw new Error('Failed to fetch LessWrong posts via GraphQL');
    const data = await gqlResponse.json();
    const posts = data?.data?.posts?.results || [];
    // Filter to only posts that are actually tagged with secular-solstice (relevance >= 1)
    // tagRelevance is an object like { "vtozKm5BZ8gf6zd45": 5 }
    return posts
      .filter((post: { baseScore?: number; tagRelevance?: Record<string, number> }) => {
        const relevance = post.tagRelevance?.[SECULAR_SOLSTICE_TAG_ID] ?? 0;
        return (post.baseScore ?? 0) >= 15 && relevance >= 1;
      })
      .map((post: { _id: string; title: string; slug: string; postedAt: string; baseScore?: number; tagRelevance?: Record<string, number>; user?: { displayName: string }; contents?: { htmlHighlight?: string } }) => ({
      title: post.title.trim(),
      link: `https://www.lesswrong.com/posts/${post._id}/${post.slug}`,
      pubDate: post.postedAt,
      description: stripHtml(post.contents?.htmlHighlight || ''),
      htmlHighlight: post.contents?.htmlHighlight,
      source: 'lesswrong' as const,
      author: post.user?.displayName,
      karma: post.baseScore
    }));
  } catch (error) {
    console.error('Error fetching LessWrong posts:', error);
    return [];
  }
}

async function fetchSecularSolsticePosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch('https://secularsolstice.com/wp-json/wp/v2/posts?per_page=100', { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error('Failed to fetch SecularSolstice posts');
    const posts = await response.json();
    return posts.map((post: { title: { rendered: string }; link: string; date: string; excerpt: { rendered: string } }) => ({
      title: decodeHtmlEntities(post.title.rendered),
      link: post.link,
      pubDate: post.date,
      description: decodeHtmlEntities(stripHtml(post.excerpt.rendered)),
      source: 'secularsolstice' as const
    }));
  } catch (error) {
    console.error('Error fetching SecularSolstice posts:', error);
    return [];
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').substring(0, 300);
}

export async function GET() {
  try {
    const [lesswrongPosts, secularsolsticePosts] = await Promise.all([
      fetchLessWrongPosts(),
      fetchSecularSolsticePosts(),
    ]);
    const allPosts = [...lesswrongPosts, ...secularsolsticePosts].sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
    return NextResponse.json({ posts: allPosts });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch blog posts', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
