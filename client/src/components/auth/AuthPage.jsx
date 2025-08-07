import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
// NEW: Import for forgot password functionality
import ForgotPasswordForm from './ForgotPasswordForm';
// NEW: Import for landing page functionality
import LandingPage from './LandingPage';

const AuthPage = () => {
    // CHANGED: Updated state to handle four views instead of three (added 'landing')
    const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'register', 'forgot-password'
    const { login } = useAuth();

    // NEW: Function to switch to landing view
    const switchToLanding = () => setCurrentView('landing');
    const switchToLogin = () => setCurrentView('login');
    const switchToRegister = () => setCurrentView('register');

    // NEW: Function to switch to forgot password view
    const switchToForgotPassword = () => setCurrentView('forgot-password');

    const handleAuthSuccess = (user) => {
        login(user);
    };

    // NEW: Function to render different views based on currentView state
    const renderCurrentView = () => {
        switch (currentView) {
            // NEW: Case for landing page view
            case 'landing':
                return <LandingPage switchToLogin={switchToLogin} />;
            case 'login':
                return (
                    <LoginForm
                        onLogin={handleAuthSuccess}
                        switchToRegister={switchToRegister}
                        // NEW: Pass forgot password switch function to LoginForm
                        switchToForgotPassword={switchToForgotPassword}
                    />
                );
            case 'register':
                return (
                    <RegisterForm
                        onRegister={handleAuthSuccess}
                        switchToLogin={switchToLogin}
                    />
                );
            // NEW: Case for forgot password view
            case 'forgot-password':
                return (
                    <ForgotPasswordForm
                        switchToLogin={switchToLogin}
                    />
                );
            default:
                // CHANGED: Default case now returns landing page instead of login
                return <LandingPage switchToLogin={switchToLogin} />;
        }
    };

    // CHANGED: Conditional rendering - landing page has its own styling, others use the card layout
    if (currentView === 'landing') {
        return renderCurrentView();
    }

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
                
                {/* CHANGED: Now renders different views using renderCurrentView function */}
                {renderCurrentView()}
            </div>
        </div>
    );
};

export default AuthPage;