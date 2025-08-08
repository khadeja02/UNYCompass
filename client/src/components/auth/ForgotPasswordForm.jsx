import React, { useState } from 'react';
import { createServerApiUrl } from '../../config/api';

const ForgotPasswordForm = ({ switchToLogin }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        console.log('=== FORGOT PASSWORD DEBUG START ===');
        console.log('Email:', email);

        try {
            console.log('Making fetch request to /api/auth/forgot-password...');

            const response = await fetch(createServerApiUrl('/api/auth/forgot-password'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            console.log('Response received:', response);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Password reset request successful');
                setSuccess('Password reset link has been sent to your email address. Please check your inbox and follow the instructions.');
                setEmail(''); // Clear the form
            } else {
                console.log('Password reset request failed with error:', data.error);
                setError(data.error || 'Failed to send password reset email');
            }
        } catch (err) {
            console.log('=== FORGOT PASSWORD CATCH BLOCK TRIGGERED ===');
            console.log('Error type:', typeof err);
            console.log('Error message:', err.message);
            console.log('Full error:', err);
            console.log('Error stack:', err.stack);
            setError('Network error. Please try again.');
        } finally {
            console.log('=== FORGOT PASSWORD DEBUG END ===');
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px'
                }}>
                    Forgot Password?
                </h3>
                <p style={{
                    fontSize: '0.875rem',
                    color: '#666',
                    lineHeight: '1.5',
                    margin: '0'
                }}>
                    Enter your email address and we'll send you a link to reset your password.
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
                    }}>Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1rem',
                            background: 'rgba(167, 100, 255, 0.1)',
                            border: '2px solid rgba(6, 2, 8, 0.2)',
                            borderRadius: '12px',
                            color: 'black'
                        }}
                        placeholder="Enter your email address"
                        required
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
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(40, 1, 82, 0.3)',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? 'Sending...' : 'SEND RESET LINK'}
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
                        onClick={switchToLogin}
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
    );
};

export default ForgotPasswordForm;