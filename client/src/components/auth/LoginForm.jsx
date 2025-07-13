import React, { useState } from 'react';

const LoginForm = ({ onLogin, switchToRegister }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        console.log('=== LOGIN DEBUG START ===');
        console.log('Form data:', formData);

        try {
            console.log('Making fetch request to /api/auth/login...');

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            console.log('Response received:', response);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Login successful, storing token...');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Token stored, calling onLogin...');
                onLogin(data.user);
            } else {
                console.log('Login failed with error:', data.error);
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            console.log('=== CATCH BLOCK TRIGGERED ===');
            console.log('Error type:', typeof err);
            console.log('Error message:', err.message);
            console.log('Full error:', err);
            console.log('Error stack:', err.stack);
            setError('Network error. Please try again.');
        } finally {
            console.log('=== LOGIN DEBUG END ===');
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Username or Email:</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Password:</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <p className="text-center mt-4 text-sm">
                Don't have an account?{' '}
                <button
                    type="button"
                    onClick={switchToRegister}
                    className="text-blue-600 hover:underline"
                >
                    Register here
                </button>
            </p>
        </div>
    );
};

export default LoginForm;
