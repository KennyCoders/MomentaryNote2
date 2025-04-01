// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer'; // Import the player component

// Receive user prop
function MyIdeas({ user }) {
    // --- State Variables ---
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [uploading, setUploading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formError, setFormError] = useState(null);
    const [myIdeas, setMyIdeas] = useState([]);
    const [loadingIdeas, setLoadingIdeas] = useState(false);
    const [listError, setListError] = useState(null);

    // --- User Check ---
    if (!user) {
        return null; // Don't render if no user is logged in
    }

    // --- Fetch User's Ideas ---
    const fetchMyIdeas = useCallback(async () => {
        if (!user) return;
        setLoadingIdeas(true);
        setListError(null);
        try {
            const { data, error } = await supabase
                .from('ideas')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw new Error(`Database error fetching ideas: ${error.message}`);
            setMyIdeas(data || []);
        } catch (err) {
            console.error('Error fetching my ideas:', err.message);
            setListError(err.message);
            setMyIdeas([]);
        } finally {
            setLoadingIdeas(false);
        }
    }, [user]);

    useEffect(() => {
        fetchMyIdeas();
    }, [fetchMyIdeas]);

    // --- File Selection Handler ---
    const handleFileChange = (event) => {
        setFormMessage('');
        setFormError(null);
        const selectedFile = event.target.files[0];
        const fileInput = event.target;

        if (!selectedFile) {
            setFile(null);
            return;
        }
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (selectedFile.size > maxSize) {
            setFormError("File is too large (max 5MB).");
            setFile(null);
            fileInput.value = null;
            return;
        }
        if (!selectedFile.type.startsWith('audio/mpeg') && !selectedFile.name.toLowerCase().endsWith('.mp3')) {
            setFormError("Please select a valid MP3 file.");
            setFile(null);
            fileInput.value = null;
            return;
        }
        setFile(selectedFile);
    };


    // --- Upload Logic ---

    const handleUpload = async (event) => {
        event.preventDefault();
        // Check duration value exists (value="0" is valid)
        if (!file || duration === '') {
            setFormError("Please select a file and choose a visibility option.");
            return;
        }

        setUploading(true);
        setFormError(null);
        setFormMessage('');

        const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
        // Parse duration, default to 0 if it's the public option
        const hiddenDurationSeconds = parseInt(duration, 10); // Will be 0 for "Make Public Immediately"

        // Determine is_public and expires_at based on duration
        let isPublic = false;
        let expiresAt = null;
        const now = new Date();

        if (hiddenDurationSeconds === 0) {
            // Make public immediately
            isPublic = true;
            // expires_at can be null or now, depends on your preference/table definition
            expiresAt = now.toISOString(); // Or set to null if column allows
            console.log("Setting is_public to TRUE immediately.");
        } else {
            // Keep hidden for the selected duration
            isPublic = false;
            expiresAt = new Date(now.getTime() + hiddenDurationSeconds * 1000).toISOString();
            console.log(`Setting is_public to FALSE, expires at: ${expiresAt}`);
        }


        try {
            setFormMessage('Uploading file...');
            const { error: uploadError } = await supabase.storage
                .from('ideas-audio')
                .upload(filePath, file);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

            setFormMessage('Saving idea details...');

            // Use the determined isPublic and expiresAt values
            const { data: insertedData, error: insertError } = await supabase
                .from('ideas')
                .insert({
                    user_id: user.id,
                    description: description || null,
                    file_path: filePath,
                    hidden_duration_seconds: hiddenDurationSeconds, // Store the selected duration (0 for public)
                    expires_at: expiresAt,                         // Store calculated expiry or null/now
                    is_public: isPublic,                           // Store calculated public status
                    original_filename: file.name,
                })
                .select()
                .single();

            if (insertError) throw new Error(`Database Error: ${insertError.message}`);

            console.log('Upload successful:', insertedData);
            setFormMessage('Idea uploaded successfully!');
            fetchMyIdeas(); // Refresh the list
            setFile(null);
            setDescription('');
            setDuration(''); // Reset duration dropdown
            if (event.target instanceof HTMLFormElement) {
                event.target.reset();
            }
        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
        } finally {
            setUploading(false);
        }
    };

    // --- Remove Logic ---
    const handleRemoveIdea = async (ideaId, filePath) => {
        if (!window.confirm("Are you sure you want to remove this idea? This cannot be undone.")) {
            return;
        }
        setListError(null);
        try {
            console.log(`Attempting to delete storage file: ${filePath}`);
            const { error: storageError } = await supabase.storage
                .from('ideas-audio')
                .remove([filePath]);
            if (storageError) {
                console.error("Error deleting file from storage (continuing deletion):", storageError.message);
            } else {
                 console.log(`Successfully deleted storage file: ${filePath}`);
            }

            console.log(`Attempting to delete DB record ID: ${ideaId}`);
            const { error: dbError } = await supabase
                .from('ideas')
                .delete()
                .eq('id', ideaId)
                .eq('user_id', user.id);
            if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);
            console.log(`Successfully deleted DB record ID: ${ideaId}`);

            // Refresh using local state update for better UX
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
        } catch (err) {
            console.error('Error removing idea:', err.message);
            setListError(`Failed to remove idea: ${err.message}`);
        }
    };

    // --- Get Public URL for Audio (Helper) ---
    const getAudioUrl = (filePath) => {
         if (!filePath) return null;
         try {
            const { data } = supabase.storage
              .from('ideas-audio')
              .getPublicUrl(filePath);
            return data?.publicUrl;
         } catch (error) {
             console.error("Error getting public URL:", error);
             return null;
         }
    };

    // --- Component Render ---
    return (
        <div className="my-ideas-container">
            {/* --- Upload Form Section --- */}
            <div className="upload-section">
                <h2>Upload New Idea</h2>
                <form onSubmit={handleUpload} className="upload-form">
                    {/* File Input */}
                    <div className="form-group">
                        <label htmlFor="audioFile">MP3 File (max 5MB):</label>
                        <input type="file" id="audioFile" accept=".mp3,audio/mpeg" onChange={handleFileChange} disabled={uploading} required />
                    </div>
                    {/* Description Textarea */}
                    <div className="form-group">
                        <label htmlFor="description">Description (optional):</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" disabled={uploading} maxLength={200} />
                    </div>
                    {/* Duration Select */}
                    <div className="form-group">
                        <label htmlFor="duration">Visibility:</label> {/* Changed Label */}
                        <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={uploading} required>
                            <option value="" disabled>-- Select visibility --</option>
                            {/* Add this new option with value="0" */}
                            <option value="0">Make Public Immediately</option>
                            <option value="604800">Hidden for 1 Week</option>
                            <option value="1209600">Hidden for 2 Weeks</option>
                            <option value="2592000">Hidden for 1 Month</option>
                        </select>
                    </div>
                    {/* Submit Button - ADDED CLASSES HERE */}
                    <button
                        type="submit"
                        className="btn btn-primary" // Added classes
                        disabled={uploading || !file || !duration}
                    >
                        {uploading ? 'Uploading...' : 'Upload Idea'}
                    </button>
                    {/* Feedback Area for Form */}
                    <div className="feedback-area form-feedback">
                        {formError && <p className="error-message">Error: {formError}</p>}
                        {formMessage && <p className="info-message">{formMessage}</p>}
                    </div>
                </form>
            </div>

            <hr /> {/* Separator */}

            {/* --- Idea List Section --- */}
            <div className="ideas-list-section">
                <h2>Your Saved Ideas</h2>
                {/* Feedback Area for List */}
                 <div className="feedback-area list-feedback">
                    {listError && <p className="error-message">Error loading ideas: {listError}</p>}
                 </div>

                {loadingIdeas ? (
                    <p style={{ textAlign: 'center' }}>Loading your ideas...</p> // Centered loading text
                ) : myIdeas.length === 0 && !listError ? (
                    <p style={{ textAlign: 'center' }}>You haven't uploaded any ideas yet.</p> // Centered text
                ) : (
                    <div className="ideas-grid">
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

                                {/* Audio Player */}
                                <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />

                                {/* Remove Button - ADDED CLASSES HERE */}
                                <button
                                    onClick={() => handleRemoveIdea(idea.id, idea.file_path)}
                                    className="btn btn-danger remove-button" // Added classes
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