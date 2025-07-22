// server/auth/authMiddleware.ts - ENHANCED VERSION
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './authService';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                username: string;
            };
        }
    }
}

// Enhanced authentication middleware with better error handling
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔐 Auth middleware called for:', req.method, req.path);

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = AuthService.verifyToken(token) as any;
        console.log('✅ Token verified for user:', decoded.userId, decoded.username);
        req.user = decoded;
        next();
    } catch (err: any) {
        console.log('❌ Token verification failed:', err.message);

        // Handle different JWT errors appropriately
        if (err.name === 'TokenExpiredError') {
            console.log('🕒 Token expired at:', err.expiredAt);
            return res.status(401).json({
                error: 'Token expired',
                expiredAt: err.expiredAt,
                code: 'TOKEN_EXPIRED'
            });
        } else if (err.name === 'JsonWebTokenError') {
            console.log('🔒 Invalid token format');
            return res.status(401).json({
                error: 'Invalid token format',
                code: 'INVALID_TOKEN'
            });
        } else {
            console.log('🚨 Unknown token error:', err);
            return res.status(403).json({
                error: 'Token verification failed',
                code: 'VERIFICATION_FAILED'
            });
        }
    }
};