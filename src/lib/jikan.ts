const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Simple in-memory cache
const cache: Record<string, { data: any; expiry: number }> = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Rate limiting queue
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // ~3 requests per second (1000/3 = 333ms)

async function rateLimitedFetch(url: string): Promise<any> {
  // Check cache first
  if (cache[url] && cache[url].expiry > Date.now()) {
    return cache[url].data;
  }

  // Wait for rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();

  try {
    const res = await fetch(url);
    if (res.status === 429) {
      // Too many requests, wait and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      return rateLimitedFetch(url);
    }
    
    if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
    
    const data = await res.json();
    
    // Cache the result
    cache[url] = {
      data: data.data,
      expiry: Date.now() + CACHE_DURATION
    };
    
    return data.data;
  } catch (err) {
    console.error('Jikan fetch error:', err);
    throw err;
  }
}

export const jikan = {
  searchAnime: (query: string) => 
    rateLimitedFetch(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10`),
  
  getAnimeDetails: (malId: number) => 
    rateLimitedFetch(`${JIKAN_BASE_URL}/anime/${malId}/full`),
  
  getAnimeEpisodes: (malId: number, page = 1) => 
    rateLimitedFetch(`${JIKAN_BASE_URL}/anime/${malId}/episodes?page=${page}`),
  
  getAnimeStreaming: (malId: number) => 
    rateLimitedFetch(`${JIKAN_BASE_URL}/anime/${malId}/streaming`),
    
  getAnimeByTitle: async (title: string) => {
    const results = await jikan.searchAnime(title);
    return results && results.length > 0 ? results[0] : null;
  }
};
