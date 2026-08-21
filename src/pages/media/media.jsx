import { useEffect, useMemo, useState } from 'react';
import Banner from '../banner/banner';
import './media.css';
import { createPortal } from 'react-dom';
import Modal from './mediaModal';
import { auth } from '../../Authentication/auth.jsx';

const MEDIA_API_BASE_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
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
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /media');
        return '/media';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/media`;
})();

const MEDIA_BACKEND_ORIGIN = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        return window.location.origin;
    }

    const cleaned = rawUrl.replace(/\/\/+$/g, '');
    try {
        return new URL(cleaned).origin;
    } catch {
        return window.location.origin;
    }
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

const getAuthorizationToken = async () => {
    const currentUser = auth.currentUser;
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

    const storedUser = window.localStorage.getItem('user-auth');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser?.token) {
                return `Bearer ${parsedUser.token}`;
            }
            if (parsedUser?.email) {
                return `Bearer user:${parsedUser.email}`;
            }
        } catch (error) {
            console.warn('Unable to parse user-auth token:', error);
        }
    }

    return '';
};

const resolveMediaUrl = (value) => {
    let src = value || '';
    if (!src) {
        return '';
    }
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    // If server stored absolute path like /var/www/html/..., strip server root
    // and prefix with backend origin (same logic used in carousel).
    if (src.includes('/var/www/html')) {
        src = src.replace('/var/www/html', '');
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    if (src.startsWith('/')) {
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    return src;
};

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

function MediaModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
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
            thumbnail_url: initialValues?.thumbnail_url || initialValues?.thumbnail || fileUrl,
            alt_text: initialValues?.alt_text || initialTitle,
        });
        setSelectedFiles([]);
        setErrors({});
        setStatus('');
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.title?.trim()) {
            nextErrors.title = 'Title is required.';
        }
        if (!formData.media_type) {
            nextErrors.media_type = 'Media type is required.';
        }
        if (formData.media_type === 'video') {
            if (!selectedFiles.length && !formData.file_url?.trim()) {
                nextErrors.file_url = 'Video URL is required.';
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
            }));
        } else {
            setFormData((previous) => ({
                ...previous,
                [name]: value,
                ...(name === 'file_url' ? { thumbnail_url: value } : {}),
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
            thumbnail_url: previous.file_url || '',
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

        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
            headers.Authorization = authToken;
        }

        const payload = new FormData();
        const title = formData.title?.trim();
        const mediaType = formData.media_type === 'video' ? 'video' : 'image';
        const fileValue = formData.file_url?.trim();
        const thumbnailValue = fileValue;
        const altText = formData.alt_text?.trim() || title;

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
                const uploadedImageList = selectedFiles.map((file) => file.name || file.url || String(file));
                payload.append('file_url', JSON.stringify(uploadedImageList));
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
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
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

                            <div className="form-group">
                                <label htmlFor="media-file-url">{formData.media_type === 'video' ? 'Video URL' : 'Image File'}</label>
                                {formData.media_type === 'video' ? (
                                    <input id="media-file-url" name="file_url" type="text" className="form-control" value={formData.file_url} onChange={handleFieldChange} placeholder="https://example.com/video.mp4" />
                                ) : (
                                    <input id="media-file-url" name="file_url" type="file" className="form-control" accept="image/*" multiple onChange={handleFileChange} />
                                )}
                                {errors.file_url && <p className="form-error">{errors.file_url}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="media-thumbnail">Thumbnail</label>
                                <input id="media-thumbnail" name="thumbnail_url" type="text" className="form-control" value={formData.thumbnail_url || formData.file_url} readOnly disabled />
                                <small>Thumbnail is populated automatically from the selected media URL.</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="media-alt-text">Alt Text</label>
                                <input id="media-alt-text" name="alt_text" type="text" className="form-control" value={formData.alt_text} readOnly disabled />
                                <small>Alt text is generated from the title.</small>
                            </div>

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
                        <div className="recent-video-works">
                            <h3>Recent Video Works</h3>
                            <video controls playsInline preload="metadata" poster="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80">
                                <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div className="some-video-works">
                            <h3>
                                Some of Our Video Works
                                {isLoggedIn() && (
                                    <button type="button" className="about-section-add-button section-add-button" onClick={onCreateClick} aria-label="Add Video Thumbnail">
                                        <i className="fas fa-plus" aria-hidden="true" />
                                    </button>
                                )}
                            </h3>
                            <div className="video-thumbnails">
                                <div className="video-thumbnail">
                                    <video controls playsInline preload="metadata" poster="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80">
                                        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                                <div className="video-thumbnail">
                                    <video controls playsInline preload="metadata" poster="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80">
                                        <source src="https://www.w3schools.com/html/movie.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                                <div className="video-thumbnail">
                                    <video controls playsInline preload="metadata" poster="https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80">
                                        <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm" />
                                        Your browser does not support the video tag.
                                    </video>
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
    // Use the last item as the most recently posted video and show up to four previous videos as thumbnails
    const recentVideo = videos.length > 0 ? videos[videos.length - 1] : null;
    const thumbnailVideos = videos.length > 1 ? videos.slice(Math.max(0, videos.length - 5), videos.length - 1) : [];

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
                                <div className="recent-video-works">
                                    <h3>Recent Video Works</h3>
                                    {recentVideo ? (
                                        <>
                                            <h4>{recentVideo.title}</h4>
                                            <video controls poster={recentVideo.thumbnail_url || recentVideo.file_url}>
                                                <source src={resolveMediaUrl(recentVideo.file_url)} type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </video>
                                        </>
                                    ) : (
                                        <p>No recent video available</p>
                                    )}
                                </div>

                                <div className="some-video-works">
                                    <h3>
                                        Some of Our Video Works
                                        {isLoggedIn() && (
                                            <button type="button" className="about-section-add-button section-add-button" onClick={onCreateClick} aria-label="Add Video Thumbnail">
                                                <i className="fas fa-plus" aria-hidden="true" />
                                            </button>
                                        )}
                                    </h3>
                                    <div className="video-thumbnails">
                                        {thumbnailVideos.length > 0 ? thumbnailVideos.map((video) => (
                                            <div className="video-thumbnail video-card" key={video.id || video.title}>
                                                <div className="video-thumb">
                                                    <video controls poster={video.thumbnail_url || video.file_url}>
                                                        <source src={resolveMediaUrl(video.file_url)} type="video/mp4" />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                                <div className="video-meta">
                                                    <div className="title">{video.title}</div>
                                                    <div className="subtitle">Video</div>
                                                    {isLoggedIn() && (
                                                        <div style={{marginTop: '0.5rem'}}>
                                                            <button type="button" className="service-card-edit-button" onClick={() => onEditClick(video)} aria-label={`Edit ${video.title}`}>
                                                                <i className="fas fa-edit" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )) : <p>No additional videos available</p>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="our-photo-works">
                    <h3>Our Photo Works</h3>
                    <div className="photo-gallery">
                        {loading ? null : images.length > 0 ? images.map((image) => (
                            <div className="photo-item" key={image.id || image.title}>
                                <img src={resolveMediaUrl(image.file_url)} alt={image.alt_text || image.title || 'Media'} />
                                {isLoggedIn() && (
                                    <button type="button" className="service-card-edit-button photo-edit-button" onClick={() => onEditClick(image)} aria-label={`Edit ${image.title}`}>
                                        <i className="fas fa-edit" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        )) : <p className="media-empty-state">No images available</p>}
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

export default Media