// src/components/PeoplesIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer';
// NOTE: No UpvoteIcon component is imported - using emojis
import { mockPublicIdeas, mockGetAudioUrl, updateMockIdeaVotes } from '../mockData';

// --- localStorage Helper Functions ---
const VOTED_IDEAS_KEY = 'momentaryNoteUpvotes';

const getVotedIdeas = () => {
    try {
        const voted = localStorage.getItem(VOTED_IDEAS_KEY);
        return voted ? new Set(JSON.parse(voted)) : new Set();
    } catch (e) { console.error("Error reading voted ideas from localStorage:", e); return new Set(); }
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
        localStorage.setItem(VOTED_IDEAS_KEY, JSON.stringify([...votedSet]));
    } catch (e) { console.error("Error saving voted idea to localStorage:", e); }
};
// --- End localStorage Helpers ---

// Gradient Helper
const gradientClasses = [
    'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5',
    'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
];
const getRandomGradientClass = () => gradientClasses[Math.floor(Math.random() * gradientClasses.length)];

// Sorting Helper (Sorts by upvotes DESC, then creation date DESC)
const sortIdeas = (ideas) => {
    if (!Array.isArray(ideas)) { console.warn("sortIdeas received non-array:", ideas); return []; }
    return [...ideas].sort((a, b) => {
        const upvotesA = a?.upvotes ?? 0;
        const upvotesB = b?.upvotes ?? 0;
        if (upvotesB !== upvotesA) return upvotesB - upvotesA;
        const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
    });
};

function PeoplesIdeas({ isMockMode }) {
    const [publicIdeas, setPublicIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [upvotingId, setUpvotingId] = useState(null);
    // State to track local votes, initialized lazily
    const [localVotes, setLocalVotes] = useState(() => getVotedIdeas());

    // Fetch public ideas function (selects upvotes and bpm)
    const fetchPublicIdeas = useCallback(async () => {
        setError(null);
        setLoading(true);
        if (isMockMode) {
            console.log("PeoplesIdeas: Running in MOCK MODE.");
            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                // Ensure we use the potentially updated mockPublicIdeas
                const currentMockIdeas = mockPublicIdeas || [];
                setPublicIdeas(sortIdeas(currentMockIdeas));
            } catch(mockError) { setError("Failed to load mock ideas."); setPublicIdeas([]); }
            finally { setLoading(false); }
            return;
        }
        console.log("PeoplesIdeas: Running in LIVE MODE.");
        try {
            const now = new Date().toISOString();
            const { data, error: dbError } = await supabase
                .from('ideas')
                // Select bpm along with other fields
                .select('id, description, file_path, original_filename, created_at, is_public, expires_at, upvotes, bpm')
                .or(`is_public.eq.true,expires_at.lte.${now}`)
                .order('upvotes', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false });
            if (dbError) throw dbError;
            setPublicIdeas(sortIdeas(data || []));
        } catch (err) { setError(`Failed to load ideas: ${err.message}`); setPublicIdeas([]); }
        finally { setLoading(false); }
    }, [isMockMode]);

    useEffect(() => { fetchPublicIdeas(); }, [fetchPublicIdeas]);

    // Listener for storage changes
    useEffect(() => {
        const handleStorageChange = (event) => { if (event.key === VOTED_IDEAS_KEY) setLocalVotes(getVotedIdeas()); };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Handle Upvote (with localStorage check and optimistic UI)
    const handleUpvote = async (ideaId, currentUpvotes) => {
        // Use state for the check within the handler
        if (localVotes.has(ideaId)) {
             console.log(`Already voted for idea ${ideaId} in this browser.`);
             return; // Already voted check
        }
        if (upvotingId === ideaId) return; // Prevent double click

        setUpvotingId(ideaId);
        setError(null);
        const numericCurrentUpvotes = currentUpvotes ?? 0;

        // Optimistic UI Update
        const optimisticallyUpdatedIdeas = publicIdeas.map(idea =>
            idea.id === ideaId ? { ...idea, upvotes: numericCurrentUpvotes + 1 } : idea
        );
        setPublicIdeas(sortIdeas(optimisticallyUpdatedIdeas));

        // MOCK MODE
        if (isMockMode) {
            console.log(`PeoplesIdeas: MOCK MODE. Upvoted idea ${ideaId}.`);
            try {
                await new Promise(resolve => setTimeout(resolve, 200));
                updateMockIdeaVotes(ideaId, numericCurrentUpvotes + 1); // Update central mock data
                markAsVoted(ideaId); // Mark in localStorage
                setLocalVotes(prevVotes => new Set(prevVotes).add(ideaId)); // Update state
            } catch (mockError) { /* Rollback logic could be added here if needed */ setError("Mock vote failed.");}
            finally { setUpvotingId(null); }
            return;
        }

        // LIVE MODE
        console.log(`PeoplesIdeas: LIVE MODE. Upvoting idea ${ideaId}.`);
        try {
            const { error: updateError } = await supabase
                .from('ideas')
                .update({ upvotes: numericCurrentUpvotes + 1 })
                .eq('id', ideaId);

            if (updateError) {
                 // Handle potential deletion during vote attempt
                 if (updateError.code === 'PGRST116') { // Example error code, check actual Supabase errors
                     console.warn(`Idea ${ideaId} might have been deleted.`);
                     setError(`Could not vote, the idea may no longer exist.`);
                     setPublicIdeas(prevIdeas => sortIdeas(prevIdeas.filter(idea => idea.id !== ideaId))); // Remove locally
                 } else throw updateError;
             } else {
                 console.log(`Successfully upvoted idea ${ideaId}`);
                 markAsVoted(ideaId); // Mark in localStorage
                 setLocalVotes(prevVotes => new Set(prevVotes).add(ideaId)); // Update state
            }
        } catch (err) {
            console.error(`Error upvoting idea ${ideaId}:`, err.message);
            setError(`Failed to upvote idea. Please try again.`);
            // Rollback optimistic update
            const revertedIdeas = publicIdeas.map(idea =>
                idea.id === ideaId ? { ...idea, upvotes: numericCurrentUpvotes } : idea
            );
            setPublicIdeas(sortIdeas(revertedIdeas));
        } finally {
            setUpvotingId(null);
        }
    };

    // Get Audio URL
     const getAudioUrl = (filePath) => {
        if (isMockMode) return mockGetAudioUrl(filePath);
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('ideas-audio').getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) { console.error(`Error getting public URL for ${filePath}:`, error); return null; }
    };

    // --- Render Logic ---
    return (
        <div className="peoples-ideas-container">
            {error && <div className="feedback-area list-feedback"><p className="error-message">{error}</p></div>}
            {loading ? <div className="loading-container">Loading shared ideas...</div>
             : publicIdeas.length === 0 && !error ? <p style={{ textAlign: 'center' }}>No public ideas found yet.</p>
             : (
                <div className="ideas-grid">
                    {publicIdeas.map((idea) => {
                        if (!idea || !idea.id) return null; // Defensive check

                        const gradientClass = getRandomGradientClass();
                        const isProcessing = upvotingId === idea.id;
                        // Use state for rendering check
                        const alreadyVoted = localVotes.has(idea.id);
                        const voteCount = idea.upvotes ?? 0;

                        return (
                            <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                {/* Header includes filename and BPM */}
                                <div className="idea-header-info">
                                    <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                    {/* Conditionally render BPM */}
                                    {idea.bpm !== null && idea.bpm !== undefined && (
                                        <p className="idea-bpm">BPM: {idea.bpm}</p>
                                    )}
                                </div>
                                {/* Description & Player */}
                                {idea.description && <p className="idea-description">{idea.description}</p>}
                                <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                {/* Footer includes date and upvote section */}
                                <div className="idea-footer">
                                     <p className="idea-dates">
                                         Shared: {idea.created_at ? new Date(idea.created_at).toLocaleDateString() : 'Date Unknown'}
                                     </p>
                                     <div className="upvote-section">
                                         <button
                                             onClick={() => handleUpvote(idea.id, voteCount)}
                                             // Class name for emoji button styling
                                             className={`upvote-button ${isProcessing ? 'processing' : ''} ${alreadyVoted ? 'voted' : ''}`}
                                             disabled={isProcessing || alreadyVoted}
                                             aria-label={alreadyVoted ? `You have upvoted ${idea.original_filename || idea.id}` : `Upvote idea ${idea.original_filename || idea.id}`}
                                             title={alreadyVoted ? "Already upvoted" : "Upvote"}
                                         >
                                             {/* Displaying your chosen Emojis */}
                                             {alreadyVoted ? '✔️' : '❤️'}
                                         </button>
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
        </div>
    );
}

export default PeoplesIdeas;