import React, { useState } from 'react';

const LoginForm = ({ onLogin, switchToRegister }) => {
    const [formData, setFormData] = useState({
        email: '',
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

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
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
                    }}>Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
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
                        placeholder="Enter your email"
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
                        color: '#fecaca',
                        background: 'rgba(220, 38, 38, 0.2)',
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
                        background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
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