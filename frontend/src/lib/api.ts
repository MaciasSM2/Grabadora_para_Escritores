/**
 * URL base del backend — se lee desde .env.local para facilitar despliegues.
 * En desarrollo: NEXT_PUBLIC_API_URL=http://localhost:8000
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
