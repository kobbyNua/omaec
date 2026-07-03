import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, subscribeToAuthChanges } from '../../Authentication/auth';
import Sidebar from './sidebar';

function AdminPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  // Sub-tabs for users management
  const [usersTab, setUsersTab] = useState('list'); // 'list' or 'create'
  const [searchTerm, setSearchTerm] = useState('');

  // Users data state, fetched from OHO backend
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  // Create User Form State
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const USERS_API_URL = 'http://127.0.0.1/media/api/user';

  const getAdminIdToken = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return '';
    }

    try {
      const token = await currentUser.getIdToken(true);
      return token || '';
    } catch (error) {
      return '';
    }
  };

  const normalizeUsers = (payload) => {
    if (Array.isArray(payload)) {
      return payload.map((item) => ({
        ...item,
        name: item.name || item.full_name || item.username || item.email || 'Unnamed user',
        email: item.email || item.mail || '',
        role: item.role || 'User',
        status: item.status || 'Active',
        createdAt: item.createdAt || item.created_at || item.created || ''
      }));
    }

    if (payload && typeof payload === 'object') {
      const collection = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.users)
          ? payload.users
          : Array.isArray(payload.results)
            ? payload.results
            : Array.isArray(payload.data)
              ? payload.data
              : Array.isArray(payload.data?.users)
                ? payload.data.users
                : Array.isArray(payload.data?.results)
                  ? payload.data.results
                  : [];

      return collection.map((item) => ({
        ...item,
        name: item.name || item.full_name || item.username || item.email || 'Unnamed user',
        email: item.email || item.mail || '',
        role: item.role || 'User',
        status: item.status || 'Active',
        createdAt: item.createdAt || item.created_at || item.created || ''
      }));
    }

    return [];
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);

    const currentUser = auth.currentUser;
    const adminUid = currentUser?.uid || user?.uid || window.localStorage.getItem('admin-firebase-uid') || '';
    const idToken = await getAdminIdToken();

    if (!currentUser || !idToken) {
      setUsers([]);
      setUsersError('Admin authentication is not ready. Please sign in again.');
      setUsersLoading(false);
      return;
    }

    try {
      const response = await fetch(USERS_API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load users (${response.status})`);
      }

      const data = await response.json();
      setUsers(normalizeUsers(data));
    } catch (error) {
      setUsers([]);
      setUsersError(error.message || 'Unable to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    window.localStorage.removeItem('omaec_users');
    setUsers([]);

    const hasLocalAdminSession = window.localStorage.getItem('admin-auth') === 'true' || window.localStorage.getItem('admin-auth') === 'firebase' || window.localStorage.getItem('admin-auth') === 'google';
    const currentUser = auth.currentUser;

    if (hasLocalAdminSession && currentUser) {
      const adminUid = currentUser.uid || window.localStorage.getItem('admin-firebase-uid') || '';
      if (adminUid) {
        window.localStorage.setItem('admin-firebase-uid', adminUid);
      }
      setUser({ ...currentUser, uid: adminUid });
      setLoading(false);
      fetchUsers();
      return;
    }

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      const isAdmin = currentUser?.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

      if (!currentUser) {
        navigate('/login', { replace: true });
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        navigate('/user', { replace: true });
        setLoading(false);
        return;
      }

      const adminUid = currentUser?.uid || window.localStorage.getItem('admin-firebase-uid') || '';
      if (adminUid) {
        window.localStorage.setItem('admin-firebase-uid', adminUid);
      }
      setUser(currentUser ? { ...currentUser, uid: adminUid } : null);
      setLoading(false);

      if (isAdmin) {
        fetchUsers();
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { name, email } = formData;

    if (!name.trim() || !email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setFormError('A user with this email address already exists.');
      return;
    }

    const currentUser = auth.currentUser;
    const idToken = await getAdminIdToken();
    const adminUid = currentUser?.uid || user?.uid || window.localStorage.getItem('admin-firebase-uid') || '';

    if (!currentUser || !idToken) {
      setFormError('Admin authentication is not ready. Please sign in again.');
      return;
    }

    const newUserUid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const body = {
      //user_uid: newUserUid,
      firebase_uid: newUserUid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      //created_by_uid: adminUid,
      //admin_uid: adminUid
    };

    if (adminUid) {
      window.localStorage.setItem('admin-firebase-uid', adminUid);
    }

    try {
      const response = await fetch(USERS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Unable to create user (${response.status})`);
      }

      setFormSuccess(`User "${name}" has been successfully created.`);
      setFormData({
        name: '',
        email: ''
      });

      await fetchUsers();
    } catch (error) {
      setFormError(error.message || 'Unable to create user.');
    }
  };

  const handleDeleteUser = (id, name) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);
      window.localStorage.setItem('omaec_users', JSON.stringify(updatedUsers));
    }
  };

  const handleToggleStatus = (id) => {
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: u.status === 'Active' ? 'Suspended' : 'Active'
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    window.localStorage.setItem('omaec_users', JSON.stringify(updatedUsers));
  };

  // Filter users based on search
  console.log(users)
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <p style={{ textAlign: 'center', marginTop: '3rem' }}>Checking access...</p>;
  }

  return (
    <div className="admin-layout">
      <Sidebar role="admin" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="admin-main-content">
        <div style={{ maxWidth: '1200px' }}>
          {activeTab === 'users' && (
            <div style={{ padding: '2.5rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Users Administration</h2>
                  <p style={{ color: '#64748b', margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>Welcome, {user?.email}. Manage and review registered users in the platform.</p>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <button
                  type="button"
                  onClick={() => { setUsersTab('list'); setFormSuccess(''); setFormError(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem 0.5rem',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: usersTab === 'list' ? '#0284c7' : '#64748b',
                    borderBottom: usersTab === 'list' ? '3px solid #0284c7' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>User List</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setUsersTab('create'); setFormSuccess(''); setFormError(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem 0.5rem',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: usersTab === 'create' ? '#0284c7' : '#64748b',
                    borderBottom: usersTab === 'create' ? '3px solid #0284c7' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="19" y1="8" x2="19" y2="14"></line>
                    <line x1="16" y1="11" x2="22" y2="11"></line>
                  </svg>
                  <span>Create User</span>
                </button>
              </div>

              {/* Tab Panel 1: User List */}
              {usersTab === 'list' && (
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.925rem',
                        outline: 'none',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0284c7';
                        e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Users Table */}
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                          <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                          <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                          <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created At</th>
                          <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersLoading ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                              Loading users...
                            </td>
                          </tr>
                        ) : usersError ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#b91c1c' }}>
                              {usersError}
                            </td>
                          </tr>
                        ) : filteredUsers.length > 0 ? (
                          filteredUsers.map((item, index) => (
                            
                            <tr 
                              key={item.id || `${item.email}-${index}`} 
                              style={{ 
                                borderBottom: index === filteredUsers.length - 1 ? 'none' : '1px solid #e2e8f0',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    backgroundColor: item.status === 'Active' ? '#e0f2fe' : '#f1f5f9',
                                    color: item.status === 'Active' ? '#0369a1' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.95rem'
                                  }}>
                                    {item.name[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{item.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>{item.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#334155',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}>
                                  {item.role}
                                </span>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '20px',
                                  backgroundColor: item.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                  color: item.status === 'Active' ? '#166534' : '#991b1b',
                                  fontSize: '0.775rem',
                                  fontWeight: 700
                                }}>
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                {item.createdAt}
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(item.id)}
                                    title={item.status === 'Active' ? 'Suspend User' : 'Activate User'}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0.4rem',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '8px',
                                      backgroundColor: '#ffffff',
                                      color: item.status === 'Active' ? '#e11d48' : '#16a34a',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = item.status === 'Active' ? '#fff1f2' : '#f0fdf4';
                                      e.currentTarget.style.borderColor = item.status === 'Active' ? '#fecdd3' : '#bbf7d0';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#ffffff';
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(item.id, item.name)}
                                    title="Delete User"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0.4rem',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '8px',
                                      backgroundColor: '#ffffff',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#fef2f2';
                                      e.currentTarget.style.borderColor = '#fca5a5';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#ffffff';
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem', color: '#94a3b8' }}>
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              </svg>
                              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#475569' }}>No users have been created yet</div>
                              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Use the create form to add a new user.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab Panel 2: Create User Form */}
              {usersTab === 'create' && (
                <div style={{ maxWidth: '600px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {formError && (
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 500 }}>
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.9rem', fontWeight: 500 }}>
                        {formSuccess}
                      </div>
                    )}

                    <div>
                      <label htmlFor="name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Full Name</label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. John Doe"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          outline: 'none',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#0284c7';
                          e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Email Address</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john.doe@example.com"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          outline: 'none',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#0284c7';
                          e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '0.8rem 1.75rem',
                        marginTop: '0.5rem',
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#0369a1';
                        e.target.style.boxShadow = '0 6px 16px rgba(3, 105, 161, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#0284c7';
                        e.target.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.2)';
                      }}
                    >
                      Save User
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
