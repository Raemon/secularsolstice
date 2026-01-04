'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
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
  karma?: number;
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
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'top-karma'>('recent');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredPosts = useMemo(() => {
    let result = posts.filter(post => 
      (post.source === 'lesswrong' && showLW) || (post.source === 'secularsolstice' && showSS)
    );
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(lowerSearch) || 
        post.description?.toLowerCase().includes(lowerSearch) ||
        post.htmlHighlight?.toLowerCase().includes(lowerSearch)
      );
    }
    return result.sort((a, b) => {
      if (sortOption === 'top-karma') {
        return (b.karma ?? 0) - (a.karma ?? 0);
      }
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
  }, [posts, showLW, showSS, search, sortOption]);

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
    <div className="max-w-2xl mx-auto px-4">
      <div className="font-georgia text-5xl mt-10 mb-6 text-center">Blog</div>
      <div className="flex gap-2 items-center sticky top-0 bg-[#11101b] py-4 mb-6 z-10">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 w-full max-w-md bg-transparent border-0 border-b border-gray-500 outline-none text-sm max-w-[200px] mr-auto"
        />
        <div className="flex gap-0">
          <button
            onClick={() => setSortOption('recent')}
            className={`text-xs px-2 whitespace-nowrap outline-none border-none ${sortOption === 'recent' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
          >Recent</button>
          <button
            onClick={() => setSortOption('top-karma')}
            className={`text-xs px-2 whitespace-nowrap border-l border-gray-500 ${sortOption === 'top-karma' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
          >Top Karma</button>
        </div>
        <Tooltip content="Show LessWrong posts" placement="bottom">
          <button onClick={() => setShowLW(!showLW)} className={`text-xs px-2 py-0.5 border border-white rounded-sm text-white whitespace-nowrap hover:bg-link/80 ${showLW ? 'opacity-100' : 'opacity-50'}`}>
          LW {showLW ? '✓' : '○'}
        </button>
        </Tooltip>
        <Tooltip content="Show SecularSolstice.com posts" placement="bottom">
        <button onClick={() => setShowSS(!showSS)} className={`text-xs px-2 py-0.5 border border-gray-200 rounded-sm text-gray-200 whitespace-nowrap ${showSS ? 'opacity-100' : 'opacity-50'}`}>
            SS {showSS ? '✓' : '○'}
          </button>
        </Tooltip>
      </div>
      {filteredPosts.length === 0 ? (
        <div className="text-gray-400">{search ? `No posts match "${search}"` : 'No posts found'}</div>
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
