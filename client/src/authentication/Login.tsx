import * as React from 'react';
import { Link } from 'react-router-dom';
import unyCompassLogo from '@/assets/uny-compass-logo.png';
import '@/styles/Login.css';

const Login: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic
  };

  return (
    <div className="app login-app">
      <header>
        <nav>
          <div className="login-register">
            <Link to="/" className="auth-btn home-btn">Home</Link>
          </div>
        </nav>
      </header>
      
      <main className="login-main">
        <div className="logo-container">
          <img 
            src={unyCompassLogo} 
            alt="UNY COMPASS Logo" 
            className="logo"
          />
        </div>
        
        <div className="login-form-container">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                className="form-control"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                className="form-control"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <div className="form-links">
              <div className="left-link">
                <span>Don't have an account? </span>
                <Link to="/register">Sign up</Link>
              </div>
              <div className="right-link">
                <Link to="/forgot-password">Forget password? Click here</Link>
              </div>
            </div>
            
            <button type="submit" className="login-submit-btn">Login</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;