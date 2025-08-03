import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
// NEW: Import LandingPage
import LandingPage from './LandingPage'; 

const AuthPage = () => {
    // CHANGED: Updated state to handle three views instead of just login/register
    //const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'forgot-password'

    // CHANGED: Added 'landing' as initial view
    const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'register', 'forgot-password
    const { login } = useAuth();

    const switchToLogin = () => setCurrentView('login');
    const switchToRegister = () => setCurrentView('register');
    const switchToForgotPassword = () => setCurrentView('forgot-password');
    // NEW: Function to switch to landing page
    const switchToLanding = () => setCurrentView('landing'); 
    const handleAuthSuccess = (user) => {
        login(user);
    };

    // NEW: Added LandingPage to view options
    const renderCurrentView = () => {
        switch (currentView) {
            case 'landing':
                return <LandingPage 
                    switchToLogin={switchToLogin} 
                    switchToRegister={switchToRegister} 
                />;
            case 'login':
                return (
                    <LoginForm
                        onLogin={handleAuthSuccess}
                        switchToRegister={switchToRegister}
                        switchToForgotPassword={switchToForgotPassword}
                        switchToLanding={switchToLanding} // NEW: Pass landing navigation
                    />
                );
            case 'register':
                return (
                    <RegisterForm
                        onRegister={handleAuthSuccess}
                        switchToLogin={switchToLogin}
                        switchToLanding={switchToLanding} // NEW: Pass landing navigation
                    />
                );
            case 'forgot-password':
                return (
                    <ForgotPasswordForm
                        switchToLogin={switchToLogin}
                        switchToLanding={switchToLanding} // NEW: Pass landing navigation
                    />
                );
            default:
                return <LandingPage 
                    switchToLogin={switchToLogin} 
                    switchToRegister={switchToRegister} 
                />;
        }
    };

    // Render LandingPage without any wrapper
    if (currentView === 'landing') {
        return (
            <LandingPage 
                switchToLogin={switchToLogin}
                switchToRegister={switchToRegister}
            />
        );
    }

    return (
        
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg,rgb(145, 0, 235) 50%,rgb(48, 3, 93) 100%)',
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
                
                {/* NEW: Back button for auth forms */}
                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                    <button
                        onClick={switchToLanding}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4871ff',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        ← Back to Home
                    </button>
                </div>
                
                {/* CHANGED: Now renders different views using renderCurrentView function */}
                {renderCurrentView()}
            </div>
        </div>
    );
};

export default AuthPage;