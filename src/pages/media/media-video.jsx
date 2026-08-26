import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendBase, getBackendOriginFrom } from '../../utils/backend.js';
import Banner from '../banner/banner.jsx';
import { MediaModal } from './media.jsx';

const MEDIA_API_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) return '/media';
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/media`;
})();

const MEDIA_BACKEND_ORIGIN = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) return window.location.origin;
    return getBackendOriginFrom(rawUrl);
})();

const resolveMediaUrl = (value) => {
    let src = value || '';
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;

    if (src.includes('/var/www/html')) {
        src = src.replace('/var/www/html', '');
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    if (src.startsWith('/media/uploads')) {
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    if (src.startsWith('/')) return `${MEDIA_BACKEND_ORIGIN}${src}`;
    return src;
};

const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const isLoggedIn = () => {
    const adminAuth = window.localStorage.getItem('admin-auth');
    if (adminAuth === 'true' || adminAuth === 'google' || adminAuth === 'firebase') return true;
    const stored = window.localStorage.getItem('user-auth');
    if (!stored) return false;
    try {
        const parsed = JSON.parse(stored);
        return Boolean(parsed?.token || parsed?.email);
    } catch {
        return stored === 'true' || stored === 'google' || stored === 'firebase';
    }
};

function useQuery() {
    const { search } = useLocation();
    return new URLSearchParams(search);
}

function VideoStill({ src, alt, fallback }) {
    const [snapshot, setSnapshot] = useState('');

    useEffect(() => {
        let isCancelled = false;

        const createSnapshot = () => {
            const resolvedSrc = resolveMediaUrl(src || '');
            if (!resolvedSrc) {
                if (!isCancelled) setSnapshot(fallback);
                return;
            }

            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';

            const captureFrame = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) {
                        if (!isCancelled) setSnapshot(fallback);
                        return;
                    }

                    const width = video.videoWidth || 1280;
                    const height = video.videoHeight || 720;
                    canvas.width = width;
                    canvas.height = height;
                    context.drawImage(video, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    if (!isCancelled) setSnapshot(dataUrl);
                } catch {
                    if (!isCancelled) setSnapshot(fallback);
                }
            };

            const handleLoadedMetadata = () => {
                try {
                    if (Number.isFinite(video.duration) && video.duration > 0) {
                        const seekTime = Math.min(0.5, video.duration * 0.25 || 0.5);
                        video.currentTime = seekTime;
                    } else {
                        captureFrame();
                    }
                } catch {
                    if (!isCancelled) setSnapshot(fallback);
                }
            };

            const handleSeeked = () => {
                captureFrame();
            };

            const handleError = () => {
                if (!isCancelled) setSnapshot(fallback);
            };

            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            video.addEventListener('seeked', handleSeeked, { once: true });
            video.addEventListener('error', handleError, { once: true });
            video.src = resolvedSrc;
            video.load();

            return () => {
                isCancelled = true;
                video.pause();
                video.removeAttribute('src');
                video.load();
            };
        };

        const cleanup = createSnapshot();
        return () => {
            if (cleanup) cleanup();
        };
    }, [src, fallback]);

    return (
        <img
            src={snapshot || fallback}
            alt={alt || 'Video preview'}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
    );
}

export default function MediaVideoPage() {
    const query = useQuery();
    const videoGroup = query.get('video') || '';
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [editMode, setEditMode] = useState('details');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [playingVideoId, setPlayingVideoId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const displayTitle = (items && items.length > 0) ? items[0].title : (videoGroup ? videoGroup.replace(/-/g, ' ') : '');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const resp = await fetch(MEDIA_API_URL);
                if (!resp.ok) throw new Error('Failed to load media');
                const json = await resp.json().catch(() => []);
                const arr = Array.isArray(json) ? json : json?.data || [];
                const filtered = arr.filter((it) => {
                    if (!it) return false;
                    if (String(it.media_type || '').toLowerCase() !== 'video') return false;
                    const groupValue = (it.thumbnail_url || it.thumbnail || it.file_url || it.url || '').trim();
                    if (!groupValue) return false;
                    return groupValue === videoGroup || slugify(groupValue) === videoGroup || slugify(it.title || it.file_url || '') === videoGroup;
                }).map((it) => ({
                    id: it.id,
                    title: it.title || it.name || '',
                    media_type: it.media_type || 'video',
                    file_url: (it.file_url || it.url || '').trim(),
                    thumbnail_url: (it.thumbnail_url || it.thumbnail || it.file_url || it.url || '').trim(),
                    alt_text: it.alt_text || it.alt || it.title || it.name || '',
                }));
                if (mounted) setItems(filtered);
            } catch (e) {
                if (mounted) setError(e.message || 'Unable to load media');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [videoGroup, refreshKey]);

    const handleEditDetails = (item) => {
        setSelectedMedia(item);
        setEditMode('details');
        setEditOpen(true);
    };

    const handleEditMedia = (item) => {
        setSelectedMedia(item);
        setEditMode('file');
        setEditOpen(true);
    };

    const handleEditPageDetails = () => {
        setSelectedMedia(items[0] || null);
        setEditMode('details');
        setEditOpen(true);
    };

    return (
        <>
            <MediaModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                title="Add Media"
                submitLabel="Create Media"
                mode="create"
                onSuccess={() => {
                    setRefreshKey((prev) => prev + 1);
                    setCreateOpen(false);
                }}
            />
            <MediaModal
                isOpen={isEditOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedMedia(null);
                    setEditMode('details');
                }}
                title={editMode === 'file' ? 'Replace Media File' : 'Edit Media Details'}
                submitLabel={editMode === 'file' ? 'Replace File' : 'Update Details'}
                mode={editMode}
                initialValues={selectedMedia || {}}
                onSuccess={() => {
                    setRefreshKey((prev) => prev + 1);
                    setEditOpen(false);
                    setSelectedMedia(null);
                    setEditMode('details');
                }}
            />
            <Banner>
                <h2>Media Video</h2>
                <p>Videos for {displayTitle}</p>
            </Banner><br /><br /><br />

            <div className="media-photo-page container">
                {isLoggedIn() && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-sm btn-light rounded-circle d-inline-flex align-items-center justify-content-center"
                            onClick={handleEditPageDetails}
                            aria-label="Edit video details"
                            title="Edit details"
                            style={{ width: '2.5rem', height: '2.5rem', padding: 0, borderRadius: '50%' }}
                        >
                            <i className="fas fa-pen" aria-hidden="true" />
                        </button>
                        <button type="button" className="about-section-add-button section-add-button" onClick={() => setCreateOpen(true)} aria-label="Add video">
                            <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                    </div>
                )}
                {loading && <p>Loading...</p>}
                {error && <p className="form-status">{error}</p>}
                {!loading && items.length === 0 && <p>No videos found for this group.</p>}

                <div className="youtube-video-grid">
                    {items.map((item) => {
                        const itemKey = item.id || item.title || item.file_url;
                        const isPlaying = playingVideoId === itemKey;

                        return (
                            <article className="youtube-video-card" key={itemKey}>
                                {isPlaying ? (
                                    <div className="youtube-video-player">
                                        <video
                                            key={itemKey}
                                            controls
                                            autoPlay
                                            playsInline
                                            preload="metadata"
                                            src={resolveMediaUrl(item.file_url)}
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="youtube-video-thumb youtube-video-launch"
                                        onClick={() => setPlayingVideoId(itemKey)}
                                        aria-label={`Play video ${item.title || 'media item'}`}
                                    >
                                        <VideoStill
                                            src={item.file_url}
                                            alt={item.alt_text || item.title || 'Video preview'}
                                            fallback={item.thumbnail_url || item.file_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80'}
                                        />
                                        <span className="youtube-play-button" aria-hidden="true">
                                            <i className="fas fa-play" />
                                        </span>
                                    </button>
                                )}
                                <div className="youtube-video-meta">
                                    <h3>{item.title}</h3>
                                    <div className="youtube-video-submeta">
                                        <span>Video</span>
                                        <span>•</span>
                                        <span>{item.alt_text || 'Media work'}</span>
                                    </div>
                                </div>
                                {isLoggedIn() && (
                                    <button type="button" className="service-card-edit-button photo-edit-button" onClick={() => handleEditMedia(item)} aria-label={`Edit ${item.title}`}>
                                        <i className="fas fa-edit" aria-hidden="true" />
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
