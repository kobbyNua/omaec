import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Modal from "./homeModal";
import { auth } from "../../Authentication/auth.jsx";
import { extractResponseCollection } from "../../utils/apiResponse.js";

const SERVICE_API_URL = (() => {
  const rawUrl = import.meta.env.VITE_APP_URL?.trim() || "";
  // If VITE_APP_URL isn't provided fall back to a relative endpoint.
  if (!rawUrl) {
    console.warn('VITE_APP_URL is not defined. Falling back to /home_services');
    return "/home_services";
  }
  const base = rawUrl.replace(/\/+$/g, "");
  console.log(`Using SERVICE_API_URL: ${base}/home_services`);
  return `${base}/home_services`;
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

function CreateServiceModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [iconValue, setIconValue] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Creating service...');

    const authToken = await getAuthorizationToken();
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = authToken;
    }

    try {
      const response = await fetch(SERVICE_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          icon_value: iconValue,
          short_description: shortDescription,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || 'Failed to create service.');
      }

      const successMessage = data?.message || 'Service created successfully.';
      setStatus(successMessage);
      setTitle('');
      setIconValue('');
      setShortDescription('');
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      setStatus(error.message || 'Unable to create service.');
    }
  };

  return (
    <>
      {createPortal(
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create Service</h2>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="service-title">Title</label>
                    <input
                      id="service-title"
                      name="title"
                      type="text"
                      className="form-control"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      minLength={3}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="service-icon">Icon Value</label>
                    <input
                      id="service-icon"
                      name="icon_value"
                      type="text"
                      className="form-control"
                      value={iconValue}
                      onChange={(e) => setIconValue(e.target.value)}
                      placeholder="e.g. fas fa-bullhorn"
                      minLength={3}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="service-description">Short Description</label>
                    <textarea
                      id="service-description"
                      name="short_description"
                      className="form-control"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      rows={4}
                      minLength={10}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Save Service
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

function EditServiceModal({ isOpen, onClose, service }) {
  const [title, setTitle] = useState('');
  const [iconValue, setIconValue] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!service) {
      setTitle('');
      setIconValue('');
      setShortDescription('');
      return;
    }

    setTitle(service.title || '');
    setIconValue(service.icon_value || '');
    setShortDescription(service.short_description || '');
  }, [service]);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Saving service...');

    const authToken = await getAuthorizationToken();
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = authToken;
    }

    try {
      const endpoint = service?.id ? `${SERVICE_API_URL}/${service.id}` : SERVICE_API_URL;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: service?.id,
          title,
          icon_value: iconValue,
          short_description: shortDescription,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || 'Failed to update service.');
      }

      const successMessage = data?.message || 'Service updated successfully.';
      setStatus(successMessage);
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      setStatus(error.message || 'Unable to update service.');
    }
  };

  return (
    <>
      {createPortal(
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Service</h2>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} noValidate>
                  <input type="hidden" name="id" value={service?.id || ''} />

                  <div className="form-group">
                    <label htmlFor="edit-service-title">Title</label>
                    <input
                      id="edit-service-title"
                      name="title"
                      type="text"
                      className="form-control"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      minLength={3}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-service-icon">Icon Value</label>
                    <input
                      id="edit-service-icon"
                      name="icon_value"
                      type="text"
                      className="form-control"
                      value={iconValue}
                      onChange={(e) => setIconValue(e.target.value)}
                      placeholder="e.g. fas fa-bullhorn"
                      minLength={3}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-service-description">Short Description</label>
                    <textarea
                      id="edit-service-description"
                      name="short_description"
                      className="form-control"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      rows={4}
                      minLength={10}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Update Service
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

function DefaultService({ onCreateClick }) {
  return (
    <>
      <div className="services">
        <div className="container">
          <div className="service-header">
            <h2>Our Services</h2>
          </div>
          <h5>We offer a wide range of services to help you succeed.</h5>
          <span>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ut dolorum iusto
            perferendis placeat ad facilis suscipit exercitationem aut vero omnis
            repellendus iure culpa, unde laudantium assumenda recusandae, beatae, porro
            incidunt.
          </span>
          <div className="service-item">
            <div className="service-icon">
              <i className="fas fa-bullhorn"></i>
            </div>
            <h3>Advertisement</h3>
            <p>Description of Advertisement Service</p>
            <span>
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ut dolorum iusto
              perferendis placeat ad facilis suscipit exercitationem aut vero omnis
              repellendus iure culpa, unde laudantium assumenda recusandae, beatae,
              porro incidunt.
            </span>
          </div>
          <div className="service-item">
            <div className="service-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <h3>Events</h3>
            <p>Description of Events Service</p>
            <span>
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ut dolorum iusto
              perferendis placeat ad facilis suscipit exercitationem aut vero omnis
              repellendus iure culpa, unde laudantium assumenda recusandae, beatae,
              porro incidunt.
            </span>
          </div>
          <div className="service-item">
            <div className="service-icon">
              <i className="fas fa-camera-retro"></i>
            </div>
            <h3>Media</h3>
            <p>Description of Media Service</p>
            <span>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro, vero
              distinctio quis ratione quod corrupti ad. Nobis, perspiciatis. Sint totam
              laudantium rem maiores fuga aut ab ratione commodi eveniet laborum?
            </span>
          </div>
          <div className="service-item">
            <div className="service-icon">
              <i className="fas fa-briefcase"></i>
            </div>
            <h3>Company Branding</h3>
            <span>
              Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aliquam unde non
              maiores doloremque beatae. Dolorem qui eligendi quas nesciunt ipsa saepe
              eaque aliquid numquam dicta? Error asperiores accusantium repellat beatae!
            </span>
          </div>
        </div>
        {isLoggedIn() && (
          <button
            type="button"
            className="service-create-action btn btn-success service-create-action-round"
            onClick={onCreateClick}
            aria-label="Create Service"
          >
            <i className="fas fa-plus" aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}

function ActiveService({ onCreateClick, onEditClick, onDataStateChange }) {
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
          throw new Error('Failed to load services');
        }

        const json = await response.json();
        const items = extractResponseCollection(json, ["services", "home_services"]);

        const validServices = items
          .filter((item) => item && (item.title || item.subTitle || item.subtitle || item.short_description || item.description || item.icon_value || item.icon || item.tagline))
          .map((item) => ({
            id: item.id,
            title: item.title || item.tagline || 'Service',
            icon_value: item.icon_value || item.icon || item.icon_type || item.tagline || 'fas fa-briefcase',
            short_description: item.short_description || item.description || item.subTitle || item.subtitle || item.tagline || '',
          }));

        setServices(validServices);
        const has = validServices.length > 0;
        setHasData(has);
        onDataStateChange?.(has);
      } catch (error_) {
        if (error_?.name === 'AbortError') {
          return;
        }
        setError(error_.message || 'Unable to load services');
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
    <div className="services">
      <div className="container">
        <div className="service-header">
          <h2>Our Services</h2>
        </div>
        <h5>We offer a wide range of services to help you succeed.</h5>
        <span>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ut dolorum iusto
          perferendis placeat ad facilis suscipit exercitationem aut vero omnis
          repellendus iure culpa, unde laudantium assumenda recusandae, beatae, porro
          incidunt.
        </span>
        {error && <p className="service-error">{error}</p>}
        {services.map((service) => (
          <div className="service-item" key={service.id}>
            <div className="service-icon">
              <i className={service.icon_value}></i>
            </div>
            <h3>{service.title}</h3>
            <p>{service.short_description}</p>
            {isLoggedIn() && (
              <button type="button" className="service-edit-btn" onClick={() => onEditClick(service)}>
                Edit
              </button>
            )}
          </div>
        ))}
      </div>
      {isLoggedIn() && (
        <button
          type="button"
          className="service-create-action btn btn-success service-create-action-round"
          onClick={onCreateClick}
          aria-label="Create Service"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      )}
      {loading && <div className="service-loading">Loading services...</div>}
    </div>
  );
}

function Service() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [activeHasData, setActiveHasData] = useState(false);

  const handleEdit = (service) => {
    setSelectedService(service);
    setIsEditOpen(true);
  };

  return (
    <>
      <CreateServiceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <EditServiceModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} service={selectedService} />
      <ActiveService
        onCreateClick={() => setIsCreateOpen(true)}
        onEditClick={handleEdit}
        onDataStateChange={setActiveHasData}
      />
      {!activeHasData && <DefaultService onCreateClick={() => setIsCreateOpen(true)} />}
    </>
  );
}

export default Service;
