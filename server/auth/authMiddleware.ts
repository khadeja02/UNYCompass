// server/auth/authMiddleware.ts
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

// EXACT same authentication middleware as original routes.ts
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = AuthService.verifyToken(token) as any;
        req.user = decoded;
        next();
    } catch (err: any) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};