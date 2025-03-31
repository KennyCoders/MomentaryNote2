// src/components/Tabs.jsx
import React from 'react';

function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-container">
      <button
        className={activeTab === 'myIdeas' ? 'active' : ''}
        onClick={() => setActiveTab('myIdeas')}
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