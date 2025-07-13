import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login } = useAuth();

    const switchToLogin = () => setIsLogin(true);
    const switchToRegister = () => setIsLogin(false);

    const handleAuthSuccess = (user) => {
        login(user);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                {isLogin ? (
                    <LoginForm
                        onLogin={handleAuthSuccess}
                        switchToRegister={switchToRegister}
                    />
                ) : (
                    <RegisterForm
                        onRegister={handleAuthSuccess}
                        switchToLogin={switchToLogin}
                    />
                )}
            </div>
        </div>
    );
};

export default AuthPage;