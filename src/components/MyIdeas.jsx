// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Supabase client (used when not in mock mode)
import AudioPlayer from './AudioPlayer';     // Audio player component
import ConfirmationModal from './ConfirmationModal'; // Import Modal component
import { mockMyIdeas, mockGetAudioUrl } from '../mockData'; // Mock data and helpers (used in mock mode)

// Helper function to get a random gradient class for cards
const gradientClasses = [
    'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5',
    'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
];
const getRandomGradientClass = () => {
    const randomIndex = Math.floor(Math.random() * gradientClasses.length);
    return gradientClasses[randomIndex];
};

// Constants for file validation
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/x-wav'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Component Function
function MyIdeas({ user, isMockMode }) {
    // --- State Variables ---
    const [file, setFile] = useState(null);                 // Currently selected file object for upload
    const [selectedFileName, setSelectedFileName] = useState(''); // Name of the selected file for display
    const [description, setDescription] = useState('');     // Description text for the new idea
    const [duration, setDuration] = useState('');         // Selected visibility/duration value
    const [uploading, setUploading] = useState(false);      // Flag for when upload is in progress
    const [formMessage, setFormMessage] = useState('');     // Success/info messages for the form
    const [formError, setFormError] = useState(null);       // Error messages for the form
    const [myIdeas, setMyIdeas] = useState([]);             // List of the user's ideas (mock or real)
    const [loadingIdeas, setLoadingIdeas] = useState(!isMockMode); // Flag for loading the idea list
    const [listError, setListError] = useState(null);       // Error messages for the idea list
    const [isModalOpen, setIsModalOpen] = useState(false);  // State to control the confirmation modal visibility

    // --- Fetch User's Ideas (Conditional: Mock or Supabase) ---
    const fetchMyIdeas = useCallback(async () => {
        if (isMockMode) {
            console.log("MyIdeas: Running in MOCK MODE. Fetching mock 'My Ideas'.");
            setMyIdeas(mockMyIdeas || []);
            setLoadingIdeas(false);
            setListError(null);
            return;
        }
        if (!user) {
           setLoadingIdeas(false);
           setMyIdeas([]);
           return;
        };
        console.log("MyIdeas: Running in LIVE MODE. Fetching ideas from Supabase.");
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
            setListError(err.message); // Set error state here
            setMyIdeas([]);
        } finally {
            setLoadingIdeas(false);
        }
    }, [user, isMockMode]);

    // Effect to fetch ideas on mount or when dependencies change
    useEffect(() => {
        fetchMyIdeas();
    }, [fetchMyIdeas]);

    // --- File Selection Handler (with updated validation and filename state) ---
    const handleFileChange = (event) => {
        setFormMessage('');
        setFormError(null);
        const selectedFile = event.target.files[0];
        const fileInput = event.target;

        if (!selectedFile) {
            setFile(null);
            setSelectedFileName(''); // Clear filename display state
            return;
        }
        // Size Check
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setFormError(`File is too large (max ${MAX_FILE_SIZE_MB}MB).`);
            setFile(null);
            setSelectedFileName(''); // Clear filename display state
            fileInput.value = null;
            return;
        }
        // Type Check
        const fileTypeValid = ALLOWED_MIME_TYPES.includes(selectedFile.type);
        const fileExtensionValid = ALLOWED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!fileTypeValid && !fileExtensionValid) {
             setFormError(`Invalid file type. Please select MP3, WAV, or OGG.`);
             setFile(null);
             setSelectedFileName(''); // Clear filename display state
             fileInput.value = null;
             return;
        }
        setFile(selectedFile); // Store the valid file object
        setSelectedFileName(selectedFile.name); // Store filename for display
    };

    // --- Trigger Upload Process (Opens Confirmation Modal) ---
    const handleUpload = async (event) => {
        event.preventDefault();
        if (!file || duration === '') {
            setFormError("Please select a file and choose a visibility option.");
            return;
        }
        setFormError(null);
        setFormMessage('');
        setIsModalOpen(true);
    };

    // --- Actual Upload Logic (Called after modal confirmation - resets filename state) ---
    const proceedWithUpload = async () => {
        if (!file || duration === '') {
             console.error("proceedWithUpload called without file or duration.");
             setFormError("Missing file or visibility option.");
             setIsModalOpen(false);
             return;
        }
        setUploading(true);
        setFormError(null);
        setFormMessage('');

        // --- MOCK MODE ---
        if (isMockMode) {
            console.log("MyIdeas: MOCK MODE. Simulating upload.");
            setFormMessage('Simulating upload...');
            try {
                await new Promise(resolve => setTimeout(resolve, 1200));
                const hiddenDurationSeconds = parseInt(duration, 10);
                const isPublic = hiddenDurationSeconds === 0;
                const expiresAt = isPublic ? new Date().toISOString() : new Date(Date.now() + hiddenDurationSeconds * 1000).toISOString();
                const newMockIdea = {
                    id: `mock-idea-${Date.now()}`,
                    user_id: user?.id || 'mock-user-123',
                    description: description || null,
                    file_path: `mock/local/${file.name}`,
                    original_filename: file.name,
                    hidden_duration_seconds: hiddenDurationSeconds,
                    expires_at: expiresAt,
                    is_public: isPublic,
                    created_at: new Date().toISOString(),
                 };
                 setMyIdeas(prev => [newMockIdea, ...prev]);
                 setFormMessage('Mock upload successful!');
                 // Reset form state
                 setFile(null);
                 setSelectedFileName(''); // Reset filename display state
                 setDescription('');
                 setDuration('');
                 const fileInput = document.getElementById('audioFile');
                 if (fileInput) fileInput.value = null;
            } catch (simulatedError) {
                 console.error("Mock upload simulation error:", simulatedError);
                 setFormError("Mock upload failed.");
                 setFormMessage('');
            } finally {
                 setUploading(false);
            }
            return;
        }

        // --- LIVE MODE ---
        console.log("MyIdeas: LIVE MODE. Uploading to Supabase.");
        if (!user) { /* ... error handling ... */ return; }
        const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
        const hiddenDurationSeconds = parseInt(duration, 10);
        const isPublic = hiddenDurationSeconds === 0;
        const now = new Date();
        const expiresAt = isPublic ? now.toISOString() : new Date(now.getTime() + hiddenDurationSeconds * 1000).toISOString();
        try {
            setFormMessage('Uploading file...');
            const { error: uploadError } = await supabase.storage.from('ideas-audio').upload(filePath, file);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
            setFormMessage('Saving idea details...');
            const { data: insertedData, error: insertError } = await supabase.from('ideas').insert({
                 user_id: user.id,
                 description: description || null,
                 file_path: filePath,
                 hidden_duration_seconds: hiddenDurationSeconds,
                 expires_at: expiresAt,
                 is_public: isPublic,
                 original_filename: file.name,
             }).select().single();
            if (insertError) throw new Error(`Database Error: ${insertError.message}`);
            console.log('Upload successful:', insertedData);
            setFormMessage('Idea uploaded successfully!');
            fetchMyIdeas();
            // Reset form state
            setFile(null);
            setSelectedFileName(''); // Reset filename display state
            setDescription('');
            setDuration('');
            const fileInput = document.getElementById('audioFile');
            if (fileInput) fileInput.value = null;
        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
        } finally {
            setUploading(false);
        }
    };

    // --- Handle Modal Confirmation/Cancellation ---
    const handleConfirmUpload = () => {
        setIsModalOpen(false);
        proceedWithUpload();
    };
    const handleCancelUpload = () => {
        setIsModalOpen(false);
        console.log("Upload cancelled by user.");
    };

    // --- Remove Idea Logic ---
    const handleRemoveIdea = async (ideaId, filePath) => {
        if (!window.confirm("Are you sure you want to remove this idea? This cannot be undone.")) return;
        setListError(null);
        // MOCK MODE
        if (isMockMode) {
            console.log(`MyIdeas: MOCK MODE. Simulating removal of idea ${ideaId}`);
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
            return;
        }
        // LIVE MODE
        if (!user) {
            setListError("User not identified. Cannot remove.");
            return;
        }
        try {
            if (filePath) {
                 const { error: storageError } = await supabase.storage.from('ideas-audio').remove([filePath]);
                 if (storageError) console.warn("Warning: Error deleting file from storage:", storageError.message);
            }
            const { error: dbError } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', user.id);
            if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
        } catch (err) {
            console.error('Error removing idea:', err.message);
            setListError(`Failed to remove idea: ${err.message}`);
        }
    };

    // --- Get Public URL for Audio ---
    const getAudioUrl = (filePath) => {
        if (isMockMode) return mockGetAudioUrl(filePath);
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('ideas-audio').getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) {
            console.error(`Error getting public URL for ${filePath}:`, error);
            return null;
        }
    };

    // --- Component Render ---
    return (
        <>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCancelUpload}
                onConfirm={handleConfirmUpload}
                message="Upon expiration, uploaded files become available for use by other users. Do you agree?"
            />

            {/* Main Content Container */}
            <div className="my-ideas-container">
                {/* Upload Section */}
                <div className="upload-section">
                    <h2 className="upload-section-title">
                        Upload New{' '}
                        <span className="upload-title-char">N</span><span className="upload-title-char">o</span><span className="upload-title-char">t</span><span className="upload-title-char">e</span>
                    </h2>
                    <form onSubmit={handleUpload} className="upload-form">

                        {/* === File Input Group === */}
                        <div className="form-group file-upload-group">
                            {/* 1. Descriptive Label */}
                            <label htmlFor="audioFile">
                                Audio File (MP3, WAV, OGG - max {MAX_FILE_SIZE_MB}MB):
                            </label>
                            {/* 2. Container for Button and Filename Display */}
                            <div className="file-input-container">
                                {/* 2a. Button Label */}
                                <label htmlFor="audioFile" className="btn btn-secondary file-upload-button">
                                    Select File
                                </label>
                                {/* 2b. Filename Display */}
                                <span id="fileNameDisplay" className="file-name-display">
                                    {selectedFileName ? selectedFileName : <span className="placeholder">No file chosen</span>}
                                </span>
                            </div>
                            {/* 3. Hidden File Input */}
                            <input
                                type="file"
                                id="audioFile"
                                accept=".mp3,audio/mpeg,.wav,audio/wav,audio/wave,.ogg,audio/ogg"
                                onChange={handleFileChange}
                                disabled={uploading}
                                required
                                className="visually-hidden-file-input"
                            />
                        </div>
                        {/* === END File Input Group === */}

                        {/* Description Input Group */}
                        <div className="form-group">
                             <label htmlFor="description">Description (optional):</label>
                             <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                disabled={uploading}
                                maxLength={200}
                             />
                        </div>
                         {/* Visibility/Duration Select Group */}
                        <div className="form-group">
                            <label htmlFor="duration">Visibility:</label>
                            <select
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                disabled={uploading}
                                required
                            >
                                 <option value="" disabled>-- Select visibility --</option>
                                 <option value="0">Make Public Immediately</option>
                                 <option value="604800">Hidden for 1 Week</option>
                                 <option value="1209600">Hidden for 2 Weeks</option>
                                 <option value="2592000">Hidden for 1 Month</option>
                            </select>
                        </div>
                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={uploading || !file || duration === ''}
                        >
                            {uploading ? 'Uploading...' : 'Add Note'}
                        </button>
                         {/* Form Feedback Area */}
                         <div className="feedback-area form-feedback">
                            {formError && <p className="error-message">Error: {formError}</p>}
                            {formMessage && <p className="info-message">{formMessage}</p>}
                        </div>
                    </form>
                </div> {/* End .upload-section */}

                {/* Separator */}
                <div className="sleek-separator"></div>

                {/* Idea List Section */}
                <div className="ideas-list-section">
                     <h2>Your Saved Ideas</h2>

                     {/* === Conditionally render the feedback div === */}
                     {listError && (
                         <div className="feedback-area list-feedback">
                             <p className="error-message">Error loading ideas: {listError}</p>
                         </div>
                     )}
                     {/* === End Conditional Rendering === */}

                     {/* Conditional Rendering: Loading, Empty, or Grid */}
                     {loadingIdeas ? (
                         <div className="loading-container">Loading your ideas...</div>
                     ) : myIdeas.length === 0 && !listError ? (
                         <p style={{ textAlign: 'center' }}>You haven't uploaded any ideas yet.</p>
                     ) : (
                         <div className="ideas-grid">
                             {myIdeas.map((idea) => {
                                 const gradientClass = getRandomGradientClass();
                                 return (
                                     <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                         <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                         {idea.description && <p className="idea-description">{idea.description}</p>}
                                         <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                         <p className="idea-dates">
                                             {idea.is_public
                                                 ? `Public Since: ${new Date(idea.expires_at || idea.created_at).toLocaleDateString()}`
                                                 : `Expires: ${new Date(idea.expires_at).toLocaleString()}`
                                             }
                                         </p>
                                         <button
                                             onClick={() => handleRemoveIdea(idea.id, idea.file_path)}
                                             className="btn btn-danger remove-button"
                                         >
                                             Remove Idea
                                         </button>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                 </div> {/* End ideas-list-section */}
             </div> {/* End my-ideas-container */}
         </> // End Fragment
     );
 }

 export default MyIdeas;