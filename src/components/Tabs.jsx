// src/components/Tabs.jsx
import React from 'react';

// Receive refs from App.jsx
function Tabs({ user, activeTab, setActiveTab, tabsRef, sliderRef }) {

    const handleTabClick = (tabName) => {
       
        setActiveTab(tabName);
    };

    return (
        // Assign the container ref here
        <div className="tabs" ref={tabsRef}>
            <button
                // Use 'disabled' class for potential styling, but REMOVE the disabled attribute
                className={`tab-button ${activeTab === 'myIdeas' ? 'active' : ''} ${!user ? 'logged-out-view' : ''}`} // Changed 'disabled' class to 'logged-out-view' for clarity
                onClick={() => handleTabClick('myIdeas')}
                // REMOVED: disabled={!user} - Make it always clickable
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