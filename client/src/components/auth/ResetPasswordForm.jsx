import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

const ResetPasswordForm = () => {
    const [location, navigate] = useLocation();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Extract token from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        setIsLoading(true);

        try {
            console.log('=== RESET PASSWORD DEBUG START ===');
            console.log('Token:', token);
            console.log('Password length:', password.length);

            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    newPassword: password
                }),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Password reset successful');
                setSuccess('Password has been reset successfully! Redirecting to login...');
                setPassword('');
                setConfirmPassword('');

                // Redirect to auth page after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                console.log('Password reset failed:', data.error);
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            console.log('=== RESET PASSWORD CATCH BLOCK ===');
            console.log('Error:', err);
            setError('Network error. Please try again.');
        } finally {
            console.log('=== RESET PASSWORD DEBUG END ===');
            setIsLoading(false);
        }
    };

    const goToLogin = () => {
        navigate('/');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
        }}>
            <div style={{
                maxWidth: '440px',
                width: '100%',
                padding: '40px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{
                        fontSize: '52px',
                        fontWeight: '800',
                        color: '#333',
                        lineHeight: '1',
                        marginBottom: '8px',
                        letterSpacing: '-1px'
                    }}>UNY</h1>
                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#9b66eaff',
                        lineHeight: '1',
                        letterSpacing: '1px'
                    }}>COMPASS</h2>
                </div>

                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                    }}>
                        Reset Your Password
                    </h3>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#666',
                        lineHeight: '1.5',
                        margin: '0'
                    }}>
                        Enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#4871ff',
                            marginBottom: '8px'
                        }}>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                background: 'rgba(167, 100, 255, 0.1)',
                                border: '2px solid rgba(6, 2, 8, 0.2)',
                                borderRadius: '12px',
                                color: 'black'
                            }}
                            placeholder="Enter your new password"
                            required
                            disabled={!token || isLoading}
                        />
                    </div>

                    <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#4871ff',
                            marginBottom: '8px'
                        }}>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                background: 'rgba(167, 100, 255, 0.1)',
                                border: '2px solid rgba(6, 2, 8, 0.2)',
                                borderRadius: '12px',
                                color: 'black'
                            }}
                            placeholder="Confirm your new password"
                            required
                            disabled={!token || isLoading}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#dc2626',
                            background: 'rgba(248, 113, 113, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            marginBottom: '16px',
                            textAlign: 'left'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            color: '#059669',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(5, 150, 105, 0.3)',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            marginBottom: '16px',
                            textAlign: 'left',
                            lineHeight: '1.5'
                        }}>
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !token || success}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: isLoading || !token || success
                                ? 'rgba(155, 181, 255, 0.5)'
                                : 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: isLoading || !token || success ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 6px rgba(40, 1, 82, 0.3)',
                            opacity: isLoading || !token || success ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Resetting...' : success ? 'Password Reset!' : 'RESET PASSWORD'}
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    fontSize: '0.875rem',
                    color: '#4871ff',
                    borderTop: '1px solid rgba(6, 2, 8, 0.1)',
                    paddingTop: '20px'
                }}>
                    <p>
                        Remember your password?{' '}
                        <button
                            type="button"
                            onClick={goToLogin}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4871ff',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Back to Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordForm;