// src/App.jsx

// React imports for component definition and hooks
import React, { useState, useEffect, useRef } from 'react';

// Supabase client import (only used when not in mock mode)
import { supabase } from './supabaseClient';

// Import child components
import Header from './components/Header';
import Tabs from './components/Tabs';
import MyIdeas from './components/MyIdeas';
import PeoplesIdeas from './components/PeoplesIdeas';
import './App.css'; // Main application styles

// Import mock data (used only when in mock mode)
import { mockUser } from './mockData';

// Helper to determine if we are running in mock mode
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'false';

function App() {
    // State
    const [activeTab, setActiveTab] = useState('peoplesIdeas');
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(!isMockMode);

    // Refs
    const tabsRef = useRef(null);
    const sliderRef = useRef(null);

    // --- Authentication Logic ---
    useEffect(() => {
        if (isMockMode) {
            console.warn("----- RUNNING IN MOCK MODE -----");
            setUser(mockUser);
            setActiveTab(mockUser ? 'myIdeas' : 'peoplesIdeas');
            setLoadingAuth(false);
            return;
        }

        console.log("----- RUNNING IN LIVE MODE (using Supabase) -----");
        setLoadingAuth(true);
        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                setActiveTab(currentUser ? 'myIdeas' : 'peoplesIdeas');
            } catch (error) {
                console.error("Error fetching initial session:", error.message);
                setActiveTab('peoplesIdeas');
            } finally {
                setLoadingAuth(false);
            }
        };
        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (!loadingAuth) {
                if (_event === 'SIGNED_IN') setActiveTab('myIdeas');
                else if (_event === 'SIGNED_OUT') setActiveTab('peoplesIdeas');
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [loadingAuth]); // Dependency array remains correct


    // --- Tab Slider Logic ---
    useEffect(() => {
        if (loadingAuth || !tabsRef.current || !sliderRef.current) return;
        const activeButton = tabsRef.current.querySelector(`.tab-button.active`);
        if (activeButton) {
            const tabContainerRect = tabsRef.current.getBoundingClientRect();
            const activeButtonRect = activeButton.getBoundingClientRect();
            const left = activeButtonRect.left - tabContainerRect.left;
            const width = activeButtonRect.width;
            sliderRef.current.style.left = `${left}px`;
            sliderRef.current.style.width = `${width}px`;
        } else {
            sliderRef.current.style.width = '0px';
            sliderRef.current.style.left = '0px';
        }
    }, [activeTab, user, loadingAuth]);


    // --- Login Handler ---
    const handleLogin = async () => {
        if (isMockMode) {
            console.log("Mock Login");
            const userToLogin = mockUser || { id: 'mock-user-123', email: 'local.dev@example.com' };
            setUser(userToLogin);
            setActiveTab('myIdeas');
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) throw error;
        } catch (error) {
            console.error('Error logging in:', error.message);
            alert('Login failed: ' + error.message);
        }
    };

    // --- Logout Handler ---
    // Corrected comment placement or removal
    const handleLogout = async () => {
        if (isMockMode) {
            console.log("Mock Logout");
            setUser(null);
            setActiveTab('peoplesIdeas');
            return;
        }
        // Comment moved or removed from between } and try
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error logging out:', error.message);
            alert('Logout failed: ' + error.message);
        }
    };

    // --- Render Logic ---
    if (loadingAuth) {
        return <div className="loading-container">Loading...</div>;
    }

    // *** Main App Structure with Fragment Wrapper ***
    return (
      <> {/* Single parent element: Fragment */}

          {/* Header is rendered first, outside the centered container */}
          <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />

          {/* The main centered content container */}
          <div className="app-container">
              {/* Main Title */}
              <h1 className="main-title">
                  Momentary{' '}
                  <span className="title-char">N</span>
                  <span className="title-char">o</span>
                  <span className="title-char">t</span>
                  <span className="title-char">e</span>
                  {' '}♪
              </h1>

              {/* Tabs */}
              <Tabs
                  user={user}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  tabsRef={tabsRef}
                  sliderRef={sliderRef}
              />

              {/* Main Content Area */}
              <main className="content-area">
                  {/* Conditional Rendering based on activeTab */}
                  {activeTab === 'myIdeas' ? (
                      user ? (
                          <MyIdeas user={user} isMockMode={isMockMode} />
                      ) : (
                          <div className="login-prompt">
                              <p>
                                  To be able to add and view your ideas, please{' '}
                                  <button className="link-button" onClick={handleLogin}>
                                      log in
                                  </button>
                                  .
                              </p>
                          </div>
                      )
                  ) : null}

                  {activeTab === 'peoplesIdeas' && <PeoplesIdeas isMockMode={isMockMode} />}
              </main>
          </div> {/* End app-container comment removed or placed inside */}

      </> // Trailing comment removed
    );
}

export default App;