/**
 * CSV parsing utilities with proper quote handling.
 */

/**
 * Parse a single CSV line with proper quote handling.
 * Handles quoted fields that may contain commas and escaped quotes.
 *
 * @param line - A single CSV line
 * @returns Array of parsed fields (quotes removed)
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (outside quotes)
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Push last field
  result.push(current.trim())
  return result
}
