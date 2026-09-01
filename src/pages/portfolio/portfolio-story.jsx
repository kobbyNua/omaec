import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Banner from '../banner/banner';
import { getBackendBase, normalizeAssetUrl } from '../../utils/backend.js';
import { extractResponseCollection } from '../../utils/apiResponse.js';

const PORTFOLIO_API_URL = (() => {
  const rawUrl = getBackendBase();
  if (!rawUrl) return '/portfolio';
  return `${rawUrl.replace(/\/+$/g, '')}/portfolio`;
})();

const DEFAULT_PORTFOLIO_IMAGE = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const findFirstMediaCandidate = (value) => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = findFirstMediaCandidate(item);
      if (candidate) return candidate;
    }
    return null;
  }

  if (typeof value === 'object') {
    const preferredKeys = ['url', 'path', 'src', 'file', 'file_url', 'media_url', 'image', 'image_url', 'cover_image_url', 'cover_image', 'photo_url', 'photo', 'public_url', 'full_url', 'location', 'name', 'href', 'link', 'video_url', 'media'];

    for (const key of preferredKeys) {
      const nestedValue = value[key];
      if (nestedValue !== null && nestedValue !== undefined && nestedValue !== '') {
        const candidate = findFirstMediaCandidate(nestedValue);
        if (candidate) return candidate;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const candidate = findFirstMediaCandidate(nestedValue);
      if (candidate) return candidate;
    }

    return null;
  }

  const trimmed = String(value).trim();
  return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : null;
};

const resolveProjectImage = (value) => normalizeAssetUrl(value || DEFAULT_PORTFOLIO_IMAGE) || DEFAULT_PORTFOLIO_IMAGE;

const normalizeGallery = (project) => {
  const raw = [project?.media_url, project?.media_files, project?.media, project?.gallery, project?.images, project?.videos, project?.project_media, project?.items]
    .flatMap((entry) => {
      if (!entry) return [];
      if (Array.isArray(entry)) return entry;
      return [entry];
    })
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { file_url: resolveProjectImage(item), media_type: /(mp4|webm|ogg|mov)$/i.test(item) ? 'video' : 'image', title: project?.project_name || 'Project media' };
      }
      if (typeof item === 'object') {
        const url = item.url || item.path || item.src || item.file || item.file_url || item.image_url || item.video_url || item.media_url || item.link || item.href || item.location || item.name || item.cover_image_url || item.cover_image;
        return {
          file_url: resolveProjectImage(url),
          media_type: String(item.media_type || item.type || item.kind || '').toLowerCase() === 'video' || /(mp4|webm|ogg|mov)$/i.test(String(url || '')) ? 'video' : 'image',
          title: item.title || item.name || project?.project_name || 'Project media',
          description: item.description || item.alt_text || item.alt || '',
        };
      }
      return null;
    })
    .filter(Boolean);

  if (raw.length > 0) return raw;
  const cover = resolveProjectImage(project?.cover_image_url || project?.cover_image || project?.image_url || project?.image);
  return [{ file_url: cover, media_type: 'image', title: project?.project_name || 'Project media', description: '' }];
};

const defaultStory = `We believe every project is a story worth telling. This portfolio feature highlights the process, the thinking, and the outcome behind our work. The goal is not only to present a result, but to show how strategy, design, and delivery came together to create meaningful impact.`;

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function PortfolioStoryPage() {
  const query = useQuery();
  const storyKey = query.get('story') || '';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const response = await fetch(PORTFOLIO_API_URL);
        if (!response.ok) throw new Error('Unable to load portfolio story.');

        const json = await response.json().catch(() => ({}));
        const items = extractResponseCollection(json, ['projects', 'portfolio', 'items']);
        const valid = items.filter((item) => item && (item.project_name || item.slug || item.project_summary || item.project_details || item.cover_image_url || item.media_url || item.media_files || item.gallery)).map((item) => ({
          id: item.id || item.slug || slugify(item.project_name || item.title || 'portfolio-item'),
          project_name: item.project_name || item.title || 'Untitled Project',
          slug: item.slug || slugify(item.project_name || item.title || 'portfolio-item'),
          client_name: item.client_name || '',
          completion_date: item.completion_date || '',
          project_url: item.project_url || item.slug || '#',
          project_summary: item.project_summary || '',
          project_details: item.project_details || item.project_summary || defaultStory,
          cover_image_url: resolveProjectImage(item.cover_image_url || item.cover_image || item.image_url || item.image),
          gallery: normalizeGallery(item),
        }));

        if (mounted) setProjects(valid.length > 0 ? valid : []);
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load portfolio story.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProjects();
    return () => { mounted = false; };
  }, []);

  const storyProject = useMemo(() => {
    if (!storyKey) return projects[0] || null;
    return projects.find((project) => project.slug === storyKey || String(project.id) === storyKey) || projects[0] || null;
  }, [projects, storyKey]);

  const recentProjects = useMemo(() => [...projects].reverse().slice(0, 4), [projects]);

  if (!storyProject && !loading) {
    return (
      <>
        <Banner>
          <h2>Portfolio Story</h2>
          <p>Story unavailable</p>
        </Banner>
        <div className="container" style={{ padding: '2rem 0 4rem' }}>
          <p>{error || 'No portfolio story is available yet.'}</p>
          <Link to="/portfolio">Back to portfolio</Link>
        </div>
      </>
    );
  }

  const gallery = storyProject?.gallery || [];
  const storyIntro = storyProject?.project_summary || 'A carefully crafted project designed to connect design thinking, audience needs and meaningful outcomes.';
  const storyCategory = storyProject?.project_summary || 'Art & Design';

  return (
    <>
      <Banner>
        <h2>Portfolio Story</h2>
        <p>{storyProject?.project_name || 'Project story'}</p>
      </Banner>
      <div className="container portfolio-story-page">
        <div className="portfolio-story-backlink">
          <Link to="/portfolio">← Back to portfolio</Link>
        </div>

        {loading && <p className="portfolio-story-status">Loading story...</p>}
        {error && <p className="portfolio-story-status portfolio-story-error">{error}</p>}

        {storyProject && (
          <div className="portfolio-story-layout">
            <article className="portfolio-story-card">
              <header className="portfolio-story-header">
                <div className="portfolio-story-kicker">{storyCategory}</div>
                <h1>{storyProject.project_name}</h1>
                <div className="portfolio-story-meta">
                  {storyProject.client_name && <span><strong>Client:</strong> {storyProject.client_name}</span>}
                  {storyProject.completion_date && <span><strong>Completed:</strong> {storyProject.completion_date}</span>}
                </div>
              </header>

              <div className="portfolio-story-hero">
                <div className="portfolio-story-hero-copy">
                  <p className="portfolio-story-deck">{storyIntro}</p>
                </div>
                <img src={storyProject.cover_image_url} alt={storyProject.project_name} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
              </div>

              <div className="portfolio-story-body">
                <div className="portfolio-story-main">
                  <p>{storyProject.project_details}</p>
                  <p>
                    Every great project begins with a clear idea and a thoughtful response to audience need. This commission was shaped to balance visual clarity, creative personality, and practical storytelling so the final work would feel both distinct and memorable.
                  </p>
                  <p>
                    From early concepting to final delivery, the focus remained on details that elevate how people experience the brand: proportions, pacing, tone, and the emotional rhythm of the visual story.
                  </p>
                </div>

                <aside className="portfolio-story-aside">
                  <div className="portfolio-story-aside-box">
                    <span className="portfolio-story-aside-label">Project focus</span>
                    <h3>{storyProject.project_name}</h3>
                    <p>{storyProject.project_summary || 'A design-led storytelling experience crafted to communicate value and identity with clarity.'}</p>
                    {storyProject.project_url && storyProject.project_url !== '#' && (
                      <a href={storyProject.project_url} target="_blank" rel="noreferrer">Visit project</a>
                    )}
                  </div>
                </aside>
              </div>

              {gallery.length > 0 && (
                <section className="portfolio-story-gallery">
                  <div className="portfolio-story-gallery-header">
                    <span>In focus</span>
                    <h3>More from the project</h3>
                  </div>
                  <div className="portfolio-story-gallery-grid">
                    {gallery.map((item, index) => (
                      <figure className="portfolio-story-gallery-item" key={`${storyProject.id}-${index}`}>
                        {item.media_type === 'video' ? (
                          <video src={item.file_url} controls playsInline preload="metadata" />
                        ) : (
                          <img src={item.file_url} alt={item.title} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
                        )}
                        <figcaption>
                          <strong>{item.title}</strong>
                          {item.description && <span>{item.description}</span>}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              )}
            </article>

            <aside className="portfolio-story-sidebar">
              <div className="portfolio-story-sidebar-box">
                <div className="portfolio-story-sidebar-header">
                  <span>Recent projects</span>
                  <h3>Latest work</h3>
                </div>
                <div className="portfolio-story-recent-list">
                  {recentProjects.map((project) => (
                    <Link to={`/portfolio-story?story=${encodeURIComponent(project.slug || project.id)}`} className="portfolio-story-recent-item" key={project.id}>
                      <img src={project.cover_image_url} alt={project.project_name} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
                      <div className="portfolio-story-recent-meta">
                        <strong>{project.project_name}</strong>
                        <span>{project.client_name || 'Recent project'}</span>
                        {project.project_summary && <small>{project.project_summary}</small>}
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
