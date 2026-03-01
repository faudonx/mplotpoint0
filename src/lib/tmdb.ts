const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhNzEzNGYxZjMxMGUzMzI0MDM1N2ZjMzQ2ZjQyZWJlYiIsIm5iZiI6MTc1NjIwMjY3MC44NDgsInN1YiI6IjY4YWQ4NmFlMzk2NTdhNzIyMjU0OGM4MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.TCY5Tt2msTRBbf6LN3cS_J7o-aSv0mJdheHrBuyS--U';

export async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3, delay = 1000) {
  const defaultOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
    }
  };

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, defaultOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

export const tmdb = {
  getNowPlaying: () => fetchWithRetry('https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1'),
  searchMulti: (query: string) => fetchWithRetry(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1`),
  getPopularMovies: () => fetchWithRetry('https://api.themoviedb.org/3/movie/popular?language=en-US&page=1'),
  getPopularTV: () => fetchWithRetry('https://api.themoviedb.org/3/tv/popular?language=en-US&page=1'),
  getAnime: () => fetchWithRetry('https://api.themoviedb.org/3/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=en-US&page=1'),
  getKDrama: () => fetchWithRetry('https://api.themoviedb.org/3/discover/tv?with_genres=18&with_original_language=ko&sort_by=popularity.desc&language=en-US&page=1'),
  getDetails: (id: number, mediaType: string) => fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${id}?append_to_response=videos,similar&language=en-US`),
  getTVSeasons: (id: number) => fetchWithRetry(`https://api.themoviedb.org/3/tv/${id}?language=en-US`),
  getTVEpisodes: (id: number, season: number) => fetchWithRetry(`https://api.themoviedb.org/3/tv/${id}/season/${season}?language=en-US`),
  getSimilar: (id: number, mediaType: string) => fetchWithRetry(`https://api.themoviedb.org/3/${mediaType}/${id}/similar?language=en-US&page=1`),
};
