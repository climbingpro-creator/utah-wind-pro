/**
 * Fetch with exponential backoff retry for transient failures.
 * Only retries on network errors and 5xx/429 status codes.
 */
export async function fetchWithRetry(url, options = {}, { retries = 2, baseDelay = 1000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok || resp.status < 500 && resp.status !== 429) return resp;
      if (attempt < retries) {
        await sleep(baseDelay * 2 ** attempt);
        continue;
      }
      return resp;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(baseDelay * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
