import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Banner from '../banner/banner';
import './services.css';
import Modal from './servicesModal';
import { auth } from '../../Authentication/auth.jsx';
import { extractResponseCollection } from '../../utils/apiResponse.js';

const SERVICE_API_BASE_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /services');
        return '';
    }

    try {
        const parsedUrl = new URL(rawUrl, window.location.origin);
        return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/g, '')}`;
    } catch {
        return rawUrl.replace(/\/+$/g, '');
    }
})();

const SERVICE_API_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        return '/services';
    }

    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/services`;
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

const resolveServiceImageUrl = (value) => {
    let src = value || '';
    if (!src) {
        return '';
    }

    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    if (src.includes('/var/www/html')) {
        const relativePath = src.replace('/var/www/html', '').replace(/^\/+/, '');
        return SERVICE_API_BASE_URL
            ? `${SERVICE_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/')
            : src;
    }

    if (src.startsWith('/')) {
        const relativePath = src.replace(/^\/+/, '');
        return SERVICE_API_BASE_URL
            ? `${SERVICE_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/')
            : src;
    }

    return src;
};

const slugify = (value) => {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

function ServiceModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        service_name: '',
        slug: '',
        image_url: '',
        description_body: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const initialServiceName = initialValues?.service_name || '';
        setFormData({
            service_name: initialServiceName,
            slug: initialValues?.slug || slugify(initialServiceName),
            image_url: initialValues?.image_url || '',
            description_body: initialValues?.description_body || '',
        });
        setSelectedFile(null);
        setErrors({});
        setStatus('');
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.service_name?.trim()) {
            nextErrors.service_name = 'Service name is required.';
        }
        if (!selectedFile && !initialValues?.image_url && !formData.image_url?.trim()) {
            nextErrors.image_url = 'Image is required.';
        }
        if (!formData.description_body?.trim()) {
            nextErrors.description_body = 'Description is required.';
        }
        return nextErrors;
    };

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        if (name === 'service_name') {
            setFormData((previous) => ({
                ...previous,
                service_name: value,
                slug: slugify(value),
            }));
        } else {
            setFormData((previous) => ({ ...previous, [name]: value }));
        }
        setErrors((previous) => ({ ...previous, [name]: '' }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setErrors((previous) => ({ ...previous, image_url: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving service...' : 'Creating service...');

        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
            headers.Authorization = authToken;
        }

        const payload = new FormData();
        const serviceName = formData.service_name?.trim();
        const slug = slugify(serviceName);
        const description = formData.description_body?.trim();

        if (serviceName) {
            payload.append('service_name', serviceName);
        }
        if (slug) {
            payload.append('slug', slug);
        }
        if (selectedFile) {
            payload.append('image_url', selectedFile);
        } else if (formData.image_url?.trim()) {
            payload.append('image_url', formData.image_url.trim());
        }
        if (description) {
            payload.append('description_body', description);
        }
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        try {
            const endpoint = initialValues?.id ? `${SERVICE_API_URL}/${initialValues.id}` : SERVICE_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: payload,
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save service.');
            }

            setStatus(data?.message || (initialValues?.id ? 'Service updated successfully.' : 'Service created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || 'Unable to save service.');
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
                                <label htmlFor="service-name">Service Name</label>
                                <input
                                    id="service-name"
                                    name="service_name"
                                    type="text"
                                    className="form-control"
                                    value={formData.service_name}
                                    onChange={handleFieldChange}
                                    required
                                />
                                {errors.service_name && <p className="form-error">{errors.service_name}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="service-slug">Slug</label>
                                <input
                                    id="service-slug"
                                    name="slug"
                                    type="text"
                                    className="form-control"
                                    value={formData.slug}
                                    readOnly
                                    disabled
                                />
                                <small>Slug is generated automatically from the service name.</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="service-image">Image</label>
                                <input
                                    id="service-image"
                                    name="image_url"
                                    type="file"
                                    className="form-control"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {errors.image_url && <p className="form-error">{errors.image_url}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="service-description">Description</label>
                                <textarea
                                    id="service-description"
                                    name="description_body"
                                    className="form-control"
                                    value={formData.description_body}
                                    onChange={handleFieldChange}
                                    rows={5}
                                    required
                                />
                                {errors.description_body && <p className="form-error">{errors.description_body}</p>}
                            </div>

                            <button type="submit" className="btn btn-primary btn-block" disabled={processing}>
                                {processing ? 'Saving...' : submitLabel}
                            </button>
                            {status && <p className="form-status">{status}</p>}
                        </form>
                    </div>
                </div>
            </div>
        </Modal>,
        document.body
    );
}

function DefaultServicePage({ onCreateClick }) {
    return (
        <>


            <div className="service-contents">
                <div className="container">
                    <div className="advertisement-service">
                        <div className="advertisement-service-image"></div>
                        <div className="advertisement-service-content">
                            <h3>Advertisement Service</h3>
                            <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem, nulla magnam repellat aspernatur eaque ipsam laudantium voluptatum quos sed. Dolorem saepe dicta iure odio delectus vel provident, possimus obcaecati excepturi?</span>
                        </div>
                    </div>

                    <div className="media-service">
                        <div className="media-service-content">
                            <h3>Media Service</h3>
                            <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, vero distinctio quis ratione quod corrupti ad. Nobis, perspiciatis. Sint totam laudantium rem maiores fuga aut ab ratione commodi eveniet laborum?</span>
                        </div>
                        <div className="media-service-image"></div>
                    </div>

                    <div className="events-service">
                        <div className="events-service-image"></div>
                        <div className="events-service-content">
                            <h3>Events Service</h3>
                            <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, vero distinctio quis ratione quod corrupti ad. Nobis, perspiciatis. Sint totam laudantium rem maiores fuga aut ab ratione commodi eveniet laborum?</span>
                        </div>
                    </div>

                    <div className="company-branding-service">
                        <div className="company-branding-service-content">
                            <h3>Company Branding</h3>
                            <span>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aliquam unde non maiores doloremque beatae. Dolorem qui eligendi quas nesciunt ipsa saepe eaque aliquid numquam dicta? Error asperiores accusantium repellat beatae!</span>
                        </div>
                        <div className="company-branding-service-image"></div>
                    </div>
                </div>
            </div>

            {isLoggedIn() && (
                <div className="service-actions">
                    <button type="button" className="about-section-add-button service-add-button" onClick={onCreateClick} aria-label="Create Service">
                        <i className="fas fa-plus" aria-hidden="true" />
                    </button>
                </div>
            )}
        </>
    );
}

function ActiveServicePage({ onCreateClick, onEditClick, onDataStateChange }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasData, setHasData] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const loadServices = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(SERVICE_API_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to load services.');
                }

                const json = await response.json();
                const items = extractResponseCollection(json, ['services']);
                const validServices = items
                    .filter((item) => item && (item.service_name || item.slug || item.image_url || item.description_body))
                    .map((item) => ({
                        id: item.id,
                        service_name: item.service_name || item.name || '',
                        slug: item.slug || '',
                        image_url: resolveServiceImageUrl(item.image_url || item.image || item.photo_url || item.photo || ''),
                        description_body: item.description_body || item.description || '',
                    }));

                setServices(validServices);
                const has = validServices.length > 0;
                setHasData(has);
                onDataStateChange?.(has);
            } catch (loadError) {
                if (loadError?.name === 'AbortError') {
                    return;
                }
                setError(loadError.message || 'Unable to load services.');
                setHasData(false);
                onDataStateChange?.(false);
            } finally {
                setLoading(false);
            }
        };

        loadServices();
        return () => controller.abort();
    }, [onDataStateChange]);

    if (!hasData && !loading) {
        return null;
    }

    return (
        <div className="service-contents">
            <div className="container">
                <div className="about-section-heading">
                    {/*<h3>Available Services</h3>*/}
                    {isLoggedIn() && (
                        <button type="button" className="about-section-add-button service-add-button" onClick={onCreateClick} aria-label="Create Service">
                            <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {error && <p className="form-status">{error}</p>}
                {loading ? (
                    <p>Loading services...</p>
                ) : (
                    <div className="service-list">
                        {services.map((service, index) => {
                            const isReverse = index % 2 === 1;
                            return (
                                <div className={isReverse ? 'media-service' : 'advertisement-service'} key={service.id || service.slug}>
                                    {isReverse ? (
                                        <>
                                            <div className="media-service-content">
                                                <h3>{service.service_name}</h3>
                                                <p className="service-card-slug">{service.slug}</p>
                                                <span>{service.description_body}</span>
                                                {isLoggedIn() && (
                                                    <button type="button" className="service-card-edit-button" onClick={() => onEditClick(service)} aria-label={`Edit ${service.service_name}`}>
                                                        <i className="fas fa-edit" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                            <div
                                                className="media-service-image"
                                                style={{ backgroundImage: `url("${service.image_url || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1350&q=80'}")` }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="advertisement-service-image"
                                                style={{ backgroundImage: `url("${service.image_url || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1350&q=80'}")` }}
                                            />
                                            <div className="advertisement-service-content">
                                                <h3>{service.service_name}</h3>
                                                <p className="service-card-slug">{service.slug}</p>
                                                <span>{service.description_body}</span>
                                                {isLoggedIn() && (
                                                    <button type="button" className="service-card-edit-button" onClick={() => onEditClick(service)} aria-label={`Edit ${service.service_name}`}>
                                                        <i className="fas fa-edit" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function Services() {
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeHasData, setActiveHasData] = useState(false);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleEdit = (service) => {
        setSelectedService(service);
        setEditOpen(true);
    };

    return (
        <>
           <Banner>
                <h2>Our Services</h2>
                <h5>We offer a wide range of services to help you succeed.</h5>
            </Banner>
            <ServiceModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                title="Add Service"
                submitLabel="Create Service"
                onSuccess={() => {
                    handleRefresh();
                    setCreateOpen(false);
                }}
            />

            <ServiceModal
                isOpen={isEditOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedService(null);
                }}
                title="Edit Service"
                submitLabel="Update Service"
                initialValues={selectedService || {}}
                onSuccess={() => {
                    handleRefresh();
                    setEditOpen(false);
                    setSelectedService(null);
                }}
            />

            <ActiveServicePage
                key={refreshKey}
                onCreateClick={() => setCreateOpen(true)}
                onEditClick={handleEdit}
                onDataStateChange={setActiveHasData}
            />
            {!activeHasData && <DefaultServicePage onCreateClick={() => setCreateOpen(true)} />}
        </>
    );
}

export default Services;