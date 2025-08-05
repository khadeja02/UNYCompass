import React from 'react';

const LandingPage = ({ switchToLogin }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
            position: 'relative'
        }}>
            {/* Header with Login Button */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 10
            }}>
                <button
                    onClick={switchToLogin}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#333',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Login
                </button>
            </div>

            {/* Main Content - Centered */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center',
                padding: '20px'
            }}>
                {/* Logo Section with Compass Icon */}
                <div style={{ marginBottom: '60px' }}>
                    {/* Compass Icon */}
                    <div style={{
                        width: '120px',
                        height: '120px',
                        margin: '0 auto 30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Outer circle */}
                            <circle cx="60" cy="60" r="55" stroke="#4A5568" strokeWidth="3" fill="none"/>
                            {/* Inner compass design */}
                            <circle cx="60" cy="60" r="45" stroke="#4A5568" strokeWidth="2" fill="none"/>
                            {/* Compass needle/arrow pointing North */}
                            <path d="M60 25 L50 55 L60 50 L70 55 Z" fill="#4A5568"/>
                            {/* Compass needle/arrow pointing South */}
                            <path d="M60 95 L70 65 L60 70 L50 65 Z" fill="#718096"/>
                            {/* Center dot */}
                            <circle cx="60" cy="60" r="4" fill="#4A5568"/>
                            {/* Cardinal direction markers */}
                            <text x="60" y="20" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">N</text>
                            <text x="100" y="65" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">E</text>
                            <text x="60" y="105" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">S</text>
                            <text x="20" y="65" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">W</text>
                        </svg>
                    </div>
                    
                    {/* UNY COMPASS Text */}
                    <h1 style={{
                        fontSize: '64px',
                        fontWeight: '800',
                        color: '#4A5568',
                        lineHeight: '1',
                        marginBottom: '8px',
                        letterSpacing: '-1px'
                    }}>UNY</h1>
                    <h2 style={{
                        fontSize: '32px',
                        fontWeight: '600',
                        color: '#4A5568',
                        lineHeight: '1',
                        letterSpacing: '4px',
                        marginBottom: '0'
                    }}>COMPASS</h2>
                </div>

                {/* Start Exploring Button */}
                <button
                    onClick={switchToLogin}
                    style={{
                        padding: '18px 48px',
                        background: '#4A5568',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(74, 85, 104, 0.3)',
                        transition: 'all 0.3s ease',
                        letterSpacing: '1px'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 12px 32px rgba(74, 85, 104, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 8px 24px rgba(74, 85, 104, 0.3)';
                    }}
                >
                    Start Exploring
                </button>
            </div>

            {/* Footer Links */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                left: '0',
                right: '0',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 40px',
                fontSize: '14px',
                color: '#4A5568',
                fontWeight: '500'
            }}>
                <span style={{ cursor: 'pointer' }}>Terms of Use</span>
                <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            </div>
        </div>
    );
};

export default LandingPage;