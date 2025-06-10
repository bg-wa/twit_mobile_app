/**
 * Utility functions for text formatting
 */

/**
 * Decodes HTML entities in a string
 * @param {string} html - The HTML string containing entities
 * @returns {string} The decoded string
 */
export const decodeHtmlEntities = (html) => {
  if (!html) return '';
  
  // Create a map of HTML entities to their character equivalents
  const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#039;': "'",
    '&ndash;': '–',
    '&mdash;': '—',
    '&apos;': "'",
    '&rsquo;': '\u2019', 
    '&lsquo;': '\u2018',
    '&rdquo;': '\u201D',
    '&ldquo;': '\u201C',
    '&hellip;': '…',
  };
  
  // Replace all entities with their decoded character
  let decoded = html;
  
  // First handle numeric entities like &#039;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });
  
  // Then replace named entities
  Object.keys(entityMap).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    decoded = decoded.replace(regex, entityMap[entity]);
  });
  
  return decoded;
};

/**
 * Removes HTML tags from a string and decodes HTML entities
 * @param {string} html - The HTML string to process
 * @returns {string} Plain text with no HTML tags and decoded entities
 */
export const stripHtmlAndDecodeEntities = (html) => {
  if (!html) return '';
  
  // First strip HTML tags
  const stripped = html.replace(/<\/?[^>]+(>|$)/g, '');
  
  // Then decode entities
  return decodeHtmlEntities(stripped);
};
