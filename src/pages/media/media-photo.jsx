import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getBackendBase, getBackendOriginFrom } from '../../utils/backend.js';
import   Banner   from '../banner/banner.jsx';

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

    // Normalize server absolute paths and map to dev-proxy-friendly paths.

    if (src.includes('/var/www/html')) {
        src = src.replace('/var/www/html', '');
        // keep '/media/uploads' prefix so the dev proxy can match it
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    // If backend returned '/media/uploads/...' leave as-is so proxy rule matches
    if (src.startsWith('/media/uploads')) {
        return `${MEDIA_BACKEND_ORIGIN}${src}`;
    }

    if (src.startsWith('/')) return `${MEDIA_BACKEND_ORIGIN}${src}`;
    return src;
};

const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
                    file_url: (it.file_url || it.url || it.image_url || it.image || it.src || '').trim(),
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
    }, [thumbnail]);

    return (
        <>
        <Banner>
            <h2>Media Photo</h2>
            <p>Photos for {displayTitle}</p>
        </Banner><br/><br/><br/>
        <div className="media-photo-page container">
            
            {loading && <p>Loading...</p>}
            {error && <p className="form-status">{error}</p>}
            {!loading && items.length === 0 && <p>No photos found for this thumbnail.</p>}
            <div className="photo-grid">
                {items.map((it) => (
                    <div className="photo-card" key={it.id || it.title}>
                        <img src={resolveMediaUrl(it.file_url)} alt={it.alt_text || it.title} />
                        <p className="caption">{it.title}</p>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
}
