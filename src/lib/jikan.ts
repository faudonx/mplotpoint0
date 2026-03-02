const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
// We'll use the hardcoded URL for now to ensure stability, or safely check env
const getBaseUrl = () => {
  try {
    return (import.meta as any).env?.VITE_JIKAN_API_BASE_URL || JIKAN_BASE_URL;
  } catch (e) {
    return JIKAN_BASE_URL;
  }
};
const ACTUAL_BASE_URL = getBaseUrl();

// Simple in-memory cache with TTL
const cache: Record<string, { data: any; expiry: number }> = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Rate limiting queue
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 400; // ~2.5 requests per second to be safe

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
      // Too many requests, wait longer and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      return rateLimitedFetch(url);
    }
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Jikan API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Cache the result
    cache[url] = {
      data: data.data,
      expiry: Date.now() + CACHE_DURATION
    };
    
    return data.data;
  } catch (err) {
    console.error('Jikan fetch error:', err);
    return null;
  }
}

export const jikan = {
  // Search for an anime by title to get its MAL ID
  searchAnime: (query: string) => 
    rateLimitedFetch(`${ACTUAL_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10`),
  
  // Fetch anime by MyAnimeList (MAL) ID
  getAnimeDetails: (malId: number) => 
    rateLimitedFetch(`${ACTUAL_BASE_URL}/anime/${malId}/full`),
  
  // Get episode list from /anime/{id}/episodes
  getAnimeEpisodes: (malId: number, page = 1) => 
    rateLimitedFetch(`${ACTUAL_BASE_URL}/anime/${malId}/episodes?page=${page}`),
  
  // Get official streaming links from the /anime/{id}/streaming endpoint
  getAnimeStreaming: (malId: number) => 
    rateLimitedFetch(`${ACTUAL_BASE_URL}/anime/${malId}/streaming`),

  // Helper to find MAL ID by title and year
  findMalId: async (title: string, year?: string) => {
    let url = `${ACTUAL_BASE_URL}/anime?q=${encodeURIComponent(title)}&limit=5`;
    if (year) url += `&start_date=${year}-01-01`;
    
    const results = await rateLimitedFetch(url);
    if (!results || results.length === 0) return null;
    
    // Try to find exact match or first result
    const exactMatch = results.find((r: any) => 
      r.title.toLowerCase() === title.toLowerCase() || 
      r.title_english?.toLowerCase() === title.toLowerCase()
    );
    
    return exactMatch ? exactMatch.mal_id : results[0].mal_id;
  },

  // Get YouTube trailer embed URL from the anime object
  getTrailerUrl: (anime: any) => {
    if (!anime?.trailer?.youtube_id) return null;
    return `https://www.youtube.com/embed/${anime.trailer.youtube_id}?rel=0&modestbranding=1&autoplay=1`;
  }
};
