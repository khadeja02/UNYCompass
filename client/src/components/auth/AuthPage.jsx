import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
// NEW: Import for forgot password functionality
import ForgotPasswordForm from './ForgotPasswordForm';

const AuthPage = () => {
    // CHANGED: Updated state to handle three views instead of just login/register
    const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'forgot-password'
    const { login } = useAuth();

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
                return (
                    <LoginForm
                        onLogin={handleAuthSuccess}
                        switchToRegister={switchToRegister}
                        // NEW: Pass forgot password switch function to LoginForm
                        switchToForgotPassword={switchToForgotPassword}
                    />
                );
        }
    };

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
                
                {/* CHANGED: Now renders different views using renderCurrentView function */}
                {renderCurrentView()}
            </div>
        </div>
    );
};

export default AuthPage;