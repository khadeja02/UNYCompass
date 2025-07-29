import React, { useState } from 'react';

const RegisterForm = ({ onRegister, switchToLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // NEW: Added state for terms agreement and modal
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        // NEW: Check if terms are agreed to before proceeding
        if (!agreeToTerms) {
            setError('Please agree to the terms and conditions to continue');
            return;
        }

        setIsLoading(true);

        console.log('=== REGISTER DEBUG START ===');
        console.log('Form data:', formData);

        try {
            console.log('Making fetch request to /api/auth/register...');

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                }),
            });

            console.log('Response received:', response);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Registration successful, storing token...');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Token stored, calling onRegister...');
                onRegister(data.user);
            } else {
                console.log('Registration failed with error:', data.error);
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            console.log('=== REGISTER CATCH BLOCK TRIGGERED ===');
            console.log('Error type:', typeof err);
            console.log('Error message:', err.message);
            console.log('Full error:', err);
            console.log('Error stack:', err.stack);
            setError('Network error. Please try again.');
        } finally {
            console.log('=== REGISTER DEBUG END ===');
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
                    }}>Username</label>
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
                        placeholder="Enter your username"
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

                {/* NEW: Terms and Conditions Checkbox */}
                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        fontSize: '0.875rem', 
                        color: '#4871ff',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            style={{ 
                                marginRight: '8px',
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer'
                            }}
                        />
                        I agree with the{' '}
                        <span
                            onClick={() => setShowTermsModal(true)}
                            style={{
                                color: '#7c3aed',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                marginLeft: '4px'
                            }}
                        >
                            terms and conditions
                        </span>
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

            {/* NEW: Terms and Conditions Modal */}
            {showTermsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        position: 'relative',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{
                                margin: 0,
                                color: '#333',
                                fontSize: '1.25rem',
                                fontWeight: '600'
                            }}>
                                Terms and Conditions
                            </h3>
                            <button
                                onClick={() => setShowTermsModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '0',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Modal Content - Scrollable */}
                        <div style={{
                            padding: '20px',
                            maxHeight: 'calc(80vh - 140px)',
                            overflowY: 'auto',
                            color: '#333',
                            lineHeight: '1.6'
                        }}>
                            <p>I will add them here!!</p>
                            {/* Terms and conditions content*/}
                        </div>
                    </div>
                </div>
            )}

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