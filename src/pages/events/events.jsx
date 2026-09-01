import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./events.css";
import Banner from "../banner/banner";
import Modal from "./eventModal";
import { auth } from "../../Authentication/auth.jsx";import { extractResponseCollection } from '../../utils/apiResponse.js';
import { getBackendBase, normalizeAssetUrl } from '../../utils/backend.js';
const EVENT_API_BASE_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        console.warn("VITE_APP_URL is not defined. Falling back to /events");
        return "";
    }

    try {
        const parsedUrl = new URL(rawUrl, window.location.origin);
        return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/g, "")}`;
    } catch {
        return rawUrl.replace(/\/+$/g, "");
    }
})();

const EVENT_API_URL = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        console.warn("VITE_APP_URL is not defined. Falling back to /events");
        return "/events";
    }
    const base = rawUrl.replace(/\/+$/g, "");
    return `${base}/events`;
})();

const EVENT_BACKEND_ORIGIN = (() => {
    const rawUrl = getBackendBase();
    if (!rawUrl) {
        return window.location.origin;
    }

    try {
        const parsed = new URL(rawUrl, window.location.origin);
        return parsed.origin;
    } catch {
        return window.location.origin;
    }
})();

const isAdminLoggedIn = () => {
    const adminAuth = window.localStorage.getItem("admin-auth");
    return adminAuth === "true" || adminAuth === "google" || adminAuth === "firebase";
};

const isLoggedIn = () => {
    const userAuth = window.localStorage.getItem("user-auth");
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
            console.warn("Unable to get Firebase token:", error);
        }
    }

    const storedUser = window.localStorage.getItem("user-auth");
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
            console.warn("Unable to parse user-auth token:", error);
        }
    }

    return "";
};

const slugify = (value) => {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

const resolveEventImageUrl = (value) => normalizeAssetUrl(value || "") || "";

const canRenderStreamEmbed = (value) => {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return [
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be",
            "vimeo.com",
            "player.vimeo.com",
            "www.vimeo.com",
            "twitch.tv",
            "www.twitch.tv",
            "facebook.com",
            "www.facebook.com",
            "streamable.com",
            "www.streamable.com",
        ].includes(host);
    } catch {
        return false;
    }
};

const isValidUrl = (value) => {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const getEventStatusLabel = (value) => {
    if (value === "live") {
        return "Live";
    }

    if (value === "ended") {
        return "Ended";
    }

    return "Upcoming";
};

const toDateTimeLocalValue = (value) => {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return value.slice(0, 16);
        }

        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime())) {
            return new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
    }

    return "";
};

const toBackendValue = (value) => {
    if (value === null || value === undefined) {
        return "null";
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed || "null";
    }

    return String(value);
};

const formatEventDate = (value) => {
    if (!value) {
        return "TBD";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const DEFAULT_EVENTS = [
    {
        id: "default-live",
        title: "Annual Charity Gala",
        slug: "annual-charity-gala",
        description_body: "A full evening of community impact, networking, and live entertainment.",
        banner_image_url: "",
        registration_url: "https://example.com/register",
        live_stream_status: "live",
        live_stream_url: "",
        event_date: "",
        location: "Lagos Conference Hall",
    },
    {
        id: "default-upcoming",
        title: "Product Launch Summit",
        slug: "product-launch-summit",
        description_body: "Join us for an exclusive preview of our upcoming product experience.",
        banner_image_url: "",
        registration_url: "https://example.com/register",
        live_stream_status: "upcoming",
        live_stream_url: "",
        event_date: "",
        location: "Abuja Event Center",
    },
    {
        id: "default-ended",
        title: "Community Outreach Day",
        slug: "community-outreach-day",
        description_body: "A recap of our recent outreach and media engagement activities.",
        banner_image_url: "",
        registration_url: "",
        live_stream_status: "ended",
        live_stream_url: "",
        event_date: "",
        location: "Kano Community Grounds",
    },
];

function EventModal({ isOpen, onClose, title, submitLabel, initialValues = {}, onSuccess }) {
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        description_body: "",
        registration_url: "",
        live_stream_status: "upcoming",
        live_stream_url: "",
        event_date: "",
        location: "",
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState("");
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFormData({
            title: initialValues?.title || "",
            slug: initialValues?.slug || slugify(initialValues?.title || ""),
            description_body: initialValues?.description_body || "",
            registration_url: initialValues?.registration_url || "",
            live_stream_status: initialValues?.live_stream_status || "upcoming",
            live_stream_url: initialValues?.live_stream_url || "",
            event_date: toDateTimeLocalValue(initialValues?.event_date || ""),
            location: initialValues?.location || "",
        });
        setSelectedFile(null);
        setSelectedFileName(initialValues?.banner_image_url ? "Current banner image is attached" : "");
        setErrors({});
        setStatus("");
        setProcessing(false);
    }, [isOpen, initialValues?.id]);

    const validateForm = () => {
        const nextErrors = {};

        if (!formData.title?.trim()) {
            nextErrors.title = "Title is required.";
        }

        if (formData.registration_url?.trim() && !isValidUrl(formData.registration_url)) {
            nextErrors.registration_url = "Please enter a valid URL.";
        }

        if (formData.live_stream_url?.trim() && !isValidUrl(formData.live_stream_url)) {
            nextErrors.live_stream_url = "Please enter a valid URL.";
        }

        if (!formData.description_body?.trim()) {
            nextErrors.description_body = "Description is required.";
        }

        return nextErrors;
    };

    const handleFieldChange = (event) => {
        const { name, value } = event.target;

        if (name === "title") {
            setFormData((previous) => ({
                ...previous,
                title: value,
                slug: slugify(value),
            }));
        } else {
            setFormData((previous) => ({ ...previous, [name]: value }));
        }

        setErrors((previous) => ({ ...previous, [name]: "" }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setSelectedFileName(file?.name || "");
        setErrors((previous) => ({ ...previous, banner_image_url: "" }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setProcessing(true);
        setStatus(initialValues?.id ? "Saving event..." : "Creating event...");

        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
            headers.Authorization = authToken;
        }

        const payload = new FormData();
        const title = formData.title?.trim();
        const description = formData.description_body?.trim();

        if (title) {
            payload.append("title", title);
        }
        if (formData.slug?.trim()) {
            payload.append("slug", formData.slug.trim());
        }
        if (selectedFile) {
            payload.append("banner_image_url", selectedFile, selectedFile.name);
        } else if (initialValues?.banner_image_url) {
            payload.append("banner_image_url", initialValues.banner_image_url);
        }
        payload.append("registration_url", toBackendValue(formData.registration_url));
        payload.append("live_stream_status", formData.live_stream_status || "upcoming");
        payload.append("live_stream_url", toBackendValue(formData.live_stream_url));
        payload.append("event_date", toBackendValue(formData.event_date));
        payload.append("location", toBackendValue(formData.location));
        if (description) {
            payload.append("description_body", description);
        } else {
            payload.append("description_body", "null");
        }
        if (initialValues?.id) {
            payload.append("id", String(initialValues.id));
        }

        try {
                const endpoint = initialValues?.id ? `${EVENT_API_URL}/${initialValues.id}` : EVENT_API_URL;
                console.debug('Submitting event to', endpoint);
                const response = await fetch(endpoint, {
                    method: initialValues?.id ? "PUT" : "POST",
                    headers,
                    body: payload,
                });

                const text = await response.text().catch(() => null);
                let data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (e) {
                    // not JSON
                }

                if (!response.ok || data?.status === false) {
                    console.error('Event save failed', { status: response.status, statusText: response.statusText, body: text, parsed: data });
                    throw new Error(data?.message || `Unable to save event. (${response.status})`);
                }

                setStatus(data?.message || (initialValues?.id ? "Event updated successfully." : "Event created successfully."));
                onSuccess?.();
                setTimeout(() => onClose?.(), 300);
        } catch (error) {
            setStatus(error.message || "Unable to save event.");
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
                <button type="button" className="close-button" onClick={onClose} aria-label="Close form">
                    <i className="fas fa-times" aria-hidden="true" />
                </button>
            </div>
            <div className="modal-body">
                <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
                    <input type="hidden" name="id" value={initialValues?.id || ""} />

                    <div className="event-form-grid">
                        <div className="form-group">
                            <label htmlFor="event-title">Title</label>
                            <input
                                id="event-title"
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
                            <label htmlFor="event-slug">Slug</label>
                            <input
                                id="event-slug"
                                name="slug"
                                type="text"
                                className="form-control"
                                value={formData.slug}
                                onChange={handleFieldChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="event-date">Event Date</label>
                            <input
                                id="event-date"
                                name="event_date"
                                type="datetime-local"
                                className="form-control"
                                value={formData.event_date}
                                onChange={handleFieldChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="event-location">Location</label>
                            <input
                                id="event-location"
                                name="location"
                                type="text"
                                className="form-control"
                                value={formData.location}
                                onChange={handleFieldChange}
                                placeholder="Event venue or address"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="event-registration-url">Registration URL</label>
                            <input
                                id="event-registration-url"
                                name="registration_url"
                                type="url"
                                className="form-control"
                                value={formData.registration_url}
                                onChange={handleFieldChange}
                                placeholder="https://example.com/register"
                            />
                            {errors.registration_url && <p className="form-error">{errors.registration_url}</p>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="event-live-status">Live Stream Status</label>
                            <select
                                id="event-live-status"
                                name="live_stream_status"
                                className="form-control"
                                value={formData.live_stream_status}
                                onChange={handleFieldChange}
                            >
                                <option value="ended">Ended</option>
                                <option value="upcoming">Upcoming</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="event-live-url">Live Stream URL</label>
                            <input
                                id="event-live-url"
                                name="live_stream_url"
                                type="url"
                                className="form-control"
                                value={formData.live_stream_url}
                                onChange={handleFieldChange}
                                placeholder="https://example.com/live"
                            />
                            {errors.live_stream_url && <p className="form-error">{errors.live_stream_url}</p>}
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="event-banner">Banner Image File</label>
                            <div className="event-file-picker">
                                <input
                                    id="event-banner"
                                    name="banner_image_url"
                                    type="file"
                                    className="event-file-input"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <span className="event-file-name">
                                    {selectedFileName || (initialValues?.banner_image_url ? "Current banner image is attached" : "No file selected")}
                                </span>
                            </div>
                            <small className="form-hint">Choose an image file to upload as the event banner.</small>
                            {errors.banner_image_url && <p className="form-error">{errors.banner_image_url}</p>}
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="event-description">Description</label>
                            <textarea
                                id="event-description"
                                name="description_body"
                                className="form-control event-description-textarea"
                                value={formData.description_body}
                                onChange={handleFieldChange}
                                rows={8}
                                required
                            />
                            {errors.description_body && <p className="form-error">{errors.description_body}</p>}
                        </div>
                    </div>

                    <button type="submit" className="event-submit-button" disabled={processing}>
                        {processing ? "Saving..." : submitLabel}
                    </button>
                    {status && <p className="form-status">{status}</p>}
                </form>
            </div>
        </Modal>
    );
}



function RecentEventsSection({ events }) {
    const recentEvents = [...events].filter((event) => event.live_stream_status === "ended");

    return (
        <div className="recents-events">
            <div className="container">
                <div className="recent-events-content recents-events-content">
                    <h3>Recent Events Coverage</h3>
                    <p>Check out our recent events coverage showcasing our expertise in event media services.</p>
                    <div className="recent-events-gallery">
                        {recentEvents.length > 0 ? (
                            recentEvents.map((event) => {
                                const storyLink = `/events-story?story=${encodeURIComponent(event.slug || event.id)}`;
                                return (
                                    <Link className="event-photo-item" to={storyLink} key={event.id} aria-label={`Read more about ${event.title}`}>
                                        <img
                                            src={resolveEventImageUrl(event.banner_image_url) || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"}
                                            alt={event.title}
                                        />
                                        <div className="event-overlay">
                                            <div className="event-overlay-inner">
                                                <h4>{event.title}</h4>
                                                <p>{event.location || "Event coverage"}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <p className="events-empty-state">No recent events yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EventsPageShell({ featuredEvent, events, onCreateClick, onEditClick, variant = "default" }) {
    const liveEvents = [...events]
        .filter((event) => event.live_stream_status === "live")
        .sort((a, b) => {
            const aDate = new Date(a.event_date || 0).getTime();
            const bDate = new Date(b.event_date || 0).getTime();
            if (aDate !== bDate) return aDate - bDate;
            return String(a.id).localeCompare(String(b.id));
        });
    const upcomingEvents = [...events]
        .filter((event) => event.live_stream_status === "upcoming")
        .reverse()
        .slice(0, 6);
    const previewEvent = featuredEvent || liveEvents[0] || null;
    const isActiveView = variant === "active";
    const canManageContent = isLoggedIn();

    return (
        <>
            <Banner>
                <h2>Events</h2>
                <h5>Stay updated with our latest events and happenings.</h5>
            </Banner>

            <div className="events-content">
                <div className="container">
                    {canManageContent && (
                        <div className="events-header-row">
                            <button type="button" className="event-fab-button event-add-button" onClick={onCreateClick} aria-label="Create Event">
                                <i className="fas fa-plus" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    <div className="events">
                        <div className="live-events-streaming">
                            <h3>{isActiveView ? "Event Highlights" : "Live Streaming"}</h3>
                            {previewEvent ? (
                                <div className="event-featured-card">
                                    {canManageContent && (
                                        <button
                                            type="button"
                                            className="event-edit-button event-edit-button-live"
                                            onClick={() => onEditClick?.(previewEvent)}
                                            aria-label={`Edit ${previewEvent.title}`}
                                        >
                                            <i className="fas fa-edit" aria-hidden="true" />
                                        </button>
                                    )}
                                    {previewEvent.live_stream_status === "live" && previewEvent.live_stream_url && canRenderStreamEmbed(previewEvent.live_stream_url) ? (
                                        <div className="event-media-preview">
                                            <iframe
                                                src={previewEvent.live_stream_url}
                                                title={previewEvent.title}
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : (
                                        <div className="event-media-preview event-media-preview-image-only">
                                            <img
                                                src={resolveEventImageUrl(previewEvent.banner_image_url) || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"}
                                                alt={previewEvent.title}
                                                className="event-media-image"
                                            />
                                        </div>
                                    )}
                                    <div className="event-brief-info event-brief-info-live">
                                        <h4>{previewEvent.title}</h4>
                                        {isActiveView ? (
                                            <>
                                                <p>{previewEvent.description_body || "More details coming soon."}</p>
                                                <p>Date: {formatEventDate(previewEvent.event_date)}</p>
                                                <p>Location: {previewEvent.location || "To be announced"}</p>
                                                {previewEvent.registration_url && (
                                                    <a href={previewEvent.registration_url} target="_blank" rel="noreferrer">
                                                        Register now
                                                    </a>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="event-live-caption">Live now</p>
                                                {previewEvent.registration_url && (
                                                    <a href={previewEvent.registration_url} target="_blank" rel="noreferrer">
                                                        Register now
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p>No live events are currently available.</p>
                            )}
                        </div>

                        <div className="upcoming-events-list">
                            <h3>Upcoming Events</h3>
                            {upcomingEvents.length > 0 ? (
                                upcomingEvents.map((event) => {
                                    const storyLink = `/events-story?story=${encodeURIComponent(event.slug || event.id)}`;
                                    const statusLabel = getEventStatusLabel(event.live_stream_status);
                                    return (
                                        <div className="event-item" key={event.id}>
                                            <div className="event-item-image-wrap">
                                                <img
                                                    src={resolveEventImageUrl(event.banner_image_url) || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"}
                                                    alt={event.title}
                                                />
                                            </div>
                                            <div className="event-brief-info">
                                                <h4>{event.title}</h4>
                                                <p>Date: {formatEventDate(event.event_date)}</p>
                                                <p>Location: {event.location || "To be announced"}</p>
                                                <div className="event-item-actions">
                                                    <Link to={storyLink} className="event-status-link">{statusLabel}</Link>
                                                    <Link to={storyLink} className="event-read-more-link">Read more</Link>
                                                </div>
                                            </div>
                                            {canManageContent && (
                                                <button type="button" className="event-edit-button" onClick={() => onEditClick?.(event)} aria-label={`Edit ${event.title}`}>
                                                    <i className="fas fa-edit" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p>No upcoming events yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <RecentEventsSection events={events} />
        </>
    );
}

function DefaultEventsPage({ events, onCreateClick, onEditClick }) {
    return <EventsPageShell featuredEvent={null} events={events} onCreateClick={onCreateClick} onEditClick={onEditClick} variant="default" />;
}

function ActiveEventPage({ event, events, onCreateClick, onEditClick }) {
    return <EventsPageShell featuredEvent={event} events={events} onCreateClick={onCreateClick} onEditClick={onEditClick} variant="active" />;
}

function Events() {
    const { slug } = useParams();
    const [events, setEvents] = useState(DEFAULT_EVENTS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [usingFallbackEvents, setUsingFallbackEvents] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const loadEvents = async () => {
            try {
                setLoading(true);
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

                const response = await fetch(EVENT_API_URL, {
                    method: "GET",
                    signal: controller.signal,
                    headers,
                });

                if (!response.ok) {
                    throw new Error("Failed to load events.");
                }

                const json = await response.json();
                const items = extractResponseCollection(json, ['events']);
                const validEvents = items
                    .filter((item) => item && (item.title || item.slug || item.description_body || item.banner_image_url || item.live_stream_status))
                    .map((item) => ({
                        id: item.id,
                        title: item.title || item.name || "Untitled Event",
                        slug: item.slug || slugify(item.title || item.name || ""),
                        description_body: item.description_body || item.description || "",
                        banner_image_url: item.banner_image_url || item.image_url || item.image || "",
                        registration_url: item.registration_url || "",
                        live_stream_status: item.live_stream_status || "upcoming",
                        live_stream_url: item.live_stream_url || "",
                        event_date: item.event_date || "",
                        location: item.location || "",
                    }));

                if (validEvents.length > 0) {
                    setEvents(validEvents);
                    setUsingFallbackEvents(false);
                } else {
                    setEvents(DEFAULT_EVENTS);
                    setUsingFallbackEvents(true);
                }
                setError("");
            } catch (loadError) {
                if (loadError?.name === "AbortError") {
                    return;
                }
                setEvents(DEFAULT_EVENTS);
                setUsingFallbackEvents(true);
                setError(loadError.message || "Unable to load events.");
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
        return () => controller.abort();
    }, [refreshKey]);

    const handleOpenCreateModal = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const activeEvent = events.find((event) => event.slug === slug || String(event.id) === slug) || null;

    if (loading && events.length === 0) {
        return (
            <>
                <Banner>
                    <h2>Events</h2>
                    <h5>Stay updated with our latest events and happenings.</h5>
                </Banner>
                <div className="events-loading">Loading events...</div>
            </>
        );
    }

    return (
        <>
            {slug && activeEvent && !usingFallbackEvents ? (
                <ActiveEventPage event={activeEvent} events={events} onCreateClick={handleOpenCreateModal} onEditClick={handleOpenEditModal} />
            ) : (
                <DefaultEventsPage events={events} onCreateClick={handleOpenCreateModal} onEditClick={handleOpenEditModal} />
            )}

            {error && <p className="events-error">{error}</p>}

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedEvent ? "Edit Event" : "Create Event"}
                submitLabel={selectedEvent ? "Update Event" : "Create Event"}
                initialValues={selectedEvent || {}}
                onSuccess={handleModalSuccess}
            />
        </>
    );
}

export default Events;