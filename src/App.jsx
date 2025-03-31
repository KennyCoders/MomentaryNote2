// src/App.jsx

import React, { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import MyIdeas from './components/MyIdeas';
import PeoplesIdeas from './components/PeoplesIdeas';
import './App.css'; // Create or modify this for basic styling

function App() {
  const [activeTab, setActiveTab] = useState('myIdeas'); // 'myIdeas' or 'peoplesIdeas'
  // We'll add user state later

  return (
    <div className="app-container">
      <Header /> {/* We'll pass user info later */}
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="content-area">
        {activeTab === 'myIdeas' && <MyIdeas />}
        {activeTab === 'peoplesIdeas' && <PeoplesIdeas />}
      </main>
    </div>
  );
}

export default App;