import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendBase, getBackendOriginFrom, normalizeAssetUrl } from '../../utils/backend.js';
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

const resolveMediaUrl = (value) => normalizeAssetUrl(value);

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

export default function MediaPhotoPage() {
    const query = useQuery();
    const thumbnail = query.get('thumbnail') || '';
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [editMode, setEditMode] = useState('details');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const displayTitle = (items && items.length > 0) ? items[0].title : (thumbnail ? thumbnail.replace(/-/g, ' ') : '');

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
                    const itThumb = (it.thumbnail_url || it.thumbnail || it.file_url || it.image_url || it.image || it.url || '').trim();
                    if (!itThumb) return false;
                    return itThumb === thumbnail || slugify(itThumb) === thumbnail || slugify(it.title || it.file_url || it.image_url || '') === thumbnail;
                }).map((it) => ({
                    id: it.id,
                    title: it.title || it.name || '',
                    media_type: it.media_type || 'image',
                    file_url: (it.file_url || it.url || it.image_url || it.image || it.src || '').trim(),
                    thumbnail_url: (it.thumbnail_url || it.thumbnail || it.file_url || it.url || it.image_url || '').trim(),
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
    }, [thumbnail, refreshKey]);

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
                <h2>Media Photo</h2>
                <p>Photos for {displayTitle}</p>
            </Banner><br/><br/><br/>
            <div className="media-photo-page container">
                {isLoggedIn() && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-sm btn-light rounded-circle d-inline-flex align-items-center justify-content-center"
                            onClick={handleEditPageDetails}
                            aria-label="Edit photo details"
                            title="Edit details"
                            style={{ width: '2.5rem', height: '2.5rem', padding: 0, borderRadius: '50%' }}
                        >
                            <i className="fas fa-pen" aria-hidden="true" />
                        </button>
                        <button type="button" className="about-section-add-button section-add-button" onClick={() => setCreateOpen(true)} aria-label="Add photo">
                            <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                    </div>
                )}
                {loading && <p>Loading...</p>}
                {error && <p className="form-status">{error}</p>}
                {!loading && items.length === 0 && <p>No photos found for this thumbnail.</p>}
                <div className="photo-grid">
                    {items.map((it) => (
                        <div className="photo-card" key={it.id || it.title}>
                            <img src={resolveMediaUrl(it.file_url)} alt={it.alt_text || it.title} />
                            {isLoggedIn() && (
                                <button type="button" className="service-card-edit-button photo-edit-button" onClick={() => handleEditMedia(it)} aria-label={`Edit ${it.title}`}>
                                    <i className="fas fa-edit" aria-hidden="true" />
                                </button>
                            )}
                            <p className="caption">{it.title}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
