import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { extractResponseCollection } from '../../utils/apiResponse.js';
import { getBackendBase } from '../../utils/backend.js';
import { auth } from '../../Authentication/auth';
import Banner from '../banner/banner';
import './portfolio.css';
import Modal from './portfolioModal.jsx';

const PORTFOLIO_API_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        return '/portfolio';
    }
    return `${rawUrl.replace(/\/+$/g, '')}/portfolio`;
})();

const DEFAULT_PORTFOLIO_IMAGE = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
const PORTFOLIO_API_ORIGIN = (() => {
    try {
        return new URL(PORTFOLIO_API_URL).origin;
    } catch {
        return typeof window !== 'undefined' ? window.location.origin : '';
    }
})();

const isAdminLoggedIn = () => {
    const adminAuth = window.localStorage.getItem('admin-auth');
    return adminAuth === 'true' || adminAuth === 'google' || adminAuth === 'firebase';
};

const isLoggedIn = () => {
    const userAuth = window.localStorage.getItem('user-auth');
    return Boolean(userAuth) || isAdminLoggedIn();
};

const DEFAULT_PORTFOLIO = [
    {
        id: 'default-1',
        project_name: 'Landscape Photography',
        slug: 'landscape-photography',
        client_name: 'Studio North',
        completion_date: '2024-05-10',
        project_url: 'landscape-photography',
        cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        project_summary: 'Photography',
        project_details: 'A visual storytelling campaign for a premium outdoor brand.',
    },
    {
        id: 'default-2',
        project_name: 'Web Development',
        slug: 'web-development',
        client_name: 'Pixel Labs',
        completion_date: '2024-07-18',
        project_url: 'web-development',
        cover_image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        project_summary: 'Branding',
        project_details: 'A full-stack website tailored for a fast-growing tech brand.',
    },
    {
        id: 'default-3',
        project_name: 'Team Collaboration',
        slug: 'team-collaboration',
        client_name: 'Summit Events',
        completion_date: '2024-09-02',
        project_url: 'team-collaboration',
        cover_image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        project_summary: 'Events',
        project_details: 'A collaborative event experience designed for a large audience.',
    },
    {
        id: 'default-4',
        project_name: 'Mobile App Showcase',
        slug: 'mobile-app-showcase',
        client_name: 'Nova Media',
        completion_date: '2024-11-14',
        project_url: 'mobile-app-showcase',
        cover_image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        project_summary: 'Media',
        project_details: 'A polished product showcase for a mobile-first business app.',
    },
];

const slugify = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toBackendValue = (value) => {
    if (value === null || value === undefined) {
        return 'null';
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || 'null';
    }

    return String(value);
};

const resolveProjectImage = (value) => {
    if (value === null || value === undefined) {
        return DEFAULT_PORTFOLIO_IMAGE;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const resolved = resolveProjectImage(item);
            if (resolved && resolved !== DEFAULT_PORTFOLIO_IMAGE) {
                return resolved;
            }
        }
        return DEFAULT_PORTFOLIO_IMAGE;
    }

    if (typeof value === 'object') {
        const nestedValue = value.url || value.path || value.src || value.file || value.image || value.image_url || value.cover_image_url || value.cover_image || value.photo_url || value.photo || value.public_url || value.full_url || value.location || value.name;
        return resolveProjectImage(nestedValue);
    }

    let trimmed = String(value).trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return DEFAULT_PORTFOLIO_IMAGE;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return resolveProjectImage(JSON.parse(trimmed));
        } catch {
            // fall through to the string handling below
        }
    }

    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    if (trimmed.includes('/var/www/html')) {
        return `${PORTFOLIO_API_ORIGIN}${trimmed.replace('/var/www/html', '')}`;
    }

    if (trimmed.startsWith('/')) {
        return PORTFOLIO_API_ORIGIN ? `${PORTFOLIO_API_ORIGIN}${trimmed}` : trimmed;
    }

    if (trimmed.startsWith('uploads/')) {
        return PORTFOLIO_API_ORIGIN ? `${PORTFOLIO_API_ORIGIN}/${trimmed}` : `/${trimmed}`;
    }

    if (/^([a-z0-9._-]+\.(png|jpe?g|gif|webp|svg|avif|bmp))$/i.test(trimmed)) {
        return PORTFOLIO_API_ORIGIN ? `${PORTFOLIO_API_ORIGIN}/uploads/${trimmed}` : `/uploads/${trimmed}`;
    }

    return trimmed;
};

const getProjectImageValue = (item) => {
    const candidates = [
        item?.cover_image_url,
        item?.cover_image,
        item?.image_url,
        item?.image,
        item?.photo_url,
        item?.photo,
        item?.coverImage,
        item?.coverImageUrl,
        item?.imagePath,
        item?.image_path,
        item?.cover_image_url?.url,
        item?.cover_image_url?.path,
        item?.cover_image?.url,
        item?.cover_image?.path,
    ];

    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined) {
            continue;
        }

        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
                return resolveProjectImage(candidate);
            }
            continue;
        }

        return resolveProjectImage(candidate);
    }

    return DEFAULT_PORTFOLIO_IMAGE;
};

const normalizeMediaSource = (value) => {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap((entry) => normalizeMediaSource(entry));
    }

    if (typeof value === 'object') {
        const url = value.url || value.path || value.src || value.file || value.file_url || value.image_url || value.video_url || value.media_url || value.link || value.href || value.location || value.name;
        const type = value.media_type || value.type || value.kind || (String(value.file || value.url || value.src || '').match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image');

        if (url) {
            return [{
                id: value.id || value.name || url,
                title: value.title || value.name || value.project_name || 'Project media',
                media_type: String(type || 'image').toLowerCase() === 'video' ? 'video' : 'image',
                file_url: resolveProjectImage(url),
                thumbnail_url: resolveProjectImage(url),
                alt_text: value.alt_text || value.alt || value.title || value.name || 'Project media',
            }];
        }

        return [];
    }

    const trimmed = String(value).trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return [];
    }

    return [{
        id: trimmed,
        title: 'Project media',
        media_type: /\.(mp4|webm|ogg|mov)$/i.test(trimmed) ? 'video' : 'image',
        file_url: resolveProjectImage(trimmed),
        thumbnail_url: resolveProjectImage(trimmed),
        alt_text: 'Project media',
    }];
};

const normalizeProjectGallery = (project) => {
    if (!project) {
        return [];
    }

    const rawItems = [
        project.media_url,
        project.media_files,
        project.media,
        project.gallery,
        project.images,
        project.videos,
        project.project_media,
        project.items,
        project.cover_image_url,
        project.cover_image,
    ].flatMap((entry) => normalizeMediaSource(entry));

    if (rawItems.length > 0) {
        return rawItems.map((item, index) => ({
            ...item,
            id: item.id || `${project.slug || project.project_name || 'project'}-${index}`,
            title: item.title || project.project_name || 'Project media',
            alt_text: item.alt_text || project.project_name || 'Project media',
            project_name: project.project_name || project.title || 'Project',
        }));
    }

    const coverImage = getProjectImageValue(project);
    return [{
        id: `${project.slug || project.id || 'project'}-cover`,
        title: project.project_name || 'Project media',
        media_type: 'image',
        file_url: coverImage,
        thumbnail_url: coverImage,
        alt_text: project.project_name || 'Project media',
        project_name: project.project_name || 'Project',
    }];
};

const getAuthorizationToken = async () => {
    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const idToken = await currentUser.getIdToken(true);
            if (idToken) {
                return `Bearer ${idToken}`;
            }
        }
    } catch (error) {
        console.warn('Unable to get Firebase token:', error);
    }

    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (storedUser?.token) {
            return `Bearer ${storedUser.token}`;
        }
        if (storedUser?.accessToken) {
            return `Bearer ${storedUser.accessToken}`;
        }
        if (storedUser?.idToken) {
            return `Bearer ${storedUser.idToken}`;
        }
    } catch (error) {
        console.warn('Unable to parse user auth token:', error);
    }

    return '';
};

function PortfolioModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        project_name: '',
        slug: '',
        client_name: '',
        completion_date: '',
        project_url: '',
        cover_image_url: '',
        project_summary: '',
        project_details: '',
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFormData({
            project_name: initialValues?.project_name || '',
            slug: initialValues?.slug || slugify(initialValues?.project_name || ''),
            client_name: initialValues?.client_name || '',
            completion_date: initialValues?.completion_date || '',
            project_url: initialValues?.project_url || '',
            cover_image_url: initialValues?.cover_image_url || '',
            project_summary: initialValues?.project_summary || '',
            project_details: initialValues?.project_details || '',
        });
        setSelectedFiles([]);
        setSelectedFileName(initialValues?.cover_image_url ? 'Current cover image attached' : 'No files selected');
        setProcessing(false);
        setStatus('');
    }, [isOpen, initialValues?.id]);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;

        if (name === 'project_name') {
            setFormData((previous) => ({
                ...previous,
                project_name: value,
                slug: slugify(value),
                project_url: slugify(value),
            }));
        } else {
            setFormData((previous) => ({ ...previous, [name]: value }));
        }
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
        setSelectedFileName(files.length > 0 ? files.map((file) => file.name).join(', ') : 'No files selected');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving project...' : 'Creating project...');

        const payload = new FormData();
        payload.append('project_name', toBackendValue(formData.project_name));
        payload.append('slug', toBackendValue(formData.slug || formData.project_name));
        payload.append('client_name', toBackendValue(formData.client_name));
        payload.append('completion_date', toBackendValue(formData.completion_date));
        payload.append('project_url', toBackendValue(formData.project_url || formData.slug || formData.project_name));
        payload.append('project_summary', toBackendValue(formData.project_summary));
        payload.append('project_details', toBackendValue(formData.project_details));
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        if (selectedFiles.length > 0) {
            selectedFiles.forEach((file) => {
                payload.append('media_url', file, file.name);
            });
            const primaryFile = selectedFiles.find((file) => file.type.startsWith('image/')) || selectedFiles[0];
            if (primaryFile) {
                payload.append('cover_image_url', primaryFile, primaryFile.name);
            }
        } else if (formData.cover_image_url?.trim()) {
            payload.append('cover_image_url', formData.cover_image_url.trim());
        }

        try {
            const endpoint = initialValues?.id ? `${PORTFOLIO_API_URL}/${initialValues.id}` : PORTFOLIO_API_URL;
            const authToken = await getAuthorizationToken();
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers: {
                    ...(authToken ? { Authorization: authToken } : {}),
                },
                body: payload,
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save project.');
            }

            setStatus(data?.message || (initialValues?.id ? 'Project updated successfully.' : 'Project created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || 'Unable to save project.');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="portfolio-modal-content">
                <h2>{title}</h2>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="portfolio-form-grid">
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-project-name">Project Name</label>
                            <input id="portfolio-project-name" name="project_name" value={formData.project_name} onChange={handleFieldChange} className="form-control" required />
                        </div>
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-slug">Slug</label>
                            <input id="portfolio-slug" name="slug" value={formData.slug} onChange={handleFieldChange} className="form-control" required />
                        </div>
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-client-name">Client Name</label>
                            <input id="portfolio-client-name" name="client_name" value={formData.client_name} onChange={handleFieldChange} className="form-control" required />
                        </div>
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-completion-date">Completion Date</label>
                            <input id="portfolio-completion-date" name="completion_date" type="date" value={formData.completion_date} onChange={handleFieldChange} className="form-control" />
                        </div>
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-project-url">Project URL</label>
                            <input id="portfolio-project-url" name="project_url" value={formData.project_url} onChange={handleFieldChange} className="form-control" required />
                        </div>
                        <div className="portfolio-form-group">
                            <label htmlFor="portfolio-cover-image">Project Media</label>
                            <input id="portfolio-cover-image" name="cover_image_url" type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="form-control" />
                            <small className="form-hint">{selectedFileName || (formData.cover_image_url ? 'Current media attached' : 'No files selected')}</small>
                        </div>
                        <div className="portfolio-form-group full-width">
                            <label htmlFor="portfolio-project-summary">Project Summary</label>
                            <input id="portfolio-project-summary" name="project_summary" value={formData.project_summary} onChange={handleFieldChange} className="form-control" required />
                        </div>
                        <div className="portfolio-form-group full-width">
                            <label htmlFor="portfolio-project-details">Project Details</label>
                            <textarea id="portfolio-project-details" name="project_details" value={formData.project_details} onChange={handleFieldChange} className="form-control portfolio-textarea" rows={6} required />
                        </div>
                    </div>
                    <button type="submit" className="portfolio-submit-button" disabled={processing}>{processing ? 'Saving...' : submitLabel}</button>
                    {status && <p className="form-status">{status}</p>}
                </form>
            </div>
        </Modal>
    );
}

function DefaultPortfolio({ projects, onOpenCreate, onOpenEdit, canManageContent }) {
    return (
        <>
            <Banner>
                <h2>Portfolio</h2>
                <h5>Discover our diverse portfolio showcasing our best works.</h5>
            </Banner>
            <div className="portfolio-content">
                <div className="container">
                    {canManageContent && (
                        <div className="portfolio-header-row">
                            <button type="button" className="portfolio-add-button" onClick={onOpenCreate} aria-label="Add Project">
                                <i className="fas fa-plus" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                    <h2>Our Amazing Works</h2>
                    <p>Explore our portfolio to see the latest projects and creative solutions we've delivered.</p>
                    <div className="portfolio-gallery">
                        {projects.map((project) => {
                            const projectGallery = normalizeProjectGallery(project);
                            const previewMedia = projectGallery[0] || { file_url: getProjectImageValue(project), alt_text: project.project_name };

                            return (
                                <div className="portfolio-item" key={project.id}>
                                    <Link to={`/portfolio/${project.slug || project.id}`}>
                                        {previewMedia.media_type === 'video' ? (
                                            <video src={previewMedia.file_url} muted playsInline preload="metadata" onError={(event) => { event.currentTarget.poster = DEFAULT_PORTFOLIO_IMAGE; }} />
                                        ) : (
                                            <img src={previewMedia.file_url} alt={project.project_name} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
                                        )}
                                        <div className="portfolio-overlay">
                                            <h4>{project.project_name}</h4>
                                            <p>{project.project_summary}</p>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

function ActivePortfolio({ project, projects, onOpenCreate, onOpenEdit, canManageContent }) {
    if (!project) {
        return <DefaultPortfolio projects={projects} onOpenCreate={onOpenCreate} onOpenEdit={onOpenEdit} canManageContent={canManageContent} />;
    }

    const projectGallery = normalizeProjectGallery(project);

    return (
        <>
            <Banner>
                <h2>Portfolio</h2>
                <h5>Discover our diverse portfolio showcasing our best works.</h5>
            </Banner>
            <div className="portfolio-content">
                <div className="container">
                    {canManageContent && (
                        <div className="portfolio-header-row">
                            <button type="button" className="portfolio-add-button" onClick={onOpenCreate} aria-label="Add Project">
                                <i className="fas fa-plus" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                    <div className="portfolio-active-card">
                        <img src={resolveProjectImage(project.cover_image_url)} alt={project.project_name} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
                        <div className="portfolio-active-body">
                            <h2>{project.project_name}</h2>
                            <p>{project.project_details}</p>
                            <p><strong>Client:</strong> {project.client_name}</p>
                            <p><strong>Completed:</strong> {project.completion_date}</p>
                            <p><strong>Project URL:</strong> <a href={project.project_url} target="_blank" rel="noreferrer">{project.project_url}</a></p>
                            {canManageContent && (
                                <button type="button" className="portfolio-edit-button" onClick={() => onOpenEdit(project)} aria-label={`Edit ${project.project_name}`}>
                                    <i className="fas fa-edit" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="portfolio-gallery portfolio-gallery-active portfolio-mixed-gallery">
                        {projectGallery.map((item) => (
                            <div className="portfolio-item portfolio-mixed-item" key={item.id}>
                                {item.media_type === 'video' ? (
                                    <video src={item.file_url} controls playsInline preload="metadata" />
                                ) : (
                                    <img src={item.file_url} alt={item.alt_text || item.title} onError={(event) => { event.currentTarget.src = DEFAULT_PORTFOLIO_IMAGE; }} />
                                )}
                                <div className="portfolio-overlay">
                                    <h4>{item.title}</h4>
                                    <p>{item.media_type === 'video' ? 'Video' : 'Image'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function Portoflio() {
    const { slug } = useParams();
    const [projects, setProjects] = useState(DEFAULT_PORTFOLIO);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const canManageContent = isLoggedIn();

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const response = await fetch(PORTFOLIO_API_URL);
                if (!response.ok) {
                    throw new Error('Unable to load projects.');
                }

                const json = await response.json();
                const items = extractResponseCollection(json, ['projects', 'portfolio', 'items']);
                const validProjects = items
                    .filter((item) => item && (item.project_name || item.slug || item.project_summary || item.project_details || item.cover_image_url || item.media_url || item.media_files || item.gallery || item.images || item.videos))
                    .map((item) => {
                        const groupGallery = normalizeProjectGallery(item);
                        const coverImage = groupGallery[0]?.file_url || getProjectImageValue(item);
                        const mediaEntries = item.media_url || item.media_files || groupGallery;

                        return {
                            id: item.id,
                            project_name: item.project_name || item.title || 'Untitled Project',
                            slug: item.slug || slugify(item.project_name || item.title || ''),
                            client_name: item.client_name || '',
                            completion_date: item.completion_date || '',
                            project_url: item.project_url || item.slug || slugify(item.project_name || item.title || ''),
                            cover_image_url: coverImage,
                            project_summary: item.project_summary || '',
                            project_details: item.project_details || '',
                            gallery: groupGallery,
                            media_url: mediaEntries,
                            media_files: mediaEntries,
                        };
                    });

                setProjects(validProjects.length > 0 ? validProjects : DEFAULT_PORTFOLIO);
            } catch {
                setProjects(DEFAULT_PORTFOLIO);
            }
        };

        loadProjects();
    }, [refreshKey]);

    const activeProject = useMemo(() => {
        if (!slug) {
            return null;
        }
        return projects.find((project) => project.slug === slug || String(project.id) === slug) || null;
    }, [projects, slug]);

    return (
        <>
            <DefaultPortfolio projects={projects} onOpenCreate={() => { setSelectedProject(null); setIsModalOpen(true); }} onOpenEdit={(project) => { setSelectedProject(project); setIsModalOpen(true); }} canManageContent={canManageContent} />
            {slug && activeProject ? (
                <ActivePortfolio project={activeProject} projects={projects} onOpenCreate={() => { setSelectedProject(null); setIsModalOpen(true); }} onOpenEdit={(project) => { setSelectedProject(project); setIsModalOpen(true); }} canManageContent={canManageContent} />
            ) : null}
            <PortfolioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProject ? 'Edit Project' : 'Create Project'} submitLabel={selectedProject ? 'Update Project' : 'Create Project'} initialValues={selectedProject || {}} onSuccess={() => setRefreshKey((value) => value + 1)} />
        </>
    );
}

export default Portoflio;