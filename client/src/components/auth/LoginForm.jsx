import React, { useState } from 'react';
import { createServerApiUrl } from '../../config/api';

// CHANGED: Added switchToForgotPassword prop to function signature
const LoginForm = ({ onLogin, switchToRegister, switchToForgotPassword }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        console.log('=== LOGIN DEBUG START ===');
        console.log('Form data:', formData);

        try {
            console.log('Making fetch request to /api/auth/login...');

            const response = await fetch(createServerApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            console.log('Response received:', response);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Login successful, storing token...');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Token stored, calling onLogin...');
                onLogin(data.user);
            } else {
                console.log('Login failed with error:', data.error);
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            console.log('=== CATCH BLOCK TRIGGERED ===');
            console.log('Error type:', typeof err);
            console.log('Error message:', err.message);
            console.log('Full error:', err);
            console.log('Error stack:', err.stack);
            setError('Network error. Please try again.');
        } finally {
            console.log('=== LOGIN DEBUG END ===');
            setIsLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#4871ff',
                        marginBottom: '8px'
                    }}>Username or Email</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
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
                        placeholder="Enter your username or email"
                        required
                    />
                </div>

                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#4871ff',
                        marginBottom: '8px'
                    }}>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1rem',
                            background: 'rgba(167, 100, 255, 0.1)',
                            border: '2px solid rgba(0, 0, 0, 0.2)',
                            borderRadius: '12px',
                            color: 'black'
                        }}
                        placeholder="Enter your password"
                        required
                    />
                    <div style={{ textAlign: 'right', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={switchToForgotPassword}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4871ff',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            Forget password? Click here
                        </button>
                    </div>
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
                        boxShadow: '0 4px 6px rgba(40, 1, 82, 0.3)'
                    }}
                >
                    {isLoading ? 'Logging in...' : 'LOGIN'}
                </button>
            </form>

            <div style={{ marginTop: '24px', fontSize: '0.875rem', color: '#4871ff' }}>
                <p>
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={switchToRegister}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4871ff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginForm;