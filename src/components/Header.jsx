// src/components/Header.jsx
import React from 'react';
// We'll add the necessary CSS classes in App.css

function Header({ user, onLogin, onLogout }) {
  return (
    // Use a <header> tag for semantics
    // Add the 'app-header' class for styling
    <header className="app-header">
      {/* Add an inner container to constrain the content width */}
      <div className="header-content">
        {/* This div now holds the user actions */}
        <div className="user-actions">
          {user ? (
            // If user is logged in
            <>
              <span>Hi, {user.email?.split('@')[0] || 'User'}</span> {/* Display part of email or "User" */}
              <button onClick={onLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            // If user is logged out
            <button onClick={onLogin} className="btn-login">
              Login with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;