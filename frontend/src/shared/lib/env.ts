export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
}
