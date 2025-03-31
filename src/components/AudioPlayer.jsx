// src/components/AudioPlayer.jsx

import React, { useState, useRef, useEffect } from 'react';

/**
 * A simple audio player component using the HTML5 audio tag.
 * @param {object} props - Component props.
 * @param {string | null | undefined} props.fileUrl - The URL of the audio file to play.
 */
function AudioPlayer({ fileUrl }) {
  // State to manage potential errors loading the audio
  const [error, setError] = useState(null);
  // useRef to get a reference to the actual <audio> DOM element
  const audioRef = useRef(null);

  // Effect to handle potential loading errors on the audio element
  useEffect(() => {
    const audioElement = audioRef.current;
    // Ensure the audio element exists before adding listener
    if (!audioElement) return;

    // Function to handle the 'error' event from the audio element
    const handleError = (e) => {
      console.error('Audio Element Error:', e);

      // Try to determine a user-friendly error message
      let errorMessage = 'Failed to load audio.';
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback aborted by user or script.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'A network error caused audio download to fail.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio playback aborted due to a decoding error.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio source format not supported or invalid URL.';
            break;
          default:
            errorMessage = 'An unknown error occurred while loading audio.';
        }
      } else if (audioElement.networkState === audioElement.NETWORK_NO_SOURCE) {
         errorMessage = 'Audio source not found or cannot be played.';
      }
      setError(errorMessage);
    };

    // Reset error state when a new fileUrl is provided
    setError(null);

    // Add the event listener for the 'error' event
    audioElement.addEventListener('error', handleError);

    // Cleanup function: remove the event listener when the component unmounts
    // or before the effect runs again (due to fileUrl changing)
    return () => {
      if (audioElement) {
         audioElement.removeEventListener('error', handleError);
      }
    };
  }, [fileUrl]); // Re-run this effect if the fileUrl changes

  // --- Render Logic ---

  // 1. Handle case where no URL is provided
  if (!fileUrl) {
    // You might want different styling for messages vs errors
    return <p className="audio-player-message">Audio URL not available.</p>;
  }

  // 2. Handle case where an error occurred during loading
  if (error) {
    return <p className="audio-player-error">Error: {error}</p>;
  }

  // 3. Render the audio player if URL exists and no error occurred
  return (
    <div className="audio-player-wrapper" style={{ marginTop: '8px' }}> {/* Basic wrapper */}
      <audio
        ref={audioRef} // Attach the ref to access the DOM element
        controls // Show default browser controls (play/pause/seek/volume)
        src={fileUrl} // Set the source URL for the audio file
        style={{ width: '100%' }} // Make player responsive within its container
        preload="metadata" // Hint: Load only metadata initially (saves bandwidth)
        // Consider adding title attribute for accessibility if needed
        // title={`Play audio: ${/* Get filename from URL or prop if available */}`}
      >
        {/* Fallback message for browsers that don't support the audio tag */}
        Your browser does not support the audio element.
      </audio>
      
      {
      <a
        href={fileUrl}
        download // Suggests download instead of navigating
        target="_blank" // Open in new tab might be safer for some browsers
        rel="noopener noreferrer" // Security for target="_blank"
        style={{ fontSize: '0.8em', marginLeft: '5px' }}
      >
        Download
      </a>
      }
    </div>
  );
}

export default AudioPlayer;