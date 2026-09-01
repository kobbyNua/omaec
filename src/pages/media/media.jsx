import { useEffect, useMemo, useState } from 'react';
import Banner from '../banner/banner';
import './media.css';
import { createPortal } from 'react-dom';
import Modal from './mediaModal';
import { Link } from 'react-router-dom';
import { auth } from '../../Authentication/auth.jsx';
import { getBackendBase, getBackendOriginFrom, normalizeAssetUrl } from '../../utils/backend.js';

const MEDIA_API_BASE_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /media');
        return '';
    }

    try {
        const parsedUrl = new URL(rawUrl, window.location.origin);
        return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/g, '')}`;
    } catch {
        return rawUrl.replace(/\/+$/g, '');
    }
})();

const MEDIA_API_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        return '/media';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/media`;
})();

const MEDIA_BACKEND_ORIGIN = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) return window.location.origin;
    return getBackendOriginFrom(rawUrl);
})();

const isAdminLoggedIn = () => {
    const adminAuth = window.localStorage.getItem('admin-auth');
    return adminAuth === 'true' || adminAuth === 'google' || adminAuth === 'firebase';
};

const isLoggedIn = () => {
    try {
        if (auth?.currentUser) return true;
    } catch (e) {
        // ignore
    }

    const stored = window.localStorage.getItem('user-auth');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed?.token) return true;
            if (parsed?.email) return true;
        } catch {
            // If stored is a non-JSON value, only treat explicit truthy auth markers as logged in
            if (stored === 'true' || stored === 'google' || stored === 'firebase') return true;
        }
    }

    return isAdminLoggedIn();
};

const getStoredToken = (key) => {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) {
        return '';
    }

    try {
        const parsed = JSON.parse(storedValue);
        const tokenCandidates = [
            parsed?.token,
            parsed?.accessToken,
            parsed?.idToken,
            parsed?.authToken,
            parsed?.jwt,
            parsed?.authorization,
        ];

        for (const token of tokenCandidates) {
            if (typeof token === 'string' && token.trim()) {
                return token.trim();
            }
        }

        if (typeof parsed?.email === 'string' && parsed.email.trim()) {
            return `user:${parsed.email.trim()}`;
        }

        if (typeof parsed === 'string' && parsed.trim() && !['true', 'false', 'google', 'firebase'].includes(parsed.trim().toLowerCase())) {
            return parsed.trim();
        }

        return '';
    } catch {
        const normalized = storedValue.trim();
        if (normalized && !['true', 'false', 'google', 'firebase'].includes(normalized.toLowerCase())) {
            return normalized;
        }
        return '';
    }
};

const getAuthorizationToken = async () => {
    const currentUser = auth?.currentUser;
    if (currentUser) {
        try {
            const idToken = await currentUser.getIdToken(true);
            if (idToken) {
                return `Bearer ${idToken}`;
            }
        } catch (error) {
            console.warn('Unable to get Firebase token:', error);
        }
    }

    const adminToken = getStoredToken('admin-auth');
    if (adminToken) {
        return adminToken.startsWith('Bearer ') ? adminToken : `Bearer ${adminToken}`;
    }

    const userToken = getStoredToken('user-auth');
    if (userToken) {
        return userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
    }

    return '';
};

const resolveMediaUrl = (value) => normalizeAssetUrl(value);

const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const isValidMediaUrl = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return false;
    }

    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return true;
    }

    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
        return true;
    }

    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(trimmed) || trimmed.includes('/media/uploads/');
};

function MediaModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess, mode = 'create' }) {
    const fileMode = mode === 'file';
    const detailsMode = mode === 'details';
    const [formData, setFormData] = useState({
        title: '',
        media_type: 'image',
        file_url: '',
        thumbnail_url: '',
        alt_text: '',
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const initialTitle = initialValues?.title || '';
        const mediaType = initialValues?.media_type || 'image';
        const fileUrl = initialValues?.file_url || '';
        setFormData({
            title: initialTitle,
            media_type: mediaType,
            file_url: fileUrl,
            thumbnail_url: initialValues?.thumbnail_url || initialValues?.thumbnail || slugify(initialTitle || ''),
            alt_text: initialValues?.alt_text || initialTitle,
        });
        setSelectedFiles([]);
        setErrors({});
        setStatus('');
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};

        if (!detailsMode && !fileMode && !formData.title?.trim()) {
            nextErrors.title = 'Title is required.';
        }

        if (!detailsMode && !fileMode && !formData.media_type) {
            nextErrors.media_type = 'Media type is required.';
        }

        if (fileMode) {
            if (!selectedFiles.length && !formData.file_url?.trim()) {
                nextErrors.file_url = 'A replacement file is required.';
            }
            return nextErrors;
        }

        if (detailsMode) {
            if (!formData.title?.trim()) {
                nextErrors.title = 'Title is required.';
            }
            if (!formData.media_type) {
                nextErrors.media_type = 'Media type is required.';
            }
            return nextErrors;
        }

        if (formData.media_type === 'video') {
            if (!selectedFiles.length && !formData.file_url?.trim()) {
                nextErrors.file_url = 'Video file is required.';
            }
        } else if (!selectedFiles.length && !initialValues?.file_url && !formData.file_url?.trim()) {
            nextErrors.file_url = 'Image is required.';
        }
        return nextErrors;
    };

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        if (name === 'media_type') {
            const normalizedValue = value === 'video' ? 'video' : 'image';
            setFormData((previous) => ({
                ...previous,
                media_type: normalizedValue,
                thumbnail_url: previous.file_url,
                alt_text: previous.alt_text || previous.title,
            }));
        } else if (name === 'title') {
            setFormData((previous) => ({
                ...previous,
                title: value,
                alt_text: value,
                thumbnail_url: slugify(value),
            }));
        } else {
            setFormData((previous) => ({
                ...previous,
                [name]: value,
            }));
        }
        setErrors((previous) => ({ ...previous, [name]: '' }));
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
        const firstFile = files[0] || null;
        setFormData((previous) => ({
            ...previous,
            thumbnail_url: slugify(previous.title || ''),
            file_url: firstFile ? '' : previous.file_url,
        }));
        setErrors((previous) => ({ ...previous, file_url: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving media...' : 'Creating media...');

        try {
            if (!fileMode && !detailsMode) {
                const checkResp = await fetch(MEDIA_API_URL, { method: 'GET' });
                if (checkResp.ok) {
                    const existing = await checkResp.json().catch(() => []);
                    const arr = Array.isArray(existing) ? existing : existing?.data || [];
                    const titleLower = (formData.title || '').trim().toLowerCase();
                    const thumbSlug = slugify(formData.title || '');
                    const duplicate = arr.find((it) => {
                        if (!it) return false;
                        const sameId = initialValues?.id && (String(it.id) === String(initialValues.id));
                        if (sameId) return false;
                        const itTitle = (it.title || '').trim().toLowerCase();
                        const itThumb = (it.thumbnail_url || it.thumbnail || it.file_url || '').trim();
                        if (itTitle && titleLower && itTitle === titleLower) return true;
                        if (itThumb && thumbSlug && (itThumb === thumbSlug || slugify(itThumb) === thumbSlug || slugify(it.title || '') === thumbSlug)) return true;
                        return false;
                    });

                    if (duplicate) {
                        setProcessing(false);
                        setStatus('A media item with the same title or thumbnail already exists.');
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('Duplicate check failed:', e);
        }

        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
            headers.Authorization = authToken;
        }

        const payload = new FormData();
        const title = formData.title?.trim();
        const mediaType = formData.media_type === 'video' ? 'video' : 'image';
        const fileValue = formData.file_url?.trim();
        const thumbnailValue = formData.thumbnail_url?.trim() || (fileValue ? slugify(fileValue) : '');
        const altText = formData.alt_text?.trim() || title;

        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        if (mode === 'details') {
            if (title) {
                payload.append('title', title);
            }
            if (mediaType) {
                payload.append('media_type', mediaType);
            }
            if (thumbnailValue) {
                payload.append('thumbnail_url', thumbnailValue);
            }
            if (altText) {
                payload.append('alt_text', altText);
            }
        } else if (mode === 'file') {
            if (selectedFiles.length > 0) {
                payload.append('file_url', selectedFiles[0]);
            } else if (fileValue) {
                payload.append('file_url', fileValue);
            }
            if (mediaType) {
                payload.append('media_type', mediaType);
            }
            if (thumbnailValue) {
                payload.append('thumbnail_url', thumbnailValue);
            }
        } else {
            if (title) {
                payload.append('title', title);
            }
            if (mediaType) {
                payload.append('media_type', mediaType);
            }
            if (selectedFiles.length > 0) {
                if (selectedFiles.length === 1) {
                    payload.append('file_url', selectedFiles[0]);
                } else {
                    selectedFiles.forEach((file) => {
                        payload.append('file_url[]', file);
                    });
                }
            } else if (fileValue) {
                payload.append('file_url', fileValue);
            }
            if (thumbnailValue) {
                payload.append('thumbnail_url', thumbnailValue);
            }
            if (altText) {
                payload.append('alt_text', altText);
            }
        }

        try {
            const endpoint = initialValues?.id ? `${MEDIA_API_URL}/${initialValues.id}` : MEDIA_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: payload,
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save media.');
            }

            setStatus(data?.message || (initialValues?.id ? 'Media updated successfully.' : 'Media created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || 'Unable to save media.');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return createPortal(
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>{title}</h2>
                        <button type="button" className="close-button" onClick={onClose} aria-label="Close form">
                            <i className="fas fa-times" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
                            <input type="hidden" name="id" value={initialValues?.id || ''} />

                            {!fileMode && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="media-title">Title</label>
                                        <input id="media-title" name="title" type="text" className="form-control" value={formData.title} onChange={handleFieldChange} required />
                                        {errors.title && <p className="form-error">{errors.title}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="media-type">Media Type</label>
                                        <select id="media-type" name="media_type" className="form-control" value={formData.media_type} onChange={handleFieldChange}>
                                            <option value="image">Image</option>
                                            <option value="video">Video</option>
                                        </select>
                                        {errors.media_type && <p className="form-error">{errors.media_type}</p>}
                                    </div>
                                </>
                            )}

                            {fileMode && (
                                <div className="form-group">
                                    <label htmlFor="media-file-url">{formData.media_type === 'video' ? 'Replace Video File' : 'Replace Image File'}</label>
                                    <input id="media-file-url" name="file_url" type="file" className="form-control" accept={formData.media_type === 'video' ? 'video/*' : 'image/*'} onChange={handleFileChange} />
                                    {errors.file_url && <p className="form-error">{errors.file_url}</p>}
                                </div>
                            )}

                            {!fileMode && !detailsMode && (
                                <div className="form-group">
                                    <label htmlFor="media-file-url">{formData.media_type === 'video' ? 'Video File' : 'Image File'}</label>
                                    <input id="media-file-url" name="file_url" type="file" className="form-control" accept={formData.media_type === 'video' ? 'video/*' : 'image/*'} multiple onChange={handleFileChange} />
                                    {errors.file_url && <p className="form-error">{errors.file_url}</p>}
                                </div>
                            )}

                            {!fileMode && (
                                <div className="form-group">
                                    <label htmlFor="media-thumbnail">Thumbnail</label>
                                    <input id="media-thumbnail" name="thumbnail_url" type="text" className="form-control" value={formData.thumbnail_url || formData.file_url} readOnly disabled />
                                    <small>Thumbnail is populated automatically from the selected media URL.</small>
                                </div>
                            )}

                            {!fileMode && (
                                <div className="form-group">
                                    <label htmlFor="media-alt-text">Alt Text</label>
                                    <input id="media-alt-text" name="alt_text" type="text" className="form-control" value={formData.alt_text} readOnly disabled />
                                    <small>Alt text is generated from the title.</small>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-block" disabled={processing}>{processing ? 'Saving...' : submitLabel}</button>
                            {status && <p className="form-status">{status}</p>}
                        </form>
                    </div>
                </div>
            </div>
        </Modal>,
        document.body
    );
}

function VideoPreview({ src, alt, fallback }) {
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

                    const width = video.videoWidth || 640;
                    const height = video.videoHeight || 360;
                    canvas.width = width;
                    canvas.height = height;
                    context.drawImage(video, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    if (!isCancelled) {
                        setSnapshot(dataUrl);
                    }
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
                if (!isCancelled) {
                    setSnapshot(fallback);
                }
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

function DefaultMediaPage({ onCreateClick }) {
    return (
        <>
            <Banner>
                <h2>Media Services</h2>
                <h5>Explore our media services to enhance your brand presence.</h5>
            </Banner>

            <div className="media-content">
                <div className="media-video-works">
                    <div className="container">
                        <div className="video-works-gallery-section">
                            <h3>
                                Video Works
                                {isLoggedIn() && (
                                    <button type="button" className="about-section-add-button section-add-button" onClick={onCreateClick} aria-label="Add Video Thumbnail">
                                        <i className="fas fa-plus" aria-hidden="true" />
                                    </button>
                                )}
                            </h3>
                            <div className="video-gallery">
                                <div className="video-work-item">
                                    <div className="video-work-thumb">
                                        <img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80" alt="Brand Story preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                    <div className="video-work-meta">
                                        <div className="title">Brand Story</div>
                                        <div className="subtitle">Video</div>
                                    </div>
                                </div>

                                <div className="video-work-item">
                                    <div className="video-work-thumb">
                                        <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80" alt="Commercial Reel preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                    <div className="video-work-meta">
                                        <div className="title">Commercial Reel</div>
                                        <div className="subtitle">Video</div>
                                    </div>
                                </div>

                                <div className="video-work-item">
                                    <div className="video-work-thumb">
                                        <img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80" alt="Event Coverage preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                    <div className="video-work-meta">
                                        <div className="title">Event Coverage</div>
                                        <div className="subtitle">Video</div>
                                    </div>
                                </div>

                                <div className="video-work-item">
                                    <div className="video-work-thumb">
                                        <img src="https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80" alt="Social Highlight preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                    <div className="video-work-meta">
                                        <div className="title">Social Highlight</div>
                                        <div className="subtitle">Video</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="our-photo-works">
                    <h3>Our Photo Works</h3>
                    <div className="photo-gallery">
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Camera" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Nature" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1551316679-9c6ae9dec224?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Portrait" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Urban" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Tech" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Nature" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Portrait" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Fashion" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Landscape" /></div>
                        <div className="photo-item"><img src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Coffee" /></div>
                    </div>
                </div>
                <div className="container">
                    <div className="media-description">
                        <h3>Our Media Services</h3>
                        <p>We provide a variety of media services including content creation, social media management, and digital marketing strategies to help your business grow.</p>
                    </div>
                    <div className="media-features">
                        <div className="feature-item"><i className="fas fa-video"></i><h4>Video Production</h4><p>High-quality video content to engage your audience.</p></div>
                        <div className="feature-item"><i className="fas fa-photo-video"></i><h4>Photography</h4><p>Professional photography services for all your needs.</p></div>
                        <div className="feature-item"><i className="fas fa-bullhorn"></i><h4>Social Media Management</h4><p>Effective strategies to boost your social media presence.</p></div>
                        <div className="feature-item"><i className="fas fa-globe"></i><h4>Digital Marketing</h4><p>Comprehensive digital marketing solutions to grow your brand.</p></div>
                    </div>
                </div>
            </div>

            {/* single add buttons are shown in section headers; removed bottom duplicate */}
        </>
    );
}

function ActiveMediaPage({ onCreateClick, onEditClick, onDataStateChange }) {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasData, setHasData] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const loadMedia = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(MEDIA_API_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to load media.');
                }

                const json = await response.json();
                const items = Array.isArray(json) ? json : json?.data || [];
                const validItems = items
                    .filter((item) => {
                        if (!item) {
                            return false;
                        }

                        const hasMeta = item.title || item.media_type || item.file_url || item.thumbnail || item.alt_text;
                        if (!hasMeta) {
                            return false;
                        }

                        const mediaType = String(item.media_type || 'image').toLowerCase();
                        const fileUrl = item.file_url || item.url || '';

                        if (mediaType === 'video') {
                            return Boolean(fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')));
                        }

                        return isValidMediaUrl(fileUrl);
                    })
                    .map((item) => ({
                        id: item.id,
                        title: item.title || '',
                        media_type: item.media_type || 'image',
                        file_url: item.file_url || item.url || '',
                        thumbnail_url: item.thumbnail_url || item.thumbnail || item.file_url || item.url || '',
                        alt_text: item.alt_text || item.title || '',
                    }));

                setMediaItems(validItems);
                const has = validItems.length > 0;
                setHasData(has);
                onDataStateChange?.(has);
            } catch (loadError) {
                if (loadError?.name === 'AbortError') {
                    return;
                }
                setError(loadError.message || 'Unable to load media.');
                setHasData(false);
                onDataStateChange?.(false);
            } finally {
                setLoading(false);
            }
        };

        loadMedia();
        return () => controller.abort();
    }, [onDataStateChange]);

    const videos = useMemo(() => mediaItems.filter((item) => item.media_type === 'video' && isValidMediaUrl(item.file_url)), [mediaItems]);
    const images = useMemo(() => mediaItems.filter((item) => item.media_type !== 'video' && isValidMediaUrl(item.file_url)), [mediaItems]);
    // Deduplicate videos and images by title/file so repeated media entries only show once per group.
    const uniqueVideos = useMemo(() => {
        const seen = new Set();
        return videos.filter((video) => {
            const key = slugify(video.title || video.file_url || video.thumbnail_url || video.id || '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [videos]);
    const uniqueImages = useMemo(() => {
        const seen = new Set();
        return images.filter((img) => {
            const key = slugify(img.title || img.file_url || img.thumbnail_url || img.id || '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [images]);

    if (!hasData && !loading) {
        return null;
    }

    return (
        <>
            <Banner>
                <h2>Media Services</h2>
                <h5>Explore our media services to enhance your brand presence.</h5>
            </Banner>

            <div className="media-content">
                <div className="media-video-works">
                    <div className="container">
                        {error && <p className="form-status">{error}</p>}
                        {loading ? (
                            <p>Loading media...</p>
                        ) : (
                            <>
                                <div className="video-works-gallery-section">
                                    <h3>
                                        Video Works
                                        {isLoggedIn() && (
                                            <button type="button" className="about-section-add-button section-add-button" onClick={onCreateClick} aria-label="Add Video Thumbnail">
                                                <i className="fas fa-plus" aria-hidden="true" />
                                            </button>
                                        )}
                                    </h3>
                                    <div className="video-gallery">
                                        {uniqueVideos.length > 0 ? uniqueVideos.map((video) => {
                                            const fallbackPreview = video.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80';
                                            return (
                                                <Link to={`/media-video?video=${encodeURIComponent(slugify(video.title || video.thumbnail_url || video.file_url || ''))}`} className="video-work-item" key={video.id || video.title} aria-label={`View videos for ${video.title}`}>
                                                    <div className="video-work-thumb">
                                                        <VideoPreview src={video.file_url} alt={video.alt_text || video.title || 'Video preview'} fallback={fallbackPreview} />
                                                    </div>
                                                    <div className="video-work-meta">
                                                        <div className="title">{video.title}</div>
                                                        <div className="subtitle">Video</div>
                                                    </div>
                                                </Link>
                                            );
                                        }) : <p className="media-empty-state">No videos available</p>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="our-photo-works">
                    <h3>Our Photo Works</h3>
                    <div className="photo-gallery">
                        {loading ? null : images.length > 0 ? uniqueImages.map((image) => {
                            const slug = slugify(image.title || image.thumbnail_url || image.file_url || '');
                            return (
                                <div className="photo-item" key={image.id || image.title}>
                                    <Link to={`/media-photo?thumbnail=${encodeURIComponent(slug)}`} aria-label={`View photos for ${slug}`}>
                                        <img src={resolveMediaUrl(image.file_url)} alt={image.alt_text || image.title || 'Media'} />
                                    </Link>
                                </div>
                            );
                        }) : <p className="media-empty-state">No images available</p>}
                    </div>
                </div>

                <div className="container">
                    <div className="media-description">
                        <h3>Our Media Services</h3>
                        <p>We provide a variety of media services including content creation, social media management, and digital marketing strategies to help your business grow.</p>
                    </div>
                    <div className="media-features">
                        <div className="feature-item"><i className="fas fa-video"></i><h4>Video Production</h4><p>High-quality video content to engage your audience.</p></div>
                        <div className="feature-item"><i className="fas fa-photo-video"></i><h4>Photography</h4><p>Professional photography services for all your needs.</p></div>
                        <div className="feature-item"><i className="fas fa-bullhorn"></i><h4>Social Media Management</h4><p>Effective strategies to boost your social media presence.</p></div>
                        <div className="feature-item"><i className="fas fa-globe"></i><h4>Digital Marketing</h4><p>Comprehensive digital marketing solutions to grow your brand.</p></div>
                    </div>
                </div>
            </div>

            {/* single add buttons are shown in section headers; removed bottom duplicate */}
        </>
    );
}

function Media() {
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeHasData, setActiveHasData] = useState(false);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleEdit = (mediaItem) => {
        setSelectedMedia(mediaItem);
        setEditOpen(true);
    };

    return (
        <>
            <MediaModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                title="Add Media"
                submitLabel="Create Media"
                onSuccess={() => {
                    handleRefresh();
                    setCreateOpen(false);
                }}
            />
            <MediaModal
                isOpen={isEditOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedMedia(null);
                }}
                title="Edit Media"
                submitLabel="Update Media"
                initialValues={selectedMedia || {}}
                onSuccess={() => {
                    handleRefresh();
                    setEditOpen(false);
                    setSelectedMedia(null);
                }}
            />
            <ActiveMediaPage
                key={refreshKey}
                onCreateClick={() => setCreateOpen(true)}
                onEditClick={handleEdit}
                onDataStateChange={setActiveHasData}
            />
            {!activeHasData && <DefaultMediaPage onCreateClick={() => setCreateOpen(true)} />}
        </>
    );
}

export { MediaModal };
export default Media;