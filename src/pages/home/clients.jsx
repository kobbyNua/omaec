import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Modal from "./homeModal";
import { auth } from "../../Authentication/auth.jsx";
import { extractResponseCollection } from "../../utils/apiResponse.js";

const CLIENT_API_URL = (() => {
  const rawUrl = import.meta.env.VITE_APP_URL?.trim() || "";
  if (!rawUrl) {
    console.warn("VITE_APP_URL is not defined. Falling back to /home_clients");
    return "/home_clients";
  }

  const base = rawUrl.replace(/\/+$/g, "");
  return `${base}/home_clients`;
})();

const CLIENT_API_ORIGIN = (() => {
  try {
    return new URL(CLIENT_API_URL).origin;
  } catch {
    return window.location.origin;
  }
})();

const resolveClientImageUrl = (src) => {
  if (!src) {
    return "";
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.includes("/var/www/html")) {
    return `${CLIENT_API_ORIGIN}${src.replace("/var/www/html", "")}`;
  }

  if (src.startsWith("/")) {
    return `${CLIENT_API_ORIGIN}${src}`;
  }

  return src;
};

const getClientId = (item) => item?.id ?? item?.client_id ?? item?.clientId ?? item?._id ?? item?.uuid ?? null;

const createClientSvgLogo = (label, bgColor, textColor = '#ffffff') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
      <rect width="240" height="120" fill="${bgColor}"/>
      <text x="50%" y="58%" text-anchor="middle" font-size="22" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${textColor}" dominant-baseline="middle">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const defaultClientLogos = [
  { name: 'Google', src: createClientSvgLogo('Google', '#f5f5f5', '#1f1f1f') },
  { name: 'Microsoft', src: createClientSvgLogo('Microsoft', '#e8f0fe', '#0f172a') },
  { name: 'Apple', src: createClientSvgLogo('Apple', '#111111', '#ffffff') },
  { name: 'Amazon', src: createClientSvgLogo('Amazon', '#f3f1e8', '#111111') },
  { name: 'Meta', src: createClientSvgLogo('Meta', '#e9f6ff', '#0f172a') },
  { name: 'Netflix', src: createClientSvgLogo('Netflix', '#111111', '#e50914') },
  { name: 'Tesla', src: createClientSvgLogo('Tesla', '#fef2f2', '#b91c1c') },
  { name: 'Coca-Cola', src: createClientSvgLogo('Coca-Cola', '#f7d7d7', '#9b1c1c') },
  { name: 'Nike', src: createClientSvgLogo('Nike', '#f3f4f6', '#111111') },
  { name: 'Samsung', src: createClientSvgLogo('Samsung', '#fef2f2', '#7f1d1d') },
  { name: 'Adobe', src: createClientSvgLogo('Adobe', '#fbe9e9', '#d14d4d') },
  { name: 'IBM', src: createClientSvgLogo('IBM', '#fef2f2', '#b91c1c') },
];

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

function CreateClientModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handlePhotoChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPhotoFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Creating client...");

    if (!photoFile) {
      setStatus("Please select a photo file.");
      return;
    }

    const formData = new FormData();
    formData.append("alt", alt.trim());
    if (photoFile) {
      formData.append("image_url", photoFile, photoFile.name);
      formData.append("photo_url", photoFile, photoFile.name);
    }

    const authToken = await getAuthorizationToken();
    const headers = {};
    if (authToken) {
      headers.Authorization = authToken;
    }

    try {
      const response = await fetch(CLIENT_API_URL, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || "Failed to create client.");
      }

      const successMessage = data?.message || "Client created successfully.";
      setStatus(successMessage);
      setPhotoFile(null);
      setPreviewUrl("");
      setAlt("");
      form.reset();
      if (data?.status === true) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setStatus(error.message || "Unable to create client.");
    }
  };

  return (
    <>
      {createPortal(
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="modal-dialog client-modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create Client</h2>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
                  <div className="client-modal-layout">
                    <div className="client-modal-form">
                      <div className="form-group">
                        <label htmlFor="client-photo">Photo</label>
                        <input
                          id="client-photo"
                          name="photo_url"
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="client-alt">Alt Text</label>
                        <input
                          id="client-alt"
                          name="alt"
                          type="text"
                          className="form-control"
                          value={alt}
                          onChange={(e) => setAlt(e.target.value)}
                          minLength={2}
                          required
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-block">
                        Save Client
                      </button>
                      {status && <p className="form-status">{status}</p>}
                    </div>

                    <div className="client-image-preview" aria-live="polite">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Client preview" />
                      ) : (
                        <div className="client-image-placeholder">
                          <i className="fas fa-image" aria-hidden="true" />
                          <span>Image preview will appear here</span>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
}

function EditClientModal({ isOpen, onClose, client }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!client) {
      setAlt("");
      setPhotoFile(null);
      return;
    }

    setAlt(client.alt || "");
  }, [client]);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("Saving client...");

    const formData = new FormData();
    formData.append("alt", alt.trim());
    if (photoFile) {
      formData.append("photo_url", photoFile, photoFile.name);
    }

    const authToken = await getAuthorizationToken();
    const headers = {};
    if (authToken) {
      headers.Authorization = authToken;
    }

    try {
      const clientId = getClientId(client);
      const endpoint = clientId ? `${CLIENT_API_URL}/${clientId}` : CLIENT_API_URL;
      const response = await fetch(endpoint, {
        method: "PUT",
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || "Failed to update client.");
      }

      const successMessage = data?.message || "Client updated successfully.";
      setStatus(successMessage);
      if (data?.status === true) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setStatus(error.message || "Unable to update client.");
    }
  };

  return (
    <>
      {createPortal(
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Client</h2>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
                  <input type="hidden" name="id" value={getClientId(client) || ""} />

                  <div className="form-group">
                    <label htmlFor="edit-client-photo">Photo</label>
                    <input
                      id="edit-client-photo"
                      name="photo_url"
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                    <small>Leave blank to keep the existing photo.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-client-alt">Alt Text</label>
                    <input
                      id="edit-client-alt"
                      name="alt"
                      type="text"
                      className="form-control"
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      minLength={2}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Update Client
                  </button>
                  {status && <p className="form-status">{status}</p>}
                </form>
              </div>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
}

function DefaultClients({ onCreateClick }) {
  return (
    <div className="clients">
      <div className="container">
        <h2>Our Clients</h2>
        <div className="client-logos">
          {defaultClientLogos.map((client) => (
            <img key={client.name} src={client.src} alt={client.name} />
          ))}
        </div>
      </div>
      {isLoggedIn() && (
        <button
          type="button"
          className="service-create-action btn btn-success service-create-action-round"
          onClick={onCreateClick}
          aria-label="Create Client"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ActiveClients({ onCreateClick, onEditClick, onDataStateChange }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasData, setHasData] = useState(false);
  const [rawJson, setRawJson] = useState(null);
  const [rawResponseText, setRawResponseText] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadClients = async () => {
      try {
        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
          headers.Authorization = authToken;
        }

        const response = await fetch(CLIENT_API_URL, {
          method: "GET",
          signal: controller.signal,
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText ? `${response.status} ${response.statusText}: ${errorText.slice(0, 200)}` : `${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || response.headers.get('Content-Type') || '';

        const text = await response.text();
        setRawResponseText(text);

        const extractAllJsonSegments = (txt) => {
          const results = [];
          if (!txt) return results;
          for (let i = 0; i < txt.length; i++) {
            const ch = txt[i];
            if (ch !== '{' && ch !== '[') continue;
            const opener = ch;
            const closer = opener === '{' ? '}' : ']';
            let depth = 0;
            for (let j = i; j < txt.length; j++) {
              const c = txt[j];
              if (c === opener) depth++;
              else if (c === closer) depth--;
              if (depth === 0) {
                const candidate = txt.slice(i, j + 1);
                try {
                  const parsed = JSON.parse(candidate);
                  results.push(parsed);
                  i = j;
                } catch (e) {
                  // ignore parse errors for this slice
                }
                break;
              }
            }
          }
          if (results.length === 0) {
            try { results.push(JSON.parse(txt)); } catch (e) {}
          }
          return results;
        };

        const candidates = extractAllJsonSegments(text);
        // JSON candidates parsed; debug logging removed
        const scoreCandidateForClients = (c) => {
          // prefer arrays/objects explicitly keyed as clients
          if (!c) return 0;
          try {
            const arr = extractResponseCollection(c, ['clients', 'home_clients', 'data']);
            if (!Array.isArray(arr) || arr.length === 0) return 0;
            const sample = arr[0] || {};
            let score = 0;
            if (c.clients || c.home_clients) score += 5;
            if (sample.photo_url || sample.image_url || sample.photo) score += 3;
            if (sample.alt) score += 2;
            // deprioritize items that look like banners/carousel (have title/subtitle)
            if (sample.title || sample.subtitle || sample.tagline) score -= 2;
            return score;
          } catch (e) {
            return 0;
          }
        };

        let selected = null;
        if (candidates.length === 1) selected = candidates[0];
        else if (candidates.length > 1) {
          let best = null; let bestScore = -Infinity;
          candidates.forEach((c) => {
            const s = scoreCandidateForClients(c);
            if (s > bestScore) { bestScore = s; best = c; }
          });
          selected = best || candidates[0];
        }

        // selected JSON candidate determined
        setRawJson(selected);
        const json = selected;

        if (!response.ok) {
          throw new Error("Failed to load clients");
        }

        const items = extractResponseCollection(json, ["clients", "home_clients"]);
        const altSource = Array.isArray(json) ? json : (json?.data || []);
        const sourceArray = items.length ? items : (Array.isArray(altSource) ? altSource : []);

        const validClients = sourceArray
          .filter((item) => item && (item.image_url || item.photo_url || item.photo || item.alt || item.title || item.subTitle || item.subtitle))
          .map((item) => ({
            id: getClientId(item),
            photo_url: resolveClientImageUrl(item.image_url || item.photo_url || item.photo || ""),
            alt: item.alt || item.title || item.subTitle || item.subtitle || "Client",
          }));

        setClients(validClients);
        const has = validClients.length > 0;
        setHasData(has);
        onDataStateChange?.(has);
      } catch (error_){
        if (error_?.name === "AbortError") {
          return;
        }
        console.warn('ActiveClients failed to load backend data:', error_?.message || error_);
        setError("");
        setHasData(false);
        onDataStateChange?.(false);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
    return () => controller.abort();
  }, [onDataStateChange]);

  if (!hasData && !loading) {
    return (
      <div className="clients-debug" style={{ padding: 12, background: '#fff6', border: '1px solid #ccc' }}>
        <strong>No active clients detected.</strong>
        <div style={{ marginTop: 8 }}>
          <em>Fetched response (truncated):</em>
          <pre style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{rawJson ? JSON.stringify(rawJson, null, 2) : (rawResponseText || 'no-json-captured')}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="clients">
      <div className="container">
        <h2>Our Clients</h2>
        {error && <p className="service-error">{error}</p>}
        <div className="client-logos">
          {clients.map((client) => (
            <div key={client.id} className="client-logo-item">
              <img src={client.photo_url} alt={client.alt} />
              {isLoggedIn() && (
                <button type="button" className="service-edit-btn client-logo-edit-btn" onClick={() => onEditClick(client)}>
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {isLoggedIn() && (
        <button
          type="button"
          className="service-create-action btn btn-success service-create-action-round"
          onClick={onCreateClick}
          aria-label="Create Client"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      )}
      {loading && <div className="service-loading">Loading clients...</div>}
    </div>
  );
}

function Clients() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeHasData, setActiveHasData] = useState(false);

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  return (
    <>
      <CreateClientModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <EditClientModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} client={selectedClient} />
      <ActiveClients
        onCreateClick={() => setIsCreateOpen(true)}
        onEditClick={handleEdit}
        onDataStateChange={setActiveHasData}
      />
      {!activeHasData && <DefaultClients onCreateClick={() => setIsCreateOpen(true)} />}
    </>
  );
}

export default Clients;