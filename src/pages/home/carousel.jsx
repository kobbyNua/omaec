import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./homeModal"; 
import { auth } from "../../Authentication/auth";import { extractResponseCollection } from "../../utils/apiResponse.js";
//add carousel modal
function AddCarouselModal(){
     
    return (
          <>
             <div className="modal">
                  <div className="modal-content">
                       <div className="modal-header"></div>
                       <div className="modal-body"></div>
                       <div className="modal-footer"></div>
                  </div>
             </div>
          </>
    )

}

const isAdminLoggedIn = () => {
    const adminAuth = window.localStorage.getItem('admin-auth');
    return adminAuth === 'true' || adminAuth === 'google' || adminAuth === 'firebase';
};

const isLoggedIn = () => {
    const userAuth = window.localStorage.getItem('user-auth');
    return Boolean(userAuth) || isAdminLoggedIn();
};

const BACKEND_API_URL = (() => {
    const rawUrl = import.meta.env.VITE_APP_URL?.trim() || '';
    if (!rawUrl) {
        console.warn('VITE_APP_URL is not defined. Active carousel backend calls may fail.');
        return '';
    }

    const cleaned = rawUrl.replace(/\/+$/, '');
    const malformedMatch = cleaned.match(/^(https?:\/\/[^/:]+):(\d+):\d+(\/.*)?$/);
    if (malformedMatch) {
        const host = malformedMatch[1];
        const port = malformedMatch[2];
        const path = malformedMatch[3] || '';
        return `${host}:${port}${path}`;
    }
    
    return cleaned;
})();

const BACKEND_API_ORIGIN = (() => {
    try {
        return new URL(BACKEND_API_URL).origin;
    } catch {
        return window.location.origin;
    }
})();

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

function CreateCarouselModal({ isOpen: isOpenProp, onOpen, onClose, hideTrigger = false }){
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl("");
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('Saving banner...');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        if (imageFile) {
            formData.append('image_url', imageFile, imageFile.name);
        }

        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
            headers.Authorization = authToken;
        }

        const response = await fetch(`${BACKEND_API_URL}/home`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (response.ok) {
            setStatus('Banner created successfully.');
            setTitle('');
            setSubtitle('');
            setImageFile(null);
            setPreviewUrl('');
        } else {
            const data = await response.json().catch(() => null);
            setStatus(data?.message || 'Failed to create banner.');
        }
    };

    useEffect(() => {
        if (typeof isOpenProp === 'boolean') {
            setIsOpen(isOpenProp);
        }
    }, [isOpenProp]);

    if (!isLoggedIn()) {
        return null;
    }

    const openModal = () => {
        if (onOpen) {
            onOpen();
        } else {
            setIsOpen(true);
        }
    };

    const closeModal = () => {
        if (onClose) {
            onClose();
        }
        setIsOpen(false);
    };

    const modalIsOpen = typeof isOpenProp === 'boolean' ? isOpenProp : isOpen;

    return (
        <>
            {!hideTrigger && (
                <button type="button" onClick={openModal} className="carousel-open-btn">
                    Create Carousel Banner
                </button>
            )}
            {createPortal(
                <Modal isOpen={modalIsOpen} onClose={closeModal}>
                    <div className="carousel-modal-grid">
                        <div className="carousel-form-column">
                            <h3>Create Carousel Banner</h3>
                            <form onSubmit={handleSubmit} className="carousel-form" encType="multipart/form-data">
                                <label htmlFor="banner-title">Title</label>
                                <input
                                    id="banner-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter banner title"
                                    required
                                />

                                <label htmlFor="banner-image">Image URL / Upload</label>
                                <input
                                    id="banner-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    required
                                />

                                <label htmlFor="banner-subtitle">Subtitle</label>
                                <textarea
                                    id="banner-subtitle"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="Enter banner subtitle"
                                    rows={4}
                                    required
                                />

                                <button type="submit" className="carousel-submit-btn">
                                    Create Banner
                                </button>
                                {status && <p className="form-status">{status}</p>}
                            </form>
                        </div>

                        <div className="carousel-preview-column">
                            <h4>Preview</h4>
                            <div className="carousel-preview-grid">
                                <div className="carousel-preview-card">
                                    <div className="banner-preview-image">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Banner preview" />
                                        ) : (
                                            <div className="preview-empty">Select an image to preview</div>
                                        )}
                                    </div>
                                </div>
                                <div className="carousel-preview-card">
                                    <div className="banner-preview-image">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Banner preview" />
                                        ) : (
                                            <div className="preview-empty">Select an image to preview</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>,
                document.body
            )}
        </>
    );
}
//edit carousel modal
function Editcarouselmodal({ isOpen: isOpenProp, onOpen, onClose, hideTrigger = false }){
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (typeof isOpenProp === 'boolean') {
            setIsOpen(isOpenProp);
        }
    }, [isOpenProp]);

    if (!isLoggedIn()) {
        return null;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('Saving changes...');

        const authToken = await getAuthorizationToken();
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers.Authorization = authToken;
        }

        const response = await fetch(`${BACKEND_API_URL}/home`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ title, subtitle }),
        });

        if (response.ok) {
            setStatus('Banner updated successfully.');
        } else {
            const data = await response.json().catch(() => null);
            setStatus(data?.message || 'Failed to update banner.');
        }
    };

    const openModal = () => {
        if (onOpen) {
            onOpen();
        } else {
            setIsOpen(true);
        }
    };

    const closeModal = () => {
        if (onClose) {
            onClose();
        }
        setIsOpen(false);
    };

    const modalIsOpen = typeof isOpenProp === 'boolean' ? isOpenProp : isOpen;

    return (
        <>
            {!hideTrigger && (
                <button type="button" onClick={openModal} className="carousel-open-btn">
                    Edit Carousel Banner
                </button>
            )}
            {createPortal(
                <Modal isOpen={modalIsOpen} onClose={closeModal}>
                    <div className="carousel-form-column">
                        <h3>Edit Carousel Banner</h3>
                        <form onSubmit={handleSubmit} className="carousel-form">
                            <label htmlFor="edit-banner-title">Title</label>
                            <input
                                id="edit-banner-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter banner title"
                                required
                            />

                            <label htmlFor="edit-banner-subtitle">Subtitle</label>
                            <textarea
                                id="edit-banner-subtitle"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="Enter banner subtitle"
                                rows={4}
                                required
                            />

                            <button type="submit" className="carousel-submit-btn">
                                Save Changes
                            </button>
                            {status && <p className="form-status">{status}</p>}
                        </form>
                    </div>
                </Modal>,
                document.body
            )}
        </>
    );
}



function ActiveCarousel({ onCreateClick, onEditClick, onDataStateChange }){
     /*
       Active carousel replicates the default layout but loads data from backend.
     */
     const [activeIndex, setActiveIndex] = useState(0);
     const [slides, setSlides] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState("");
     const [hasData, setHasData] = useState(false);
    const [rawJson, setRawJson] = useState(null);
    const [rawResponseText, setRawResponseText] = useState('');

     useEffect(() => {
         const controller = new AbortController();
        let isMounted = true;

        const loadSlides = async () => {
             try {
                const authToken = await getAuthorizationToken();
                const headers = {};
                if (authToken) {
                    headers.Authorization = authToken;
                }

               const response = await fetch(`${BACKEND_API_URL}/home`, {
                   method: 'GET',
                   signal: controller.signal,
                   headers,
               });
                 if (!response.ok) {
                     throw new Error('Failed to load carousel data');
                 }

                    const contentType = response.headers.get('content-type') || response.headers.get('Content-Type') || '';

                    const text = await response.text();
                    setRawResponseText(text);

                    const parsePossiblyConcatenatedJSON = (txt) => {
                        if (!txt) return null;
                        try { return JSON.parse(txt); } catch (e) {}

                        const firstObj = txt.indexOf('{');
                        const firstArr = txt.indexOf('[');
                        const start = (firstObj === -1) ? firstArr : (firstArr === -1 ? firstObj : Math.min(firstObj, firstArr));
                        if (start === -1) return null;
                        const opener = txt[start];
                        const closer = opener === '{' ? '}' : ']';
                        let depth = 0;
                        for (let i = start; i < txt.length; i++) {
                            const ch = txt[i];
                            if (ch === opener) depth++;
                            else if (ch === closer) depth--;
                            if (depth === 0) {
                                const candidate = txt.slice(start, i + 1);
                                try { return JSON.parse(candidate); } catch (err) {
                                    // continue searching
                                }
                            }
                        }

                        // final fallback: try extract between first { and last }
                        const lastObjEnd = txt.lastIndexOf('}');
                        if (firstObj !== -1 && lastObjEnd > firstObj) {
                            try { return JSON.parse(txt.slice(firstObj, lastObjEnd + 1)); } catch (err) {}
                        }

                        return null;
                    };

                    const json = parsePossiblyConcatenatedJSON(text);
                    if (!json) console.warn('ActiveCarousel: response text not valid JSON or could not extract JSON');
                    setRawJson(json);
                    const items = extractResponseCollection(json, ["home", "slides", "banners"]);

                if (items.length > 0) {
                    const parsedSlides = items
                        .filter((it) => Number(it.is_active) === 1 || it.is_active === true)
                        .map((item, index) => {
                            let src = item.image_url || item.image || item.src || item.url || item.picture || '';
                            if (src && !src.startsWith('http')) {
                                if (src.includes('/var/www/html')) {
                                    src = `${BACKEND_API_ORIGIN}${src.replace('/var/www/html', '')}`;
                                } else if (src.startsWith('/')) {
                                    src = `${BACKEND_API_ORIGIN}${src}`;
                                }
                            }

                            return {
                                src,
                                title: item.title || item.tagline || '',
                                subtitle: item.subTitle || item.subtitle || '',
                                alt: item.title || item.subTitle || item.subtitle || `Carousel slide ${index + 1}`,
                            };
                        })
                        .filter((s) => Boolean(s.src));

                    if (isMounted) {
                        console.debug('ActiveCarousel: parsedSlides count:', parsedSlides.length, parsedSlides);
                        // If parsing yielded no slides but the backend returned something useful,
                        // try a fallback using the raw JSON in case the response shape differs.
                        if (parsedSlides.length === 0) {
                            const altSource = Array.isArray(json)
                                ? json
                                : (json?.data || json?.home || json?.slides || json?.banners || []);
                            if (Array.isArray(altSource) && altSource.length > 0) {
                                const altParsed = altSource
                                    .map((item, index) => ({
                                        src: item.image_url || item.image || item.src || item.url || item.picture || '',
                                        title: item.title || item.tagline || '',
                                        subtitle: item.subTitle || item.subtitle || '',
                                        alt: item.title || item.subTitle || item.subtitle || `Carousel slide ${index + 1}`,
                                    }))
                                    .filter((s) => Boolean(s.src));
                                if (altParsed.length > 0) {
                                    setSlides(altParsed);
                                    setHasData(true);
                                    if (typeof onDataStateChange === 'function') onDataStateChange(true);
                                } else {
                                    setSlides([]);
                                    setHasData(false);
                                    if (typeof onDataStateChange === 'function') onDataStateChange(false);
                                }
                            } else {
                                setSlides([]);
                                setHasData(false);
                                if (typeof onDataStateChange === 'function') onDataStateChange(false);
                            }
                        } else {
                            setSlides(parsedSlides);
                            const has = parsedSlides.length > 0;
                            setHasData(has);
                            if (typeof onDataStateChange === 'function') onDataStateChange(has);
                        }
                    }
                } else {
                    if (isMounted) {
                        setHasData(false);
                        if (typeof onDataStateChange === 'function') onDataStateChange(false);
                    }
                    }
            } catch (error_) {
                // Ignore abort errors (triggered by controller.abort() on unmount)
                if (error_ && error_.name === 'AbortError') {
                    return;
                }

                if (isMounted) {
                    setError(error_.message || 'Unable to load slides');
                    setHasData(false);
                    if (typeof onDataStateChange === 'function') onDataStateChange(false);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
         };

         loadSlides();
         return () => {
             isMounted = false;
             controller.abort();
         };
     }, []);

     useEffect(() => {
         if (slides.length === 0) {
             return;
         }

         const interval = setInterval(() => {
             setActiveIndex((prevIndex) => (prevIndex + 1) % slides.length);
         }, 5000); // Change slide every 5 seconds

         return () => clearInterval(interval);
     }, [slides.length]);

     const goToSlide = (index) => {
         setActiveIndex(index);
     };

    const handleAddClick = () => {
        if (isLoggedIn()) {
            onCreateClick?.();
        } else {
            console.warn('Create carousel banner requires sign-in.');
        }
    };

    const handleEditClick = () => {
        if (isLoggedIn()) {
            onEditClick?.();
        } else {
            console.warn('Edit carousel banner requires sign-in.');
        }
    };

            if (!hasData && !loading) {
        return (
            <div className="carousel-debug" style={{ padding: 12, background: '#fff6', border: '1px solid #ccc' }}>
                <strong>No active carousel slides detected.</strong>
                <div style={{ marginTop: 8 }}>
                    <em>Fetched response (truncated):</em>
                            <pre style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{rawJson ? JSON.stringify(rawJson, null, 2) : (rawResponseText || 'no-json-captured')}</pre>
                </div>
            </div>
        );
    }

    return (<>
           
        <div className="carousel">

              {slides.map((slide, index) => (
                  <div key={`${slide.src}-${index}`} className={`carousel-item ${activeIndex === index ? "active" : ""}`}>
                      <img src={slide.src} alt={slide.alt} />
                      <div className="carousel-caption">
                          {slide.title && <h2>{slide.title}</h2>}
                          {slide.subtitle && <p>{slide.subtitle}</p>}
                      </div>
                  </div>
              ))}

           <div className="carousel-indicators">
                         {slides.map((_, index) => (
                     <button 
                         key={index}
                         type="button"
                         onClick={() => goToSlide(index)}
                         className={ activeIndex === index ? "active" : ""}
                     ></button>
                 ))}
           </div>

           {isAdminLoggedIn() && (
               <button type="button" className="carousel-add-button" onClick={handleAddClick} aria-label="Create carousel banner">
                   +
               </button>
           )}

           {isLoggedIn() && (
               <button type="button" className="carousel-edit-button" onClick={handleEditClick} aria-label="Edit carousel banner">
                   Edit
               </button>
           )}

           {loading && <div className="carousel-loading">Loading carousel...</div>}
           {error && <div className="carousel-error">{error}</div>}
        </div>

    </>);
}

function DefaultCarousel({ onCreateClick }){
    const [activeIndex, setActiveIndex] = useState(0);
    const slides = [
        { src: 'https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=1200&q=80', alt: 'Modern workspace' },
        { src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', alt: 'Team meeting' },
        { src: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1200&q=80', alt: 'Desk setup' },
    ];

    useEffect(() => {
        const id = setInterval(() => setActiveIndex((i) => (i + 1) % slides.length), 5000);
        return () => clearInterval(id);
    }, [slides.length]);

    const goTo = (i) => setActiveIndex(i);

    return (
        <div className="carousel">
            {slides.map((s, idx) => (
                <div key={s.src} className={`carousel-item ${activeIndex === idx ? 'active' : ''}`}>
                    <img src={s.src} alt={s.alt} />
                </div>
            ))}

            <div className="carousel-indicators">
                {slides.map((_, i) => (
                    <button key={i} type="button" onClick={() => goTo(i)} className={activeIndex === i ? 'active' : ''}></button>
                ))}
            </div>
            {isLoggedIn() && (
                <button type="button" className="carousel-add-button" onClick={() => onCreateClick?.()} aria-label="Create carousel banner">
                    +
                </button>
            )}
        </div>
    );
}



function Carousels(){
      
       const [isCreateOpen, setIsCreateOpen] = useState(false);
       const [isEditOpen, setIsEditOpen] = useState(false);
       const [activeHasData, setActiveHasData] = useState(false);

       return (
              <>
                 <CreateCarouselModal
                     isOpen={isCreateOpen}
                     onOpen={() => setIsCreateOpen(true)}
                     onClose={() => setIsCreateOpen(false)}
                     hideTrigger
                 />
                 <Editcarouselmodal
                     isOpen={isEditOpen}
                     onOpen={() => setIsEditOpen(true)}
                     onClose={() => setIsEditOpen(false)}
                     hideTrigger
                 />
                 <ActiveCarousel
                     onCreateClick={() => setIsCreateOpen(true)}
                     onEditClick={() => setIsEditOpen(true)}
                     onDataStateChange={(v) => setActiveHasData(v)}
                 />
                 {!activeHasData && <DefaultCarousel onCreateClick={() => setIsCreateOpen(true)} />}
              </>

       );
}




export default Carousels;