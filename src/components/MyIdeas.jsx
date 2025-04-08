// src/components/MyIdeas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AudioPlayer from './AudioPlayer';
import ConfirmationModal from './ConfirmationModal';
import { mockMyIdeas as sourceMockMyIdeas, mockPublicIdeas as sourceMockPublicIdeas, mockGetAudioUrl, updateMockIdeaVotes } from '../mockData';

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/x-wav'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const sortIdeas = (ideas) => {
    if (!Array.isArray(ideas)) return [];
    return [...ideas].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });
};

function MyIdeas({ user, isMockMode }) {
    const [file, setFile] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [bpm, setBpm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formError, setFormError] = useState(null);
    const [myIdeas, setMyIdeas] = useState([]);
    const [loadingIdeas, setLoadingIdeas] = useState(true);
    const [listError, setListError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchMyIdeas = useCallback(async () => {
        if (isMockMode) {
             console.log("MyIdeas: Running in MOCK MODE. Fetching mock 'My Ideas'.");
             const userMockIdeas = (sourceMockMyIdeas || []).filter(idea => idea.user_id === (user?.id || 'mock-user-123'));
             setMyIdeas(sortIdeas(userMockIdeas));
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
                .select('id, user_id, description, file_path, original_filename, hidden_duration_seconds, expires_at, is_public, created_at, upvotes, bpm')
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
        if (user || isMockMode) {
           fetchMyIdeas();
        } else {
           setMyIdeas([]);
           setLoadingIdeas(false);
        }
    }, [fetchMyIdeas, user, isMockMode]);


    const handleFileChange = (event) => {
        setFormMessage(''); setFormError(null);
        const selectedFile = event.target.files[0]; const fileInput = event.target;
        if (!selectedFile) { setFile(null); setSelectedFileName(''); return; }
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) { setFormError(`File is too large (max ${MAX_FILE_SIZE_MB}MB).`); setFile(null); setSelectedFileName(''); fileInput.value = null; return; }
        const fileTypeValid = ALLOWED_MIME_TYPES.includes(selectedFile.type); const fileExtensionValid = ALLOWED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!fileTypeValid && !fileExtensionValid) { setFormError(`Invalid file type. Please select MP3, WAV, or OGG.`); setFile(null); setSelectedFileName(''); fileInput.value = null; return; }
        setFile(selectedFile); setSelectedFileName(selectedFile.name);
    };
    const handleDescriptionChange = (e) => { setDescription(e.target.value); setFormError(null); };
    const handleDurationChange = (e) => { setDuration(e.target.value); setFormError(null); };
    const handleBpmChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^[0-9]*$/.test(value)) { setBpm(value); setFormError(null); }
        else { setFormError("BPM must be a number."); }
    };

    const validateBpm = (bpmString) => {
         if (!bpmString || bpmString.trim() === '') {
            return { isValid: true, error: null, value: null };
         }
         const bpmNum = parseInt(bpmString, 10);
         if (isNaN(bpmNum)) { return { isValid: false, error: "Please input a valid BPM number.", value: null }; }
         if (bpmNum < 0) { return { isValid: false, error: "BPM cannot be negative.", value: null }; }
         if (bpmNum > 500) { return { isValid: false, error: "Can you really play that fast? (BPM must be 0-500)", value: null }; }
         return { isValid: true, error: null, value: bpmNum };
    }

    const handleUpload = async (event) => {
        event.preventDefault();
        setFormError(null); setFormMessage('');

        if (!file || duration === '') { setFormError("Please select a file and choose a visibility option."); return; }

        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) { setFormError(bpmValidation.error); return; }

        setIsModalOpen(true);
    };

    const resetOverflow = () => {
        document.body.style.overflow = 'unset';
        document.documentElement.style.overflow = 'unset'; // Also reset on html element
        console.log("Body and HTML overflow explicitly reset to unset.");
    };

    const proceedWithUpload = async () => {
        console.log("Starting proceedWithUpload...");
        if (!file || duration === '') {
            setFormError("Missing file or visibility option.");
            setIsModalOpen(false);
            console.error("Upload cancelled: Missing file or duration.");
            return;
        }
        const bpmValidation = validateBpm(bpm);
        if (!bpmValidation.isValid) {
            setFormError(bpmValidation.error);
            setIsModalOpen(false);
            console.error("Upload cancelled: Invalid BPM.");
            return;
        }
        const bpmToSave = bpmValidation.value;

        setUploading(true);
        setFormError(null);
        setFormMessage('');
        setIsModalOpen(false);
        console.log("Uploading state set to true. Modal closed.");

        if (isMockMode) {
             console.log("MyIdeas: MOCK MODE. Simulating upload with BPM:", bpmToSave);
             setFormMessage('Simulating upload...');
             try {
                 await new Promise(resolve => setTimeout(resolve, 1200));
                 const hiddenDurationSeconds = parseInt(duration, 10); const isPublic = hiddenDurationSeconds === 0;
                 const expiresAt = isPublic ? new Date().toISOString() : new Date(Date.now() + hiddenDurationSeconds * 1000).toISOString();
                 const newMockIdea = { id: `mock-idea-${Date.now()}`, user_id: user?.id || 'mock-user-123', description: description || null, file_path: `mock/local/${file.name}`, original_filename: file.name, hidden_duration_seconds: hiddenDurationSeconds, expires_at: expiresAt, is_public: isPublic, created_at: new Date().toISOString(), upvotes: 0, bpm: bpmToSave };
                 setMyIdeas(prev => sortIdeas([newMockIdea, ...prev]));
                 console.log("Mock upload simulation successful. Updated local MyIdeas state.");
                 console.warn("Note: The central mockData.js arrays were NOT mutated during mock upload simulation.");
                 setFormMessage('Mock upload successful!');
                 setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm('');
                 const fileInput = document.getElementById('audioFile'); if (fileInput) fileInput.value = null;
                 console.log("Mock form reset.");
             } catch (simulatedError) {
                 console.error("Mock upload simulation error:", simulatedError);
                 setFormError("Mock upload failed.");
                 setFormMessage('');
             }
             finally {
                 console.log("Mock mode finally block.");
                 resetOverflow(); // Call the reset function
                 setUploading(false);
             }
             return;
        }

        console.log("MyIdeas: LIVE MODE. Uploading to Supabase with BPM:", bpmToSave);
        if (!user) {
            setFormError("User not authenticated.");
            setUploading(false);
            console.error("Upload cancelled: User not authenticated.");
            return;
        }

        const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
        const hiddenDurationSeconds = parseInt(duration, 10);
        const isPublic = hiddenDurationSeconds === 0;
        const now = new Date();
        const expiresAt = isPublic ? now.toISOString() : new Date(now.getTime() + hiddenDurationSeconds * 1000).toISOString();
        let uploadSuccessful = false;

        try {
            setFormMessage('Uploading file...');
            console.log("Attempting storage upload...");
            const { error: uploadError } = await supabase.storage.from('ideas-audio').upload(filePath, file);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
            console.log("Storage upload successful.");

            setFormMessage('Saving idea details...');
            console.log("Attempting database insert...");
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
                 bpm: bpmToSave,
             }).select().single();

            if (insertError) throw new Error(`Database Error: ${insertError.message}`);
            console.log('Database insert successful:', insertedData);

            uploadSuccessful = true;

            setFormMessage('Idea uploaded successfully!');
            console.log("Calling fetchMyIdeas()...");
            await fetchMyIdeas();
            console.log("fetchMyIdeas() completed. Resetting form...");
            setFile(null); setSelectedFileName(''); setDescription(''); setDuration(''); setBpm('');
            const fileInput = document.getElementById('audioFile');
            if (fileInput) fileInput.value = null;
            console.log("Form reset complete.");

        } catch (err) {
            console.error('Upload process error:', err);
            setFormError(`Upload failed: ${err.message}`);
            setFormMessage('');
             if (!uploadSuccessful && err.message.includes('Database Error')) {
                 console.warn("Database insert failed after file upload. Attempting to remove orphaned file:", filePath);
                 try {
                    await supabase.storage.from('ideas-audio').remove([filePath]);
                    console.log("Orphaned file removal attempt finished.");
                 } catch (removeError) {
                    console.error("Error removing orphaned file:", removeError);
                 }
             }
        } finally {
            console.log("Live mode finally block.");
            resetOverflow(); // Call the reset function
            setUploading(false);
        }
    };

    const handleConfirmUpload = () => { proceedWithUpload(); };
    const handleCancelUpload = () => { setIsModalOpen(false); console.log("Upload cancelled by user."); };

    const handleRemoveIdea = async (ideaId, filePath, isPublic) => {
        setListError(null);
        const publicRemovePrompt = "An already public note will be removed from your list, but would still be available to everyone on shared notes. Proceed?";
        const privateRemovePrompt = "Are you sure you want to remove this private idea permanently? This cannot be undone.";
        const confirmationMessage = isPublic ? publicRemovePrompt : privateRemovePrompt;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        if (isMockMode) {
            if (isPublic) {
                console.log(`MyIdeas: MOCK MODE. Dissociating public idea ${ideaId} from local list.`);
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
                console.warn("Mock Mode: Public idea removed from 'My Ideas' view only. Underlying shared mock data was NOT mutated.");
            } else {
                console.log(`MyIdeas: MOCK MODE. Removing private idea ${ideaId} from local list.`);
                setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
                console.warn(`Mock Mode: Private idea ${ideaId} removed from 'My Ideas' view only. Underlying shared mock data was NOT mutated.`);
            }
            return;
        }

        if (!user) { setListError("User not identified. Cannot remove."); return; }

        try {
            if (isPublic) {
                console.log(`LIVE MODE: Calling RPC dissociate_my_public_idea for idea ${ideaId} by user ${user.id}.`);
                const { error: rpcError } = await supabase.rpc(
                    'dissociate_my_public_idea',
                    { idea_id_to_dissociate: ideaId }
                );

                if (rpcError) {
                    console.error(`RPC Error dissociating idea ${ideaId}:`, rpcError);
                    throw new Error(`Database error dissociating idea: ${rpcError.message}`);
                }
                console.log(`Idea ${ideaId} disassociated successfully via RPC.`);

            } else {
                console.log(`LIVE MODE: Permanently deleting private idea ${ideaId} by user ${user.id}.`);
                if (filePath) {
                    const { error: storageError } = await supabase.storage.from('ideas-audio').remove([filePath]);
                    if (storageError) console.warn(`Warning: Error deleting file ${filePath} from storage: ${storageError.message}`);
                } else {
                     console.warn(`No file path for private idea ${ideaId}, cannot remove from storage.`);
                }
                const { error: dbError } = await supabase.from('ideas').delete().eq('id', ideaId).eq('user_id', user.id);
                if (dbError) throw new Error(`Database error deleting idea: ${dbError.message}`);
                console.log(`Idea ${ideaId} deleted successfully.`);
            }
            setMyIdeas(currentIdeas => currentIdeas.filter(idea => idea.id !== ideaId));
        } catch (err) {
            console.error('Error during idea removal:', err.message);
            setListError(`Failed to remove idea: ${err.message}`);
        }
    };

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

    return (
        <>
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCancelUpload}
                onConfirm={handleConfirmUpload}
                message="Upon expiration, uploaded files become available for use by other users. Do you agree?"
            />
            <div className="my-ideas-container">
                <div className="upload-section">
                     <h2 className="upload-section-title">
                        Upload New{' '}
                        <span className="upload-title-char">N</span>
                        <span className="upload-title-char">o</span>
                        <span className="upload-title-char">t</span>
                        <span className="upload-title-char">e</span>
                    </h2>
                    <form onSubmit={handleUpload} className="upload-form" noValidate>
                         <div className="form-group file-upload-group">
                            <label htmlFor="audioFile"> Audio File (MP3, WAV, OGG - max {MAX_FILE_SIZE_MB}MB): </label>
                            <div className="file-input-container">
                                <label htmlFor="audioFile" className="btn btn-secondary file-upload-button"> Select File </label>
                                <span id="fileNameDisplay" className="file-name-display"> {selectedFileName ? selectedFileName : <span className="placeholder">No file chosen</span>} </span>
                            </div>
                            <input type="file" id="audioFile" accept=".mp3,audio/mpeg,.wav,audio/wav,audio/wave,.ogg,audio/ogg" onChange={handleFileChange} disabled={uploading} required className="visually-hidden-file-input" />
                        </div>
                        <div className="form-group"> <label htmlFor="description">Description (optional):</label> <textarea id="description" value={description} onChange={handleDescriptionChange} rows="2" disabled={uploading} maxLength={200} /> </div>
                        <div className="form-group"> <label htmlFor="bpm">BPM (optional, 0-500):</label> <input type="number" id="bpm" value={bpm} onChange={handleBpmChange} placeholder="e.g., 120" min="0" max="500" step="1" disabled={uploading} className="bpm-input" /> </div>
                        <div className="form-group"> <label htmlFor="duration">Visibility:</label> <select id="duration" value={duration} onChange={handleDurationChange} disabled={uploading} required> <option value="" disabled>-- Select visibility --</option> <option value="0">Make Public Immediately</option> <option value="604800">Hidden for 1 Week</option> <option value="1209600">Hidden for 2 Weeks</option> <option value="2592000">Hidden for 1 Month</option> </select> </div>
                        <button type="submit" className="btn btn-primary" disabled={uploading || !file || duration === ''}>
                           {uploading ? 'Uploading...' : 'Add Note'}
                        </button>
                         <div className="feedback-area form-feedback"> {formError && <p className="error-message">{formError}</p>} {formMessage && <p className="info-message">{formMessage}</p>} </div>
                    </form>
                </div>

                <div className="sleek-separator"></div>

                <div className="ideas-list-section">
                     <h2>Your Saved Notes</h2>
                     {listError && <div className="feedback-area list-feedback"><p className="error-message">Error loading notes: {listError}</p></div>}
                     {loadingIdeas ? <div className="loading-container">Loading your ideas...</div>
                      : myIdeas.length === 0 && !listError ? <p style={{ textAlign: 'center' }}>You haven't uploaded any notes yet.</p>
                      : (
                         <div className="ideas-grid">
                             {myIdeas.map((idea) => {
                                 if (!idea || !idea.id) { console.warn("Skipping invalid idea object in map:", idea); return null; }
                                 const isEffectivelyPublic = idea.is_public || (idea.expires_at && new Date(idea.expires_at) <= new Date());
                                 return (
                                     <div key={idea.id} className="idea-box">
                                         <div className="idea-header-info">
                                             <p className="idea-filename">Name: {idea.original_filename || 'Unknown Filename'}</p>
                                             {idea.bpm !== null && idea.bpm !== undefined && (
                                                 <p className="idea-bpm">BPM: {idea.bpm}</p>
                                             )}
                                         </div>
                                         {idea.description && <p className="idea-description">{idea.description}</p>}
                                         <AudioPlayer fileUrl={getAudioUrl(idea.file_path)} />
                                         <p className="idea-dates">
                                             {idea.hidden_duration_seconds === 0
                                                 ? `Public Since: ${new Date(idea.created_at || Date.now()).toLocaleDateString()}`
                                                 : `Expires: ${new Date(idea.expires_at || Date.now()).toLocaleString()}`
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
