import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './events.css';
import Banner from '../banner/banner';
import { getBackendBase } from '../../utils/backend.js';
import { extractResponseCollection } from '../../utils/apiResponse.js';

const EVENT_API_URL = (() => {
  const rawUrl = getBackendBase();
  if (!rawUrl) return '/events';
  const base = rawUrl.replace(/\/+$/g, '');
  return `${base}/events`;
})();

const EVENT_BACKEND_ORIGIN = (() => {
  const rawUrl = getBackendBase();
  if (!rawUrl) return window.location.origin;

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
})();

const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const resolveEventImageUrl = (value) => {
  let src = String(value || '').trim();
  if (!src) return DEFAULT_EVENT_IMAGE;

  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  if (src.includes('/var/www/html')) {
    src = src.replace('/var/www/html', '');
    return `${EVENT_BACKEND_ORIGIN}${src}`;
  }

  if (src.startsWith('/')) {
    return `${EVENT_BACKEND_ORIGIN}${src}`;
  }

  return src;
};

const normalizeEndedVideoUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  if (raw.includes('/var/www/html')) {
    return `${EVENT_BACKEND_ORIGIN}${raw.replace('/var/www/html', '')}`;
  }

  if (raw.startsWith('/')) {
    return `${EVENT_BACKEND_ORIGIN}${raw}`;
  }

  return raw;
};

const buildEmbedVideoUrl = (value) => {
  const url = normalizeEndedVideoUrl(value);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname || '';

    if (host === 'youtu.be') {
      const videoId = pathname.replace('/', '').split(/[?&]/)[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (host.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) {
        const base = 'https://www.youtube-nocookie.com/embed/' + videoId;
        const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
        return `${base}?${params.toString()}`;
      }
    }

    if (host.includes('vimeo.com')) {
      const videoId = pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        const base = `https://player.vimeo.com/video/${videoId}`;
        const params = new URLSearchParams({ title: '0', byline: '0', portrait: '0', autoplay: '0' });
        return `${base}?${params.toString()}`;
      }
    }

    return url;
  } catch {
    return url;
  }
};

const defaultStory = `We believe every event should leave a lasting impression. This story captures the ideas, planning, atmosphere, and the experience we created so guests can feel the energy and purpose behind the occasion.`;

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function EventStoryPage() {
  const query = useQuery();
  const storyKey = query.get('story') || '';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const response = await fetch(EVENT_API_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load event story.');

        const json = await response.json().catch(() => ({}));
        const items = extractResponseCollection(json, ['events', 'items', 'data']);

        const validEvents = items
          .filter((item) => item && (item.title || item.slug || item.description_body || item.banner_image_url || item.location || item.live_stream_status))
          .map((item) => ({
            id: item.id || item.slug || slugify(item.title || 'event-story'),
            title: item.title || 'Untitled event',
            slug: item.slug || slugify(item.title || 'event-story'),
            description_body: item.description_body || item.description || defaultStory,
            location: item.location || 'To be announced',
            event_date: item.event_date || '',
            registration_url: item.registration_url || '',
            live_stream_status: item.live_stream_status || 'upcoming',
            live_stream_url: item.live_stream_url || item.stream_url || '',
            video_url: item.video_url || item.event_video_url || item.recording_url || item.video || item.recurring_video_url || item.event_recording_url || '',
            banner_image_url: resolveEventImageUrl(item.banner_image_url || item.image_url || item.image || ''),
          }));

        if (isMounted) {
          setEvents(validEvents.length > 0 ? validEvents : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load event story.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const storyEvent = useMemo(() => {
    if (!storyKey) {
      return events[0] || null;
    }

    return events.find((event) => event.slug === storyKey || String(event.id) === storyKey) || events[0] || null;
  }, [events, storyKey]);

  const endedVideoUrl = useMemo(() => {
    if (!storyEvent) return null;
    if (storyEvent.live_stream_status !== 'ended') return null;
    const candidate = storyEvent.video_url || storyEvent.live_stream_url;
    return buildEmbedVideoUrl(candidate);
  }, [storyEvent]);

  const recentEvents = useMemo(() => [...events].reverse().slice(0, 4), [events]);

  if (!storyEvent && !loading) {
    return (
      <>
        <Banner>
          <h2>Event Story</h2>
          <p>Story unavailable</p>
        </Banner>
        <div className="container" style={{ padding: '2rem 0 4rem' }}>
          <p>{error || 'No event story is available yet.'}</p>
          <Link to="/events">Back to events</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Banner>
        <h2>Event Story</h2>
        <p>{storyEvent?.title || 'Event story'}</p>
      </Banner>

      <div className="container portfolio-story-page">
        <div className="portfolio-story-backlink">
          <Link to="/events">← Back to events</Link>
        </div>

        {loading && <p className="portfolio-story-status">Loading story...</p>}
        {error && <p className="portfolio-story-status portfolio-story-error">{error}</p>}

        {storyEvent && (
          <div className="portfolio-story-layout">
            <article className="portfolio-story-card">
              <header className="portfolio-story-header">
                <div className="portfolio-story-kicker">{storyEvent.live_stream_status === 'live' ? 'Live Streaming' : storyEvent.live_stream_status === 'ended' ? 'Event Coverage' : 'Upcoming Event'}</div>
                <h1>{storyEvent.title}</h1>
                <div className="portfolio-story-meta">
                  <span><strong>Date:</strong> {storyEvent.event_date || 'TBA'}</span>
                  <span><strong>Location:</strong> {storyEvent.location}</span>
                </div>
              </header>

              <div className="portfolio-story-hero">
                <img src={storyEvent.banner_image_url} alt={storyEvent.title} onError={(event) => { event.currentTarget.src = DEFAULT_EVENT_IMAGE; }} />
              </div>

              <div className="portfolio-story-body">
                <div className="portfolio-story-main">
                  <p>{storyEvent.description_body || defaultStory}</p>
                  <p>
                    The event experience is designed to create clarity, excitement, and memorable engagement for every guest. From the first welcome to the final interaction, the focus remains on crafting a polished experience that brings people together and communicates the message with confidence.
                  </p>

                  {storyEvent.live_stream_status === 'ended' && endedVideoUrl ? (
                    <div className="event-story-video-wrapper">
                      <div className="event-story-video-frame">
                        {/^https?:\/\//i.test(endedVideoUrl) && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(endedVideoUrl) ? (
                          <video src={endedVideoUrl} controls playsInline preload="metadata" />
                        ) : (
                          <iframe
                            src={endedVideoUrl}
                            title={`${storyEvent.title} recap`}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                        )}
                      </div>
                    </div>
                  ) : null}

                  {storyEvent.live_stream_status === 'live' && storyEvent.live_stream_url ? (
                    <div className="event-story-live-frame">
                      <iframe
                        src={storyEvent.live_stream_url}
                        title={storyEvent.title}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                </div>

                <aside className="portfolio-story-aside">
                  <div className="portfolio-story-aside-box">
                    <span className="portfolio-story-aside-label">Event status</span>
                    <h3>{storyEvent.live_stream_status === 'live' ? 'Live now' : storyEvent.live_stream_status === 'ended' ? 'Ended' : 'Upcoming'}</h3>
                    <p>{storyEvent.location}</p>
                    {storyEvent.registration_url ? (
                      <a href={storyEvent.registration_url} target="_blank" rel="noreferrer">Register now</a>
                    ) : null}
                  </div>
                </aside>
              </div>
            </article>

            <aside className="portfolio-story-sidebar">
              <div className="portfolio-story-sidebar-box">
                <div className="portfolio-story-sidebar-header">
                  <span>Recent events</span>
                  <h3>Latest highlights</h3>
                </div>

                <div className="portfolio-story-recent-list">
                  {recentEvents.map((event) => (
                    <Link to={`/events-story?story=${encodeURIComponent(event.slug || event.id)}`} className="portfolio-story-recent-item" key={event.id}>
                      <img src={event.banner_image_url} alt={event.title} />
                      <div className="portfolio-story-recent-meta">
                        <strong>{event.title}</strong>
                        <span>{event.location}</span>
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
