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

// Helper to determine if we are running in mock mode
// Defaults to false (live mode) unless VITE_USE_MOCK_DATA is explicitly 'true'
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

function App() {
    // State
    const [activeTab, setActiveTab] = useState('peoplesIdeas'); // Default tab
    const [user, setUser] = useState(null); // Current authenticated user
    const [loadingAuth, setLoadingAuth] = useState(!isMockMode); // Track initial auth state loading

    // Refs for DOM elements (Tabs and Slider)
    const tabsRef = useRef(null);
    const sliderRef = useRef(null);

    // --- Authentication Logic ---
    useEffect(() => {
        // Use an async IIFE to handle potential async operations like dynamic import
        (async () => {
            let authSubscription = null; // To hold the Supabase subscription

            if (isMockMode) {
                console.warn("----- RUNNING IN MOCK MODE -----");
                try {
                    // Dynamically import mock data only when in mock mode
                    const mockDataModule = await import('./mockData');
                    const mockUser = mockDataModule.mockUser;

                    setUser(mockUser);
                    setActiveTab(mockUser ? 'myIdeas' : 'peoplesIdeas');
                    setLoadingAuth(false); // Mock mode setup is complete
                    console.log("Mock data loaded and set.");
                } catch (error) {
                    console.error("Failed to load mockData.js:", error);
                    alert("Error: Could not load mock data. Ensure mockData.js exists locally.");
                    setLoadingAuth(false); // Stop loading indicator even on error
                    setActiveTab('peoplesIdeas'); // Fallback tab
                }
                // No Supabase subscription needed in mock mode
                return; // Exit early
            }

            // --- Live Mode (Supabase) ---
            console.log("----- RUNNING IN LIVE MODE (using Supabase) -----");
            setLoadingAuth(true);

            // Fetch initial session state
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                setActiveTab(currentUser ? 'myIdeas' : 'peoplesIdeas'); // Set initial tab based on login status
            } catch (error) {
                console.error("Error fetching initial session:", error.message);
                setActiveTab('peoplesIdeas'); // Default to public tab on error
            } finally {
                setLoadingAuth(false); // Auth check finished
            }

            // Listen for authentication state changes (login, logout)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                // Update active tab based on auth events *after* initial load is done
                 if (!loadingAuth) { // Check loadingAuth flag might be less reliable here after async operations
                    if (_event === 'SIGNED_IN') {
                        setActiveTab('myIdeas');
                    } else if (_event === 'SIGNED_OUT') {
                        setActiveTab('peoplesIdeas');
                    }
                 }
                 // More direct approach: update tab based on user state change
                 // setActiveTab(currentUser ? 'myIdeas' : 'peoplesIdeas');
            });
            authSubscription = subscription; // Store the subscription to unsubscribe later

            // Return the cleanup function for the Supabase subscription
             return () => {
                 authSubscription?.unsubscribe();
                 console.log("Auth subscription unsubscribed.");
             };

        })(); // Immediately invoke the async function

        // The useEffect hook itself returns the cleanup function returned by the IIFE
    }, []); // Run only once on component mount (isMockMode won't change typically)

    // --- Tab Slider Logic ---
    // Updates the position and width of the slider indicator under the active tab
    useEffect(() => {
        // Wait until authentication is resolved and refs are available
        if (loadingAuth || !tabsRef.current || !sliderRef.current) return;

        const activeButton = tabsRef.current.querySelector(`.tab-button.active`);
        if (activeButton) {
            const tabContainerRect = tabsRef.current.getBoundingClientRect();
            const activeButtonRect = activeButton.getBoundingClientRect();
            const left = activeButtonRect.left - tabContainerRect.left; // Position relative to container
            const width = activeButtonRect.width;
            sliderRef.current.style.left = `${left}px`;
            sliderRef.current.style.width = `${width}px`;
        } else {
            // Hide slider if no tab is active (e.g., during transitions or initial state)
            sliderRef.current.style.width = '0px';
            sliderRef.current.style.left = '0px';
        }
    }, [activeTab, user, loadingAuth]); // Re-run when tab, user, or loading state changes

    // --- Login Handler ---
    const handleLogin = async () => {
        if (isMockMode) {
            console.log("Mock Login");
            // Define a simple mock user structure for login simulation
            const mockLoggedInUser = { id: 'mock-user-123', email: 'local.dev@example.com', isMock: true };
            setUser(mockLoggedInUser);
            setActiveTab('myIdeas'); // Switch to user's ideas tab on login
            return;
        }
        // Live mode: Initiate Supabase Google OAuth flow
        try {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) throw error;
            // Supabase handles the redirect and auth state change listener updates the UI
        } catch (error) {
            console.error('Error logging in:', error.message);
            alert('Login failed: ' + error.message);
        }
    };

    // --- Logout Handler ---
    const handleLogout = async () => {
        if (isMockMode) {
            console.log("Mock Logout");
            setUser(null); // Clear user state
            setActiveTab('peoplesIdeas'); // Switch to public tab on logout
            return;
        }
        // Live mode: Sign out using Supabase
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // Auth state change listener will update the UI
        } catch (error) {
            console.error('Error logging out:', error.message);
            alert('Logout failed: ' + error.message);
        }
    };

    // --- Render Logic ---

    // Show loading indicator while checking initial authentication status
    if (loadingAuth && !isMockMode) { // Only show loading for live mode initial auth check
        return <div className="loading-container">Loading...</div>;
    }

    // Main App Structure (using Fragment shorthand <>)
    return (
      <>
          {/* Header Component: Displays login/logout controls */}
          <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />

          {/* Main centered content container */}
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

              {/* Tabs Component: Navigation between My Ideas and People's Ideas */}
              <Tabs
                  user={user}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  tabsRef={tabsRef} // Pass ref for slider calculation
                  sliderRef={sliderRef} // Pass ref for slider element
              />

              {/* Main Content Area: Displays content based on the active tab */}
              <main className="content-area">
                  {/* Conditional Rendering for 'My Ideas' tab */}
                  {activeTab === 'myIdeas' ? (
                      user ? (
                          // Show user's ideas if logged in
                          <MyIdeas user={user} isMockMode={isMockMode} />
                      ) : (
                          // Show login prompt if not logged in
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
                  ) : null /* Render nothing if 'myIdeas' is not active */}

                  {/* Conditional Rendering for 'People's Ideas' tab */}
                  {activeTab === 'peoplesIdeas' && (
                      // Always show people's ideas when this tab is active
                      <PeoplesIdeas isMockMode={isMockMode} />
                  )}
              </main>
          </div> {/* End app-container */}
      </> // End Fragment
    );
}

export default App;