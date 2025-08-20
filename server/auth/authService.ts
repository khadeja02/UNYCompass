// server/auth/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
import { EmailService } from './emailService';

// Load environment variables
config();

// PostgreSQL connection - EXACT same as original
const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const JWT_SECRET = process.env.JWT_SECRET;

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash?: string;
    reset_token?: string;
    reset_token_expiry?: Date;
    created_at: Date;
    updated_at?: Date;
}

export class AuthService {
    // Test database connection - EXACT same as original
    static async testConnection(): Promise<boolean> {
        try {
            console.log('Testing database connection...');
            console.log('Connection string:', process.env.DATABASE_PUBLIC_URL?.replace(/:[^:]*@/, ':****@')); // Hide password

            const client = await pool.connect();
            console.log('✅ Database connected successfully!');

            const result = await client.query('SELECT NOW()');
            console.log('✅ Query test successful:', result.rows[0]);

            client.release();
            return true;
        } catch (err) {
            console.error('❌ Database connection failed:', err);
            return false;
        }
    }

    // Initialize users table - UPDATED to include reset token fields
    static async createUsersTable(): Promise<void> {
        const isConnected = await AuthService.testConnection();
        if (!isConnected) {
            console.error('❌ Skipping table creation due to connection failure');
            return;
        }

        try {
            await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          reset_token VARCHAR(255),
          reset_token_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ Users table created or already exists');

            // Add reset token columns if they don't exist (for existing tables)
            try {
                await pool.query(`
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP
                `);
                console.log('✅ Reset token columns added or already exist');
            } catch (alterErr) {
                console.log('ℹ️ Reset token columns may already exist:', alterErr);
            }
        } catch (err) {
            console.error('❌ Error creating users table:', err);
        }
    }

    // Register new user - EXACT same logic as original
    static async register(username: string, email: string, password: string) {
        // Validation
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('Username or email already exists');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
            [username, email, passwordHash]
        );

        const newUser = result.rows[0];

        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return { user: newUser, token };
    }

    // Login user - EXACT same logic as original
    static async login(username: string, password: string) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        const result = await pool.query(
            'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = result.rows[0];

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return { user: { id: user.id, username: user.username, email: user.email }, token };
    }

    static async requestPasswordReset(email: string): Promise<void> {
        console.log('🔍 Requesting password reset for:', email);

        // Check if user exists
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            console.log('❌ User not found for email:', email);
            return;
        }

        const user = result.rows[0];
        console.log('✅ User found:', user.username);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Use UTC timezone explicitly
        const expiryResult = await pool.query(`
        SELECT 
            NOW() AT TIME ZONE 'UTC' as current_utc,
            (NOW() AT TIME ZONE 'UTC' + INTERVAL '1 hour') as expiry_utc
    `);

        const currentUtc = expiryResult.rows[0].current_utc;
        const resetTokenExpiry = expiryResult.rows[0].expiry_utc;

        console.log('🔍 Generated reset token:', resetToken);
        console.log('🔍 Current UTC time:', currentUtc);
        console.log('🔍 Token expiry (UTC):', resetTokenExpiry);

        // Store reset token in database
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
            [resetToken, resetTokenExpiry, email]
        );

        console.log('✅ Reset token stored in database');

        // Test validation immediately
        const testQuery = await pool.query(
            'SELECT id, (reset_token_expiry > NOW() AT TIME ZONE \'UTC\') as is_valid_utc FROM users WHERE reset_token = $1',
            [resetToken]
        );

        console.log('🔍 IMMEDIATE TEST with UTC:', {
            found: testQuery.rows.length > 0,
            isValidUTC: testQuery.rows[0]?.is_valid_utc
        });

        try {
            await EmailService.sendPasswordResetEmail(email, resetToken);
            console.log('✅ Password reset email sent successfully to:', email);
        } catch (emailError) {
            console.error('❌ Failed to send password reset email:', emailError);
        }
    }

    // Reset password with token
    static async resetPassword(token: string, newPassword: string): Promise<void> {
        console.log('🔍 Resetting password with token:', token);

        if (!token || !newPassword) {
            throw new Error('Token and new password are required');
        }

        if (newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Use UTC timezone for comparison
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW() AT TIME ZONE \'UTC\'',
            [token]
        );

        if (result.rows.length === 0) {
            console.log('❌ Invalid or expired reset token (UTC check):', token);

            // Debug: Check if token exists but is expired
            const debugResult = await pool.query(`
            SELECT 
                username,
                reset_token_expiry,
                NOW() AT TIME ZONE 'UTC' as current_utc,
                (reset_token_expiry > NOW() AT TIME ZONE 'UTC') as is_valid_utc
            FROM users 
            WHERE reset_token = $1
        `, [token]);

            if (debugResult.rows.length > 0) {
                console.log('🔍 Token found but expired (UTC):', debugResult.rows[0]);
            } else {
                console.log('🔍 Token not found in database at all');
            }

            throw new Error('Invalid or expired reset token');
        }

        const user = result.rows[0];
        console.log('✅ Valid reset token for user:', user.username);

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token
        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, user.id]
        );

        console.log('✅ Password reset successfully for user:', user.username);
    }

    // Get user by ID 
    static async getUserById(userId: number) {
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = $1',
            [userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    // Update user profile 
    static async updateProfile(userId: number, email: string) {
        if (!email) {
            throw new Error('Email is required');
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('Email already in use');
        }

        const result = await pool.query(
            'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, updated_at',
            [email, userId]
        );

        return result.rows[0];
    }

    // Update password 
    static async updatePassword(userId: number, currentPassword: string, newPassword: string) {
        if (!currentPassword || !newPassword) {
            throw new Error('Current password and new password are required');
        }

        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        const result = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, userId]
        );
    }

    // Verify JWT token 
    static verifyToken(token: string) {
        return jwt.verify(token, JWT_SECRET!);
    }

    //  Test email functionality
    static async testEmail(email: string): Promise<void> {
        try {
            await EmailService.sendTestEmail(email);
            console.log('✅ Test email sent successfully');
        } catch (error) {
            console.error('❌ Test email failed:', error);
            throw error;
        }
    }
}