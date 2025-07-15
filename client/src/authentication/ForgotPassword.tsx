import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import unyCompassLogo from '@/assets/uny-compass-logo.png';
import '@/styles/ForgotPassword.css'; 

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle forgot password logic
    console.log('Password reset requested for:', email);
  };

  return (
    <div className="app forgot-password-app">
      <header>
        <nav>
          <div className="login-register">
            <Link to="/" className="auth-btn home-btn">Home</Link>
          </div>
        </nav>
      </header>
      
      <main className="forgot-password-main">
        <div className="logo-container">
          <img 
            src={unyCompassLogo} 
            alt="UNY COMPASS Logo" 
            className="logo"
          />
        </div>
        
        <div className="forgot-password-form-container">
          <form className="forgot-password-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Reset Your Password</h2>
            <p className="form-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                className="form-control"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="forgot-password-submit-btn">
              Send Reset Link
            </button>
            
            <div className="form-links">
              <div className="left-link">
                <span>Remember your password? </span>
                <Link to="/login">Sign in</Link>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;