// server/auth/userModel.ts
// Simple TypeScript interfaces - no validation libraries, keeping it minimal

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuthResponse {
  message: string;
  user?: PublicUser;
  token?: string;
}

export interface ErrorResponse {
  error: string;
}