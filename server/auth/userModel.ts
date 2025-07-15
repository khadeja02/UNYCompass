// server/auth/userModel.ts
import { z } from 'zod';

// User schema for validation
export const userSchema = z.object({
    id: z.number(),
    username: z.string().min(3).max(50),
    email: z.string().email().max(100),
    password_hash: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date().optional(),
});

// Registration schema
export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be less than 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string()
        .email('Please enter a valid email address')
        .max(100, 'Email must be less than 100 characters'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

// Login schema
export const loginSchema = z.object({
    username: z.string().min(1, 'Username or email is required'),
    password: z.string().min(1, 'Password is required'),
});

// Profile update schema
export const updateProfileSchema = z.object({
    email: z.string()
        .email('Please enter a valid email address')
        .max(100, 'Email must be less than 100 characters'),
});

// Password update schema
export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(6, 'New password must be at least 6 characters')
        .max(100, 'New password must be less than 100 characters'),
});

// TypeScript types
export type User = z.infer<typeof userSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordData = z.infer<typeof updatePasswordSchema>;

// Public user type (without sensitive data)
export type PublicUser = Omit<User, 'password_hash'>;

// JWT payload type
export interface JWTPayload {
    userId: number;
    username: string;
    iat?: number;
    exp?: number;
}

// API response types
export interface AuthResponse {
    success: boolean;
    message: string;
    user?: PublicUser;
    token?: string;
    error?: string;
}

export interface ApiError {
    success: false;
    error: string;
    message: string;
    details?: any;
}

export interface ApiSuccess<T = any> {
    success: true;
    message: string;
    data?: T;
}

// Validation helper functions
export const validateRegistration = (data: any): { valid: boolean; errors?: any; data?: RegisterData } => {
    try {
        const validData = registerSchema.parse(data);
        return { valid: true, data: validData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { valid: false, errors: error.flatten().fieldErrors };
        }
        return { valid: false, errors: { general: 'Validation failed' } };
    }
};

export const validateLogin = (data: any): { valid: boolean; errors?: any; data?: LoginData } => {
    try {
        const validData = loginSchema.parse(data);
        return { valid: true, data: validData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { valid: false, errors: error.flatten().fieldErrors };
        }
        return { valid: false, errors: { general: 'Validation failed' } };
    }
};

export const validateProfileUpdate = (data: any): { valid: boolean; errors?: any; data?: UpdateProfileData } => {
    try {
        const validData = updateProfileSchema.parse(data);
        return { valid: true, data: validData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { valid: false, errors: error.flatten().fieldErrors };
        }
        return { valid: false, errors: { general: 'Validation failed' } };
    }
};

export const validatePasswordUpdate = (data: any): { valid: boolean; errors?: any; data?: UpdatePasswordData } => {
    try {
        const validData = updatePasswordSchema.parse(data);
        return { valid: true, data: validData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { valid: false, errors: error.flatten().fieldErrors };
        }
        return { valid: false, errors: { general: 'Validation failed' } };
    }
};