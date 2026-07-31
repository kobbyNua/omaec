import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './aboutModal';
import { auth } from '../../Authentication/auth.jsx';

const TEAM_API_BASE_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /aboutTeam');
        return '';
    }

    try {
        const parsedUrl = new URL(rawUrl, window.location.origin);
        return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/g, '')}`;
    } catch {
        return rawUrl.replace(/\/+$/g, '');
    }
})();

const TEAM_API_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /aboutTeam');
        return '/aboutTeam';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/aboutTeam`;
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

const resolveTeamImageUrl = (value) => {
    let src = value || '';
    if (!src) {
        return '';
    }

    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    if (src.includes('/var/www/html')) {
        const relativePath = src.replace('/var/www/html', '').replace(/^\/+/, '');
        return TEAM_API_BASE_URL ? `${TEAM_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/') : src;
    }

    if (src.startsWith('/')) {
        const relativePath = src.replace(/^\/+/, '');
        return TEAM_API_BASE_URL ? `${TEAM_API_BASE_URL}/${relativePath}`.replace(/\/{2,}/g, '/') : src;
    }

    return src;
};

const isValidUrl = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return true;
    }

    try {
        const url = new URL(trimmed);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

function TeamModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        full_name: '',
        job_role: '',
        photo_url: '',
        linkedin_url: '',
        twitter_url: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFormData({
            full_name: initialValues?.full_name || '',
            job_role: initialValues?.job_role || '',
            photo_url: initialValues?.photo_url || '',
            linkedin_url: initialValues?.linkedin_url || '',
            twitter_url: initialValues?.twitter_url || '',
        });
        setSelectedFile(null);
        setErrors({});
        setStatus('');
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.full_name?.trim()) {
            nextErrors.full_name = 'Full name is required.';
        }
        if (!formData.job_role?.trim()) {
            nextErrors.job_role = 'Job role is required.';
        }
        if (!selectedFile && !initialValues?.photo_url && !formData.photo_url?.trim()) {
            nextErrors.photo_url = 'Photo is required.';
        }
        if (formData.linkedin_url?.trim() && !isValidUrl(formData.linkedin_url)) {
            nextErrors.linkedin_url = 'Please enter a valid LinkedIn URL.';
        }
        if (formData.twitter_url?.trim() && !isValidUrl(formData.twitter_url)) {
            nextErrors.twitter_url = 'Please enter a valid Twitter URL.';
        }
        return nextErrors;
    };

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: '' }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setErrors((previous) => ({ ...previous, photo_url: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving team member...' : 'Creating team member...');

        const authToken = await getAuthorizationToken();
        const headers = {};

        if (authToken) {
            headers.Authorization = authToken;
        }

        const payload = new FormData();
        payload.append('full_name', formData.full_name.trim());
        payload.append('job_role', formData.job_role.trim());
        if (selectedFile) {
            payload.append('photo_url', selectedFile);
        } else if (formData.photo_url?.trim()) {
            payload.append('photo_url', formData.photo_url.trim());
        }
        if (formData.linkedin_url?.trim()) {
            payload.append('linkedin_url', formData.linkedin_url.trim());
        }
        if (formData.twitter_url?.trim()) {
            payload.append('twitter_url', formData.twitter_url.trim());
        }
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        try {
            const endpoint = initialValues?.id ? `${TEAM_API_URL}/${initialValues.id}` : TEAM_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: payload,
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save team member.');
            }

            setStatus(data?.message || (initialValues?.id ? 'Team member updated successfully.' : 'Team member created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || 'Unable to save team member.');
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
                            <div className="form-group">
                                <label htmlFor="team-full-name">Full Name</label>
                                <input
                                    id="team-full-name"
                                    name="full_name"
                                    type="text"
                                    className="form-control"
                                    value={formData.full_name}
                                    onChange={handleFieldChange}
                                    required
                                />
                                {errors.full_name && <p className="form-error">{errors.full_name}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="team-job-role">Job Role</label>
                                <input
                                    id="team-job-role"
                                    name="job_role"
                                    type="text"
                                    className="form-control"
                                    value={formData.job_role}
                                    onChange={handleFieldChange}
                                    required
                                />
                                {errors.job_role && <p className="form-error">{errors.job_role}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="team-photo">Photo</label>
                                <input
                                    id="team-photo"
                                    name="photo_url"
                                    type="file"
                                    className="form-control"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {errors.photo_url && <p className="form-error">{errors.photo_url}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="team-linkedin">LinkedIn URL</label>
                                <input
                                    id="team-linkedin"
                                    name="linkedin_url"
                                    type="url"
                                    className="form-control"
                                    value={formData.linkedin_url}
                                    onChange={handleFieldChange}
                                />
                                {errors.linkedin_url && <p className="form-error">{errors.linkedin_url}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="team-twitter">Twitter URL</label>
                                <input
                                    id="team-twitter"
                                    name="twitter_url"
                                    type="url"
                                    className="form-control"
                                    value={formData.twitter_url}
                                    onChange={handleFieldChange}
                                />
                                {errors.twitter_url && <p className="form-error">{errors.twitter_url}</p>}
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

function DefaultTeam() {
    return (
        <div className="team-grid">
                    <div className="team-member">
                        <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 1" />
                        <h4>John Doe</h4>
                        <p>CEO & Founder</p>
                    </div>
                    <div className="team-member">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 2" />
                        <h4>Jane Smith</h4>
                        <p>Creative Director</p>
                    </div>
                    <div className="team-member">
                        <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 3" />
                        <h4>Mike Johnson</h4>
                        <p>Lead Developer</p>
                    </div>
                    <div className="team-member">
                        <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" alt="Team Member 4" />
                        <h4>Sarah Williams</h4>
                        <p>Marketing Manager</p>
                    </div>

        </div>
    );
}

function Team() {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [isEditOpen, setEditOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const loadTeam = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(TEAM_API_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to load team members.');
                }

                const json = await response.json();
                const items = Array.isArray(json) ? json : json?.data || [];
                const validMembers = items
                    .filter((item) => item && (item.full_name || item.job_role || item.photo_url || item.linkedin_url || item.twitter_url))
                    .map((item) => ({
                        id: item.id,
                        full_name: item.full_name || item.name || '',
                        job_role: item.job_role || item.role || '',
                        photo_url: resolveTeamImageUrl(item.photo_url || item.photo || item.image_url || item.image || ''),
                        linkedin_url: item.linkedin_url || '',
                        twitter_url: item.twitter_url || '',
                    }));

                setTeamMembers(validMembers);
            } catch (loadError) {
                if (loadError?.name !== 'AbortError') {
                    setError(loadError.message || 'Unable to load team members.');
                }
            } finally {
                setLoading(false);
            }
        };

        loadTeam();
        return () => controller.abort();
    }, [refreshKey]);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    if (error) {
        return null;
    }

    return (
        <>
            <div className="our-team">
                <div className="about-section-heading">
                    <h3>Meet Our Team</h3>
                    {isLoggedIn() && (
                        <button type="button" className="about-section-add-button" onClick={() => setCreateOpen(true)} aria-label="Create Team Member">
                            <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {error && <p className="form-status">{error}</p>}
                {loading ? (
                    <p>Loading team members...</p>
                ) : teamMembers.length > 0 ? (
                    <div className="team-grid">
                        {teamMembers.map((member) => (
                            <div className="team-member" key={member.id || member.full_name}>
                                <img
                                    src={member.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'}
                                    alt={member.full_name || 'Team member'}
                                />
                                <h4>{member.full_name}</h4>
                                <p>{member.job_role}</p>
                                {isLoggedIn() && (
                                    <button type="button" className="about-section-edit-button" onClick={() => { setSelectedMember(member); setEditOpen(true); }} aria-label={`Edit ${member.full_name}`}>
                                        <i className="fas fa-edit" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <DefaultTeam />
                )}
            </div>

            <TeamModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                title="Add Team Member"
                submitLabel="Create Team Member"
                onSuccess={() => {
                    handleRefresh();
                    setCreateOpen(false);
                }}
            />

            <TeamModal
                isOpen={isEditOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedMember(null);
                }}
                title="Edit Team Member"
                submitLabel="Update Team Member"
                initialValues={selectedMember || {}}
                onSuccess={() => {
                    handleRefresh();
                    setEditOpen(false);
                    setSelectedMember(null);
                }}
            />
        </>
    );
}

export default Team;


