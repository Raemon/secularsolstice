'use client';
import { useEffect, useState } from 'react';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
}

const BlogPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading blog posts...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-georgia text-5xl mb-6">Blog</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Posts from <a href="https://www.lesswrong.com/tag/secular-solstice" className="text-link hover:underline" target="_blank" rel="noopener noreferrer">LessWrong</a> and <a href="https://secularsolstice.com/blog/" className="text-link hover:underline" target="_blank" rel="noopener noreferrer">secularsolstice.com</a>
      </p>
      {posts.length === 0 ? (
        <div className="text-gray-400">No posts found</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, i) => (
            <div key={`${post.source}-${i}`} className="pb-6 border-b border-gray-800">
              <div className="flex items-baseline gap-2 mb-1">
                <a href={post.link} target="_blank" rel="noopener noreferrer" className=" font-medium text-2xl font-georgia">
                  <span className="text-white hover:opacity-80">{post.title}</span>
                </a>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {post.author && <span className="text-white/80">{post.author}</span>}
                <span className="text-gray-400"> · {formatDate(post.pubDate)}</span>

                <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase" style={{ color: post.source === 'lesswrong' ? '#8fc98f' : '#c98fc9' }}>
                  {post.source === 'lesswrong' ? 'LW' : ''}
                </span>
              </div>
              {post.description && <p className="text-gray-400 text-sm line-clamp-2">{post.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPage;
