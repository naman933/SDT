// Runtime switches.
// SERVER_AI: false = everything runs in the browser — rule-based understanding, the browser's own speech recognition
// for voice typing and its speech synthesis for read-aloud. No request goes to /api.
// true = also use the serverless /api (Groq) for understanding and Whisper transcription when it is configured.
export const SERVER_AI = false;
