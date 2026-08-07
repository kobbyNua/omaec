import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./homeModal";
import { auth } from "../../Authentication/auth.jsx";
import { extractResponseCollection } from "../../utils/apiResponse.js";

const ACHIEVEMENT_API_URL = (() => {
  const rawUrl = import.meta.env.VITE_APP_URL?.trim() || "";
  if (!rawUrl) {
    console.warn('VITE_APP_URL is not defined. Falling back to /home_achievements');
    return "/home_achiebements";
  }
  const base = rawUrl.replace(/\/+$/g, "");
  return `${base}/home_achiebements`;
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

function AchievementModal({ isOpen, onClose, title, fields, onFieldChange, onSubmit, status }) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{title}</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close form">
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={onSubmit} noValidate>
              {fields.map(({ id, label, value, placeholder, type = 'text', hidden = false }) => {
                if (hidden) {
                  return <input key={id} type="hidden" name={id} value={value || ''} />;
                }

                return (
                  <div className="form-group" key={id}>
                    <label htmlFor={id}>{label}</label>
                    <input
                      id={id}
                      name={id}
                      type={type}
                      className="form-control"
                      value={value}
                      placeholder={placeholder}
                      onChange={(e) => onFieldChange(id, e.target.value)}
                      readOnly={id === 'id'}
                      required
                    />
                  </div>
                );
              })}
              <button type="submit" className="btn btn-primary btn-block">
                {title}
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

function DefaultAchievement({ onCreateClick }) {
  return (
    <div className="our-success-story-numbers">
      <div className="container">
        <div className="success-story-number-item">
          <i className="fas fa-briefcase"></i>
          <h3>5+</h3>
          <p>years of experience</p>
        </div>
        <div className="success-story-number-item">
          <i className="fas fa-smile"></i>
          <h3>25+</h3>
          <p>happy clients</p>
        </div>
        <div className="success-story-number-item">
          <i className="fas fa-check-circle"></i>
          <h3>60+</h3>
          <p>projects completed</p>
        </div>
        <div className="success-story-number-item">
          <i className="fas fa-trophy"></i>
          <h3>10+</h3>
          <p>awards won</p>
        </div>
      </div>
      {isLoggedIn() && (
        <button
          type="button"
          className="service-create-action btn btn-success service-create-action-round"
          onClick={onCreateClick}
          aria-label="Create Achievement"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ActiveAchievement({ onCreateClick, onEditClick, onDataStateChange, onLoadedChange, refreshKey }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadAchievements = async () => {
      try {
        const authToken = await getAuthorizationToken();
        const headers = {};
        if (authToken) {
          headers.Authorization = authToken;
        }

        const response = await fetch(ACHIEVEMENT_API_URL, {
          method: 'GET',
          signal: controller.signal,
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to load achievements');
        }

        const json = await response.json();
        const items = extractResponseCollection(json, ["achievements", "home_achievements"]);
        const valid = items.filter(
          (item) => item && (
            item.archivement_name ||
            item.achievement_name ||
            item.icon_type ||
            item.icon_value ||
            item.figures ||
            item.title ||
            item.subTitle ||
            item.subtitle
          )
        );

        const normalizedAchievements = valid.map((item) => ({
          id: item.id,
          figures: item.figures || item.id || 0,
          icon_type: item.icon_type || item.icon_value || item.icon || 'fas fa-award',
          archivement_name: item.archivement_name || item.achievement_name || item.title || item.tagline || 'Achievement',
        }));

        setAchievements(normalizedAchievements);
        const hasData = normalizedAchievements.length > 0;
        onDataStateChange?.(hasData);
        onLoadedChange?.(true);
      } catch (loadError) {
        if (loadError?.name === 'AbortError') {
          return;
        }
        setError(loadError.message || 'Unable to load achievements');
        onDataStateChange?.(false);
        onLoadedChange?.(true);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
    return () => controller.abort();
  }, [onDataStateChange, onLoadedChange, refreshKey]);

  if (!loading && achievements.length === 0) {
    return null;
  }

  return (
    <div className="our-success-story-numbers">
      <div className="container">
        {error && <p className="service-error">{error}</p>}
        {achievements.map((achievement) => (
          <div
            className="success-story-number-item"
            key={achievement.id || achievement.archivement_name || achievement.achievement_name}
          >
            <i className={achievement.icon_type || achievement.icon_value || 'fas fa-award'} aria-hidden="true" />
            <h3>{achievement.figures || '0'}</h3>
            <p>{achievement.archivement_name || achievement.achievement_name || 'Achievement'}</p>
            {isLoggedIn() && (
              <button type="button" className="service-edit-btn" onClick={() => onEditClick(achievement)}>
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
          aria-label="Create Achievement"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
      )}
      {loading && <div className="service-loading">Loading achievements...</div>}
    </div>
  );
}

function Achievement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', figures: '', icon_type: '', archivement_name: '' });
  const [formStatus, setFormStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeHasData, setActiveHasData] = useState(false);
  const [activeLoaded, setActiveLoaded] = useState(false);

  const resetForm = () => {
    setFormData({ id: '', figures: '', icon_type: '', archivement_name: '' });
    setFormStatus('');
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canManageAchievements = isLoggedIn();

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEditOpen = (achievement) => {
    setFormData({
      id: achievement.id || '',
      figures: achievement.figures || '',
      icon_type: achievement.icon_type || achievement.icon_value || '',
      archivement_name: achievement.archivement_name || achievement.achievement_name || '',
    });
    setFormStatus('');
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setFormStatus('Creating achievement...');

    // Validate required fields
    if (!formData.figures?.trim()) {
      setFormStatus('Figures is required.');
      return;
    }
    if (!formData.icon_type?.trim()) {
      setFormStatus('Icon Type is required.');
      return;
    }
    if (!formData.archivement_name?.trim()) {
      setFormStatus('Achievement Name is required.');
      return;
    }

    const authToken = await getAuthorizationToken();
    if (!authToken) {
      setFormStatus('You must be logged in to create an achievement.');
      return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = authToken;
    }

    const payload = {
      figures: parseInt(formData.figures.trim(), 10),
      icon_type: formData.icon_type.trim(),
      archivement_name: formData.archivement_name.trim(),
    };

    console.log('Sending achievement data:', payload);

    try {
      const response = await fetch(ACHIEVEMENT_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      console.log('Backend response:', response.status, data);

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      if (typeof data?.status === 'boolean' && !data.status) {
        throw new Error(data?.message || 'Failed to create achievement.');
      }

      setFormStatus(data?.message || 'Achievement created successfully.');
      setIsCreateOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Create achievement error:', error);
      setFormStatus(error.message || 'Unable to create achievement.');
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setFormStatus('Saving achievement...');

    // Validate required fields
    if (!formData.figures?.trim()) {
      setFormStatus('Figures is required.');
      return;
    }
    if (!formData.icon_type?.trim()) {
      setFormStatus('Icon Type is required.');
      return;
    }
    if (!formData.archivement_name?.trim()) {
      setFormStatus('Achievement Name is required.');
      return;
    }

    if (!formData.id) {
      setFormStatus('Achievement ID is missing.');
      return;
    }

    const authToken = await getAuthorizationToken();
    if (!authToken) {
      setFormStatus('You must be logged in to update an achievement.');
      return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = authToken;
    }

    const endpoint = `${ACHIEVEMENT_API_URL}/${formData.id}`;

    const payload = {
      figures: parseInt(formData.figures.trim(), 10),
      icon_type: formData.icon_type.trim(),
      archivement_name: formData.archivement_name.trim(),
    };

    console.log('Sending PUT request to:', endpoint);
    console.log('Sending edit achievement data:', payload);
    console.log('Headers:', headers);

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      console.log('PUT Response received:', response.status, response.statusText);
      const data = await response.json().catch(() => null);
      console.log('Backend response data:', data);

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      if (typeof data?.status === 'boolean' && !data.status) {
        throw new Error(data?.message || 'Failed to update achievement.');
      }

      setFormStatus(data?.message || 'Achievement updated successfully.');
      // Commented out to allow debugging - modal will stay open
      // setIsEditOpen(false);
      // setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Edit achievement error:', error);
      setFormStatus(error.message || 'Unable to update achievement.');
    }
  };

  const formFields = [
    {
      id: 'figures',
      label: 'Figures',
      value: formData.figures,
      placeholder: 'e.g. 10',
      type: 'number',
    },
    {
      id: 'icon_type',
      label: 'Icon Type',
      value: formData.icon_type,
      placeholder: 'e.g. fas fa-briefcase',
    },
    {
      id: 'archivement_name',
      label: 'Achievement Name',
      value: formData.archivement_name,
      placeholder: 'e.g. Years of Experience',
    },
  ];

  return (
    <>
      <AchievementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Achievement"
        fields={formFields}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreateSubmit}
        status={formStatus}
      />

      <AchievementModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Achievement"
        fields={[
          {
            id: 'id',
            label: 'ID',
            value: formData.id,
            placeholder: '',
            hidden: false,
          },
          ...formFields,
        ]}
        onFieldChange={handleFieldChange}
        onSubmit={handleEditSubmit}
        status={formStatus}
      />

      <ActiveAchievement
        onCreateClick={handleCreateOpen}
        onEditClick={handleEditOpen}
        onDataStateChange={setActiveHasData}
        onLoadedChange={setActiveLoaded}
        refreshKey={refreshKey}
      />

      {activeLoaded && !activeHasData && (
        <DefaultAchievement onCreateClick={handleCreateOpen} />
      )}
    </>
  );
}

export default Achievement;
