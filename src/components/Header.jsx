// src/components/Header.jsx
function Header({ user, onLogin, onLogout }) {

  return (
    <header className="app-header">
      <h1>Momentary Note</h1>
      <div>
        {user ?
          // Value if true (no extra parentheses needed around the fragment)
          <>
            <span>Hi, {user.user_metadata?.full_name || user.email}</span>
            <button onClick={onLogout} className="btn btn-secondary">Logout</button>
          </>
        : // Colon separating true/false
          // Value if false (no extra parentheses needed around the button)
          <button onClick={onLogin} className="btn btn-primary">Login with Google</button>
        } {/* Closing brace for the entire JS expression */}
      </div>
    </header>
  );
}

export default Header;