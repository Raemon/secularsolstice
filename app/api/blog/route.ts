import { NextResponse } from 'next/server';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  htmlHighlight?: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
}

async function fetchLessWrongPosts(): Promise<BlogPost[]> {
  try {
    // Use view: "tagRelevance" with tagId to get posts actually tagged with secular-solstice
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
    return posts.map((post: { _id: string; title: string; slug: string; postedAt: string; user?: { displayName: string }; contents?: { htmlHighlight?: string } }) => ({
      title: post.title.trim(),
      link: `https://www.lesswrong.com/posts/${post._id}/${post.slug}`,
      pubDate: post.postedAt,
      description: stripHtml(post.contents?.htmlHighlight || ''),
      htmlHighlight: post.contents?.htmlHighlight,
      source: 'lesswrong' as const,
      author: post.user?.displayName
    }));
  } catch (error) {
    console.error('Error fetching LessWrong posts:', error);
    return [];
  }
}

async function parseRSSFeed(url: string, source: 'lesswrong' | 'secularsolstice'): Promise<BlogPost[]> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const xml = await response.text();
    const posts: BlogPost[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
      const description = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() || '';
      const author = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/)?.[1]?.trim() || undefined;
      if (title && link) {
        posts.push({ title: decodeHtmlEntities(title), link, pubDate, description: decodeHtmlEntities(stripHtml(description)), source, author: author ? decodeHtmlEntities(author) : undefined });
      }
    }
    return posts;
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error);
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
      parseRSSFeed('https://secularsolstice.com/blog/feed/', 'secularsolstice'),
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
