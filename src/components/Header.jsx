// src/components/Header.jsx
import React from 'react';

// Header now just renders the top-right user actions
function Header({ user, onLogin, onLogout }) {
    return (
        <header className="top-bar"> {/* Use top-bar class */}
            <div className="user-actions"> {/* Wrapper for user info/buttons */}
                {user ? (
                    <>
                        <span>Hi, {user.user_metadata?.full_name || user.email}</span>
                        {/* Added btn-logout class */}
                        <button onClick={onLogout} className="btn btn-secondary btn-logout">Logout</button>
                    </>
                ) : (
                    /* Added btn-login class */
                    <button onClick={onLogin} className="btn btn-primary btn-login">Login with Google</button>
                )}
            </div>
        </header>
    );
}

export default Header;