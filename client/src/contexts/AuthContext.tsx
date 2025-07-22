// client/src/contexts/AuthContext.tsx - FIXED AUTH VALIDATION
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
    id: number;
    username: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Helper function to check if token is expired
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        // Check if token is expired (with 30 second buffer)
        return payload.exp < (currentTime + 30);
    } catch (error) {
        console.error('Error parsing token:', error);
        return true; // Assume expired if we can't parse it
    }
}

// Helper function to validate token with server
async function validateTokenWithServer(token: string): Promise<boolean> {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Token validation failed:', error);
        return false;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // FIXED: Validate token before assuming user is logged in
    useEffect(() => {
        const checkAuthStatus = async () => {
            console.log('🔐 Checking auth status...');
            try {
                const token = localStorage.getItem('token');
                const savedUser = localStorage.getItem('user');

                console.log('🔐 Auth check:', {
                    hasToken: !!token,
                    hasSavedUser: !!savedUser,
                });

                if (!token || !savedUser) {
                    console.log('❌ No token or user data found');
                    setIsLoading(false);
                    return;
                }

                // STEP 1: Check if token is expired client-side
                if (isTokenExpired(token)) {
                    console.log('🕒 Token is expired client-side, clearing auth');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setIsLoading(false);
                    return;
                }

                // STEP 2: Validate token with server
                console.log('🔍 Validating token with server...');
                const isValid = await validateTokenWithServer(token);

                if (isValid) {
                    const userData = JSON.parse(savedUser);
                    setUser(userData);
                    console.log('✅ Auth validated for user:', userData.username);
                } else {
                    console.log('❌ Server rejected token, clearing auth');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }

            } catch (error) {
                console.error('❌ Auth validation failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setIsLoading(false);
                console.log('🔐 Auth initialization complete');
            }
        };

        checkAuthStatus();
    }, []);

    // Listen for logout events from other parts of the app
    useEffect(() => {
        const handleAuthLogout = () => {
            console.log('🚨 Auth logout event received');
            setUser(null);
        };

        window.addEventListener('auth-logout', handleAuthLogout);
        return () => window.removeEventListener('auth-logout', handleAuthLogout);
    }, []);

    // Login function
    const login = useCallback((userData: User) => {
        console.log('✅ Login successful for user:', userData.username);
        setUser(userData);
    }, []);

    // Logout function
    const logout = useCallback(() => {
        console.log('👋 Logging out user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};