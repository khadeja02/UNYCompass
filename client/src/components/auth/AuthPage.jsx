import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import LandingPage from './LandingPage';

const AuthPage = () => {
    const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'register', 'forgot-password'
    const { login } = useAuth();

    const switchToLanding = () => setCurrentView('landing');
    const switchToLogin = () => setCurrentView('login');
    const switchToRegister = () => setCurrentView('register');
    const switchToForgotPassword = () => setCurrentView('forgot-password');

    const handleAuthSuccess = (user) => {
        login(user);
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case 'landing':
                return <LandingPage switchToLogin={switchToLogin} />;
            case 'login':
                return (
                    <LoginForm
                        onLogin={handleAuthSuccess}
                        switchToRegister={switchToRegister}
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
            case 'forgot-password':
                return (
                    <ForgotPasswordForm
                        switchToLogin={switchToLogin}
                    />
                );
            default:
                return <LandingPage switchToLogin={switchToLogin} />;
        }
    };

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

                {renderCurrentView()}
            </div>
        </div>
    );
};

export default AuthPage;