import React, { useState, useEffect } from 'react';

const LandingPage = ({ switchToLogin }) => {
    // State for parallax scroll effect
    const [scrollY, setScrollY] = useState(0);

    // Back to Top button visibility - shows button when user scrolls down
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Typing animation effect - tracks current text being typed
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const fullText = "Discover your perfect academic path";

    // Interactive glow effect - tracks mouse position for floating elements
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Particle system state
    const [particles, setParticles] = useState([]);

    // ====== NEW FEATURE 1: STATS COUNTER ANIMATION - STATE ======
    const [statsVisible, setStatsVisible] = useState(false);
    const [animatedStats, setAnimatedStats] = useState({
        students: 0,
        majors: 0,
        universities: 0,
        satisfaction: 0
    });

    const finalStats = {
        students: 2847,
        majors: 156,
        universities: 47,
        satisfaction: 94
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrollY(currentScrollY);
            // Show back to top button when scrolled more than 300px
            setShowBackToTop(currentScrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Mouse tracking for glow effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Typing animation effect
    useEffect(() => {
        if (currentIndex < fullText.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(fullText.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, 80); // Speed of typing (80ms per character)
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, fullText]);

    // ====== NEW: STATS COUNTER ANIMATION EFFECT ======
    useEffect(() => {
        if (statsVisible) {
            const duration = 2000; // 2 seconds
            const steps = 60; // 60 frames for smooth animation
            const stepDuration = duration / steps;
            let currentStep = 0;

            const timer = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const easeOutQuart = 1 - Math.pow(1 - progress, 4); // Smooth easing function

                setAnimatedStats({
                    students: Math.round(finalStats.students * easeOutQuart),
                    majors: Math.round(finalStats.majors * easeOutQuart),
                    universities: Math.round(finalStats.universities * easeOutQuart),
                    satisfaction: Math.round(finalStats.satisfaction * easeOutQuart)
                });

                if (currentStep >= steps) {
                    clearInterval(timer);
                }
            }, stepDuration);

            return () => clearInterval(timer);
        }
    }, [statsVisible]);

    // Particle system initialization and animation
    useEffect(() => {
        // Initialize particles with random positions and properties
        const initializeParticles = () => {
            const newParticles = [];
            for (let i = 0; i < 25; i++) { // Create 25 particles
                newParticles.push({
                    id: i,
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    size: Math.random() * 4 + 2, // Size between 2-6px
                    speedX: (Math.random() - 0.5) * 0.5, // Slow horizontal movement
                    speedY: (Math.random() - 0.5) * 0.5, // Slow vertical movement
                    opacity: Math.random() * 0.3 + 0.1, // Opacity between 0.1-0.4
                    color: Math.random() > 0.5 ? '#4A5568' : '#8B5CF6' // Alternate between theme colors
                });
            }
            setParticles(newParticles);
        };

        // Animate particles continuously
        const animateParticles = () => {
            setParticles(prevParticles => 
                prevParticles.map(particle => {
                    // Calculate distance from mouse for interaction effect
                    const distanceFromMouse = Math.sqrt(
                        Math.pow(mousePos.x - particle.x, 2) + Math.pow(mousePos.y - particle.y, 2)
                    );
                    
                    // Repel particles from mouse cursor (within 150px radius)
                    let newSpeedX = particle.speedX;
                    let newSpeedY = particle.speedY;
                    
                    if (distanceFromMouse < 150) {
                        const repelForce = (150 - distanceFromMouse) / 150 * 2;
                        const angle = Math.atan2(particle.y - mousePos.y, particle.x - mousePos.x);
                        newSpeedX += Math.cos(angle) * repelForce * 0.02;
                        newSpeedY += Math.sin(angle) * repelForce * 0.02;
                    }
                    
                    // Apply some drag to prevent particles from moving too fast
                    newSpeedX *= 0.98;
                    newSpeedY *= 0.98;
                    
                    // Update particle position
                    let newX = particle.x + newSpeedX;
                    let newY = particle.y + newSpeedY;
                    
                    // Bounce off screen edges
                    if (newX <= 0 || newX >= window.innerWidth) {
                        newSpeedX *= -1;
                        newX = Math.max(0, Math.min(window.innerWidth, newX));
                    }
                    if (newY <= 0 || newY >= window.innerHeight) {
                        newSpeedY *= -1;
                        newY = Math.max(0, Math.min(window.innerHeight, newY));
                    }
                    
                    return {
                        ...particle,
                        x: newX,
                        y: newY,
                        speedX: newSpeedX,
                        speedY: newSpeedY
                    };
                })
            );
        };

        // Initialize particles on component mount
        initializeParticles();

        // Set up animation loop
        const animationInterval = setInterval(animateParticles, 16); // ~60fps

        // Handle window resize
        const handleResize = () => {
            initializeParticles(); // Reinitialize on resize
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            clearInterval(animationInterval);
            window.removeEventListener('resize', handleResize);
        };
    }, [mousePos]); // Depend on mousePos to trigger particle interactions

    // Animation styles for floating elements
    const floatingElementStyle = {
        position: 'absolute',
        opacity: 0.1,
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
        transition: 'all 0.3s ease' // Smooth transition for glow effect
    };

    // Function to calculate distance-based glow effect
    const getGlowStyle = (elementX, elementY) => {
        const distance = Math.sqrt(Math.pow(mousePos.x - elementX, 2) + Math.pow(mousePos.y - elementY, 2));
        const maxDistance = 200; // Increased detection radius (was 150)
        const glowIntensity = Math.max(0, (maxDistance - distance) / maxDistance);
        
        return {
            opacity: 0.1 + (glowIntensity * 0.6), // More dramatic opacity increase (was 0.3)
            filter: `drop-shadow(0 0 ${glowIntensity * 40}px rgba(139, 92, 246, ${glowIntensity * 0.9}))` // CHANGED: Larger, more intense glow (was 20px and 0.6 alpha)
        };
    };

    // ====== NEW: FUNCTION TO TOGGLE STATS VISIBILITY ======
    const toggleStats = () => {
        setStatsVisible(!statsVisible);
    };

    // Back to Top functionality - smoothly scrolls to top of page
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Keyframe animations defined in a style tag
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
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;

    return (
        <>
            <style>{animationStyles}</style>

            <div style={{
                minHeight: '100vh', // ====== CHANGED: Back to single viewport height for clean look ======
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, rgb(224, 195, 252) 0%, rgb(155, 181, 255) 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>

                {/* Existing particle system */}
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1
                }}>
                    {particles.map(particle => (
                        <div
                            key={particle.id}
                            style={{
                                position: 'absolute',
                                left: particle.x + 'px',
                                top: particle.y + 'px',
                                width: particle.size + 'px',
                                height: particle.size + 'px',
                                backgroundColor: particle.color,
                                borderRadius: '50%',
                                opacity: particle.opacity,
                                transition: 'opacity 0.3s ease',
                                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}40`
                            }}
                        />
                    ))}
                </div>

                {/* Existing floating background elements - ALL UNCHANGED */}
                <div style={{
                    ...floatingElementStyle,
                    top: '10%',
                    left: '5%',
                    animation: 'float 12s ease-in-out infinite',
                    zIndex : 2
                }}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="25" stroke="#4A5568" strokeWidth="2"/>
                        <path d="M30 10 L25 25 L30 22 L35 25 Z" fill="#4A5568"/>
                        <path d="M30 50 L35 35 L30 38 L25 35 Z" fill="#4A5568"/>
                        <path d="M10 30 L25 25 L22 30 L25 35 Z" fill="#4A5568"/>
                        <path d="M50 30 L35 35 L38 30 L35 25 Z" fill="#4A5568"/>
                    </svg>
                </div>

                <div style={{
                    ...floatingElementStyle,
                    top: '15%',
                    right: '10%',
                    animation: 'floatReverse 10s ease-in-out infinite',
                    zIndex: 2
                }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <path d="M20 5 L35 20 L20 35 L25 20 Z" fill="#4A5568"/>
                        <path d="M5 20 L25 20" stroke="#4A5568" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                </div>

                <div style={{
                    ...floatingElementStyle,
                    left: '8%',
                    top: '60%',
                    animation: 'pulse 6s ease-in-out infinite, float 15s linear infinite',
                    zIndex: 2
                }}>
                    <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
                        <circle cx="17.5" cy="17.5" r="15" stroke="#4A5568" strokeWidth="2"/>
                        <path d="M17.5 7.5 L22.5 17.5 L17.5 15 L12.5 17.5 Z" fill="#4A5568"/>
                    </svg>
                </div>

                <div style={{
                    ...floatingElementStyle,
                    right: '5%',
                    top: '70%',
                    animation: 'float 9s ease-in-out infinite',
                    zIndex: 2
                }}>
                    <svg width="45" height="45" viewBox="0 0 45 45" fill="none">
                        <path d="M22.5 2.5 L25.5 15.5 L37.5 22.5 L25.5 29.5 L22.5 42.5 L19.5 29.5 L7.5 22.5 L19.5 15.5 Z" fill="#4A5568"/>
                    </svg>
                </div>

                <div style={{
                    ...floatingElementStyle,
                    left: '15%',
                    bottom: '20%',
                    animation: 'floatReverse 11s ease-in-out infinite',
                    zIndex: 2
                }}>
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                        <path d="M15 5 L25 15 L15 25 L18 15 Z" fill="#4A5568"/>
                    </svg>
                </div>

                <div style={{
                    ...floatingElementStyle,
                    right: '12%',
                    bottom: '15%',
                    animation: 'pulse 8s ease-in-out infinite, floatReverse 14s linear infinite',
                    zIndex: 2
                }}>
                    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                        <circle cx="25" cy="25" r="20" stroke="#4A5568" strokeWidth="2"/>
                        <circle cx="25" cy="25" r="12" stroke="#4A5568" strokeWidth="1"/>
                        <circle cx="25" cy="25" r="2" fill="#4A5568"/>
                    </svg>
                </div>

                {/* Existing Header with Login Button - UNCHANGED */}
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

                {/* Existing Main Content - UNCHANGED */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    textAlign: 'center',
                    padding: '20px',
                    zIndex: 5,
                    minHeight: '100vh' // ====== CHANGED: Ensure first section takes full viewport height ======
                }}>
                    <div style={{ 
                        marginBottom: '60px',
                        transform: `translateY(${scrollY * 0.3}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="60" cy="60" r="55" stroke="#4A5568" strokeWidth="3" fill="none"/>
                                <circle cx="60" cy="60" r="45" stroke="#4A5568" strokeWidth="2" fill="none"/>
                                <path d="M60 25 L50 55 L60 50 L70 55 Z" fill="#4A5568"/>
                                <path d="M60 95 L70 65 L60 70 L50 65 Z" fill="#718096"/>
                                <circle cx="60" cy="60" r="4" fill="#4A5568"/>
                                <text x="60" y="20" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">N</text>
                                <text x="100" y="65" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">E</text>
                                <text x="60" y="105" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">S</text>
                                <text x="20" y="65" textAnchor="middle" fontSize="12" fill="#4A5568" fontWeight="bold">W</text>
                            </svg>
                        </div>
                        
                        <h1 style={{
                            fontSize: '64px',
                            fontWeight: '800',
                            color: '#4A5568',
                            background: 'linear-gradient(-45deg, #4A5568, #6B7280, #8B5CF6, #4A5568)',
                            backgroundSize: '400% 400%',
                            animation: 'gradientShift 6s ease-in-out infinite',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: '1',
                            marginBottom: '8px',
                            letterSpacing: '-1px'
                        }}>UNY</h1>
                        <h2 style={{
                            fontSize: '32px',
                            fontWeight: '600',
                            background: 'linear-gradient(-45deg, #4A5568, #6B7280, #8B5CF6, #4A5568)',
                            backgroundSize: '400% 400%',
                            animation: 'gradientShift 6s ease-in-out infinite',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: '1',
                            letterSpacing: '4px',
                            marginBottom: '0'
                        }}>COMPASS</h2>

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

                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginTop: '20px'
                    }}>
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
                                transform: `translateY(${scrollY * 0.3}px)`
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

                        {/* ====== NEW: OPTIONAL STATS TOGGLE BUTTON ====== */}
                        <button
                            onClick={toggleStats}
                            style={{
                                padding: '18px 48px',
                                background: 'transparent',
                                color: '#4A5568',
                                fontSize: '18px',
                                fontWeight: '600',
                                border: '2px solid #4A5568',
                                borderRadius: '25px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                letterSpacing: '1px',
                                transform: `translateY(${scrollY * 0.3}px)`
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = '#4A5568';
                                e.target.style.color = 'white';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = '#4A5568';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            {statsVisible ? 'Hide Stats' : 'Learn More'}
                        </button>
                    </div>
                </div>

                {/* ====== NEW FEATURE: OPTIONAL ANIMATED STATISTICS SECTION ====== */}
                {statsVisible && (
                    <div style={{
                        padding: '60px 20px 40px',
                        textAlign: 'center',
                        zIndex: 5,
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        margin: '40px 20px 0',
                        borderRadius: '20px',
                        animation: 'fadeIn 0.8s ease-out'
                    }}>
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: '600',
                            color: '#4A5568',
                            marginBottom: '40px',
                            animation: 'slideInFromLeft 0.6s ease-out'
                        }}>
                            Trusted by Students Worldwide
                        </h2>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '30px',
                            maxWidth: '800px',
                            margin: '0 auto'
                        }}>
                            {/* Students Helped */}
                            <div style={{
                                animation: 'slideInFromLeft 0.8s ease-out'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: '700',
                                    color: '#8B5CF6',
                                    marginBottom: '8px'
                                }}>
                                    {animatedStats.students.toLocaleString()}+
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#4A5568',
                                    fontWeight: '500'
                                }}>
                                    Students Helped
                                </div>
                            </div>

                            {/* Available Majors */}
                            <div style={{
                                animation: 'slideInFromRight 1s ease-out'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: '700',
                                    color: '#4ECDC4',
                                    marginBottom: '8px'
                                }}>
                                    {animatedStats.majors}+
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#4A5568',
                                    fontWeight: '500'
                                }}>
                                    Available Majors
                                </div>
                            </div>

                            {/* Partner Universities */}
                            <div style={{
                                animation: 'slideInFromLeft 1.2s ease-out'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: '700',
                                    color: '#FF6B6B',
                                    marginBottom: '8px'
                                }}>
                                    {animatedStats.universities}+
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#4A5568',
                                    fontWeight: '500'
                                }}>
                                    Partner Universities
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing Back to Top Button - UNCHANGED */}
                {showBackToTop && (
                    <button
                        onClick={scrollToTop}
                        style={{
                            position: 'fixed',
                            bottom: '40px',
                            right: '40px',
                            padding: '14px 18px',
                            background: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                            cursor: 'pointer',
                            zIndex: 100,
                            transition: 'background 0.2s, box-shadow 0.2s',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Back to Top"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 19V5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M5 12L12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                )}

                {/* Existing Footer Links - UNCHANGED */}
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
                    fontWeight: '500',
                    zIndex: 5
                }}>
                    <span style={{ cursor: 'pointer' }}>Terms of Use</span>
                    <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
                </div>
            </div>
        </>
    );
};

export default LandingPage;