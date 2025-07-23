import React, { useState } from 'react';

const RegisterForm = ({ onRegister, switchToLogin }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [agreedToTerms, setAgreedToTerms] = useState(false);
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

        if (!agreedToTerms) {
            setError('You must agree to the Terms of Service');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onRegister(data.user);
            } else {
                setError(data.error || 'Registration failed');
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
                    }}>Full Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
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
                        placeholder="Enter your full name"
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
                            border: '2px solid rgba(6, 2, 8, 0.2)',
                            borderRadius: '12px',
                            color: 'black'
                        }}
                        placeholder="Create a password"
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
                    }}>Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
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
                        placeholder="Confirm your password"
                        required
                    />
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start' }}>
                    <input
                        type="checkbox"
                        id="terms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        style={{
                            marginRight: '10px',
                            marginTop: '3px'
                        }}
                    />
                    <label htmlFor="terms" style={{
                        fontSize: '0.875rem',
                        color: '#4871ff',
                        textAlign: 'left'
                    }}>
                        I agree to the <a href="#" style={{ color: '#4871ff', fontWeight: '600' }}>Terms of Service</a>
                    </label>
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
                        boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)'
                    }}
                >
                    {isLoading ? 'Creating account...' : 'SIGN UP'}
                </button>
            </form>

            <div style={{ marginTop: '24px', fontSize: '0.875rem', color: '#4871ff' }}>
                <p>
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={switchToLogin}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4871ff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterForm;