import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './aboutModal';
import { auth } from '../../Authentication/auth.jsx';
import { getBackendBase } from '../../utils/backend.js';

const ABOUT_API_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /about');
        return '/about';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/about`;
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

function VisionModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        section_key: '',
        title: '',
        subtitle_or_body: '',
    });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFormData({
            section_key: initialValues?.section_key || '',
            title: initialValues?.title || '',
            subtitle_or_body: initialValues?.subtitle_or_body || '',
        });
        setErrors({});
        setStatus('');
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.section_key?.trim()) {
            nextErrors.section_key = 'Please select a section.';
        }
        if (!formData.title?.trim()) {
            nextErrors.title = 'Title is required.';
        }
        if (!formData.subtitle_or_body?.trim()) {
            nextErrors.subtitle_or_body = 'Content is required.';
        }
        return nextErrors;
    };

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving content...' : 'Creating content...');

        const authToken = await getAuthorizationToken();
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers.Authorization = authToken;
        }

        try {
            const endpoint = initialValues?.id ? `${ABOUT_API_URL}/${initialValues.id}` : ABOUT_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify({
                    id: initialValues?.id,
                    section_key: formData.section_key.trim(),
                    title: formData.title.trim(),
                    subtitle_or_body: formData.subtitle_or_body.trim(),
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save content.');
            }

            setStatus(data?.message || (initialValues?.id ? 'Content updated successfully.' : 'Content created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || 'Unable to save content.');
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
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="form-group">
                                <label htmlFor="section-key">Section</label>
                                <select
                                    id="section-key"
                                    name="section_key"
                                    className="form-control"
                                    value={formData.section_key}
                                    onChange={handleFieldChange}
                                    required
                                >
                                    <option value="">Select a section</option>
                                    <option value="about-story">About Story</option>
                                    <option value="about-mission">About Mission</option>
                                </select>
                                {errors.section_key && <p className="form-error">{errors.section_key}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="vision-title">Title</label>
                                <input
                                    id="vision-title"
                                    name="title"
                                    type="text"
                                    className="form-control"
                                    value={formData.title}
                                    onChange={handleFieldChange}
                                    required
                                />
                                {errors.title && <p className="form-error">{errors.title}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="vision-body">Subtitle or Body</label>
                                <textarea
                                    id="vision-body"
                                    name="subtitle_or_body"
                                    className="form-control"
                                    value={formData.subtitle_or_body}
                                    onChange={handleFieldChange}
                                    rows={5}
                                    required
                                />
                                {errors.subtitle_or_body && <p className="form-error">{errors.subtitle_or_body}</p>}
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

function DefaultVisionMissionGoal() {
    return (
        <>
            <div className="about-story">
                <h3>Our Story</h3>
                <p>Founded in 2010, we started with a simple mission: to provide exceptional digital solutions that empower businesses to grow. Over the years, we have evolved into a full-service agency, helping clients across the globe achieve their goals through innovation and creativity.</p>
            </div>

            <div className="about-mission">
                <h3>Our Mission</h3>
                <p>Our mission is to deliver high-quality services that exceed expectations. We believe in the power of collaboration, integrity, and continuous improvement. We strive to build lasting relationships with our clients by understanding their unique needs and delivering tailored solutions.</p>
            </div>
        </>
    );
}

function VisionMissionGoal() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const loadSections = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(ABOUT_API_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to load about content.');
                }

                const json = await response.json();
                const items = Array.isArray(json) ? json : json?.data || [];
                const validSections = items
                    .filter((item) => item && (item.section_key || item.title || item.subtitle_or_body))
                    .map((item) => ({
                        id: item.id,
                        section_key: item.section_key || '',
                        title: item.title || '',
                        subtitle_or_body: item.subtitle_or_body || item.body || '',
                    }));

                setSections(validSections);
            } catch (loadError) {
                if (loadError?.name !== 'AbortError') {
                    setError(loadError.message || 'Unable to load about content.');
                }
            } finally {
                setLoading(false);
            }
        };

        loadSections();
        return () => controller.abort();
    }, [refreshKey]);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const renderSections = () => {
        const storySection = sections.find((section) => section.section_key === 'about-story');
        const missionSection = sections.find((section) => section.section_key === 'about-mission');
        const hasData = Boolean(storySection || missionSection);

        if (!hasData) {
            return <DefaultVisionMissionGoal />;
        }

        return (
            <>
                {storySection ? (
                    <div className="about-story">
                        <h3>{storySection.title}</h3>
                        <p>{storySection.subtitle_or_body}</p>
                        {isLoggedIn() && (
                            <button type="button" className="about-section-edit-button" onClick={() => { setSelectedSection(storySection); setEditOpen(true); }} aria-label="Edit story section">
                                <i className="fas fa-edit" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ) : null}

                {missionSection ? (
                    <div className="about-mission">
                        <h3>{missionSection.title}</h3>
                        <p>{missionSection.subtitle_or_body}</p>
                        {isLoggedIn() && (
                            <button type="button" className="about-section-edit-button" onClick={() => { setSelectedSection(missionSection); setEditOpen(true); }} aria-label="Edit mission section">
                                <i className="fas fa-edit" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ) : null}
            </>
        );
    };

    return (
        <>
            <>
                <div className="about-section-heading">
                    {/*<h3>About Story & Mission</h3>*/}
                    {isLoggedIn() && (
                        <button type="button" className="about-section-add-button" onClick={() => setCreateOpen(true)} aria-label="Create About Content">
                            <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {error && <p className="form-status">{error}</p>}
                {loading ? <p>Loading about content...</p> : renderSections()}
            </>

            <VisionModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                title="Add About Content"
                submitLabel="Create About Content"
                onSuccess={() => {
                    handleRefresh();
                    setCreateOpen(false);
                }}
            />

            <VisionModal
                isOpen={isEditOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedSection(null);
                }}
                title="Edit About Content"
                submitLabel="Update About Content"
                initialValues={selectedSection || {}}
                onSuccess={() => {
                    handleRefresh();
                    setEditOpen(false);
                    setSelectedSection(null);
                }}
            />
        </>
    );
}

export default VisionMissionGoal;