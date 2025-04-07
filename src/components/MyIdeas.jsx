// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer';
import ConfirmationModal from './ConfirmationModal';
// Import mock data - use different names internally if needed to avoid confusion, DO NOT REASSIGN THESE IMPORTS
import { mockMyIdeas as sourceMockMyIdeas, mockPublicIdeas as sourceMockPublicIdeas, mockGetAudioUrl, updateMockIdeaVotes } from '../mockData';

// Helper function to get a random gradient class for cards
const gradientClasses = [
    'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5',
    'gradient-6', 'gradient-7', 'gradient-8', 'gradient-9', 'gradient-10'
];
const getRandomGradientClass = () => gradientClasses[Math.floor(Math.random() * gradientClasses.length)];

// Constants for file validation
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/x-wav'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Helper to sort ideas by creation date (newest first)
const sortIdeas = (ideas) => {
    if (!Array.isArray(ideas)) return [];
    return [...ideas].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        // Handle potential NaN from invalid dates
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1; // Put invalid dates last
        if (isNaN(dateB)) return -1; // Put invalid dates last
        return dateB - dateA; // Descending order
    });
};

function MyIdeas({ user, isMockMode }) {
    // --- State Variables ---
    const [file, setFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [bpm, setBpm] = useState(''); // BPM state (string for input)
    const [uploading, setUploading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formError, setFormError] = useState(null); // Unified form error state
    const [myIdeas, setMyIdeas] = useState([]); // Local state for component display
    const [loadingIdeas, setLoadingIdeas] = useState(true); // Start loading true
    const [listError, setListError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Fetch User's Ideas (Selects bpm) ---
    const fetchMyIdeas = useCallback(async () => {
        // MOCK MODE
        if (isMockMode) {
             console.log("MyIdeas: Running in MOCK MODE. Fetching mock 'My Ideas'.");
             // Filter the imported source array for the current mock user
             // Make sure sourceMockMyIdeas is correctly defined and exported in mockData.js
             const userMockIdeas = (sourceMockMyIdeas || []).filter(idea => idea.user_id === (user?.id || 'mock-user-123'));
             setMyIdeas(sortIdeas(userMockIdeas)); // Update local state with sorted data
             setLoadingIdeas(false);
             setListError(null);
             return;
        }
        // LIVE MODE
        if (!user) { // Handle case where user might log out while viewing
           setLoadingIdeas(false);
           setMyIdeas([]);
           return;
        };
        console.log("MyIdeas: Running in LIVE MODE. Fetching ideas from Supabase.");
        setLoadingIdeas(true);
        setListError(null);
        try {
            // SELECT bpm column along with others
            const { data, error } = await supabase
                .from('ideas')
                .select('id, user_id, description, file_path, original_filename, hidden_duration_seconds, expires_at, is_public, created_at, upvotes, bpm') // Explicitly list columns
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw new Error(`Database error fetching ideas: ${error.message}`);
            setMyIdeas(data || []); // Update local state
        } catch (err) {
            console.error('Error fetching my ideas:', err.message);
            setListError(err.message);
            setMyIdeas([]);
        } finally {
            setLoadingIdeas(false);
        }
    }, [user, isMockMode]); // Dependencies

    useEffect(() => {
        // Fetch ideas immediately if user is present or in mock mode
        if (user || isMockMode) {
           fetchMyIdeas();
        } else {
           // If no user and not mock mode, clear ideas and stop loading
           setMyIdeas([]);
           setLoadingIdeas(false);
        }
    }, [fetchMyIdeas, user, isMockMode]); // Re-fetch if user changes or mode changes


    // --- Form Input Change Handlers ---
    const handleFileChange = (event) => {
        setFormMessage(''); setFormError(null);
        const selectedFile = event.target.files[0]; const fileInput = event.target;
        if (!selectedFile) { setFile(null); setSelectedFileName(''); return; }
        // File Size Check
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) { setFormError(`File is too large (max ${MAX_FILE_SIZE_MB}MB).`); setFile(null); setSelectedFileName(''); fileInput.value = null; return; }
        // File Type Check
        const fileTypeValid = ALLOWED_MIME_TYPES.includes(selectedFile.type); const fileExtensionValid = ALLOWED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!fileTypeValid && !fileExtensionValid) { setFormError(`Invalid file type. Please select MP3, WAV, or OGG.`); setFile(null); setSelectedFileName(''); fileInput.value = null; return; }
        setFile(selectedFile); setSelectedFileName(selectedFile.name);
    };
    const handleDescriptionChange = (e) => { setDescription(e.target.value); setFormError(null); };
    const handleDurationChange = (e) => { setDuration(e.target.value); setFormError(null); };
    const handleBpmChange = (e) => {
        const value = e.target.value;
        // Allow empty or digits only
        if (value === '' || /^[0-9]*$/.test(value)) { setBpm(value); setFormError(null); }
        else { setFormError("BPM must be a number."); } // Basic immediate feedback
    };

    // --- BPM Validation Function ---
    const validateBpm = (bpmString) => {
         if (!bpmString || bpmString.trim() === '') {
            return { isValid: true, error: null, value: null }; // Empty is valid, value is null
         }
         const bpmNum = parseInt(bpmString, 10);
         if (isNaN(bpmNum)) { return { isValid: false, error: "Please input a valid BPM number.", value: null }; }
         if (bpmNum < 0) { return { isValid: false, error: "BPM cannot be negative.", value: null }; }
         if (bpmNum > 500) { return { isValid: false, error: "Can you really play that fast? (BPM must be 0-500)", value: null }; }
         return { isValid: true, error: null, value: bpmNum }; // Return parsed number
    }

    // --- Trigger Upload Process (Opens Confirmation Modal) ---
    const handleUpload = async (event) => {
        event.preventDefault();
        setFormError(null); setFormMessage(''); // Reset feedback

        // Check required fields
        if (!file || duration === '') { setFormError("Please select a file and choose a visibility option."); return; }

        // Validate BPM
        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) { setFormError(bpmValidation.error); return; }

        // If all checks pass, open modal
        setIsModalOpen(true);
    };

    // --- Actual Upload Logic ---
    const proceedWithUpload = async () => {
        // Re-check required fields (safety)
        if (!file || duration === '') { setFormError("Missing file or visibility option."); setIsModalOpen(false); return; }
        // Re-validate BPM (safety)
        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) { setFormError(bpmValidation.error); setIsModalOpen(false); return; }
        const bpmToSave = bpmValidation.value; // Use the parsed value (or null)

        // Start upload process
        setUploading(true); setFormError(null); setFormMessage(''); setIsModalOpen(false);

        // --- MOCK MODE ---
        if (isMockMode) {
            console.log("MyIdeas: MOCK MODE. Simulating upload with BPM:", bpmToSave);
            setFormMessage('Simulating upload...');
            try {
                await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate delay
                const hiddenDurationSeconds = parseInt(duration, 10); const isPublic = hiddenDurationSeconds === 0;
                const expiresAt = isPublic ? new Date().toISOString() : new Date(Date.now() + hiddenDurationSeconds * 1000).toISOString();
                // Create the new mock idea object
                const newMockIdea = { id: `mock-idea-${Date.now()}`, user_id: user?.id || 'mock-user-123', description: description || null, file_path: `mock/local/${file.name}`, original_filename: file.name, hidden_duration_seconds: hiddenDurationSeconds, expires_at: expiresAt, is_public: isPublic, created_at: new Date().toISOString(), upvotes: 0, bpm: bpmToSave };
                // Update ONLY the local state for this component's display
                setMyIdeas(prev => sortIdeas([newMockIdea, ...prev]));
                console.log("Mock upload simulation successful. Updated local MyIdeas state.");
                console.warn("Note: The central mockData.js arrays were NOT mutated during mock upload simulation.");
                setFormMessage('Mock upload successful!');
                // Reset form state
                setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm('');
                const fileInput = document.getElementById('audioFile'); if (fileInput) fileInput.value = null;
            } catch (simulatedError) { console.error("Mock upload simulation error:", simulatedError); setFormError("Mock upload failed."); setFormMessage('');}
            finally { setUploading(false); }
            return; // End mock mode execution
        }

        // --- LIVE MODE ---
        console.log("MyIdeas: LIVE MODE. Uploading to Supabase with BPM:", bpmToSave);
        if (!user) { setFormError("User not authenticated."); setUploading(false); return; } // Check user again

        const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
        const hiddenDurationSeconds = parseInt(duration, 10);
        const isPublic = hiddenDurationSeconds === 0;
        const now = new Date();
        const expiresAt = isPublic ? now.toISOString() : new Date(now.getTime() + hiddenDurationSeconds * 1000).toISOString();

        try {
            // 1. Upload file to Storage
            setFormMessage('Uploading file...');
            const { error: uploadError } = await supabase.storage.from('ideas-audio').upload(filePath, file);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

            // 2. Insert record into Database
            setFormMessage('Saving idea details...');
            const { data: insertedData, error: insertError } = await supabase
             .from('ideas')
             .insert({
                 user_id: user.id,
                 description: description || null,
                 file_path: filePath,
                 hidden_duration_seconds: hiddenDurationSeconds,
                 expires_at: expiresAt,
                 is_public: isPublic,
                 original_filename: file.name,
                 bpm: bpmToSave, // Include bpm value (can be null)
                 // 'upvotes' column defaults to 0 in the database
             }).select().single(); // Select to get the inserted row back

            if (insertError) throw new Error(`Database Error: ${insertError.message}`);

            // Success: Refresh list and reset form
            console.log('Upload successful:', insertedData);
            setFormMessage('Idea uploaded successfully!');
            fetchMyIdeas(); // Refresh local state by re-fetching
            setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm('');
            const fileInput = document.getElementById('audioFile'); if (fileInput) fileInput.value = null;

        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
             // Attempt to remove orphaned file if DB insert failed after storage upload
             if (err.message.includes('Database Error') && !err.message.includes('Storage Error')) {
                 console.warn("Database insert failed after file upload. Attempting to remove orphaned file:", filePath);
                 await supabase.storage.from('ideas-audio').remove([filePath]);
             }
        } finally {
            setUploading(false); // Stop loading indicator
        }
    };

    // --- Modal Handlers ---
    const handleConfirmUpload = () => { proceedWithUpload(); };
    const handleCancelUpload = () => { setIsModalOpen(false); console.log("Upload cancelled by user."); };

    // --- Remove Idea Logic (Handles public dissociation via RPC) ---
    const handleRemoveIdea = async (ideaId, filePath, isPublic) => {
        setListError(null); // Clear previous list errors

        // Define confirmation messages
        const publicRemovePrompt = "An already public note will be removed from your list, but would still be available to everyone on shared notes. Proceed?";
        const privateRemovePrompt = "Are you sure you want to remove this private idea permanently? This cannot be undone.";
        const confirmationMessage = isPublic ? publicRemovePrompt : privateRemovePrompt;

        // Show confirmation dialog
        if (!window.confirm(confirmationMessage)) {
            return; // User cancelled
        }

        // --- MOCK MODE (Corrected: No direct mutation) ---
        if (isMockMode) {
            if (isPublic) {
                console.log(`MyIdeas: MOCK MODE. Dissociating public idea ${ideaId} from local list.`);
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId)); // Update local state only
                console.warn("Mock Mode: Public idea removed from 'My Ideas' view only. Underlying shared mock data was NOT mutated.");
            } else {
                console.log(`MyIdeas: MOCK MODE. Removing private idea ${ideaId} from local list.`);
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId)); // Update local state only
                console.warn(`Mock Mode: Private idea ${ideaId} removed from 'My Ideas' view only. Underlying shared mock data was NOT mutated.`);
            }
            return; // Exit mock mode logic
        }

        // --- LIVE MODE ---
        if (!user) { setListError("User not identified. Cannot remove."); return; }

        try {
            if (isPublic) {
                // *** Call RPC function to dissociate ***
                console.log(`LIVE MODE: Calling RPC dissociate_my_public_idea for idea ${ideaId} by user ${user.id}.`);
                const { error: rpcError } = await supabase.rpc(
                    'dissociate_my_public_idea',
                    { idea_id_to_dissociate: ideaId } // Pass the argument (ensure argument name matches SQL function)
                );

                if (rpcError) {
                    console.error(`RPC Error dissociating idea ${ideaId}:`, rpcError);
                    throw new Error(`Database error dissociating idea: ${rpcError.message}`);
                }
                console.log(`Idea ${ideaId} disassociated successfully via RPC.`);

            } else {
                // Delete Permanently (Private Idea - Requires RLS DELETE policy)
                console.log(`LIVE MODE: Permanently deleting private idea ${ideaId} by user ${user.id}.`);
                // 1. Remove file from storage
                if (filePath) {
                    const { error: storageError } = await supabase.storage.from('ideas-audio').remove([filePath]);
                    if (storageError) console.warn(`Warning: Error deleting file ${filePath} from storage: ${storageError.message}`);
                } else {
                     console.warn(`No file path for private idea ${ideaId}, cannot remove from storage.`);
                }
                // 2. Remove record from database
                const { error: dbError } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', user.id);
                if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);
                console.log(`Idea ${ideaId} deleted successfully.`);
            }

            // Update Local State (Same for both public dissociation and private delete)
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));

        } catch (err) {
            console.error('Error during idea removal:', err.message);
            setListError(`Failed to remove idea: ${err.message}`);
        }
    };
    // --- End Remove Idea Logic ---

    // --- Get Audio URL ---
    const getAudioUrl = (filePath) => {
        if (isMockMode) return mockGetAudioUrl(filePath);
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('ideas-audio').getPublicUrl(filePath);
            // Handle potential null response from getPublicUrl
            if (!data || !data.publicUrl) {
                console.warn(`Could not get public URL for path: ${filePath}`);
                return null;
            }
            return data.publicUrl;
        } catch (error) { console.error(`Error getting public URL for ${filePath}:`, error); return null; }
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

            {/* Main Container */}
            <div className="my-ideas-container">
                {/* Upload Section */}
                <div className="upload-section">
                    <h2 className="upload-section-title">
                        Upload New{' '}
                        <span className="upload-title-char">N</span>
                        <span className="upload-title-char">o</span>
                        <span className="upload-title-char">t</span>
                        <span className="upload-title-char">e</span>
                    </h2>
                    {/* Upload Form */}
                    <form onSubmit={handleUpload} className="upload-form" noValidate>
                         {/* File Input */}
                         <div className="form-group file-upload-group">
                            <label htmlFor="audioFile"> Audio File (MP3, WAV, OGG - max {MAX_FILE_SIZE_MB}MB): </label>
                            <div className="file-input-container">
                                <label htmlFor="audioFile" className="btn btn-secondary file-upload-button"> Select File </label>
                                <span id="fileNameDisplay" className="file-name-display"> {selectedFileName ? selectedFileName : <span className="placeholder">No file chosen</span>} </span>
                            </div>
                            <input type="file" id="audioFile" accept=".mp3,audio/mpeg,.wav,audio/wav,audio/wave,.ogg,audio/ogg" onChange={handleFileChange} disabled={uploading} required className="visually-hidden-file-input" />
                        </div>
                        {/* Description */}
                        <div className="form-group"> <label htmlFor="description">Description (optional):</label> <textarea id="description" value={description} onChange={handleDescriptionChange} rows="3" disabled={uploading} maxLength={200} /> </div>
                        {/* BPM Input */}
                        <div className="form-group"> <label htmlFor="bpm">BPM (optional, 0-500):</label> <input type="number" id="bpm" value={bpm} onChange={handleBpmChange} placeholder="e.g., 120" min="0" max="500" step="1" disabled={uploading} className="bpm-input" /> </div>
                        {/* Visibility Select */}
                        <div className="form-group"> <label htmlFor="duration">Visibility:</label> <select id="duration" value={duration} onChange={handleDurationChange} disabled={uploading} required> <option value="" disabled>-- Select visibility --</option> <option value="0">Make Public Immediately</option> <option value="604800">Hidden for 1 Week</option> <option value="1209600">Hidden for 2 Weeks</option> <option value="2592000">Hidden for 1 Month</option> </select> </div>
                        {/* Submit Button */}
                        <button type="submit" className="btn btn-primary" disabled={uploading || !file || duration === ''}> {uploading ? 'Uploading...' : 'Add Note'} </button>
                        {/* Feedback Area */}
                         <div className="feedback-area form-feedback"> {formError && <p className="error-message">{formError}</p>} {formMessage && <p className="info-message">{formMessage}</p>} </div>
                    </form>
                </div> {/* End upload-section */}

                {/* Separator */}
                <div className="sleek-separator"></div>

                {/* Idea List Section */}
                <div className="ideas-list-section">
                     <h2>Your Saved Ideas</h2>
                     {/* List Status: Error, Loading, Empty, or Grid */}
                     {listError && <div className="feedback-area list-feedback"><p className="error-message">Error loading ideas: {listError}</p></div>}
                     {loadingIdeas ? <div className="loading-container">Loading your ideas...</div>
                      : myIdeas.length === 0 && !listError ? <p style={{ textAlign: 'center' }}>You haven't uploaded any ideas yet.</p>
                      : (
                         <div className="ideas-grid">
                             {/* Map over user's ideas */}
                             {myIdeas.map((idea) => {
                                 // Defensive check
                                 if (!idea || !idea.id) { console.warn("Skipping invalid idea object in map:", idea); return null; }

                                 const gradientClass = getRandomGradientClass();
                                 // Check if public now
                                 const isEffectivelyPublic = idea.is_public || (idea.expires_at && new Date(idea.expires_at) <= new Date());

                                 return (
                                     <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                         {/* Header: Filename & BPM */}
                                         <div className="idea-header-info">
                                             <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                             {idea.bpm !== null && idea.bpm !== undefined && (
                                                 <p className="idea-bpm">BPM: {idea.bpm}</p>
                                             )}
                                         </div>
                                         {/* Description */}
                                         {idea.description && <p className="idea-description">{idea.description}</p>}
                                         {/* Audio Player */}
                                         <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                         {/* Dates / Status */}
                                         <p className="idea-dates"> {/* Consider if this is needed if footer handles dates elsewhere */}
                                             {idea.hidden_duration_seconds === 0
                                                 ? `Public Since: ${new Date(idea.created_at || Date.now()).toLocaleDateString()}`
                                                 : `Expires: ${new Date(idea.expires_at || Date.now()).toLocaleString()}`
                                             }
                                         </p>
                                         {/* Remove Button */}
                                         <button
                                             onClick={() => handleRemoveIdea(idea.id, idea.file_path, isEffectivelyPublic)}
                                             className="btn btn-danger remove-button"
                                         >
                                             Remove
                                         </button>
                                     </div>
                                 );
                             })}
                         </div> // End ideas-grid
                     )}
                 </div> {/* End ideas-list-section */}
             </div> {/* End my-ideas-container */}
         </> // End Fragment
     );
 }

 export default MyIdeas;