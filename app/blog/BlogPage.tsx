'use client';
import { useEffect, useState } from 'react';
import BlogPostPreview from './BlogPostPreview';
import Tooltip from '../components/Tooltip';

export interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  htmlHighlight?: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
}

type BlogPageProps = {
  initialPosts?: BlogPost[];
};

const BlogPage = ({ initialPosts }: BlogPageProps = {}) => {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts || []);
  const [isLoading, setIsLoading] = useState(!initialPosts);
  const [error, setError] = useState<string | null>(null);
  const [showLW, setShowLW] = useState(true);
  const [showSS, setShowSS] = useState(true);

  const filteredPosts = posts.filter(post => 
    (post.source === 'lesswrong' && showLW) || (post.source === 'secularsolstice' && showSS)
  );

  useEffect(() => {
    if (initialPosts) return; // Skip fetch - we have server data
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        if (!response.ok) throw new Error('Failed to fetch blog posts');
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading blog posts...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="font-georgia text-5xl mt-10 mb-6 text-center">Blog</div>
      <div className="flex gap-2 mt-12 mb-16 text-sm justify-center">
        <Tooltip content="Show LessWrong posts" placement="bottom">
          <button onClick={() => setShowLW(!showLW)} className={`text-black px-2 py-0.5 border border-white rounded-sm text-white hover:text-white hover:bg-link/80 ${showLW ? 'opacity-100' : 'opacity-50'}`}>
          LW {showLW ? '✓' : '○'}
        </button>
        </Tooltip>
        <Tooltip content="Show SecularSolstice.com posts" placement="bottom">
        <button onClick={() => setShowSS(!showSS)} className={`text-black px-2 py-0.5 border border-gray-200 rounded-sm text-gray-200 ${showSS ? 'opacity-100' : 'opacity-50'}`}>
            SecularSolstice {showSS ? '✓' : '○'}
          </button>
        </Tooltip>
      </div>
      {filteredPosts.length === 0 ? (
        <div className="text-gray-400">No posts found</div>
      ) : (
        <div className="space-y-12">
          {filteredPosts.map((post, i) => (
            <BlogPostPreview key={`${post.source}-${i}`} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPage;
