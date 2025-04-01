// src/App.jsx

// React imports for component definition and hooks
import React, { useState, useEffect, useRef } from 'react'; // <-- Make sure useRef is listed here!

// Supabase client import for authentication and data fetching
import { supabase } from './supabaseClient'; // Assuming supabaseClient.js is in the same src folder

// Import child components
import Header from './components/Header';     // Component for the top bar
import Tabs from './components/Tabs';         // Component for tab navigation
import MyIdeas from './components/MyIdeas';     // Component to display user's private ideas
import PeoplesIdeas from './components/PeoplesIdeas'; // Component to display public ideas

// Import the CSS file for App component styling
import './App.css'; // Assuming App.css is in the same src folder

function App() {
  // State to manage which tab is currently active ('myIdeas' or 'peoplesIdeas')
  const [activeTab, setActiveTab] = useState('peoplesIdeas'); // Default before auth check
  // State to hold the authenticated user object (null if not logged in)
  const [user, setUser] = useState(null);
  // State to track if the initial authentication check is in progress
  const [loadingAuth, setLoadingAuth] = useState(true);

  const tabsRef = useRef(null); // Ref for the container holding the buttons
  const sliderRef = useRef(null); // Ref for the slider element itself

  // --- Authentication Logic ---
  useEffect(() => {
    setLoadingAuth(true); // Indicate loading when the component mounts

    // Function to check the current session state on initial load
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error; // Handle potential errors during session fetching

        const currentUser = session?.user ?? null;
        setUser(currentUser); // Set user state based on session

        // Set the initial active tab based on login status
        if (currentUser) {
          setActiveTab('myIdeas'); // Default to 'My Ideas' if logged in
        } else {
          setActiveTab('peoplesIdeas'); // Default to 'People's Ideas' if not logged in
        }
      } catch (error) {
        console.error("Error fetching initial session:", error.message);
        // Keep the default 'peoplesIdeas' tab if there's an error
        setActiveTab('peoplesIdeas');
      } finally {
        setLoadingAuth(false); // Stop loading indicator after initial check completes
      }
    };

    fetchSession(); // Call the function to check the session

    // --- Authentication State Change Listener ---
    // Subscribe to changes in the user's authentication state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser); // Update user state whenever auth state changes

      // Adjust the active tab based on login/logout events
      if (_event === 'SIGNED_IN') {
        setActiveTab('myIdeas'); // Switch to 'My Ideas' upon login
      } else if (_event === 'SIGNED_OUT') {
        setActiveTab('peoplesIdeas'); // Switch to 'People's Ideas' upon logout
      }
      // Note: setLoadingAuth is primarily for the *initial* load,
      // so we don't typically set it back to false here.
    });

    // --- Cleanup ---
    // Unsubscribe from the listener when the component unmounts to prevent memory leaks
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount


  // --- Tab Slider Logic ---
  useEffect(() => {
    if (loadingAuth || !tabsRef.current || !sliderRef.current) return; // Don't run if loading or refs not ready

    // Find the active button within the tabs container
    const activeButton = tabsRef.current.querySelector(`.tab-button.active`);

    if (activeButton) {
        const tabContainerRect = tabsRef.current.getBoundingClientRect();
        const activeButtonRect = activeButton.getBoundingClientRect();

        // Calculate position relative to the tabs container
        const left = activeButtonRect.left - tabContainerRect.left;
        const width = activeButtonRect.width;

        // Apply styles to the slider
        sliderRef.current.style.left = `${left}px`;
        sliderRef.current.style.width = `${width}px`;
    } else {
         // Optionally hide slider if no button is active (e.g., user logged out)
         sliderRef.current.style.width = '0px';
    }

}, [activeTab, user, loadingAuth]); // Re-run when tab, user, or loading state changes
  

  // --- Login Handler ---
  const handleLogin = async () => {
    try {
      // Initiate Google OAuth login flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // Optional: specify where to redirect after login if needed
        // options: {
        //   redirectTo: window.location.origin
        // }
      });
      if (error) throw error; // Throw error to be caught below
      // The onAuthStateChange listener will handle setting the user state
    } catch (error) {
      console.error('Error logging in:', error.message);
      alert('Login failed: ' + error.message); // Simple user feedback
    }
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    try {
      // Sign the user out
      const { error } = await supabase.auth.signOut();
      if (error) throw error; // Throw error to be caught below
      // The onAuthStateChange listener will handle clearing the user state and changing the tab
    } catch (error) {
      console.error('Error logging out:', error.message);
      alert('Logout failed: ' + error.message); // Simple user feedback
    }
  };


  // --- Render Logic ---

  // Display a loading message while checking the initial authentication status
  if (loadingAuth) {
    // You could replace this with a more sophisticated loading spinner component
    return <div className="loading-container">Loading...</div>;
  }

// --- Render Logic ---
    if (loadingAuth) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="app-container">
            {/* Render Header (now just the top bar user actions) */}
            <Header
                user={user}
                onLogin={handleLogin}
                onLogout={handleLogout}
            />

            {/* Render the Main Title Centered */}
            <h1 className="main-title">Momentary Note</h1>

            {/* Render Tabs - Pass refs and slider element */}
             {/* Conditionally render tabs only if user is logged in? Or always show? */}
             {/* Let's always show them for now, disable 'My Ideas' if logged out */}
            <Tabs
                user={user}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabsRef={tabsRef} // Pass the ref for the container
                sliderRef={sliderRef} // Pass the ref for the slider div
            />

            {/* Main content area */}
            <main className="content-area">
                {activeTab === 'myIdeas' && <MyIdeas user={user} />}
                {activeTab === 'peoplesIdeas' && <PeoplesIdeas />}
            </main>
        </div>
    );
}
export default App;