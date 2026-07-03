import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, logoutUser, subscribeToAuthChanges } from '../../Authentication/auth';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

  useEffect(() => {
    const hasLocalAdminSession = window.localStorage.getItem('admin-auth') === 'true';

    if (hasLocalAdminSession) {
      setUser({ email: adminEmail });
      navigate('/admin', { replace: true });
      return;
    }

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);

      if (currentUser?.email?.toLowerCase() === adminEmail) {
        navigate('/admin', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, adminEmail]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    const trimmedEmail = email.trim();

    if (trimmedEmail.toLowerCase() === adminEmail) {
      setMessage('Please use the Google sign-in option for admin access.');
      setIsLoading(false);
      return;
    }

    if (!trimmedEmail || !password) {
      setMessage('Please enter your email and password.');
      setIsLoading(false);
      return;
    }

    window.localStorage.setItem('user-auth', JSON.stringify({ email: trimmedEmail }));
    setUser({ email: trimmedEmail });
    setMessage('User login successful.');
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await loginWithGoogle();
      const signedInEmail = result?.user?.email?.toLowerCase();

      if (signedInEmail === adminEmail) {
        window.localStorage.setItem('admin-auth', 'google');
        setUser(result.user);
        setMessage('Google login successful. Redirecting to the admin area...');
        navigate('/admin', { replace: true });
      } else {
        await logoutUser();
        setMessage('Only the configured admin Google account can access this page.');
      }
    } catch (error) {
      setMessage(error?.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    window.localStorage.removeItem('admin-auth');
    await logoutUser();
    setMessage('You have signed out.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)' }}>
      <div style={{ width: '100%', maxWidth: '440px', padding: '2rem', borderRadius: '24px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 20px 50px rgba(0,0,0,0.28)', backdropFilter: 'blur(10px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            A
          </div>
          <h2 style={{ margin: '0 0 0.4rem', color: '#111827', fontSize: '1.6rem' }}>Welcome back</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
            Sign in as a user or use Google for admin access.
          </p>
        </div>

        {user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem', color: '#111827' }}>You are signed in as {user.email}</p>
            <button type="button" onClick={handleLogout} style={{ width: '100%', padding: '0.8rem', border: 'none', borderRadius: '12px', background: '#111827', color: 'white', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '0.35rem', color: '#374151', fontWeight: 600 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{ width: '100%', padding: '0.85rem 0.95rem', border: '1px solid #d1d5db', borderRadius: '12px', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '0.35rem', color: '#374151', fontWeight: 600 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={{ width: '100%', padding: '0.85rem 0.95rem', border: '1px solid #d1d5db', borderRadius: '12px', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.9rem', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ marginBottom: '0.5rem', color: '#6b7280', textAlign: 'center', fontSize: '0.9rem' }}>Admin access</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{ width: '100%', padding: '0.9rem', border: '1px solid #d1d5db', borderRadius: '12px', background: 'white', color: '#111827', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLoading ? 'Please wait...' : 'Sign in with Google'}
          </button>
        </div>

        {message ? <p style={{ marginTop: '1rem', textAlign: 'center', color: '#dc2626', fontSize: '0.95rem' }}>{message}</p> : null}
      </div>
    </div>
  );
}

export default LoginPage;
