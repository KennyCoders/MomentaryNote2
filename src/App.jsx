// src/App.jsx

// React imports for component definition and hooks
import React, { useState, useEffect } from 'react';

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

  // Render the main application structure
  return (
    <div className="app-container"> {/* Main wrapper for centering and layout */}
      {/* Render the Header, passing user data and login/logout handlers */}
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Render the Tabs, passing user data, active tab state, and the state setter */}
      <Tabs
        user={user} // Pass user to conditionally render tabs if needed
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main content area where the selected tab's component is displayed */}
      <main className="content-area">
        {/* Conditionally render the MyIdeas component if the 'myIdeas' tab is active */}
        {/* Pass the user object down, as MyIdeas needs it to fetch/upload user-specific data */}
        {activeTab === 'myIdeas' && <MyIdeas user={user} />}

        {/* Conditionally render the PeoplesIdeas component if the 'peoplesIdeas' tab is active */}
        {/* This component fetches public data, so it doesn't strictly need the user object */}
        {activeTab === 'peoplesIdeas' && <PeoplesIdeas />}
      </main>

      {/* Optional: You could add a Footer component here */}
      {/* <Footer /> */}
    </div>
  );
}

// Export the App component for use in your application's entry point (e.g., main.jsx)
export default App;