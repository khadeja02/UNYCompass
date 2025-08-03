import React, { useState } from 'react';    

const LandingPage = ({ switchToLogin, switchToRegister }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #ddc4f8ff 0%, #47027bff 100%)',
            color: 'white',
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{
                    fontSize: '52px',
                    fontWeight: '800',
                    color: 'black',
                    lineHeight: '1',
                    marginBottom: '8px',
                    letterSpacing: '-1px'
                }}>UNY</h1>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#5f10b3ff',
                    lineHeight: '1',
                    letterSpacing: '1px'
                }}>COMPASS</h2>
            </div>

            <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '20px',
                maxWidth: '600px'
            }}>
                Discover Your Academic Path
            </h1>
            
            <p style={{
                fontSize: '1.25rem',
                marginBottom: '40px',
                maxWidth: '600px',
                lineHeight: '1.6',
            }}>
                AI-powered guidance to match your strengths and interests with ideal university programs
            </p>
            
            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                marginBottom: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <button
                    onClick={switchToLogin}
                    style={{
                        padding: '16px 40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid white',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minWidth: '180px',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
                    }}
                >
                    Login
                </button>
                
                <button
                    onClick={switchToRegister}
                    style={{
                        padding: '16px 40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid white',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minWidth: '180px',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
                    }}
                >
                    Register
                </button>
            </div>
            
            <div style={{
                marginTop: '60px',
                padding: '20px',
                width: '100%',
                maxWidth: '600px'
            }}>
                <p style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)'
                }}>
                    © {new Date().getFullYear()} UNY Compass. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;