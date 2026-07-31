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

const isAdminLoggedIn = () => {
    const adminAuth = window.localStorage.getItem('admin-auth');
    return adminAuth === 'true' || adminAuth === 'google' || adminAuth === 'firebase';
};

const isLoggedIn = () => {
    const userAuth = window.localStorage.getItem('user-auth');
    return Boolean(userAuth) || isAdminLoggedIn();
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

    if (src.includes('/var/www/html')) {
        const relativePath = src.replace('/var/www/html', '').replace(/^\/+/, '');
        return MEDIA_API_BASE_URL ? `${MEDIA_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/') : src;
    }

    if (src.startsWith('/')) {
        const relativePath = src.replace(/^\/+/, '');
        return MEDIA_API_BASE_URL ? `${MEDIA_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/') : src;
    }

    return src;
};

const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function MediaModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        title: '',
        media_type: 'image',
        file_url: '',
        thumbnail_url: '',
        alt_text: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
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
        setSelectedFile(null);
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
            if (!selectedFile && !formData.file_url?.trim()) {
                nextErrors.file_url = 'Video URL is required.';
            }
        } else if (!selectedFile && !initialValues?.file_url && !formData.file_url?.trim()) {
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
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setFormData((previous) => ({
            ...previous,
            thumbnail_url: previous.file_url || '',
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
        if (selectedFile) {
            payload.append('file_url', selectedFile);
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
                                    <input id="media-file-url" name="file_url" type="file" className="form-control" accept="image/*" onChange={handleFileChange} />
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
                            <video controls>
                                <source src="../media/sample-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div className="some-video-works">
                            <h3>Some of Our Video Works</h3>
                            <div className="video-thumbnails">
                                <div className="video-thumbnail">
                                    <video controls>
                                        <source src="../media/sample-video2.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                                <div className="video-thumbnail">
                                    <video controls>
                                        <source src="../media/sample-video3.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                                <div className="video-thumbnail">
                                    <video controls>
                                        <source src="../media/sample-video4.mp4" type="video/mp4" />
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

            {isLoggedIn() && (
                <div className="service-actions">
                    <button type="button" className="about-section-add-button service-add-button" onClick={onCreateClick} aria-label="Create Media">
                        <i className="fas fa-plus" aria-hidden="true" />
                    </button>
                </div>
            )}
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
                    .filter((item) => item && (item.title || item.media_type || item.file_url || item.thumbnail || item.alt_text))
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

    const videos = useMemo(() => mediaItems.filter((item) => item.media_type === 'video'), [mediaItems]);
    const images = useMemo(() => mediaItems.filter((item) => item.media_type !== 'video'), [mediaItems]);
    const recentVideo = videos[0] || null;
    const thumbnailVideos = videos.slice(1, 5);

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
                                    {recentVideo ? (
                                        <>
                                            <h3>{recentVideo.title}</h3>
                                            <video controls poster={recentVideo.thumbnail_url || recentVideo.file_url}>
                                                <source src={resolveMediaUrl(recentVideo.file_url)} type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </video>
                                        </>
                                    ) : (
                                        <h3>No recent video available</h3>
                                    )}
                                </div>

                                <div className="some-video-works">
                                    <h3>Some of Our Video Works</h3>
                                    <div className="video-thumbnails">
                                        {thumbnailVideos.length > 0 ? thumbnailVideos.map((video) => (
                                            <div className="video-thumbnail" key={video.id || video.title}>
                                                <video controls poster={video.thumbnail_url || video.file_url}>
                                                    <source src={resolveMediaUrl(video.file_url)} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                                <p>{video.title}</p>
                                                {isLoggedIn() && (
                                                    <button type="button" className="service-card-edit-button" onClick={() => onEditClick(video)} aria-label={`Edit ${video.title}`}>
                                                        <i className="fas fa-edit" aria-hidden="true" />
                                                    </button>
                                                )}
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

            {isLoggedIn() && (
                <div className="service-actions">
                    <button type="button" className="about-section-add-button service-add-button" onClick={onCreateClick} aria-label="Create Media">
                        <i className="fas fa-plus" aria-hidden="true" />
                    </button>
                </div>
            )}
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