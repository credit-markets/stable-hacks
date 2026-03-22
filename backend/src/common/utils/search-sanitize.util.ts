/**
 * Sanitizes a search term for use in Supabase PostgREST .or() filter strings.
 * Removes characters that have special meaning in PostgREST filter syntax.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,.()"'\\%_*!@:;[\]{}]/g, '');
}
