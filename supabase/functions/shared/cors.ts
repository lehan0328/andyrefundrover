// supabase/functions/shared/cors.ts
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173", // Standard Vite port
  "https://reimbursements.aurenapp.com", // Removed trailing slash for exact matching
  "https://lovable.dev", // Replace with your actual domain
];

export const getCorsHeaders = (requestOrigin: string | null) => {
  // Check if the origin is allowed, otherwise default to your production domain
  const origin = (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[1]; 

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    // CASA DAST requirement: Prevent Clickjacking on API responses
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
  };
};