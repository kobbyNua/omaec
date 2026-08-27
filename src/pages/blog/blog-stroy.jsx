import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Banner from '../banner/banner';
import { getBackendBase } from '../../utils/backend.js';
import { extractResponseCollection } from '../../utils/apiResponse.js';

const BLOG_API_URL = (() => {
  const rawUrl = getBackendBase();
  if (!rawUrl) return '/blog';
  const base = rawUrl.replace(/\/+$/g, '');
  return `${base}/blog`;
})();

const BLOG_BACKEND_ORIGIN = (() => {
  const rawUrl = getBackendBase();
  if (!rawUrl) return window.location.origin;

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
})();

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const buildExcerpt = (value) => {
  const source = String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  return source.length > 180 ? `${source.slice(0, 177)}...` : source;
};

const resolveImageUrl = (value) => {
  let src = String(value || '').trim();
  if (!src) return '';

  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  src = src.replace(/\\/g, '/');

  if (src.includes('/var/www/html')) {
    src = src.replace('/var/www/html', '');
    return `${BLOG_BACKEND_ORIGIN}${src}`;
  }

  if (src.startsWith('/')) {
    return `${BLOG_BACKEND_ORIGIN}${src}`;
  }

  if (src.startsWith('uploads/posts/') || src.startsWith('storage/') || src.startsWith('public/')) {
    return `${BLOG_BACKEND_ORIGIN}/${src}`.replace(/\/{2,}/g, '/');
  }

  return src;
};

const defaultStory = `We write to shape perspective, share knowledge, and make ideas easier to understand. This article brings together the thinking behind the work, the process behind the decision, and the value it creates for the people we serve.`;

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function BlogStoryPage() {
  const query = useQuery();
  const storyKey = query.get('story') || '';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        const response = await fetch(BLOG_API_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Unable to load blog story.');
        }

        const json = await response.json().catch(() => ({}));
        const items = extractResponseCollection(json, ['posts', 'blog', 'items', 'data']);

        const validPosts = items
          .filter((item) => item && (item.title || item.slug || item.content || item.description || item.image_url || item.image || item.name))
          .map((item) => ({
            id: item.id || item.slug || slugify(item.title || 'blog-post'),
            title: item.title || item.name || 'Untitled post',
            slug: item.slug || slugify(item.title || item.name || 'blog-post'),
            content: item.content || item.description || defaultStory,
            excerpt: item.excerpt || buildExcerpt(item.content || item.description || defaultStory),
            image_url: resolveImageUrl(item.image_url || item.image?.url || item.image?.path || item.image || item.cover_image_url || item.cover_image || ''),
            category_name: item.category?.name || item.category_name || '',
            name: item.name || 'Anonymous',
            email: item.email || '',
          }));

        if (isMounted) {
          setPosts(validPosts.length > 0 ? validPosts : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load blog story.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const storyPost = useMemo(() => {
    if (!storyKey) {
      return posts[0] || null;
    }

    return posts.find((post) => post.slug === storyKey || String(post.id) === storyKey) || posts[0] || null;
  }, [posts, storyKey]);

  const recentPosts = useMemo(() => [...posts].reverse().slice(0, 4), [posts]);

  if (!storyPost && !loading) {
    return (
      <>
        <Banner>
          <h2>Blog Story</h2>
          <p>Story unavailable</p>
        </Banner>
        <div className="container" style={{ padding: '2rem 0 4rem' }}>
          <p>{error || 'No blog story is available yet.'}</p>
          <Link to="/blog">Back to blog</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Banner>
        <h2>Blog Story</h2>
        <p>{storyPost?.title || 'Article story'}</p>
      </Banner>

      <div className="container portfolio-story-page">
        <div className="portfolio-story-backlink">
          <Link to="/blog">← Back to blog</Link>
        </div>

        {loading && <p className="portfolio-story-status">Loading story...</p>}
        {error && <p className="portfolio-story-status portfolio-story-error">{error}</p>}

        {storyPost && (
          <div className="portfolio-story-layout">
            <article className="portfolio-story-card">
              <header className="portfolio-story-header">
                <div className="portfolio-story-kicker">{storyPost.category_name || 'Insights'}</div>
                <h1>{storyPost.title}</h1>
                <div className="portfolio-story-meta">
                  <span><strong>Author:</strong> {storyPost.name || 'Anonymous'}</span>
                </div>
              </header>

              <div className="portfolio-story-hero">
                <div className="portfolio-story-hero-copy">
                  <p className="portfolio-story-deck">{storyPost.excerpt || 'A thoughtful post exploring ideas, strategy, and practical insight.'}</p>
                </div>
                {storyPost.image_url ? (
                  <img src={storyPost.image_url} alt={storyPost.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                ) : null}
              </div>

              <div className="portfolio-story-body">
                <div className="portfolio-story-main">
                  <div className="read-post-content">{storyPost.content}</div>
                </div>

                <aside className="portfolio-story-aside">
                  <div className="portfolio-story-aside-box">
                    <span className="portfolio-story-aside-label">Article focus</span>
                    <h3>{storyPost.category_name || 'Insights'}</h3>
                    <p>{storyPost.excerpt || defaultStory}</p>
                  </div>
                </aside>
              </div>
            </article>

            <aside className="portfolio-story-sidebar">
              <div className="portfolio-story-sidebar-box">
                <div className="portfolio-story-sidebar-header">
                  <span>Recent posts</span>
                  <h3>Latest articles</h3>
                </div>

                <div className="portfolio-story-recent-list">
                  {recentPosts.map((post) => (
                    <Link to={`/blog-story?story=${encodeURIComponent(post.slug || post.id)}`} className="portfolio-story-recent-item" key={post.id}>
                      {post.image_url ? <img src={post.image_url} alt={post.title} /> : <img alt={post.title} src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80" />}
                      <div className="portfolio-story-recent-meta">
                        <strong>{post.title}</strong>
                        <span>{post.name || 'Anonymous author'}</span>
                        {post.excerpt && <small>{post.excerpt}</small>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
