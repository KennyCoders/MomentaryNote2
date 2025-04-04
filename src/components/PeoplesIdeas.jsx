// src/components/PeoplesIdeas.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Supabase client (used when not in mock mode)
import AudioPlayer from './AudioPlayer';     // Audio player component
import { mockPublicIdeas, mockGetAudioUrl } from '../mockData'; // Mock data and helpers

const gradientClasses = [
    'gradient-2',  'gradient-4',
    'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
];
const getRandomGradientClass = () => {
    const randomIndex = Math.floor(Math.random() * gradientClasses.length);
    return gradientClasses[randomIndex];
};

// Receive isMockMode prop from App.jsx
function PeoplesIdeas({ isMockMode }) {
    // State for ideas, loading status, and errors
    const [publicIdeas, setPublicIdeas] = useState([]);
    // Start loaded if in mock mode, otherwise true to indicate fetching needed
    const [loadingPublicIdeas, setLoadingPublicIdeas] = useState(!isMockMode);
    const [error, setError] = useState(null);

    // Effect to fetch public ideas (Conditional)
    useEffect(() => {
        const fetchPublicIdeas = async () => {
            // --- MOCK MODE: Load mock data ---
            if (isMockMode) {
                console.log("PeoplesIdeas: Running in MOCK MODE. Fetching mock 'People's Ideas'.");
                // Simulate fetching delay slightly for realism if desired
                // await new Promise(resolve => setTimeout(resolve, 150));
                setPublicIdeas(mockPublicIdeas || []); // Use imported mock data or empty array
                setLoadingPublicIdeas(false);
                setError(null);
                return;
            }

            // --- LIVE MODE: Fetch from Supabase ---
            console.log("PeoplesIdeas: Running in LIVE MODE. Fetching public ideas from Supabase.");
            setLoadingPublicIdeas(true);
            setError(null); // Reset error on new fetch
            try {
                // Optional: Call DB function to update expired ideas *before* fetching public ones
                // This should ideally be a scheduled task, but can be called here if needed.
                // console.log("Checking for expired ideas...");
                // const { error: rpcError } = await supabase.rpc('check_and_update_expired_ideas');
                // if (rpcError) {
                //    console.warn("Warning: Error checking/updating expired ideas:", rpcError.message);
                //    // Decide if this should be a fatal error or just a warning
                // } else {
                //    console.log("Expired idea check complete.");
                // }

                // Fetch ideas marked as public
                const { data, error: fetchError } = await supabase
                    .from('ideas')
                    .select('id, created_at, description, file_path, original_filename') // Select only needed fields
                    .eq('is_public', true) // Filter for public ideas ONLY
                    // Optional filtering: Add .lt('expires_at', new Date().toISOString()) if needed,
                    // but the `is_public` flag should be the primary indicator.
                    .order('created_at', { ascending: false }); // Show newest first

                if (fetchError) throw fetchError; // Throw error to be caught below

                setPublicIdeas(data || []); // Set fetched data or empty array

            } catch (err) {
                console.error('Error fetching public ideas:', err.message);
                setError(`Failed to load ideas: ${err.message}`); // Set error message for display
                setPublicIdeas([]); // Clear ideas on error
            } finally {
                setLoadingPublicIdeas(false); // Stop loading indicator
            }
        };

        fetchPublicIdeas();
        // Optional: Set up a timer to refetch periodically?
        // const intervalId = setInterval(fetchPublicIdeas, 60000); // Refetch every 60 seconds
        // return () => clearInterval(intervalId); // Cleanup interval on unmount

    }, [isMockMode]); // Re-run effect if the mode changes


     // --- Get Public URL for Audio (Conditional Helper) ---
     const getAudioUrl = (filePath) => {
        // --- MOCK MODE: Use mock URL getter ---
        if (isMockMode) {
            return mockGetAudioUrl(filePath); // Use the imported mock function
        }

        // --- LIVE MODE: Get URL from Supabase Storage ---
        if (!filePath) return null; // No path, no URL
        try {
            const { data } = supabase.storage
                .from('ideas-audio') // Ensure bucket name is correct
                .getPublicUrl(filePath);
            // Check if data and publicUrl exist
            if (data?.publicUrl) {
                return data.publicUrl;
            } else {
                console.warn(`Could not retrieve public URL for path: ${filePath}`);
                return null;
            }
        } catch (fetchError) {
            console.error(`Error getting public URL for ${filePath}:`, fetchError);
            return null; // Return null on error
        }
    };


    // --- Render Logic ---
    return (
        <div className="peoples-ideas-container">
            {/* Section Header (Centered via CSS) */}
            <h2 className="section-subtitle">
                Shared{' '} {/* This is plain text */}
                <span className="subtitle-char">N</span><span className="subtitle-char">o</span><span className="subtitle-char">t</span><span className="subtitle-char">e</span><span className="subtitle-char">s</span>

            </h2>
            <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--dark-gray)' }}>
                These are musical ideas shared publicly by other users.
            </p>

            {/* Display Loading State */}
            {loadingPublicIdeas && (
                <div className="loading-container">Loading public ideas...</div> // Use loading class
            )}

            {/* Display Error State */}
            {error && (
                <div className="feedback-area list-feedback">
                    <p className="error-message">Error: {error}</p>
                 </div>
            )}

             {/* Display Ideas Grid if not loading and no error */}
            {!loadingPublicIdeas && !error && (
                 publicIdeas.length === 0 ? (
                    // Message when no public ideas are available
                    <p style={{ textAlign: 'center' }}>No public ideas available right now. Check back later!</p>
                ) : (
                    // Grid for displaying idea boxes (CSS controls columns and centering)
                    <div className="ideas-grid">
                        {publicIdeas.map((idea) => {
                            // Assign a random gradient class for each card
                            const gradientClass = getRandomGradientClass(); // Make sure this function is defined above
                            return (
                                // Apply the dynamic gradient class to the idea box
                                <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                    {/* Display Name */}
                                    <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>

                                    {/* Display Description if it exists */}
                                    {idea.description && <p className="idea-description">{idea.description}</p>}

                                    {/* Display Date Shared */}
                                    <p className="idea-dates">
                                        Shared: {new Date(idea.created_at).toLocaleDateString()}
                                    </p>

                                    {/* Audio Player Component */}
                                    <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />

                                    {/* No remove button for public ideas */}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

export default PeoplesIdeas;