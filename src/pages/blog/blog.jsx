import { useEffect, useState } from 'react';
import Banner from '../banner/banner';
import './blog.css';
import Modal from './blogModal';
import { auth } from '../../Authentication/auth.jsx';

const BLOG_API_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /blog');
        return '/blog';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/blog`;
})();

const CATEGORY_API_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Falling back to /categories');
        return '/categories';
    }
    const base = rawUrl.replace(/\/+$/g, '');
    return `${base}/categories`;
})();

const BLOG_API_ORIGIN = (() => {
    try {
        return new URL(BLOG_API_URL).origin;
    } catch {
        return window.location.origin;
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

const getAuthorizationToken = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const idToken = await currentUser.getIdToken(true);
            if (idToken) {
                return `Bearer ${idToken}`;
            }
        } catch (error) {
            console.warn('Unable to get Firebase token for blog requests:', error);
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
            console.warn('Unable to parse stored user auth for blog requests:', error);
        }
    }

    return '';
};

const slugify = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildExcerpt = (value) => {
    const source = String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!source) {
        return '';
    }
    return source.length > 180 ? `${source.slice(0, 177)}...` : source;
};

const resolveBlogImageUrl = (value) => {
    let src = String(value || '').trim();
    if (!src) {
        return '';
    }

    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    src = src.replace(/\\/g, '/');
    if (src.includes('/var/www/html')) {
        return `${BLOG_API_ORIGIN}${src.replace('/var/www/html', '')}`;
    }
    if (src.startsWith('/')) {
        return `${BLOG_API_ORIGIN}${src}`;
    }
    if (src.startsWith('uploads/posts/') || src.startsWith('storage/') || src.startsWith('public/')) {
        return `${BLOG_API_ORIGIN}/${src}`;
    }

    return src;
};

function CategoryModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setFormData({
            name: initialValues?.name || '',
            slug: initialValues?.slug || '',
        });
        setProcessing(false);
        setStatus('');
    }, [isOpen, initialValues?.id, initialValues?.name, initialValues?.slug]);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        if (name === 'name') {
            setFormData((previous) => ({
                ...previous,
                name: value,
                slug: slugify(value),
            }));
            return;
        }
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving category...' : 'Creating category...');

        const payload = new FormData();
        const name = formData.name?.trim();
        const slug = formData.slug?.trim() || slugify(name);
        if (name) {
            payload.append('name', name);
        }
        if (slug) {
            payload.append('slug', slug);
        }
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        try {
            const authToken = await getAuthorizationToken();
            const headers = {};
            if (authToken) {
                headers.Authorization = authToken;
            }

            const endpoint = initialValues?.id ? `${CATEGORY_API_URL}/${initialValues.id}` : CATEGORY_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: payload,
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save category.');
            }
            setStatus(data?.message || (initialValues?.id ? 'Category updated successfully.' : 'Category created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 250);
        } catch (error) {
            setStatus(error.message || 'Unable to save category.');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="modal-header">
                <h2>{title}</h2>
                <button type="button" className="close-button" onClick={onClose} aria-label="Close category form">
                    <i className="fas fa-times" aria-hidden="true" />
                </button>
            </div>
            <div className="modal-body">
                <form onSubmit={handleSubmit} className="blog-form" noValidate>
                    <div className="blog-form-group">
                        <label htmlFor="category-name">Name</label>
                        <input id="category-name" name="name" type="text" className="form-control" value={formData.name} onChange={handleFieldChange} required />
                    </div>
                    <div className="blog-form-group">
                        <label htmlFor="category-slug">Slug</label>
                        <input id="category-slug" name="slug" type="text" className="form-control" value={formData.slug} onChange={handleFieldChange} disabled readOnly />
                        <small>Slug is generated automatically from the name.</small>
                    </div>
                    <div className="blog-form-actions">
                        <button type="submit" className="btn btn-primary" disabled={processing}>{processing ? 'Saving...' : submitLabel}</button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                    {status && <p className="form-status">{status}</p>}
                </form>
            </div>
        </Modal>
    );
}

function PostModal({ isOpen, onClose, title, submitLabel, initialValues = {}, categories = [], onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        avatar_url: '',
        title: '',
        slug: '',
        category_id: '',
        image_url: '',
        content: '',
        excerpt: '',
    });
    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setFormData({
            name: initialValues?.name || '',
            email: initialValues?.email || '',
            avatar_url: initialValues?.avatar_url || '',
            title: initialValues?.title || '',
            slug: initialValues?.slug || '',
            category_id: initialValues?.category_id || initialValues?.category?.id || '',
            image_url: initialValues?.image_url || '',
            content: initialValues?.content || '',
            excerpt: initialValues?.excerpt || buildExcerpt(initialValues?.content || ''),
        });
        setSelectedAvatarFile(null);
        setSelectedImageFile(null);
        setProcessing(false);
        setStatus('');
    }, [isOpen, initialValues?.id, initialValues?.name, initialValues?.email, initialValues?.title, initialValues?.slug, initialValues?.content, initialValues?.category_id, initialValues?.category?.id, initialValues?.avatar_url, initialValues?.image_url]);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        if (name === 'title') {
            setFormData((previous) => ({
                ...previous,
                title: value,
                slug: slugify(value),
            }));
            return;
        }
        if (name === 'content') {
            setFormData((previous) => ({
                ...previous,
                content: value,
                excerpt: buildExcerpt(value),
            }));
            return;
        }
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleAvatarFileChange = (event) => {
        setSelectedAvatarFile(event.target.files?.[0] || null);
    };

    const handleImageFileChange = (event) => {
        setSelectedImageFile(event.target.files?.[0] || null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setStatus(initialValues?.id ? 'Saving post...' : 'Creating post...');

        const payload = new FormData();
        const name = formData.name?.trim();
        const email = formData.email?.trim();
        const title = formData.title?.trim();
        const slug = formData.slug?.trim() || slugify(title);
        const categoryId = formData.category_id?.toString().trim();
        const content = formData.content?.trim();
        const excerpt = formData.excerpt?.trim() || buildExcerpt(content);

        if (name) {
            payload.append('name', name);
        }
        if (email) {
            payload.append('email', email);
        }
        if (selectedAvatarFile) {
            payload.append('avatar_url', selectedAvatarFile);
        } else if (initialValues?.avatar_url && initialValues?.id) {
            payload.append('avatar_url', initialValues.avatar_url);
        }
        if (title) {
            payload.append('title', title);
        }
        if (slug) {
            payload.append('slug', slug);
        }
        if (categoryId) {
            payload.append('category_id', categoryId);
        }
        if (selectedImageFile) {
            payload.append('image_url', selectedImageFile);
        } else if (formData.image_url?.trim()) {
            payload.append('image_url', formData.image_url.trim());
        } else if (initialValues?.image_url && initialValues?.id) {
            payload.append('image_url', initialValues.image_url);
        }
        if (content) {
            payload.append('content', content);
        }
        if (excerpt) {
            payload.append('excerpt', excerpt);
        }
        if (initialValues?.id) {
            payload.append('id', String(initialValues.id));
        }

        try {
            const authToken = await getAuthorizationToken();
            const headers = {};
            if (authToken) {
                headers.Authorization = authToken;
            }

            const endpoint = initialValues?.id ? `${BLOG_API_URL}/${initialValues.id}` : BLOG_API_URL;
            const response = await fetch(endpoint, {
                method: initialValues?.id ? 'PUT' : 'POST',
                headers,
                body: payload,
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || data?.status === false) {
                throw new Error(data?.message || 'Unable to save post.');
            }
            setStatus(data?.message || (initialValues?.id ? 'Post updated successfully.' : 'Post created successfully.'));
            onSuccess?.();
            setTimeout(() => onClose?.(), 250);
        } catch (error) {
            setStatus(error.message || 'Unable to save post.');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="modal-header">
                <h2>{title}</h2>
                <button type="button" className="close-button" onClick={onClose} aria-label="Close post form">
                    <i className="fas fa-times" aria-hidden="true" />
                </button>
            </div>
            <div className="modal-body">
                <form onSubmit={handleSubmit} className="blog-form" noValidate encType="multipart/form-data">
                    <div className="blog-form-section">
                        <h3>Author info</h3>
                        <div className="blog-form-group">
                            <label htmlFor="post-author-name">Name</label>
                            <input id="post-author-name" name="name" type="text" className="form-control" value={formData.name} onChange={handleFieldChange} required />
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-author-email">Email</label>
                            <input id="post-author-email" name="email" type="email" className="form-control" value={formData.email} onChange={handleFieldChange} required />
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-author-avatar">Avatar</label>
                            <input id="post-author-avatar" name="avatar_url" type="file" className="form-control" accept="image/*" onChange={handleAvatarFileChange} />
                            <small>Optional.</small>
                        </div>
                    </div>

                    <div className="blog-form-section">
                        <h3>Post info</h3>
                        <div className="blog-form-group">
                            <label htmlFor="post-title">Title</label>
                            <input id="post-title" name="title" type="text" className="form-control" value={formData.title} onChange={handleFieldChange} required />
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-slug">Slug</label>
                            <input id="post-slug" name="slug" type="text" className="form-control" value={formData.slug} onChange={handleFieldChange} disabled readOnly />
                            <small>Slug is generated automatically from the title.</small>
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-category">Category</label>
                            <select id="post-category" name="category_id" className="form-control" value={formData.category_id || ''} onChange={handleFieldChange} required aria-required="true">
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id || category.slug || category.name} value={category.id || category.slug || category.name}>
                                        {category.name || category.title || category.slug}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-image">Image</label>
                            <input id="post-image" name="image_url" type="file" className="form-control" accept="image/*" onChange={handleImageFileChange} />
                            <small>{initialValues?.id ? 'Optional when updating.' : 'Required when creating.'}</small>
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-content">Content</label>
                            <textarea id="post-content" name="content" className="form-control" value={formData.content} onChange={handleFieldChange} rows={6} required />
                        </div>
                        <div className="blog-form-group">
                            <label htmlFor="post-excerpt">Excerpt</label>
                            <textarea id="post-excerpt" name="excerpt" className="form-control" value={formData.excerpt} rows={3} readOnly disabled />
                        </div>
                    </div>

                    <div className="blog-form-actions">
                        <button type="submit" className="btn btn-primary" disabled={processing}>{processing ? 'Saving...' : submitLabel}</button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                    {status && <p className="form-status">{status}</p>}
                </form>
            </div>
        </Modal>
    );
}

function DefaultBlog({ onCreateCategoryClick, onCreatePostClick, canManageBlog }) {
    return (
        <>
            <div className="blog-content">
                <div className="container">
                    <div className="blog-header">
                        <div>
                            <h2>Welcome to Our Blog</h2>
                            <p>Stay updated with the latest news, insights, and stories from our team.</p>
                        </div>
                        {canManageBlog && (
                            <div className="blog-actions">
                                <button type="button" className="about-section-add-button" onClick={onCreateCategoryClick} aria-label="Create category">
                                    <i className="fas fa-tags" aria-hidden="true" />
                                </button>
                                <button type="button" className="about-section-add-button" onClick={onCreatePostClick} aria-label="Create post">
                                    <i className="fas fa-plus" aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="blog-posts">
                        <div className="blog-post-grid">
                            <div className="blog-post">
                                <img src="https://images.unsplash.com/photo-1499750310159-5b9887039e54?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Blog Post 1" />
                                <div className="blog-post-content">
                                    <h3>Blog Post Title 1</h3>
                                    <p>Date: June 10, 2024</p>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sit amet accumsan arcu. Proin ac consequat arcu.</p>
                                    <a href="#" className="read-more">Read More</a>
                                </div>
                            </div>
                            <div className="blog-post">
                                <img src="https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Blog Post 2" />
                                <div className="blog-post-content">
                                    <h3>Blog Post Title 2</h3>
                                    <p>Date: May 25, 2024</p>
                                    <p>Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui, egestas eget quam.</p>
                                    <a href="#" className="read-more">Read More</a>
                                </div>
                            </div>
                        </div>
                        <aside className="blog-sidebar">
                            <div className="previous-posts">
                                <h3>Previous Posts</h3>
                                <div className="previous-post-item">
                                    <span>June 1, 2024</span>
                                    <p>How to build a stronger brand story.</p>
                                </div>
                                <div className="previous-post-item">
                                    <span>May 12, 2024</span>
                                    <p>The future of digital marketing in a post-pandemic world.</p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}

function ActiveBlog({ onCreateCategoryClick, onCreatePostClick, onEditClick, onDataStateChange, canManageBlog, onReadMoreClick }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const loadPosts = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(BLOG_API_URL, { method: 'GET', signal: controller.signal, headers });
                if (!response.ok) {
                    throw new Error('Unable to load blog posts.');
                }
                const json = await response.json().catch(() => null);
                const items = Array.isArray(json) ? json : json?.data || [];
                const validPosts = items
                    .filter((item) => item && (item.title || item.slug || item.content || item.excerpt || item.image_url))
                    .map((item) => ({
                        id: item.id,
                        title: item.title || item.name || '',
                        slug: item.slug || '',
                        content: item.content || item.description || '',
                        excerpt: item.excerpt || buildExcerpt(item.content || item.description || ''),
                        image_url: resolveBlogImageUrl(item.image_url || item.image?.url || item.image?.path || item.image || item.cover_image_url || item.cover_image || ''),
                        category_id: item.category_id || item.category?.id || '',
                        category_name: item.category?.name || item.category_name || '',
                        name: item.name || '',
                        email: item.email || '',
                        avatar_url: resolveBlogImageUrl(item.avatar_url || item.avatar?.url || item.avatar?.path || item.avatar || ''),
                    }))
                    .sort((left, right) => {
                        const leftId = Number(left.id);
                        const rightId = Number(right.id);
                        if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
                            return rightId - leftId;
                        }
                        return String(right.id || '').localeCompare(String(left.id || ''));
                    });
                setPosts(validPosts);
                onDataStateChange?.(validPosts.length > 0);
            } catch (loadError) {
                if (loadError?.name === 'AbortError') {
                    return;
                }
                setError(loadError.message || 'Unable to load blog posts.');
                onDataStateChange?.(false);
            } finally {
                setLoading(false);
            }
        };

        loadPosts();
        return () => controller.abort();
    }, [onDataStateChange]);

    if (loading) {
        return (
            <div className="blog-content">
                <div className="container">
                    <p>Loading blog posts...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="blog-content">
                <div className="container">
                    <p className="form-status">{error}</p>
                </div>
            </div>
        );
    }

    if (!posts.length) {
        return null;
    }

    return (
        <div className="blog-content">
            <div className="container">
                <div className="blog-header">
                    <div>
                        <h2>Latest Posts</h2>
                        <p>Fresh updates from our team and community.</p>
                    </div>
                    {canManageBlog && (
                        <div className="blog-actions">
                            <button type="button" className="about-section-add-button" onClick={onCreateCategoryClick} aria-label="Create category">
                                <i className="fas fa-tags" aria-hidden="true" />
                            </button>
                            <button type="button" className="about-section-add-button" onClick={onCreatePostClick} aria-label="Create post">
                                <i className="fas fa-plus" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="blog-layout">
                    <div className="blog-post-grid blog-active-grid">
                        {posts.map((post) => (
                            <article className="blog-post" key={post.id || post.slug}>
                                {post.image_url ? <img src={post.image_url} alt={post.title} /> : null}
                                <div className="blog-post-content">
                                    <div className="blog-card-meta">
                                        {post.category_name ? <span className="blog-chip">{post.category_name}</span> : null}
                                        {canManageBlog && (
                                            <button type="button" className="blog-card-edit-button" onClick={() => onEditClick(post)} aria-label={`Edit ${post.title}`}>
                                                <i className="fas fa-edit" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                    <h3>{post.title}</h3>
                                    <p>{post.excerpt || buildExcerpt(post.content)}</p>
                                    <p className="blog-post-author">By {post.name || 'Anonymous'}</p>
                                    <button type="button" className="read-more" onClick={() => onReadMoreClick?.(post.slug || post.id)}>
                                        Read More
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                    <aside className="blog-sidebar">
                        <div className="blog-sidebar-card">
                            <h3>Previous Posts</h3>
                            <div className="previous-post-item">
                                <span>June 1, 2024</span>
                                <p>How to build a stronger brand story.</p>
                            </div>
                            <div className="previous-post-item">
                                <span>May 12, 2024</span>
                                <p>The future of digital marketing in a post-pandemic world.</p>
                            </div>
                        </div>
                        <div className="blog-ad-card">
                            <p className="blog-ad-label">Sponsored</p>
                            <h3>Need a stronger online presence?</h3>
                            <p>Showcase your work, connect with clients, and grow with a polished digital experience.</p>
                            <a href="/contact" className="read-more">Contact us</a>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function Blog() {
    const [isCategoryCreateOpen, setCategoryCreateOpen] = useState(false);
    const [isCategoryEditOpen, setCategoryEditOpen] = useState(false);
    const [isPostCreateOpen, setPostCreateOpen] = useState(false);
    const [isPostEditOpen, setPostEditOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [categories, setCategories] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [hasActiveBlogData, setHasActiveBlogData] = useState(false);
    const [canManageBlog, setCanManageBlog] = useState(() => isLoggedIn());
    const [selectedPostSlug, setSelectedPostSlug] = useState('');

    useEffect(() => {
        const syncLoginState = () => setCanManageBlog(isLoggedIn());
        syncLoginState();

        const unsubscribe = auth?.onAuthStateChanged?.(() => syncLoginState());
        window.addEventListener('storage', syncLoginState);

        return () => {
            unsubscribe?.();
            window.removeEventListener('storage', syncLoginState);
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const loadCategories = async () => {
            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(CATEGORY_API_URL, { method: 'GET', signal: controller.signal, headers });
                if (!response.ok) {
                    throw new Error('Unable to load categories.');
                }
                const json = await response.json().catch(() => null);
                const items = Array.isArray(json) ? json : json?.data || [];
                setCategories(items.filter(Boolean));
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    console.warn('Unable to load categories:', error);
                }
            }
        };

        loadCategories();
        return () => controller.abort();
    }, []);

    const handleRefresh = () => setRefreshKey((previous) => previous + 1);
    const handleReadMore = (slug) => setSelectedPostSlug(slug || '');
    const openCreateCategory = () => {
        if (!canManageBlog) {
            return;
        }
        setSelectedCategory(null);
        setCategoryCreateOpen(true);
    };
    const openEditCategory = (category) => {
        if (!canManageBlog) {
            return;
        }
        setSelectedCategory(category);
        setCategoryEditOpen(true);
    };
    const openCreatePost = () => {
        if (!canManageBlog) {
            return;
        }
        setSelectedPost(null);
        setPostCreateOpen(true);
    };
    const openEditPost = (post) => {
        if (!canManageBlog) {
            return;
        }
        setSelectedPost(post);
        setPostEditOpen(true);
    };

    return (
        <>
            <Banner>
                <h2>Blog</h2>
                <h5>Insights, updates, and stories from our team</h5>
            </Banner>

            <CategoryModal
                isOpen={isCategoryCreateOpen}
                onClose={() => setCategoryCreateOpen(false)}
                title="Add Category"
                submitLabel="Create Category"
                onSuccess={() => {
                    handleRefresh();
                    setCategoryCreateOpen(false);
                }}
            />
            <CategoryModal
                isOpen={isCategoryEditOpen}
                onClose={() => {
                    setCategoryEditOpen(false);
                    setSelectedCategory(null);
                }}
                title="Edit Category"
                submitLabel="Update Category"
                initialValues={selectedCategory || {}}
                onSuccess={() => {
                    handleRefresh();
                    setCategoryEditOpen(false);
                    setSelectedCategory(null);
                }}
            />
            <PostModal
                isOpen={isPostCreateOpen}
                onClose={() => setPostCreateOpen(false)}
                title="Add Post"
                submitLabel="Create Post"
                categories={categories}
                onSuccess={() => {
                    handleRefresh();
                    setPostCreateOpen(false);
                }}
            />
            <PostModal
                isOpen={isPostEditOpen}
                onClose={() => {
                    setPostEditOpen(false);
                    setSelectedPost(null);
                }}
                title="Edit Post"
                submitLabel="Update Post"
                initialValues={selectedPost || {}}
                categories={categories}
                onSuccess={() => {
                    handleRefresh();
                    setPostEditOpen(false);
                    setSelectedPost(null);
                }}
            />

            {selectedPostSlug ? (
                <ReadPost linkk={selectedPostSlug} onBack={() => setSelectedPostSlug('')} />
            ) : (
                <>
                    <ActiveBlog
                        key={refreshKey}
                        onCreateCategoryClick={openCreateCategory}
                        onCreatePostClick={openCreatePost}
                        onEditClick={openEditPost}
                        onDataStateChange={setHasActiveBlogData}
                        canManageBlog={canManageBlog}
                        onReadMoreClick={handleReadMore}
                    />
                    {!hasActiveBlogData && <DefaultBlog onCreateCategoryClick={openCreateCategory} onCreatePostClick={openCreatePost} canManageBlog={canManageBlog} />}
                </>
            )}
        </>
    );
}

function ReadPost({ linkk, onBack }) {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(Boolean(linkk));
    const [error, setError] = useState('');

    useEffect(() => {
        if (!linkk) {
            setPost(null);
            setLoading(false);
            setError('');
            return;
        }

        let isActive = true;
        const controller = new AbortController();

        const loadPost = async () => {
            setLoading(true);
            setError('');

            try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(`${BLOG_API_URL}/${encodeURIComponent(linkk)}`, { method: 'GET', signal: controller.signal, headers });
                if (!response.ok) {
                    throw new Error('Unable to load post.');
                }

                const json = await response.json().catch(() => null);
                const item = json?.data || json || null;
                if (!isActive) {
                    return;
                }

                if (!item) {
                    setPost(null);
                    setError('Post not found.');
                    return;
                }

                setPost({
                    id: item.id,
                    title: item.title || item.name || '',
                    slug: item.slug || '',
                    content: item.content || item.description || '',
                    excerpt: item.excerpt || buildExcerpt(item.content || item.description || ''),
                    image_url: resolveBlogImageUrl(item.image_url || item.image?.url || item.image?.path || item.image || item.cover_image_url || item.cover_image || ''),
                    category_name: item.category?.name || item.category_name || '',
                    name: item.name || '',
                    email: item.email || '',
                });
            } catch (loadError) {
                if (loadError?.name === 'AbortError') {
                    return;
                }
                if (isActive) {
                    setError(loadError.message || 'Unable to load post.');
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        loadPost();
        return () => {
            isActive = false;
            controller.abort();
        };
    }, [linkk]);

    if (!linkk) {
        return null;
    }

    return (
        <div className="blog-content">
            <div className="container">
                <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
                    Back to posts
                </button>
                {loading ? (
                    <p>Loading post...</p>
                ) : error ? (
                    <p className="form-status">{error}</p>
                ) : post ? (
                    <article className="blog-post read-post-card">
                        {post.image_url ? <img src={post.image_url} alt={post.title} /> : null}
                        <div className="blog-post-content">
                            {post.category_name ? <span className="blog-chip">{post.category_name}</span> : null}
                            <h2>{post.title}</h2>
                            <p className="blog-post-author">By {post.name || 'Anonymous'}</p>
                            <div className="read-post-content">{post.content}</div>
                        </div>
                    </article>
                ) : null}
            </div>
        </div>
    );
}

export default Blog;