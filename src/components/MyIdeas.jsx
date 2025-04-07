// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer';
import ConfirmationModal from './ConfirmationModal';
import { mockMyIdeas, mockGetAudioUrl, updateMockIdeaVotes } from '../mockData'; // Assuming update function exists

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

function MyIdeas({ user, isMockMode }) {
    // --- State Variables ---
    const [file, setFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [bpm, setBpm] = useState(''); // <-- ADDED BPM STATE
    const [uploading, setUploading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formError, setFormError] = useState(null); // Unified form error state
    const [myIdeas, setMyIdeas] = useState([]);
    const [loadingIdeas, setLoadingIdeas] = useState(true); // Start loading true
    const [listError, setListError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Fetch User's Ideas (Selects bpm) ---
    const fetchMyIdeas = useCallback(async () => {
        if (isMockMode) {
             console.log("MyIdeas: Running in MOCK MODE. Fetching mock 'My Ideas'.");
             const userMockIdeas = (mockMyIdeas || []).filter(idea => idea.user_id === (user?.id || 'mock-user-123'));
             setMyIdeas(sortIdeas(userMockIdeas)); // Sort mock ideas too
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
            // SELECT bpm column
            const { data, error } = await supabase
                .from('ideas')
                .select('*, bpm')
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
    }, [user, isMockMode]);

    useEffect(() => {
        fetchMyIdeas();
    }, [fetchMyIdeas]);

    // --- Form Input Change Handlers ---
    const handleFileChange = (event) => {
        setFormMessage('');
        setFormError(null);
        const selectedFile = event.target.files[0];
        const fileInput = event.target;

        if (!selectedFile) {
            setFile(null);
            setSelectedFileName('');
            return;
        }
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setFormError(`File is too large (max ${MAX_FILE_SIZE_MB}MB).`);
            setFile(null); setSelectedFileName(''); fileInput.value = null; return;
        }
        const fileTypeValid = ALLOWED_MIME_TYPES.includes(selectedFile.type);
        const fileExtensionValid = ALLOWED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!fileTypeValid && !fileExtensionValid) {
             setFormError(`Invalid file type. Please select MP3, WAV, or OGG.`);
             setFile(null); setSelectedFileName(''); fileInput.value = null; return;
        }
        setFile(selectedFile);
        setSelectedFileName(selectedFile.name);
    };

    const handleDescriptionChange = (e) => {
         setDescription(e.target.value);
         setFormError(null);
    };

     const handleDurationChange = (e) => {
         setDuration(e.target.value);
         setFormError(null);
    };

    // ADDED: BPM Change Handler
    const handleBpmChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^[0-9]*$/.test(value)) {
            setBpm(value);
            setFormError(null);
        } else {
             setFormError("BPM must be a number.");
        }
    };

    // ADDED: BPM Validation Function
    const validateBpm = (bpmString) => {
         if (!bpmString || bpmString.trim() === '') {
            return { isValid: true, error: null, value: null }; // Empty is valid
         }
         const bpmNum = parseInt(bpmString, 10);
         if (isNaN(bpmNum)) {
             return { isValid: false, error: "Please input a valid BPM number.", value: null };
         }
         if (bpmNum < 0) {
             return { isValid: false, error: "BPM cannot be negative.", value: null };
         }
         if (bpmNum > 500) {
             return { isValid: false, error: "Can you really play that fast? (BPM must be 0-500)", value: null };
         }
         return { isValid: true, error: null, value: bpmNum }; // Return parsed number
    }

    // UPDATED: Trigger Upload Process (Validates BPM)
    const handleUpload = async (event) => {
        event.preventDefault();
        setFormError(null);
        setFormMessage('');

        if (!file || duration === '') {
            setFormError("Please select a file and choose a visibility option.");
            return;
        }

        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) {
            setFormError(bpmValidation.error);
            return;
        }

        setIsModalOpen(true);
    };

    // UPDATED: Actual Upload Logic (Includes BPM)
    const proceedWithUpload = async () => {
        if (!file || duration === '') {
            setFormError("Missing file or visibility option.");
            setIsModalOpen(false); return;
        }

        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) {
            setFormError(bpmValidation.error);
            setIsModalOpen(false); return;
        }
        const bpmToSave = bpmValidation.value;

        setUploading(true);
        setFormError(null);
        setFormMessage('');
        setIsModalOpen(false);

        // MOCK MODE
        if (isMockMode) {
            console.log("MyIdeas: MOCK MODE. Simulating upload with BPM:", bpmToSave);
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
                    upvotes: 0,
                    bpm: bpmToSave, // ADD BPM
                 };
                 mockMyIdeas.push(newMockIdea); // Add to source array for consistency if needed
                 setMyIdeas(prev => sortIdeas([newMockIdea, ...prev]));
                 setFormMessage('Mock upload successful!');
                 // Reset form state
                 setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm(''); // RESET BPM
                 const fileInput = document.getElementById('audioFile'); if (fileInput) fileInput.value = null;
            } catch (simulatedError) { console.error("Mock upload simulation error:", simulatedError); setFormError("Mock upload failed."); setFormMessage('');}
            finally { setUploading(false); }
            return;
        }

        // LIVE MODE
        console.log("MyIdeas: LIVE MODE. Uploading to Supabase with BPM:", bpmToSave);
        if (!user) { setFormError("User not authenticated."); setUploading(false); return; }

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
                 bpm: bpmToSave, // ADD BPM
             }).select().single();

            if (insertError) throw new Error(`Database Error: ${insertError.message}`);

            console.log('Upload successful:', insertedData);
            setFormMessage('Idea uploaded successfully!');
            fetchMyIdeas();
            // Reset form state
            setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm(''); // RESET BPM
            const fileInput = document.getElementById('audioFile'); if (fileInput) fileInput.value = null;

        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
             if (err.message.includes('Database Error') && !err.message.includes('Storage Error')) {
                 console.warn("Database insert failed after file upload. Attempting to remove orphaned file:", filePath);
                 await supabase.storage.from('ideas-audio').remove([filePath]);
             }
        } finally {
            setUploading(false);
        }
    };

    // --- Modal Handlers ---
    const handleConfirmUpload = () => { proceedWithUpload(); };
    const handleCancelUpload = () => { setIsModalOpen(false); console.log("Upload cancelled by user."); };

    // --- Remove Idea Logic (Handles public dissociation) ---
    const handleRemoveIdea = async (ideaId, filePath, isPublic) => {
        setListError(null);

        const publicRemovePrompt = "An already public note will be removed from your list, but would still be available to everyone on shared notes. Proceed?";
        const privateRemovePrompt = "Are you sure you want to remove this idea permanently? This cannot be undone.";
        const confirmationMessage = isPublic ? publicRemovePrompt : privateRemovePrompt;

        if (!window.confirm(confirmationMessage)) return;

        // MOCK MODE
        if (isMockMode) {
            if (isPublic) {
                console.log(`MyIdeas: MOCK MODE. Simulating removal of public idea ${ideaId} from user's list.`);
                // Filter from local state, assume global mock data remains for PeoplesIdeas
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
            } else {
                console.log(`MyIdeas: MOCK MODE. Simulating permanent removal of private idea ${ideaId}.`);
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
                // Also remove from the source array if PeoplesIdeas reads directly from it
                 mockMyIdeas = mockMyIdeas.filter(idea => idea.id !== ideaId);
                 // And potentially from mockPublicIdeas if it was there too
                 mockPublicIdeas = mockPublicIdeas.filter(idea => idea.id !== ideaId);
            }
            return;
        }

        // LIVE MODE
        if (!user) { setListError("User not identified. Cannot remove."); return; }

        try {
            if (isPublic) {
                // Dissociate public idea (set user_id to null)
                const { error: updateError } = await supabase
                    .from('ideas').update({ user_id: null }).eq('id', ideaId).eq('user_id', user.id);
                if (updateError) throw new Error(`Database error dissociating idea: ${updateError.message}`);
            } else {
                // Permanently remove private idea (file and DB record)
                if (filePath) {
                    const { error: storageError } = await supabase.storage.from('ideas-audio').remove([filePath]);
                    if (storageError) console.warn(`Warning: Error deleting file ${filePath}: ${storageError.message}`);
                }
                const { error: dbError } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', user.id);
                if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);
            }
            // Update local state after successful operation
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
        } catch (err) {
            console.error('Error removing idea:', err.message);
            setListError(`Failed to remove idea: ${err.message}`);
        }
    };

    // --- Get Audio URL ---
    const getAudioUrl = (filePath) => {
        if (isMockMode) return mockGetAudioUrl(filePath);
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('ideas-audio').getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) { console.error(`Error getting public URL for ${filePath}:`, error); return null; }
    };

    // Helper to sort ideas by creation date
    const sortIdeas = (ideas) => {
        if (!Array.isArray(ideas)) return [];
        // defensive copy before sorting
        return [...ideas].sort((a, b) => {
            // Handle cases where created_at might be missing or invalid
             const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
             const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
             if (isNaN(dateA) || isNaN(dateB)) return 0; // Avoid NaN comparison issues
             return dateB - dateA; // Descending order (newest first)
         });
    };


    // --- Component Render ---
    return (
        <>
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCancelUpload}
                onConfirm={handleConfirmUpload}
                message="Upon expiration, uploaded files become available for use by other users. Do you agree?"
            />

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
                    <form onSubmit={handleUpload} className="upload-form">
                        {/* File Input */}
                         <div className="form-group file-upload-group">
                            <label htmlFor="audioFile">
                                Audio File (MP3, WAV, OGG - max {MAX_FILE_SIZE_MB}MB):
                            </label>
                            <div className="file-input-container">
                                <label htmlFor="audioFile" className="btn btn-secondary file-upload-button"> Select File </label>
                                <span id="fileNameDisplay" className="file-name-display">
                                    {selectedFileName ? selectedFileName : <span className="placeholder">No file chosen</span>}
                                </span>
                            </div>
                            <input type="file" id="audioFile" accept=".mp3,audio/mpeg,.wav,audio/wav,audio/wave,.ogg,audio/ogg" onChange={handleFileChange} disabled={uploading} required className="visually-hidden-file-input" />
                        </div>
                        {/* Description */}
                        <div className="form-group">
                             <label htmlFor="description">Description (optional):</label>
                             <textarea id="description" value={description} onChange={handleDescriptionChange} rows="3" disabled={uploading} maxLength={200} />
                        </div>
                        {/* BPM Input */}
                        <div className="form-group">
                            <label htmlFor="bpm">BPM (optional, 0-500):</label>
                            <input type="number" id="bpm" value={bpm} onChange={handleBpmChange} placeholder="e.g., 120" min="0" max="500" step="1" disabled={uploading} className="bpm-input" />
                        </div>
                        {/* Visibility */}
                        <div className="form-group">
                            <label htmlFor="duration">Visibility:</label>
                            <select id="duration" value={duration} onChange={handleDurationChange} disabled={uploading} required>
                                 <option value="" disabled>-- Select visibility --</option>
                                 <option value="0">Make Public Immediately</option>
                                 <option value="604800">Hidden for 1 Week</option>
                                 <option value="1209600">Hidden for 2 Weeks</option>
                                 <option value="2592000">Hidden for 1 Month</option>
                            </select>
                        </div>
                        {/* Submit */}
                        <button type="submit" className="btn btn-primary" disabled={uploading || !file || duration === ''}>
                            {uploading ? 'Uploading...' : 'Add Note'}
                        </button>
                        {/* Feedback */}
                         <div className="feedback-area form-feedback">
                            {formError && <p className="error-message">{formError}</p>}
                            {formMessage && <p className="info-message">{formMessage}</p>}
                        </div>
                    </form>
                </div>

                <div className="sleek-separator"></div>

                {/* Idea List Section */}
                <div className="ideas-list-section">
                     <h2>Your Saved Ideas</h2>
                     {listError && <div className="feedback-area list-feedback"><p className="error-message">Error loading ideas: {listError}</p></div>}

                     {loadingIdeas ? (
                         <div className="loading-container">Loading your ideas...</div>
                     ) : myIdeas.length === 0 && !listError ? (
                         <p style={{ textAlign: 'center' }}>You haven't uploaded any ideas yet.</p>
                     ) : (
                         <div className="ideas-grid">
                             {myIdeas.map((idea) => {
                                 // Defensive check
                                 if (!idea || !idea.id) return null;

                                 const gradientClass = getRandomGradientClass();
                                 const isEffectivelyPublic = idea.is_public || (idea.expires_at && new Date(idea.expires_at) <= new Date());
                                 return (
                                     <div key={idea.id} className={`idea-box ${gradientClass}`}>
                                         {/* ADDED: Header for filename & BPM */}
                                         <div className="idea-header-info">
                                             <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                             {idea.bpm !== null && idea.bpm !== undefined && (
                                                 <p className="idea-bpm">BPM: {idea.bpm}</p>
                                             )}
                                         </div>

                                         {idea.description && <p className="idea-description">{idea.description}</p>}
                                         <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                         <p className="idea-dates"> {/* This class might need removal if footer handles dates now */}
                                             {idea.hidden_duration_seconds === 0
                                                 ? `Public Since: ${new Date(idea.created_at || Date.now()).toLocaleDateString()}` // Fallback date
                                                 : `Expires: ${new Date(idea.expires_at || Date.now()).toLocaleString()}` // Fallback date
                                             }
                                         </p>
                                         <button
                                             onClick={() => handleRemoveIdea(idea.id, idea.file_path, isEffectivelyPublic)}
                                             className="btn btn-danger remove-button"
                                         >
                                             Remove
                                         </button>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                 </div>
             </div>
         </>
     );
 }

 export default MyIdeas;