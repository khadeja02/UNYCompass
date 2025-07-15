import * as React from 'react';
import { Link } from 'react-router-dom';
import unyCompassLogo from '@/assets/uny-compass-logo.png';
import '@/styles/HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="app">
      <header>
        <nav>
          <div className="login-register">
            <Link to="/login" className="auth-btn login-btn">Login</Link>
            <Link to="/register" className="auth-btn register-btn">Register</Link>
          </div>
        </nav>
      </header>
      
      <main>
        <div className="logo-container">
          <img 
            src={unyCompassLogo} 
            alt="UNY COMPASS Logo" 
            className="logo"
          />
        </div>
        <button className="explore-btn">Start Exploring</button>
      </main>
    </div>
  );
};

export default HomePage;