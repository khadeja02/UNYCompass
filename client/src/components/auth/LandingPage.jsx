import React, { useState, useEffect } from 'react';

const LandingPage = ({ switchToLogin }) => {
    // NEW: State for parallax scroll effect
    const [scrollY, setScrollY] = useState(0);

    // NEW: Typing animation effect - tracks current text being typed
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const fullText = "Discover your perfect academic path";

    // NEW: Interactive glow effect - tracks mouse position for floating elements
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // NEW: Effect to track scroll position for parallax
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // NEW: Mouse tracking for glow effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // NEW: Typing animation effect
    useEffect(() => {
        if (currentIndex < fullText.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(fullText.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, 80); // Speed of typing (80ms per character)
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, fullText]);

    // NEW: Animation styles for floating elements
    const floatingElementStyle = {
        position: 'absolute',
        opacity: 0.1,
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
        transition: 'all 0.3s ease' // NEW: Smooth transition for glow effect
    };

    // NEW: Function to calculate distance-based glow effect
    const getGlowStyle = (elementX, elementY) => {
        const distance = Math.sqrt(Math.pow(mousePos.x - elementX, 2) + Math.pow(mousePos.y - elementY, 2));
        const maxDistance = 200; // CHANGED: Increased detection radius (was 150)
        const glowIntensity = Math.max(0, (maxDistance - distance) / maxDistance);
        
        return {
            opacity: 0.1 + (glowIntensity * 0.6), // CHANGED: More dramatic opacity increase (was 0.3)
            filter: `drop-shadow(0 0 ${glowIntensity * 40}px rgba(139, 92, 246, ${glowIntensity * 0.9}))` // CHANGED: Larger, more intense glow (was 20px and 0.6 alpha)
        };
    };

    // NEW: Keyframe animations defined in a style tag
    const animationStyles = `
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(120deg); }
            66% { transform: translateY(-10px) rotate(240deg); }
        }
        @keyframes floatReverse {
            0%, 100% { transform: translateY(0px) rotate(360deg); }
            50% { transform: translateY(-15px) rotate(180deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.2; }
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;

    return (
        <>
            {/* NEW: Add CSS animations to the document */}
            <style>{animationStyles}</style>

            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>

                {/* NEW: Floating Background Elements */}
                    {/* Top-left compass rose */}
                    <div style={{
                        ...floatingElementStyle,
                        top: '10%',
                        left: '5%',
                        animation: 'float 12s ease-in-out infinite'
                    }}>
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                            <circle cx="30" cy="30" r="25" stroke="#4A5568" strokeWidth="2"/>
                            <path d="M30 10 L25 25 L30 22 L35 25 Z" fill="#4A5568"/>
                            <path d="M30 50 L35 35 L30 38 L25 35 Z" fill="#4A5568"/>
                            <path d="M10 30 L25 25 L22 30 L25 35 Z" fill="#4A5568"/>
                            <path d="M50 30 L35 35 L38 30 L35 25 Z" fill="#4A5568"/>
                        </svg>
                    </div>

                    {/* Top-right directional arrow */}
                    <div style={{
                        ...floatingElementStyle,
                        top: '15%',
                        right: '10%',
                        animation: 'floatReverse 10s ease-in-out infinite'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                            <path d="M20 5 L35 20 L20 35 L25 20 Z" fill="#4A5568"/>
                            <path d="M5 20 L25 20" stroke="#4A5568" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                    </div>

                    {/* Left side small compass */}
                    <div style={{
                        ...floatingElementStyle,
                        left: '8%',
                        top: '60%',
                        animation: 'pulse 6s ease-in-out infinite, float 15s linear infinite'
                    }}>
                        <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
                            <circle cx="17.5" cy="17.5" r="15" stroke="#4A5568" strokeWidth="2"/>
                            <path d="M17.5 7.5 L22.5 17.5 L17.5 15 L12.5 17.5 Z" fill="#4A5568"/>
                        </svg>
                    </div>

                    {/* Right side navigation star */}
                    <div style={{
                        ...floatingElementStyle,
                        right: '5%',
                        top: '70%',
                        animation: 'float 9s ease-in-out infinite'
                    }}>
                        <svg width="45" height="45" viewBox="0 0 45 45" fill="none">
                            <path d="M22.5 2.5 L25.5 15.5 L37.5 22.5 L25.5 29.5 L22.5 42.5 L19.5 29.5 L7.5 22.5 L19.5 15.5 Z" fill="#4A5568"/>
                        </svg>
                    </div>

                    {/* Bottom left small arrow */}
                    <div style={{
                        ...floatingElementStyle,
                        left: '15%',
                        bottom: '20%',
                        animation: 'floatReverse 11s ease-in-out infinite'
                    }}>
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                            <path d="M15 5 L25 15 L15 25 L18 15 Z" fill="#4A5568"/>
                        </svg>
                    </div>

                    {/* Bottom right compass element */}
                    <div style={{
                        ...floatingElementStyle,
                        right: '12%',
                        bottom: '15%',
                        animation: 'pulse 8s ease-in-out infinite, floatReverse 14s linear infinite'
                    }}>
                        <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                            <circle cx="25" cy="25" r="20" stroke="#4A5568" strokeWidth="2"/>
                            <circle cx="25" cy="25" r="12" stroke="#4A5568" strokeWidth="1"/>
                            <circle cx="25" cy="25" r="2" fill="#4A5568"/>
                        </svg>
                    </div>

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
                <div style={{ marginBottom: '60px',
                    transform: `translateY(${scrollY * 0.3}px)`, // NEW: Parallax effect - main content moves slower than scroll
                    transition: 'transform 0.1s ease-out'
                 }}>
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
                        background: 'linear-gradient(-45deg, #4A5568, #6B7280, #8B5CF6, #4A5568)', // NEW: Animated gradient text
                        backgroundSize: '400% 400%', // NEW: Large background for smooth animation
                        animation: 'gradientShift 6s ease-in-out infinite', // NEW: Subtle color shifting
                        WebkitBackgroundClip: 'text', // NEW: Clip background to text
                        WebkitTextFillColor: 'transparent', // NEW: Make text transparent to show gradient
                        backgroundClip: 'text', // NEW: Standard property for non-webkit browsers
                        lineHeight: '1',
                        marginBottom: '8px',
                        letterSpacing: '-1px'
                    }}>UNY</h1>
                    <h2 style={{
                        fontSize: '32px',
                        fontWeight: '600',
                        background: 'linear-gradient(-45deg, #4A5568, #6B7280, #8B5CF6, #4A5568)', // NEW: Matching gradient
                        backgroundSize: '400% 400%', // NEW: Large background for smooth animation
                        animation: 'gradientShift 6s ease-in-out infinite', // NEW: Same animation as h1
                        WebkitBackgroundClip: 'text', // NEW: Clip background to text
                        WebkitTextFillColor: 'transparent', // NEW: Make text transparent to show gradient
                        backgroundClip: 'text', // NEW: Standard property for non-webkit browsers
                        lineHeight: '1',
                        letterSpacing: '4px',
                        marginBottom: '0'
                    }}>COMPASS</h2>

                    {/* NEW: Typing animation tagline */}
                    <div style={{
                        fontSize: '18px',
                        color: '#6B7280',
                        fontWeight: '600',
                        minHeight: '25px',
                        marginBottom: '0',
                        fontStyle: 'italic'
                    }}>
                        <span>{displayedText}</span>
                        <span style={{
                            animation: currentIndex < fullText.length ? 'blink 1s infinite' : 'none',
                            color: '#4A5568',
                            fontWeight: '600',
                            fontStyle: 'italic'
                        }}>|</span>
                    </div>
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
                        letterSpacing: '1px',
                        transform: `translateY(${scrollY * 0.1}px)` // NEW: Parallax effect - button moves at medium speed for depth
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
        </>
    );
};

export default LandingPage;