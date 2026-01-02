'use client';
import { useEffect, useState } from 'react';
import BlogPostPreview from './BlogPostPreview';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  htmlHighlight?: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
}

const BlogPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLW, setShowLW] = useState(true);
  const [showSS, setShowSS] = useState(true);

  const filteredPosts = posts.filter(post => 
    (post.source === 'lesswrong' && showLW) || (post.source === 'secularsolstice' && showSS)
  );

  useEffect(() => {
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
  }, []);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading blog posts...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-georgia text-6xl mt-10 mb-6">Blog</h1>
      <div className="flex gap-2 mb-16 text-sm">
        <button onClick={() => setShowLW(!showLW)} className={`text-black px-2 py-0.5 border border-link rounded-sm text-link hover:bg-link /80 ${showLW ? 'opacity-100' : 'opacity-50'}`}>
          LW {showLW ? '✓' : '○'}
        </button>
        <button onClick={() => setShowSS(!showSS)} className={`text-black px-2 py-0.5 border border-gray-200 rounded-sm text-gray-200 ${showSS ? 'opacity-100' : 'opacity-50'}`}>
          SecularSolstice {showSS ? '✓' : '○'}
        </button>
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
