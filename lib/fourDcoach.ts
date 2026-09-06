/**
 * Where 4Dcoach lives. 4Dcoach is the film-a-set → 4D replay app (repo Alihomaei/shaipt-simple,
 * folder 4Dcoach, deployed by the Vercel project sh-ai-pt-simple). Set NEXT_PUBLIC_4DCOACH_URL
 * to point somewhere else; on a LAN or localhost dev server the Vite dev server on port 5174 of
 * the same host is used, so the phone can reach it during development.
 */
export const FOURD_COACH_DEFAULT = 'https://sh-ai-pt-simple.vercel.app/';

export function fourDcoachUrl(): string {
  const env = process.env.NEXT_PUBLIC_4DCOACH_URL;
  if (env) return env;
  if (typeof window === 'undefined') return FOURD_COACH_DEFAULT;
  const { protocol, hostname } = window.location;
  const lan = protocol === 'http:' && (hostname === 'localhost' || /^\d+(\.\d+){3}$/.test(hostname) || hostname.endsWith('.local'));
  return lan ? `http://${hostname}:5174/` : FOURD_COACH_DEFAULT;
}
