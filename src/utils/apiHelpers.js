/**
 * Utility functions for working with the TWiT API
 */

/**
 * Formats a date string from the API into a readable format
 * @param {string} dateString - Date string in ZULU format from the API
 * @param {object} options - Formatting options for toLocaleDateString
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Extracts image URL from API response
 * @param {object} item - Item from API response
 * @returns {string|null} Image URL or null if not found
 */
export const getImageUrl = (item) => {
  if (!item) return null;
  
  // Check different possible locations for image URL based on API structure
  if (item.image) return item.image;
  if (item._links?.image?.href) return item._links.image.href;
  if (item._embedded?.image?.url) return item._embedded.image.url;
  
  return null;
};

/**
 * Safely access nested properties in API response objects
 * @param {object} obj - Object to access properties from
 * @param {string} path - Dot-notation path to the property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or default value
 */
export const getNestedProperty = (obj, path, defaultValue = null) => {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
};

/**
 * Parses API error responses
 * @param {Error} error - Error object from API request
 * @returns {string} User-friendly error message
 */
export const parseApiError = (error) => {
  if (!error) return 'Unknown error occurred';
  
  // Check if it's an API error with status and message
  if (error.response) {
    const { status, data } = error.response;
    
    // Check for usage limits exceeded error
    if (status === 500 && data?._errors?.[0]?.message === 'usage limits are exceeded') {
      return 'API usage limits exceeded. Please try again later.';
    }
    
    // Check for other API errors
    if (data?._errors?.[0]?.message) {
      return `API Error: ${data._errors[0].message}`;
    }
    
    return `API Error: ${status}`;
  }
  
  // Network errors
  if (error.request) {
    return 'Network error. Please check your internet connection.';
  }
  
  // Other errors
  return error.message || 'An unexpected error occurred';
};
