// src/components/Tabs.jsx
import React from 'react';

// Receive refs from App.jsx
function Tabs({ user, activeTab, setActiveTab, tabsRef, sliderRef }) {

    const handleTabClick = (tabName) => {
        // Prevent switching to 'My Ideas' if not logged in
        if (tabName === 'myIdeas' && !user) {
            alert("Please log in to view your ideas."); // Or handle differently
            return;
        }
        setActiveTab(tabName);
    };

    return (
        // Assign the container ref here
        <div className="tabs" ref={tabsRef}>
            <button
                className={`tab-button ${activeTab === 'myIdeas' ? 'active' : ''} ${!user ? 'disabled' : ''}`} // Add disabled class visually if needed
                onClick={() => handleTabClick('myIdeas')}
                disabled={!user} // Optionally disable interaction too
            >
                My Ideas
            </button>
            <button
                className={`tab-button ${activeTab === 'peoplesIdeas' ? 'active' : ''}`}
                onClick={() => handleTabClick('peoplesIdeas')}
            >
                People's Ideas
            </button>
            {/* Add the slider element - assign its ref here */}
            <div className="tab-slider" ref={sliderRef}></div>
        </div>
    );
}

export default Tabs;