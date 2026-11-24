// Build-time settings from client/.env.local (dev) or Vercel (production).
// Kept in one small file so tests can swap it for fixed values.

/**
 * Where the Express API lives. Empty in development: Vite forwards /api to
 * localhost:3001. In production it's the Render address, e.g.
 * https://lefa-api.onrender.com
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
