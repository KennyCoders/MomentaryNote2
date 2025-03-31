// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer'; // Import the player component

// Receive user prop
function MyIdeas({ user }) {
    // --- State Variables ---
    // Upload Form State
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [uploading, setUploading] = useState(false);
    const [formMessage, setFormMessage] = useState(''); // Separate messages for form vs list
    const [formError, setFormError] = useState(null);

    // Idea List State
    const [myIdeas, setMyIdeas] = useState([]); // Holds the fetched ideas
    const [loadingIdeas, setLoadingIdeas] = useState(false);
    const [listError, setListError] = useState(null); // Separate error for the list

    // --- User Check ---
    // If user prop is not available, render nothing or a placeholder.
    // The main check/redirect happens in App.jsx and Tabs.jsx now.
    if (!user) {
        return null; // Or a minimal placeholder if needed
    }

    // --- Fetch User's Ideas (Step 8 Logic) ---
    // useCallback ensures fetchMyIdeas function identity is stable unless 'user' changes
    const fetchMyIdeas = useCallback(async () => {
        if (!user) return; // Don't fetch if user is somehow null

        setLoadingIdeas(true);
        setListError(null); // Clear previous list errors
        try {
            const { data, error } = await supabase
                .from('ideas')
                .select('*') // Select all columns needed
                .eq('user_id', user.id) // Filter by current user ID (RLS enforces too)
                .order('created_at', { ascending: false }); // Show newest first

            if (error) {
                 console.error("Fetch error:", error);
                 throw new Error(`Database error fetching ideas: ${error.message}`); // Throw to be caught
            }
            setMyIdeas(data || []); // Set fetched data or empty array

        } catch (err) {
            console.error('Error fetching my ideas:', err.message);
            setListError(err.message); // Set list-specific error state
            setMyIdeas([]); // Clear ideas on error
        } finally {
            setLoadingIdeas(false);
        }
    }, [user]); // Re-run fetchMyIdeas if the user object changes

    // useEffect to call fetchMyIdeas when component mounts or user changes
    useEffect(() => {
        fetchMyIdeas();
    }, [fetchMyIdeas]); // Dependency array uses the memoized fetchMyIdeas

    // --- File Selection Handler (Step 6) ---
    const handleFileChange = (event) => {
        setFormMessage('');
        setFormError(null);
        const selectedFile = event.target.files[0];
        const fileInput = event.target; // Keep reference to clear later if needed

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5 MB limit
        if (selectedFile.size > maxSize) {
            setFormError("File is too large (max 5MB).");
            setFile(null);
            fileInput.value = null; // Clear the file input
            return;
        }
        if (!selectedFile.type.startsWith('audio/mpeg') && !selectedFile.name.toLowerCase().endsWith('.mp3')) {
            setFormError("Please select a valid MP3 file.");
            setFile(null);
            fileInput.value = null; // Clear the file input
            return;
        }

        setFile(selectedFile);
    };

    // --- Upload Logic (Step 6 + Refresh from Step 8) ---
    const handleUpload = async (event) => {
        event.preventDefault();
        if (!file || !duration) {
            setFormError("Please select a file and choose a duration.");
            return;
        }

        setUploading(true);
        setFormError(null);
        setFormMessage('');

        const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
        const hiddenDurationSeconds = parseInt(duration, 10);

        try {
            setFormMessage('Uploading file...');
            const { error: uploadError } = await supabase.storage
                .from('ideas-audio') // Ensure bucket 'ideas-audio' exists and is public
                .upload(filePath, file);

            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

            setFormMessage('Saving idea details...');
            const now = new Date();
            const expiresAt = new Date(now.getTime() + hiddenDurationSeconds * 1000).toISOString();

            const { data: insertedData, error: insertError } = await supabase
                .from('ideas')
                .insert({
                    user_id: user.id,
                    description: description || null,
                    file_path: filePath,
                    hidden_duration_seconds: hiddenDurationSeconds,
                    expires_at: expiresAt,
                    is_public: false,
                    original_filename: file.name,
                })
                .select() // Select the inserted row data
                .single(); // Expect one row

            if (insertError) throw new Error(`Database Error: ${insertError.message}`);

            console.log('Upload successful:', insertedData);
            setFormMessage('Idea uploaded successfully!');

            // --- Refresh Logic (Option 1: Refetch all) ---
            fetchMyIdeas(); // Re-fetch the list to include the new idea

            // --- Refresh Logic (Option 2: Update local state - faster UI) ---
            // setMyIdeas(currentIdeas => [insertedData, ...currentIdeas]);

            // Clear the form
            setFile(null);
            setDescription('');
            setDuration('');
            event.target.reset(); // Resets the form element

        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
        } finally {
            setUploading(false);
        }
    };

    // --- Remove Logic (Step 8 + Refresh) ---
    const handleRemoveIdea = async (ideaId, filePath) => {
        if (!window.confirm("Are you sure you want to remove this idea? This cannot be undone.")) {
            return;
        }

        setListError(null); // Clear previous list errors before attempting delete

        try {
            // 1. Delete the file from Storage
            console.log(`Attempting to delete storage file: ${filePath}`);
            const { error: storageError } = await supabase.storage
                .from('ideas-audio')
                .remove([filePath]); // Pass filePath as an array

            if (storageError) {
                // Log error but proceed to delete DB record anyway
                console.error("Error deleting file from storage (continuing deletion):", storageError.message);
                // Optionally inform user the file might linger?
            } else {
                 console.log(`Successfully deleted storage file: ${filePath}`);
            }


            // 2. Delete the record from the database
            console.log(`Attempting to delete DB record ID: ${ideaId}`);
            const { error: dbError } = await supabase
                .from('ideas')
                .delete()
                .eq('id', ideaId)
                .eq('user_id', user.id); // RLS protects, but redundant check is fine

            if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);

             console.log(`Successfully deleted DB record ID: ${ideaId}`);

            // --- Refresh Logic (Option 1: Refetch all) ---
            // fetchMyIdeas();

            // --- Refresh Logic (Option 2: Update local state - faster UI) ---
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
            // Optionally set a temporary success message for deletion

        } catch (err) {
            console.error('Error removing idea:', err.message);
            setListError(`Failed to remove idea: ${err.message}`); // Show error in the list area
        }
        // No 'finally' block needed specifically for loading state here unless you add one
    };


    // --- Get Public URL for Audio (Helper) ---
    // Can be memoized with useCallback if performance becomes an issue with many items
    const getAudioUrl = (filePath) => {
         if (!filePath) return null;
         try {
            const { data } = supabase.storage
              .from('ideas-audio')
              .getPublicUrl(filePath);
             // console.log(`Public URL for ${filePath}: ${data?.publicUrl}`); // Debugging
            return data?.publicUrl;
         } catch (error) {
             console.error("Error getting public URL:", error);
             return null;
         }
    };

    // --- Component Render ---
    return (
        <div className="my-ideas-container">
            {/* --- Upload Form Section (Step 6) --- */}
            <div className="upload-section">
                <h2>Upload New Idea</h2>
                <form onSubmit={handleUpload} className="upload-form">
                    {/* File Input */}
                    <div className="form-group">
                        <label htmlFor="audioFile">MP3 File (max 60s, 5MB):</label>
                        <input type="file" id="audioFile" accept=".mp3" onChange={handleFileChange} disabled={uploading} required />
                    </div>
                    {/* Description Textarea */}
                    <div className="form-group">
                        <label htmlFor="description">Description (optional):</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" disabled={uploading} maxLength={200} />
                    </div>
                    {/* Duration Select */}
                    <div className="form-group">
                        <label htmlFor="duration">Keep Hidden For:</label>
                        <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={uploading} required>
                            <option value="" disabled>-- Select duration --</option>
                            <option value="604800">1 Week</option>
                            <option value="1209600">2 Weeks</option>
                            <option value="2592000">1 Month (approx 30 days)</option>
                        </select>
                    </div>
                    {/* Submit Button */}
                    <button type="submit" disabled={uploading || !file || !duration}>
                        {uploading ? 'Uploading...' : 'Upload Idea'}
                    </button>
                    {/* Feedback Area for Form */}
                    <div className="feedback-area form-feedback">
                        {formError && <p className="error-message">Error: {formError}</p>}
                        {formMessage && <p className="info-message">{formMessage}</p>}
                    </div>
                </form>
            </div>

            <hr /> {/* Separator between sections */}

            {/* --- Idea List Section (Step 8) --- */}
            <div className="ideas-list-section">
                <h2>Your Saved Ideas</h2>
                {/* Feedback Area for List */}
                 <div className="feedback-area list-feedback">
                    {listError && <p className="error-message">Error loading ideas: {listError}</p>}
                 </div>

                {loadingIdeas ? (
                    <p>Loading your ideas...</p>
                ) : myIdeas.length === 0 && !listError ? ( // Only show 'no ideas' if not loading and no error
                    <p>You haven't uploaded any ideas yet.</p>
                ) : (
                    <div className="ideas-grid"> {/* Use a grid for layout */}
                        {myIdeas.map((idea) => (
                            <div key={idea.id} className="idea-box">
                                {/* Display Idea Details */}
                                <p className="idea-filename">File: {idea.original_filename || 'Unknown'}</p>
                                {idea.description && <p className="idea-description">Desc: {idea.description}</p>}
                                <p className="idea-dates">
                                    Uploaded: {new Date(idea.created_at).toLocaleDateString()}
                                    <br />
                                    Expires: {new Date(idea.expires_at).toLocaleString()}
                                </p>

                                {/* Audio Player (Step 9) */}
                                <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />

                                {/* Remove Button (Step 8) */}
                                <button
                                    onClick={() => handleRemoveIdea(idea.id, idea.file_path)}
                                    className="remove-button"
                                    // Optionally disable if an operation is ongoing elsewhere?
                                >
                                    Remove Idea
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyIdeas;