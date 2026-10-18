// Central configuration — resolves the backend URL from the Vite env variable.
// Set VITE_API_URL in your .env.local (local dev) or Vercel environment variables (production).
// Example: VITE_API_URL=https://ai-powered-smart-tender-construction.onrender.com/api

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Root of the backend server (used for building file / document URLs)
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
