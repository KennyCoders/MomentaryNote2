// src/components/Tabs.jsx
import React from 'react';

// Receive user prop
function Tabs({ user, activeTab, setActiveTab }) {
  return (
    <div className="tabs-container">
      <button
        className={activeTab === 'myIdeas' ? 'active' : ''}
        onClick={() => {
            // Only allow switching to My Ideas if logged in
            if (user) {
                setActiveTab('myIdeas')
            } else {
                alert("Please log in to see your ideas."); // Or handle more gracefully
            }
        }}
        // Visually disable the button if not logged in
        disabled={!user}
        title={!user ? "Login required" : "View your private ideas"} // Tooltip
      >
        My Ideas
      </button>
      <button
        className={activeTab === 'peoplesIdeas' ? 'active' : ''}
        onClick={() => setActiveTab('peoplesIdeas')}
      >
        People's Ideas
      </button>
    </div>
  );
}

export default Tabs;