import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Modal from "./homeModal";
import { auth } from "../../Authentication/auth.jsx";

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
      const endpoint = client?.id ? `${CLIENT_API_URL}/${client.id}` : CLIENT_API_URL;
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
                  <input type="hidden" name="id" value={client?.id || ""} />

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
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" alt="Microsoft" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" alt="Meta" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="Netflix" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png" alt="Tesla" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg" alt="Coca-Cola" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" alt="Nike" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" alt="Samsung" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Adobe_Corporate_Logo.png" alt="Adobe" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg" alt="IBM" />
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
          throw new Error("Failed to load clients");
        }

        const json = await response.json();
        const items = Array.isArray(json) ? json : json?.data || [];

        const validClients = items
          .filter((item) => item && (item.image_url || item.photo_url || item.photo || item.alt))
          .map((item) => ({
            id: item.id,
            photo_url: resolveClientImageUrl(item.image_url || item.photo_url || item.photo || ""),
            alt: item.alt || "Client",
          }));

        setClients(validClients);
        const has = validClients.length > 0;
        setHasData(has);
        onDataStateChange?.(has);
      } catch (error_){
        if (error_?.name === "AbortError") {
          return;
        }
        setError(error_.message || "Unable to load clients");
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
    return null;
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