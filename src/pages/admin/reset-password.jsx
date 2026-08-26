import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './reset-password.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) {
            setMessage('Missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        if (!token) {
            setError('Missing reset token.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const payload = {
            token,
            password,
        };

        try {
            setLoading(true);
            setMessage('Sending password reset...');

            const response = await fetch('http://localhost/api/resetPassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                const errMsg = errData?.detail || errData?.message || `Request failed (${response.status})`;
                setError(errMsg);
                setMessage(null);
            } else {
                await response.json().catch(() => null);
                setMessage('Password reset successful.');
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 800);
            }
        } catch (err) {
            setError(err.message || 'Network error');
            setMessage(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="reset-page" aria-labelledby="reset-heading">
            <h2 id="reset-heading">Reset Password</h2>
            <p className="lead">Set a new password for your account.</p>

            {message && <div className="status" role="status" style={{ color: 'green' }}>{message}</div>}
            {error && <div className="status" role="alert" style={{ color: 'red' }}>{error}</div>}


            <form onSubmit={handleSubmit} className="form-grid" noValidate>

                <div className="form-group">
                    <label htmlFor="password" className="form-label">New Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        aria-required="true"
                        minLength={8}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirm" className="form-label">Confirm Password</label>
                    <input
                        id="confirm"
                        name="confirm"
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        aria-required="true"
                        minLength={8}
                    />
                </div>

                <div className="form-actions">
                    <div className="hint">This page requires a valid token in the URL. Share the URL that was sent to the user.</div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Please wait...' : 'Reset Password'}
                    </button>
                </div>
            </form>
        </main>
    );
}

export default ResetPassword;