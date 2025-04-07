// src/components/PeoplesIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer';
// Import necessary mock data and potentially the update function if needed elsewhere
import { mockPublicIdeas, mockGetAudioUrl, updateMockIdeaVotes } from '../mockData';

// --- localStorage Helper Functions ---
const VOTED_IDEAS_KEY = 'momentaryNoteUpvotes';

const getVotedIdeas = () => {
    try {
        const voted = localStorage.getItem(VOTED_IDEAS_KEY);
        // Use a Set for efficient lookups
        return voted ? new Set(JSON.parse(voted)) : new Set();
    } catch (e) {
        console.error("Error reading voted ideas from localStorage:", e);
        return new Set(); // Return empty set on error
    }
};
// Checks if a specific idea ID has been voted on
const hasVoted = (ideaId) => {
    // Directly use the getter function for the latest value
    return getVotedIdeas().has(ideaId);
};
// Adds an idea ID to the set of voted ideas in localStorage
const markAsVoted = (ideaId) => {
    try {
        const votedSet = getVotedIdeas();
        votedSet.add(ideaId);
        // Convert Set back to array for JSON serialization
        localStorage.setItem(VOTED_IDEAS_KEY, JSON.stringify([...votedSet]));
    } catch (e) {
        console.error("Error saving voted idea to localStorage:", e);
    }
};
// --- End localStorage Helpers ---


// Helper function for random gradients
const gradientClasses = [
    'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5',
    'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
];
const getRandomGradientClass = () => gradientClasses[Math.floor(Math.random() * gradientClasses.length)];

// Helper function to sort ideas (Sorts by upvotes DESC, then creation date DESC)
const sortIdeas = (ideas) => {
    // Ensure ideas is an array before sorting
    if (!Array.isArray(ideas)) {
        console.warn("sortIdeas received non-array:", ideas);
        return [];
    }
    return [...ideas].sort((a, b) => {
        // Handle potential missing upvotes property gracefully
        const upvotesA = a?.upvotes ?? 0;
        const upvotesB = b?.upvotes ?? 0;

        if (upvotesB !== upvotesA) {
            return upvotesB - upvotesA; // Descending upvotes
        }
        // Then sort by creation date descending (newest first)
        // Handle potential invalid dates gracefully
        const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (isNaN(dateA) || isNaN(dateB)) {
            return 0; // Avoid errors if dates are invalid/missing
        }
        return dateB - dateA;
    });
};

function PeoplesIdeas({ isMockMode }) {
    const [publicIdeas, setPublicIdeas] = useState([]);
    const [loading, setLoading] = useState(true); // Start loading true initially
    const [error, setError] = useState(null);
    const [upvotingId, setUpvotingId] = useState(null);
    // State to track which ideas the *current browser* has voted on, initialized lazily
    const [localVotes, setLocalVotes] = useState(() => getVotedIdeas());

    // Fetch public ideas function (selects upvotes and bpm)
    const fetchPublicIdeas = useCallback(async () => {
        setError(null);
        setLoading(true); // Ensure loading state is set

        // MOCK MODE
        if (isMockMode) {
            console.log("PeoplesIdeas: Running in MOCK MODE. Fetching mock 'Public Ideas'.");
            try {
                 // Make sure mockPublicIdeas is treated as the source of truth
                const currentMockIdeas = mockPublicIdeas || [];
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 300));
                const sortedMockIdeas = sortIdeas(currentMockIdeas);
                setPublicIdeas(sortedMockIdeas);
            } catch(mockError) {
                console.error("Error processing mock data:", mockError);
                setError("Failed to load mock ideas.");
                setPublicIdeas([]);
            } finally {
                setLoading(false);
            }
            return; // End mock mode execution
        }

        // --- Live Mode (Supabase) ---
        console.log("PeoplesIdeas: Running in LIVE MODE. Fetching public ideas from Supabase.");
        try {
            const now = new Date().toISOString();
            const { data, error: dbError } = await supabase
                .from('ideas')
                // Select bpm along with other fields
                .select('id, description, file_path, original_filename, created_at, is_public, expires_at, upvotes, bpm')
                // Fetch ideas that are explicitly public OR whose expiry date has passed
                .or(`is_public.eq.true,expires_at.lte.${now}`)
                // Order by upvotes descending, then by creation date descending
                .order('upvotes', { ascending: false, nullsFirst: false }) // Handle potential nulls if default isn't strictly enforced
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;

            // Sort data after fetching
            const sortedData = sortIdeas(data || []);
            setPublicIdeas(sortedData);
        } catch (err) {
            console.error('Error fetching public ideas:', err.message);
            setError(`Failed to load ideas: ${err.message}`);
            setPublicIdeas([]); // Clear ideas on error
        } finally {
            setLoading(false);
        }
    }, [isMockMode]); // Dependency array includes isMockMode

    // Effect to fetch ideas on mount and when mode changes
    useEffect(() => {
        fetchPublicIdeas();
    }, [fetchPublicIdeas]); // fetchPublicIdeas correctly depends on isMockMode

    // Effect to listen for localStorage changes in other tabs
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === VOTED_IDEAS_KEY) {
                setLocalVotes(getVotedIdeas()); // Update state if localStorage changes elsewhere
            }
        };
        window.addEventListener('storage', handleStorageChange);
        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []); // Run only once on mount


    // --- Handle Upvote (Corrected logic for count update) ---
    const handleUpvote = async (ideaId, currentUpvotes) => {
        // 1. Check localStorage first (using state for immediate check)
        if (localVotes.has(ideaId)) {
             console.log(`Already voted for idea ${ideaId} in this browser.`);
             return;
        }

        // 2. Prevent double-clicks
        if (upvotingId === ideaId) return;
        setUpvotingId(ideaId); // Mark as processing
        setError(null); // Clear previous errors

        // 3. Prepare the new vote count
        const numericCurrentUpvotes = Number(currentUpvotes) || 0;
        const newVoteCount = numericCurrentUpvotes + 1;
        console.log(`Attempting to upvote idea ${ideaId}. Current: ${numericCurrentUpvotes}, New: ${newVoteCount}`);

        // 4. Optimistic UI Update
        const optimisticallyUpdatedIdeas = publicIdeas.map(idea => {
            if (idea.id === ideaId) {
                 // Create a NEW object with the updated count
                return { ...idea, upvotes: newVoteCount };
            }
            return idea;
        });
        setPublicIdeas(sortIdeas(optimisticallyUpdatedIdeas)); // Update state and re-sort

        // --- Perform Backend/Mock Update ---

        // MOCK MODE
        if (isMockMode) {
            console.log(`PeoplesIdeas: MOCK MODE. Updating vote for ${ideaId} to ${newVoteCount}.`);
            try {
                await new Promise(resolve => setTimeout(resolve, 200));
                updateMockIdeaVotes(ideaId, newVoteCount); // Update central mock data (optional)
                markAsVoted(ideaId); // Mark in localStorage
                setLocalVotes(prevVotes => new Set(prevVotes).add(ideaId)); // Update local state
                console.log(`Mock vote for ${ideaId} complete.`);
            } catch (mockError) {
                 console.error("Mock upvote simulation error:", mockError);
                 setError("Mock vote failed.");
                 // Rollback optimistic update
                 setPublicIdeas(sortIdeas(publicIdeas.map(idea =>
                    idea.id === ideaId ? { ...idea, upvotes: numericCurrentUpvotes } : idea
                 )));
            } finally {
                setUpvotingId(null);
            }
            return; // End mock mode
        }

        // LIVE MODE (Supabase)
        console.log(`PeoplesIdeas: LIVE MODE. Updating vote for ${ideaId} in Supabase to ${newVoteCount}.`);
        try {
            // Send the calculated newVoteCount directly.
            const { data, error: updateError } = await supabase
                .from('ideas')
                .update({ upvotes: newVoteCount }) // Send the new total
                .eq('id', ideaId)
                .select('id, upvotes') // Optionally select to confirm
                .single(); // Use single if expecting one row update

            if (updateError) {
                 if (updateError.code === 'PGRST116') { // Example: Row not found
                     console.warn(`Supabase update failed for idea ${ideaId}, likely deleted.`, updateError);
                     setError(`Could not vote, the idea may no longer exist.`);
                     setPublicIdeas(prevIdeas => sortIdeas(prevIdeas.filter(idea => idea.id !== ideaId)));
                 } else { throw updateError; } // Rethrow other errors
            } else {
                 console.log(`Successfully upvoted idea ${ideaId} in Supabase. DB New count: ${data?.upvotes ?? newVoteCount}`);
                 markAsVoted(ideaId); // Mark locally only on success
                 setLocalVotes(prevVotes => new Set(prevVotes).add(ideaId));
            }
        } catch (err) {
            console.error(`Error upvoting idea ${ideaId} in Supabase:`, err);
            setError(`Failed to upvote idea. Please try again.`);
            // Rollback optimistic update on error
            setPublicIdeas(sortIdeas(publicIdeas.map(idea =>
                idea.id === ideaId ? { ...idea, upvotes: numericCurrentUpvotes } : idea
            )));
        } finally {
            setUpvotingId(null); // Stop processing indicator
        }
    };
    // --- End Handle Upvote ---


     // --- Get Audio URL ---
     const getAudioUrl = (filePath) => {
        if (isMockMode) return mockGetAudioUrl(filePath);
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('ideas-audio').getPublicUrl(filePath);
             if (!data || !data.publicUrl) {
                console.warn(`Could not get public URL for path: ${filePath}`);
                return null;
            }
            return data.publicUrl;
        } catch (error) { console.error(`Error getting public URL for ${filePath}:`, error); return null; }
    };

    // --- Render Logic ---
    return (
        <div className="peoples-ideas-container">
            {/* Loading / Error / Empty States */}
            {error && <div className="feedback-area list-feedback"><p className="error-message">{error}</p></div>}
            {loading ? <div className="loading-container">Loading shared ideas...</div>
             : publicIdeas.length === 0 && !error ? <p style={{ textAlign: 'center' }}>No public ideas found yet.</p>
             : (
                 // Grid Display
                <div className="ideas-grid">
                    {publicIdeas.map((idea) => {
                        // Basic check for valid idea object
                        if (!idea || !idea.id) {
                            console.warn("Skipping invalid idea object:", idea);
                            return null;
                        }

                        const gradientClass = getRandomGradientClass();
                        const isProcessing = upvotingId === idea.id;
                        // Check local state for voted status
                        const alreadyVoted = localVotes.has(idea.id);
                        // Get vote count, default to 0 if missing
                        const voteCount = idea.upvotes ?? 0;

                        return (
                            <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                {/* Header: Filename & BPM */}
                                <div className="idea-header-info">
                                    <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                    {/* Conditionally display BPM */}
                                    {idea.bpm !== null && idea.bpm !== undefined && (
                                        <p className="idea-bpm">BPM: {idea.bpm}</p>
                                    )}
                                </div>
                                {/* Description */}
                                {idea.description && <p className="idea-description">{idea.description}</p>}
                                {/* Audio Player */}
                                <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                {/* Footer: Date & Upvote */}
                                <div className="idea-footer">
                                     <p className="idea-dates">
                                         Shared: {idea.created_at ? new Date(idea.created_at).toLocaleDateString() : 'Date Unknown'}
                                     </p>
                                     <div className="upvote-section">
                                         {/* Upvote Button (Emoji Version) */}
                                         <button
                                             onClick={() => handleUpvote(idea.id, voteCount)} // Pass current count
                                             className={`upvote-button ${isProcessing ? 'processing' : ''} ${alreadyVoted ? 'voted' : ''}`}
                                             disabled={isProcessing || alreadyVoted}
                                             aria-label={alreadyVoted ? `You have upvoted ${idea.original_filename || idea.id}` : `Upvote idea ${idea.original_filename || idea.id}`}
                                             title={alreadyVoted ? "Already upvoted" : "Upvote"}
                                         >
                                             {/* Your Emojis */}
                                             {alreadyVoted ? '✔️' : '❤️'}
                                         </button>
                                         {/* Vote Count Display */}
                                         <span className="upvote-count" aria-live="polite">
                                             {voteCount}
                                         </span>
                                     </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div> // End peoples-ideas-container
    );
}

export default PeoplesIdeas;