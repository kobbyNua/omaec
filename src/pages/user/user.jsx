import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../admin/sidebar';

function UserPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // For change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedUser = window.localStorage.getItem('user-auth');
    if (!storedUser) {
      navigate('/login', { replace: true });
    } else {
      try {
        const parsed = JSON.parse(storedUser);
        setEmail(parsed.email || 'User');
      } catch (e) {
        setEmail('User');
      }
    }
  }, [navigate]);

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    setMessage('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="admin-layout">
      <Sidebar role="user" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="admin-main-content">
        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          
          {activeTab === 'profile' && (
            <div style={{ padding: '2.5rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>User Profile</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '2rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700 }}>
                  {email[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{email.split('@')[0]}</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>Regular Member</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address</label>
                  <input type="text" value={email} readOnly style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#64748b', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>Role</label>
                  <input type="text" value="User Account" readOnly style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#64748b', outline: 'none' }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'change-password' && (
            <div style={{ padding: '2.5rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>Change Password</h2>
              
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label htmlFor="currentPass" style={{ display: 'block', fontSize: '0.875rem', color: '#475569', fontWeight: 600, marginBottom: '0.5rem' }}>Current Password</label>
                  <input id="currentPass" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label htmlFor="newPass" style={{ display: 'block', fontSize: '0.875rem', color: '#475569', fontWeight: 600, marginBottom: '0.5rem' }}>New Password</label>
                  <input id="newPass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label htmlFor="confirmPass" style={{ display: 'block', fontSize: '0.875rem', color: '#475569', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm New Password</label>
                  <input id="confirmPass" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.95rem' }} />
                </div>

                <button type="submit" style={{ padding: '0.8rem 1.5rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', transition: 'background-color 0.2s ease' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#0369a1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#0284c7'}>
                  Update Password
                </button>
              </form>

              {message && (
                <p style={{ marginTop: '1.25rem', color: message.includes('success') ? '#10b981' : '#ef4444', fontSize: '0.95rem', fontWeight: 600 }}>
                  {message}
                </p>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default UserPage;
