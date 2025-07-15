import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import unyCompassLogo from '@/assets/uny-compass-logo.png';
import '@/styles/Register.css';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle registration logic
    console.log('Registration form submitted:', formData);
  };

  return (
    <div className="app register-app">
      <header>
        <nav>
          <div className="login-register">
            <Link to="/" className="auth-btn home-btn">Home</Link>
          </div>
        </nav>
      </header>
      
      <main className="register-main">
        <div className="logo-container">
          <img 
            src={unyCompassLogo} 
            alt="UNY COMPASS Logo" 
            className="logo"
          />
        </div>
        
        <div className="register-form-container">
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input 
                type="text" 
                id="fullName" 
                className="form-control"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                className="form-control"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                className="form-control"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                className="form-control"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-links">
              <div className="left-link">
                <span>Already have an account? </span>
                <Link to="/login">Login</Link>
              </div>
              <div className="right-link">
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
            
            <button type="submit" className="register-submit-btn">Register</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Register;