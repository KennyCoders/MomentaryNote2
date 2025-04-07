// src/mockData.js

// Simulate a logged-in user object (or set to null to test logged-out state)
export const mockUser = {
    id: 'mock-user-123',
    email: 'local.dev@example.com',
    isMock: true // Add flag if needed elsewhere
};
// export const mockUser = null; // <-- Use this to test logged-out locally

// --- MOCK MY IDEAS ---
// Added 'bpm' and initial 'upvotes'
export let mockMyIdeas = [ // Use let if you might modify it during mock operations
    {
        id: 'mock-idea-1',
        user_id: 'mock-user-123',
        description: 'A groovy bassline concept.',
        file_path: 'mock/audio/bass_groove.mp3',
        original_filename: 'bass_groove.mp3',
        hidden_duration_seconds: 604800, // 1 week
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        upvotes: 0,
        bpm: 118, // Added BPM
    },
    {
        id: 'mock-idea-2',
        user_id: 'mock-user-123',
        description: null, // Test idea without description
        file_path: 'mock/audio/synth_pad.mp3',
        original_filename: 'synth_pad_idea.mp3',
        hidden_duration_seconds: 0, // Public immediately
        expires_at: new Date().toISOString(), // Expires 'now' since it's public
        is_public: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        upvotes: Math.floor(Math.random() * 5) + 1, // Add some initial votes if public
        bpm: null, // Added BPM (optional)
    },
    {
        id: 'mock-idea-3',
        user_id: 'mock-user-123',
        description: 'Quick vocal melody sketch.',
        file_path: 'mock/audio/vocal_sketch.mp3',
        original_filename: 'vox_idea_1.mp3',
        hidden_duration_seconds: 1209600, // 2 weeks
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
         upvotes: 0,
         bpm: 140, // Added BPM
    },
    {
        id: 'mock-idea-4',
        user_id: 'mock-user-123',
        description: 'Trying out a new guitar effect.',
        file_path: 'mock/audio/guitar_effect_test.mp3',
        original_filename: 'wet_guitar.mp3',
        hidden_duration_seconds: 2592000, // 1 month
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: false,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
         upvotes: 0,
         bpm: null, // Added BPM (optional)
    },
];


// --- MOCK PUBLIC IDEAS ---
// Added 'upvotes' and 'bpm' properties
export let mockPublicIdeas = [
     // Include the public idea from mockMyIdeas if it should appear here too
    {
        id: 'mock-idea-2', // From MyIdeas, now public
        user_id: 'mock-user-123', // Keep original user ID
        description: null,
        file_path: 'mock/audio/synth_pad.mp3',
        original_filename: 'synth_pad_idea.mp3',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        upvotes: mockMyIdeas.find(i => i.id === 'mock-idea-2')?.upvotes || Math.floor(Math.random() * 5),
        is_public: true,
        expires_at: new Date().toISOString(),
        hidden_duration_seconds: 0,
        bpm: mockMyIdeas.find(i => i.id === 'mock-idea-2')?.bpm ?? null, // Added BPM
    },
    // Other public ideas
    {
        id: 'mock-public-idea-1',
        description: 'Cool drum beat, feel free to use.',
        file_path: 'mock/public/drum_beat.mp3',
        original_filename: 'public_drums.mp3',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 50),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 125, // Added BPM
    },
    {
        id: 'mock-public-idea-2',
        description: 'Simple guitar riff.',
        file_path: 'mock/public/guitar_riff.mp3',
        original_filename: 'riff_idea.mp3',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 75),
        is_public: true, user_id: 'mock-other-user-1', expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 95, // Added BPM
    },
    {
        id: 'mock-public-idea-3',
        description: 'Synth arpeggio sequence.',
        file_path: 'mock/public/synth_arp.mp3',
        original_filename: 'arp_120bpm_Cmin.mp3',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 30),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 120, // Added BPM
    },
    {
        id: 'mock-public-idea-4',
        description: null,
        file_path: 'mock/public/bass_loop.mp3',
        original_filename: 'funky_bass_loop.mp3',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 100),
        is_public: true, user_id: 'mock-other-user-2', expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: null, // Added BPM
    },
    {
        id: 'mock-public-idea-5',
        description: 'A short atmospheric pad sound.',
        file_path: 'mock/public/atmos_pad.mp3',
        original_filename: 'spacey_pad.mp3',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 15),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 60, // Added BPM
    },
    {
        id: 'mock-public-idea-6',
        description: 'Basic 4/4 kick and snare.',
        file_path: 'mock/public/kick_snare.mp3',
        original_filename: 'simple_beat.mp3',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 40),
        is_public: true, user_id: 'mock-other-user-1', expires_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 90, // Added BPM
    },
    {
        id: 'mock-public-idea-7',
        description: 'A weird glitchy sound I made.',
        file_path: 'mock/public/glitch_sound.mp3',
        original_filename: 'error_beep_boop.mp3',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 60),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: null, // Added BPM
    },
    {
        id: 'mock-public-idea-8',
        description: '8-bit style melody line.',
        file_path: 'mock/public/8bit_melody.mp3',
        original_filename: 'chiptune_lead.mp3',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 25),
        is_public: true, user_id: 'mock-other-user-3', expires_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 135, // Added BPM
    },
    {
        id: 'mock-public-idea-9',
        description: 'Upbeat ukulele chords.',
        file_path: 'mock/public/ukulele_strum.mp3',
        original_filename: 'happy_uke.mp3',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 80),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 110, // Added BPM
    },
    {
        id: 'mock-public-idea-10',
        description: 'Slow piano melody fragment.',
        file_path: 'mock/public/slow_piano.mp3',
        original_filename: 'sad_piano_bits.mp3',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 55),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 70, // Added BPM
    },
    {
        id: 'mock-public-idea-11',
        description: 'Electric piano chords (Rhodes sound).',
        file_path: 'mock/public/rhodes_chords.mp3',
        original_filename: 'jazzy_epiano.mp3',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 90),
        is_public: true, user_id: 'mock-other-user-1', expires_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 85, // Added BPM
    },
    {
        id: 'mock-public-idea-12',
        description: 'Tambourine loop 90bpm.',
        file_path: 'mock/public/tambourine_loop.mp3',
        original_filename: 'tamb_90.mp3',
        created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 10),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 90, // Added BPM
    },
    {
        id: 'mock-public-idea-13',
        description: 'Distorted guitar power chords.',
        file_path: 'mock/public/power_chords.mp3',
        original_filename: 'heavy_gtr.mp3',
        created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 65),
        is_public: true, user_id: 'mock-other-user-2', expires_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: null, // Added BPM
    },
    {
        id: 'mock-public-idea-14',
        description: 'Simple hi-hat pattern.',
        file_path: 'mock/public/hihat_pattern.mp3',
        original_filename: 'hats_16ths.mp3',
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 20),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 100, // Added BPM
    },
    {
        id: 'mock-public-idea-15',
        description: 'Synth bass wobble.',
        file_path: 'mock/public/wobble_bass.mp3',
        original_filename: 'dubstep_wub.mp3',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 110),
        is_public: true, user_id: null, expires_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), hidden_duration_seconds: 0,
        bpm: 140, // Added BPM
    },
];

// Mock function to simulate getting a public URL
export const mockGetAudioUrl = (filePath) => {
    // console.log(`Mock getAudioUrl called for: ${filePath}`);
    // Return null or a placeholder for testing UI without actual audio
    // Example placeholder:
    // if (filePath?.includes('.mp3')) {
    //     return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    // }
    return null;
};

// Function to update mock data (useful if mock actions need to modify shared state)
// Primarily used here for updating votes in mock mode.
export const updateMockIdeaVotes = (ideaId, newVoteCount) => {
    const publicIdeaIndex = mockPublicIdeas.findIndex(idea => idea.id === ideaId);
    if (publicIdeaIndex > -1) {
        mockPublicIdeas[publicIdeaIndex].upvotes = newVoteCount;
    }
    const myIdeaIndex = mockMyIdeas.findIndex(idea => idea.id === ideaId);
     if (myIdeaIndex > -1) {
         mockMyIdeas[myIdeaIndex].upvotes = newVoteCount;
     }
    // Note: This direct mutation won't trigger re-renders automatically.
    // UI updates rely on optimistic updates within components.
};