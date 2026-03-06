/**
 * Utility functions for string manipulation and normalization.
 */

/**
 * Normalizes line endings to \n and trims whitespace from both ends.
 * Also handles various types of line endings (\r\n, \r) to ensure consistency.
 */
export function normalizeString(str: any): string {
  if (str === null || str === undefined) return ''
  
  return str
    .toString()
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/**
 * Safe string conversion with fallback.
 */
export function safeString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback
  return String(val)
}
