/**
 * Fetch with automatic retry and exponential backoff.
 * Used for API calls that may fail transiently.
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(15000),
      });
      
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or abort
      if (error.name === 'AbortError') throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
}

export default fetchWithRetry;
