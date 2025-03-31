// src/components/PeoplesIdeas.jsx
import React, { useState, useEffect } from 'react'; // Make sure these are imported
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer'; // Assuming you'll need this

function PeoplesIdeas() {
    // State for ideas and loading status
    const [publicIdeas, setPublicIdeas] = useState([]);
    const [loadingPublicIdeas, setLoadingPublicIdeas] = useState(false);
    const [error, setError] = useState(null); // Add error state

    // Fetch public ideas
    useEffect(() => {
        const fetchPublicIdeas = async () => {
            setLoadingPublicIdeas(true);
            setError(null); // Reset error on new fetch
            try {
                // --- Expiration Check Placeholder ---
                // If you implement the DB function later, uncomment:
                // const { error: rpcError } = await supabase.rpc('check_and_update_expired_ideas');
                // if (rpcError) console.warn("Error checking expired ideas:", rpcError);
                // --- End Placeholder ---

                const { data, error: fetchError } = await supabase
                    .from('ideas')
                    .select('id, created_at, description, file_path, original_filename') // Select fields
                    .eq('is_public', true) // Filter for public ideas
                    .order('created_at', { ascending: false }); // Newest first

                if (fetchError) throw fetchError; // Throw error to be caught

                setPublicIdeas(data || []); // Set data or empty array
            } catch (err) {
                console.error('Error fetching public ideas:', err.message);
                setError(`Failed to load ideas: ${err.message}`); // Set error state
                setPublicIdeas([]); // Clear ideas on error
            } finally {
                setLoadingPublicIdeas(false); // Stop loading indicator
            }
        };

        fetchPublicIdeas();
    }, []); // Empty dependency array means run once on mount

     // --- Get Public URL for Audio (Helper) ---
     // (Copied from MyIdeas - can be moved to a shared utility file later)
     const getAudioUrl = (filePath) => {
         if (!filePath) return null;
         try {
            const { data } = supabase.storage
              .from('ideas-audio') // Ensure bucket name matches
              .getPublicUrl(filePath);
            return data?.publicUrl;
         } catch (fetchError) { // Renamed variable to avoid conflict
             console.error("Error getting public URL:", fetchError);
             return null;
         }
    };


    // --- Render Logic ---
    return (
        <div className="peoples-ideas-container">
            <h2>People's Ideas</h2>
            <p>These are musical ideas shared by other users. Feel free to use them!</p>

            {/* Display Loading State - Now 'loadingPublicIdeas' is used */}
            {loadingPublicIdeas && <p>Loading ideas...</p>}

            {/* Display Error State */}
            {error && <p className="error-message">Error: {error}</p>}

             {/* Display Ideas if not loading and no error */}
            {!loadingPublicIdeas && !error && (
                 publicIdeas.length === 0 ? (
                    <p>No public ideas available right now.</p>
                ) : (
                    <div className="ideas-grid"> {/* Use the same grid class */}
                        {/* Map over publicIdeas - Now 'publicIdeas' is used */}
                        {publicIdeas.map((idea) => (
                            <div key={idea.id} className="idea-box"> {/* Use the same box class */}
                                <p className="idea-filename">File: {idea.original_filename || 'Unknown'}</p>
                                {idea.description && <p className="idea-description">Desc: {idea.description}</p>}
                                <p className="idea-dates">
                                    Shared: {new Date(idea.created_at).toLocaleDateString()}
                                </p>
                                {/* Add Audio Player */}
                                <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                {/* No remove button here */}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default PeoplesIdeas;