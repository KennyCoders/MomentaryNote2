// src/App.jsx
// ... imports ...

function App() {
    const [activeTab, setActiveTab] = useState('peoplesIdeas'); // Default to People's Ideas? Or check user status first?
    const [user, setUser] = useState(null); // State for the user object
    const [loadingAuth, setLoadingAuth] = useState(true); // State to track initial auth check
  
    // --- Move Auth Logic Here ---
    useEffect(() => {
      setLoadingAuth(true);
      // Check initial session
      const fetchSession = async () => {
         const { data: { session } } = await supabase.auth.getSession();
         setUser(session?.user ?? null);
         setLoadingAuth(false);
         // If user exists on load, maybe default to My Ideas?
         if (session?.user) {
              setActiveTab('myIdeas');
         } else {
              setActiveTab('peoplesIdeas'); // Ensure default if no user
         }
      }
      fetchSession();
  
      // Listen for auth changes (login/logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        // If user logs out while on My Ideas tab, switch to People's Ideas
        if (_event === 'SIGNED_OUT') {
            setActiveTab('peoplesIdeas');
        }
   
        if (_event === 'SIGNED_IN') {
           setActiveTab('myIdeas');
        }
        // Stop loading indicator only after the listener is set up AND initial check is done (if needed)
        setLoadingAuth(false); // Moved setLoading(false) into fetchSession for clarity
      });
  
      // Cleanup subscription on component unmount
      return () => subscription?.unsubscribe();
    }, []); // Empty dependency array means this runs once on mount
  
    // --- Move Login/Logout Handlers Here ---
     const handleLogin = async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          // Optional: Add redirect options if needed later
          // options: {
          //   redirectTo: window.location.origin // Redirect back to your app page after Google login
          // }
        });
        if (error) throw error;
        // No need to setUser here, onAuthStateChange listener will handle it
      } catch (error) {
        console.error('Error logging in:', error.message);
        alert('Error logging in: ' + error.message);
      }
    };
  
    const handleLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
         // No need to setUser here, onAuthStateChange listener will handle it
      } catch (error) {
        console.error('Error logging out:', error.message);
        alert('Error logging out: ' + error.message);
      }
    };
  
  
    // --- Render Logic ---
    // Show loading indicator while checking auth initially
    if (loadingAuth) {
      return <div>Loading authentication...</div>;
    }
  
    return (
      <div className="app-container">
        {/* Pass user state and handlers down to Header */}
        <Header
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
        />
        {/* Pass user state and active tab state down to Tabs */}
        <Tabs
            user={user} /* Pass user to Tabs */
            activeTab={activeTab}
            setActiveTab={setActiveTab}
        />
        <main className="content-area">
          {/* Pass user state down to MyIdeas */}
          {activeTab === 'myIdeas' && <MyIdeas user={user} />} {/* Pass user to MyIdeas */}
          {activeTab === 'peoplesIdeas' && <PeoplesIdeas />} {/* People's Ideas doesn't strictly need user, but could */}
        </main>
      </div>
    );
  }
  
  export default App;