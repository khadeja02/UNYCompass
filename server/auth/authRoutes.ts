// server/auth/authRoutes.ts
import { Router, Request, Response } from 'express';
import { AuthService } from './authService';
import { authenticateToken } from './authMiddleware';

const router = Router();

// Register new user - EXACT same as original
router.post('/register', async (req: Request, res: Response) => {
    try {
        console.error('🔍 REGISTER DEBUG - req.body:', req.body);
        console.error('🔍 REGISTER DEBUG - content-type:', req.headers['content-type']);

        const { username, email, password } = req.body;

        const { user, token } = await AuthService.register(username, email, password);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.created_at
            },
            token
        });

    } catch (err: any) {
        console.error('Registration error:', err);

        if (err.message === 'Username, email, and password are required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Password must be at least 6 characters long') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Username or email already exists') {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user - WITH DEBUGGING
router.post('/login', async (req: Request, res: Response) => {
    try {
        // EXTENSIVE DEBUG LOGGING
        console.error('🔍 LOGIN DEBUG START ================================');
        console.error('🔍 LOGIN DEBUG - req.body:', req.body);
        console.error('🔍 LOGIN DEBUG - req.body type:', typeof req.body);
        console.error('🔍 LOGIN DEBUG - req.body keys:', Object.keys(req.body || {}));
        console.error('🔍 LOGIN DEBUG - req.headers:', req.headers);
        console.error('🔍 LOGIN DEBUG - content-type:', req.headers['content-type']);
        console.error('🔍 LOGIN DEBUG - req.method:', req.method);
        console.error('🔍 LOGIN DEBUG - req.path:', req.path);
        console.error('🔍 LOGIN DEBUG - req.url:', req.url);
        console.error('🔍 LOGIN DEBUG - JSON.stringify(req.body):', JSON.stringify(req.body));
        console.error('🔍 LOGIN DEBUG END ==================================');

        // Check if body exists
        if (!req.body || typeof req.body !== 'object') {
            console.error('❌ LOGIN ERROR - req.body is not an object:', req.body);
            return res.status(400).json({ error: 'Invalid request body' });
        }

        // Check if required fields exist
        const { username, password } = req.body;

        console.error('🔍 LOGIN DEBUG - Extracted username:', username);
        console.error('🔍 LOGIN DEBUG - Extracted password:', password ? '[HIDDEN]' : 'undefined');

        if (!username || !password) {
            console.error('❌ LOGIN ERROR - Missing username or password');
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.error('✅ LOGIN DEBUG - Calling AuthService.login...');
        const { user, token } = await AuthService.login(username, password);

        console.error('✅ LOGIN DEBUG - AuthService.login successful');
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        });

    } catch (err: any) {
        console.error('❌ Login error:', err);
        console.error('❌ Login error stack:', err.stack);

        if (err.message === 'Username and password are required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Invalid credentials') {
            return res.status(401).json({ error: err.message });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a test endpoint to verify body parsing
router.post('/test', (req: Request, res: Response) => {
    console.error('🧪 TEST ENDPOINT - req.body:', req.body);
    console.error('🧪 TEST ENDPOINT - content-type:', req.headers['content-type']);
    console.error('🧪 TEST ENDPOINT - headers:', req.headers);

    res.json({
        message: 'Test endpoint reached',
        body: req.body,
        headers: req.headers,
        contentType: req.headers['content-type']
    });
});

// Get user profile - EXACT same as original
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await AuthService.getUserById(req.user!.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (err: any) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile - EXACT same as original
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const updatedUser = await AuthService.updateProfile(req.user!.userId, email);

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (err: any) {
        console.error('Profile update error:', err);

        if (err.message === 'Email is required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Email already in use') {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update password - EXACT same as original
router.put('/password', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        await AuthService.updatePassword(req.user!.userId, currentPassword, newPassword);

        res.json({ message: 'Password updated successfully' });

    } catch (err: any) {
        console.error('Password update error:', err);

        if (err.message === 'Current password and new password are required') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'New password must be at least 6 characters long') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'User not found') {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === 'Current password is incorrect') {
            return res.status(401).json({ error: err.message });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout - EXACT same as original
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
    res.json({ message: 'Logout successful' });
});

export default router;