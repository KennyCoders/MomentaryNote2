// Inside PeoplesIdeas.jsx
const [publicIdeas, setPublicIdeas] = useState([]);
const [loadingPublicIdeas, setLoadingPublicIdeas] = useState(false);

useEffect(() => {
  const fetchPublicIdeas = async () => {
    setLoadingPublicIdeas(true);
    try {
      // Optional: Run the expiration check first (see Step 11 Option B)
      // await supabase.rpc('check_and_update_expired_ideas'); // If using DB function

      const { data, error } = await supabase
        .from('ideas')
        .select('id, created_at, description, file_path, original_filename') // Select necessary fields
        // Optionally select user info if needed, requires table join setup
        .eq('is_public', true)
        .order('created_at', { ascending: false }); // Or random order?

      if (error) throw error;
      setPublicIdeas(data || []);
    } catch (error) {
      console.error('Error fetching public ideas:', error.message);
    } finally {
      setLoadingPublicIdeas(false);
    }
  };

  fetchPublicIdeas();
  // Potentially add a refresh button or interval polling
}, []); // Fetch once on mount