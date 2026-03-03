import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Expand, ThumbsUp, ThumbsDown, Share2, Plus, List, PlayCircle, Loader2, Calendar, Star, ChevronDown, ChevronUp, LogOut, Film, Tv, ExternalLink, AlertCircle, RefreshCw, Youtube } from 'lucide-react';
import { tmdb } from '../lib/tmdb';
import { jikan } from '../lib/jikan';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, updateDoc, increment, limit } from 'firebase/firestore';

export function PlayerModal({ isOpen, onClose, item, mediaType, initialSeason = 1, initialEpisode = 1, onOpenDetail, onShowRestricted, onOpenAuth, onOpenWatchlist }: any) {
  const [seasonNum, setSeasonNum] = useState(initialSeason);
  const [episodeNum, setEpisodeNum] = useState(initialEpisode);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [jikanEpisodes, setJikanEpisodes] = useState<any[]>([]);
  const [jikanStreaming, setJikanStreaming] = useState<any[]>([]);
  const [jikanAnime, setJikanAnime] = useState<any>(null);
  const [malId, setMalId] = useState<number | null>(item?.mal_id || null);
  const [fallbackLayer, setFallbackLayer] = useState<'primary' | 'official' | 'trailer' | 'error'>('primary');
  const [isReporting, setIsReporting] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarMinimized(false);
      } else {
        setIsSidebarMinimized(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [userLiked, setUserLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [watchProgress, setWatchProgress] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [initialSeekTime, setInitialSeekTime] = useState(0);
  const [stableViews] = useState(() => (Math.random() * 5 + 0.5).toFixed(1));
  const [quality, setQuality] = useState(() => {
    try {
      return localStorage.getItem('preferred_quality') || '1080';
    } catch (e) {
      return '1080';
    }
  });

  // Load watch progress
  const loadWatchProgress = async () => {
    if (!auth.currentUser || !item) return;
    const uid = auth.currentUser.uid;
    const currentKey = mediaType === 'movie' ? 'movie' : `s${seasonNum}e${episodeNum}`;
    const storageKey = `progress_${uid}_${item.id}_${currentKey}`;
    
    try {
      // 1. Check Local Storage first for most recent progress
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        setInitialSeekTime(parsed.timestamp || 0);
        setCurrentTime(parsed.timestamp || 0);
        return;
      }

      // 2. Fallback to Firestore
      const q = query(
        collection(db, 'watchProgress'),
        where('userId', '==', uid),
        where('movieId', '==', item.id)
      );
      const snap = await getDocs(q);
      const progress: Record<string, any> = {};
      snap.forEach(doc => {
        const data = doc.data();
        const key = data.mediaType === 'movie' ? 'movie' : `s${data.season}e${data.episode}`;
        progress[key] = data;
      });
      setWatchProgress(progress);
      
      const savedTime = progress[currentKey]?.timestamp || 0;
      setInitialSeekTime(savedTime);
      setCurrentTime(savedTime);
    } catch (e) {
      console.error('Error loading watch progress:', e);
    }
  };

  useEffect(() => {
    if (!isOpen || !item) return;
    loadWatchProgress();
  }, [isOpen, item, seasonNum, episodeNum]);

  // Track time spent (Simulated since we can't access iframe internals)
  useEffect(() => {
    if (!isOpen || !item) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 1;
        // Save to local storage every second for maximum reliability
        const uid = auth.currentUser?.uid;
        if (uid) {
          const currentKey = mediaType === 'movie' ? 'movie' : `s${seasonNum}e${episodeNum}`;
          const storageKey = `progress_${uid}_${item.id}_${currentKey}`;
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              timestamp: next,
              lastUpdated: new Date().toISOString()
            }));
          } catch (e) {}
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      saveCurrentProgress();
    };
  }, [isOpen, item, seasonNum, episodeNum]);

  // Periodic sync to DB (Every 30 seconds instead of 15 to reduce requests)
  useEffect(() => {
    if (currentTime > 0 && currentTime % 30 === 0) {
      saveCurrentProgress();
    }
  }, [currentTime]);

  const saveCurrentProgress = async () => {
    if (!auth.currentUser || !item || currentTime < 5) return;
    
    const uid = auth.currentUser.uid;
    const progressKey = mediaType === 'movie' ? `${uid}_movie_${item.id}` : `${uid}_tv_${item.id}_s${seasonNum}_e${episodeNum}`;
    const progressRef = doc(db, 'watchProgress', progressKey);
    
    try {
      await setDoc(progressRef, {
        userId: uid,
        movieId: item.id,
        mediaType,
        season: mediaType === 'tv' ? seasonNum : null,
        episode: mediaType === 'tv' ? episodeNum : null,
        timestamp: currentTime,
        lastUpdated: new Date(),
        duration: mediaType === 'movie' ? (item.runtime * 60 || 7200) : 2400 
      }, { merge: true });
      
      const key = mediaType === 'movie' ? 'movie' : `s${seasonNum}e${episodeNum}`;
      setWatchProgress(prev => ({
        ...prev,
        [key]: { timestamp: currentTime, duration: mediaType === 'movie' ? (item.runtime * 60 || 7200) : 2400 }
      }));
    } catch (e) {
      console.error('Error saving progress to DB:', e);
    }
  };
  
  useEffect(() => {
    if (!isOpen || !item) return;

    const loadData = async () => {
      // Load user data
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }

      // Load MAL ID mapping if not present
      if (!malId && (mediaType === 'tv' || item.genres?.some((g: any) => g.id === 16))) {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date)?.slice(0, 4);
        const id = await jikan.findMalId(title, year);
        if (id) setMalId(id);
      }

      // Load likes
      const likesQuery = query(collection(db, 'likes'), where('movieId', '==', item.id), where('mediaType', '==', mediaType));
      const likesSnap = await getDocs(likesQuery);
      setLikeCount(likesSnap.size);

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const likeDoc = await getDoc(doc(db, 'likes', `${uid}_${mediaType}_${item.id}`));
        setUserLiked(likeDoc.exists());

        const watchlistDoc = await getDoc(doc(db, 'watchlist', `${uid}_${mediaType}_${item.id}`));
        setInWatchlist(watchlistDoc.exists());
      }

      // Load recommendations
      try {
        const recs = await tmdb.getSimilar(item.id, mediaType);
        if (recs && recs.results) setRecommendations(recs.results.slice(0, 10));
      } catch (e) {
        console.error(e);
      }

      // Load comments
      loadComments();

      // Load TV Seasons if applicable
      if (mediaType === 'tv') {
        try {
          const tvData = await tmdb.getTVSeasons(item.id);
          if (tvData && tvData.seasons) {
            const validSeasons = tvData.seasons.filter((s: any) => s.season_number > 0);
            setSeasons(validSeasons);
            loadEpisodes(seasonNum);
          } else {
            // If TMDB has no seasons, try Jikan fallback
            loadJikanData();
          }
        } catch (e) {
          console.error('TMDB Seasons load failed, trying Jikan...', e);
          loadJikanData();
        }
      }
    };

    const loadJikanData = async () => {
      try {
        let currentMalId = malId;
        if (!currentMalId) {
          const title = item.title || item.name;
          const year = (item.release_date || item.first_air_date)?.slice(0, 4);
          currentMalId = await jikan.findMalId(title, year);
          if (currentMalId) setMalId(currentMalId);
        }

        if (currentMalId) {
          const [details, eps, stream] = await Promise.all([
            jikan.getAnimeDetails(currentMalId),
            jikan.getAnimeEpisodes(currentMalId),
            jikan.getAnimeStreaming(currentMalId)
          ]);
          if (details) setJikanAnime(details);
          if (eps) setJikanEpisodes(eps);
          if (stream) setJikanStreaming(stream);
        }
      } catch (err) {
        console.error('Jikan fallback failed:', err);
      }
    };

    loadData();
  }, [isOpen, item, mediaType]);

  const loadEpisodes = async (season: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await tmdb.getTVEpisodes(item.id, season);
      if (data && data.episodes && data.episodes.length > 0) {
        setEpisodes(data.episodes);
      } else {
        // Try Jikan fallback if TMDB episodes are empty
        if (malId) {
          const eps = await jikan.getAnimeEpisodes(malId);
          if (eps) setJikanEpisodes(eps);
        } else {
          const title = item.title || item.name;
          const year = (item.release_date || item.first_air_date)?.slice(0, 4);
          const id = await jikan.findMalId(title, year);
          if (id) {
            setMalId(id);
            const eps = await jikan.getAnimeEpisodes(id);
            if (eps) setJikanEpisodes(eps);
          }
        }
      }
    } catch (e) {
      console.error('TMDB Episodes load failed, trying Jikan...', e);
      if (malId) {
        const eps = await jikan.getAnimeEpisodes(malId);
        if (eps) setJikanEpisodes(eps);
      }
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const loadComments = async () => {
    try {
      const q = query(collection(db, 'comments'), where('movieId', '==', item.id), where('mediaType', '==', mediaType), limit(50));
      const snap = await getDocs(q);
      const loadedComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedComments.sort((a: any, b: any) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
      setComments(loadedComments);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !item) return null;

  const title = item.title || item.name;
  const embedUrl = mediaType === 'movie' 
    ? `https://vidsrc.icu/embed/movie/${item.id}`
    : `https://vidsrc.icu/embed/tv/${item.id}/${seasonNum}/${episodeNum}`;

  // Use initialSeekTime and quality for the iframe URL
  let finalEmbedUrl = embedUrl;
  const params = new URLSearchParams();
  if (initialSeekTime > 10) params.append('t', initialSeekTime.toString());
  // Some embeds support quality/res params, we'll include it just in case
  if (quality) params.append('quality', quality);
  
  const queryString = params.toString();
  if (queryString) {
    finalEmbedUrl += (finalEmbedUrl.includes('?') ? '&' : '?') + queryString;
  }

  const handleLike = async () => {
    if (!auth.currentUser) return onShowRestricted();
    const uid = auth.currentUser.uid;
    const likeRef = doc(db, 'likes', `${uid}_${mediaType}_${item.id}`);
    
    if (userLiked) {
      await deleteDoc(likeRef);
      setUserLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
    } else {
      await setDoc(likeRef, { userId: uid, movieId: item.id, mediaType, timestamp: new Date() });
      setUserLiked(true);
      setLikeCount(likeCount + 1);
    }
  };

  const handleWatchlist = async () => {
    if (!auth.currentUser) return onShowRestricted();
    const uid = auth.currentUser.uid;
    const watchlistRef = doc(db, 'watchlist', `${uid}_${mediaType}_${item.id}`);
    
    if (inWatchlist) {
      if (window.confirm(`Are you sure you want to remove "${title}" from your watchlist?`)) {
        await deleteDoc(watchlistRef);
        setInWatchlist(false);
      }
    } else {
      await setDoc(watchlistRef, { userId: uid, movieId: item.id, mediaType, addedAt: new Date() });
      setInWatchlist(true);
    }
  };

  const handlePostComment = async () => {
    if (!auth.currentUser) return onShowRestricted();
    if (!commentText.trim()) return;

    try {
      const nickname = userData?.nickname || auth.currentUser.email?.split('@')[0] || 'User';
      const photoURL = userData?.photoURL || null;

      await addDoc(collection(db, 'comments'), {
        userId: auth.currentUser.uid,
        movieId: item.id,
        mediaType,
        text: commentText.trim(),
        nickname,
        photoURL,
        timestamp: new Date(),
        likes: 0
      });

      setCommentText('');
      loadComments();
    } catch (e) {
      console.error(e);
      alert('Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!auth.currentUser) return onShowRestricted();
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, { likes: increment(1) });
      loadComments();
    } catch (e) {
      console.error(e);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
    return 'just now';
  };

  const handleReportBroken = () => {
    setIsReporting(true);
    setTimeout(() => {
      if (fallbackLayer === 'primary') {
        if (jikanStreaming.length > 0) setFallbackLayer('official');
        else if (jikanAnime?.trailer?.youtube_id) setFallbackLayer('trailer');
        else setFallbackLayer('error');
      } else if (fallbackLayer === 'official') {
        if (jikanAnime?.trailer?.youtube_id) setFallbackLayer('trailer');
        else setFallbackLayer('error');
      } else if (fallbackLayer === 'trailer') {
        setFallbackLayer('error');
      }
      setIsReporting(false);
    }, 800);
  };

  const userInitial = userData?.nickname?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';
  const nickname = userData?.nickname || auth.currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[2000] animate-fadeIn pt-[60px] md:pt-[72px]">
      <div className="w-full h-full bg-modal-bg flex flex-col overflow-hidden relative">
        
        {/* Floating Back Button */}
        <button 
          className="absolute top-4 left-4 z-[500] bg-black/50 backdrop-blur-md border border-white/10 text-white p-2 rounded-full cursor-pointer transition-all duration-200 hover:bg-accent hover:border-accent hover:scale-110 flex items-center justify-center shadow-lg" 
          onClick={onClose}
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-bg-base min-h-0">
            
            {/* Video Player */}
            <div className="w-full relative pb-[56.25%] bg-black shrink-0 group">
              {fallbackLayer === 'primary' ? (
                <iframe 
                  src={finalEmbedUrl} 
                  allowFullScreen 
                  className="absolute top-0 left-0 w-full h-full border-none"
                  sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts"
                ></iframe>
              ) : fallbackLayer === 'official' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-modal-bg">
                  <AlertCircle className="w-12 h-12 text-accent mb-4" />
                  <h3 className="text-xl font-bold mb-2">Media Unavailable on Primary Source</h3>
                  <p className="text-text-secondary mb-6 max-w-md">This episode is blocked or missing. Please use the official streaming links below to watch on their respective platforms.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {jikanStreaming.map((s: any, idx: number) => (
                      <a 
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-accent text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-accent/20"
                      >
                        Watch on {s.name} <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                  <button 
                    className="mt-8 text-text-secondary hover:text-white text-sm underline flex items-center gap-2"
                    onClick={() => setFallbackLayer('trailer')}
                  >
                    Watch Trailer Instead
                  </button>
                </div>
              ) : fallbackLayer === 'trailer' ? (
                <div className="absolute inset-0 flex flex-col bg-modal-bg">
                  <div className="flex-1 relative">
                    <iframe 
                      src={jikan.getTrailerUrl(jikanAnime)} 
                      allowFullScreen 
                      className="absolute inset-0 w-full h-full border-none"
                    ></iframe>
                  </div>
                  <div className="bg-accent/10 border-t border-accent/20 p-3 flex items-center justify-center gap-3">
                    <Youtube className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium text-white">Full episode not available – watch trailer.</span>
                    <button 
                      className="ml-4 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold transition-colors"
                      onClick={() => setFallbackLayer('official')}
                    >
                      Official Links
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-modal-bg">
                  <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Content Not Found</h3>
                  <p className="text-text-secondary mb-8 max-w-md">We couldn't find a working source for this episode. Please check back later or try another episode.</p>
                  <button 
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2"
                    onClick={() => setFallbackLayer('primary')}
                  >
                    <RefreshCw className="w-4 h-4" /> Retry Primary Source
                  </button>
                </div>
              )}

              {/* Player Controls Overlays */}
              <div className="absolute top-4 right-4 z-20">
                <button 
                  className={`bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all hover:bg-red-500/20 hover:border-red-500/50 ${isReporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleReportBroken}
                  disabled={isReporting}
                >
                  {isReporting ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Switching Source...</>
                  ) : (
                    <><AlertCircle className="w-3 h-3" /> Report Issue / Try Fallback</>
                  )}
                </button>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                {initialSeekTime > 0 && (
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[0.7rem] font-medium text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    Resumed from {Math.floor(initialSeekTime / 60)}:{(initialSeekTime % 60).toString().padStart(2, '0')}
                  </div>
                )}
                <button 
                  className="bg-black/70 border-none text-white px-4 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 transition-colors hover:bg-black/90 hidden md:flex opacity-0 group-hover:opacity-100 pointer-events-auto"
                  onClick={() => {
                    const iframe = document.querySelector('iframe');
                    if (iframe?.requestFullscreen) iframe.requestFullscreen();
                  }}
                >
                  <Expand className="w-4 h-4" /> Fullscreen
                </button>
                
                {/* Quality Selector */}
                <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-2 px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                  <span className="text-[0.7rem] text-white/60 font-medium uppercase tracking-wider">Quality:</span>
                  <select 
                    className="bg-transparent border-none text-white text-xs font-bold cursor-pointer outline-none"
                    value={quality}
                    onChange={(e) => {
                      const newQuality = e.target.value;
                      setQuality(newQuality);
                      try {
                        localStorage.setItem('preferred_quality', newQuality);
                      } catch (err) {}
                      // Reload iframe with new quality
                      setInitialSeekTime(currentTime);
                    }}
                  >
                    <option value="2160" className="bg-bg-base">4K</option>
                    <option value="1080" className="bg-bg-base">1080p</option>
                    <option value="720" className="bg-bg-base">720p</option>
                    <option value="480" className="bg-bg-base">480p</option>
                    <option value="360" className="bg-bg-base">360p</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-6 md:px-8">
              <h2 className="text-2xl font-bold mb-2">{title}{mediaType === 'tv' ? ` - S${seasonNum}E${episodeNum}` : ''}</h2>
              <div className="flex items-center gap-8 text-text-secondary text-sm mb-6 flex-wrap">
                <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4" /> {stableViews}M views</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {item.release_date?.slice(0,10) || item.first_air_date?.slice(0,10) || 'N/A'}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-[#ffb400]" /> {item.vote_average?.toFixed(1) || 'N/A'}/10</span>
              </div>

              {/* Actions */}
              <div className="flex gap-4 py-4 border-y border-white/10 mb-6 flex-wrap">
                <button 
                  className={`bg-transparent border border-white/10 text-white px-6 py-2.5 rounded-full cursor-pointer flex items-center gap-2 text-sm transition-all duration-200 hover:bg-glass-bg hover:border-accent ${userLiked ? 'bg-accent border-accent text-white' : ''}`}
                  onClick={handleLike}
                >
                  <ThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} /> {likeCount}
                </button>
                <button className="bg-transparent border border-white/10 text-white px-6 py-2.5 rounded-full cursor-pointer flex items-center gap-2 text-sm transition-all duration-200 hover:bg-glass-bg hover:border-accent">
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button className="bg-transparent border border-white/10 text-white px-6 py-2.5 rounded-full cursor-pointer flex items-center gap-2 text-sm transition-all duration-200 hover:bg-glass-bg hover:border-accent">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button 
                  className={`bg-transparent border border-white/10 text-white px-6 py-2.5 rounded-full cursor-pointer flex items-center gap-2 text-sm transition-all duration-200 hover:bg-glass-bg hover:border-accent ${inWatchlist ? 'bg-accent border-accent text-white' : ''}`}
                  onClick={handleWatchlist}
                >
                  <Plus className="w-4 h-4" /> {inWatchlist ? 'In List' : 'Add to List'}
                </button>
              </div>

              {/* Description */}
              <div className="bg-glass-bg p-6 rounded-2xl mb-8">
                <h4 className="mb-3 text-lg font-semibold">Description</h4>
                <p className="text-text-secondary leading-[1.6]">{item.overview || 'No description available.'}</p>
                
                {jikanStreaming.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h5 className="text-sm font-bold mb-3 text-white uppercase tracking-widest opacity-80">Official Streaming Alternatives</h5>
                    <div className="flex flex-wrap gap-2">
                      {jikanStreaming.map((s: any, idx: number) => (
                        <a 
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          {s.name} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TV Episodes */}
              {mediaType === 'tv' && (
                <div className="mb-8 border-b border-white/10 pb-8">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2"><List className="w-5 h-5 text-accent" /> Episodes</h3>
                    <div className="flex items-center gap-2 bg-glass-bg px-4 py-2 rounded-full border border-white/10">
                      <label className="text-sm text-text-secondary">Season:</label>
                      <select 
                        className="bg-transparent border-none text-white text-[0.95rem] font-semibold cursor-pointer outline-none"
                        value={seasonNum}
                        onChange={(e) => {
                          setSeasonNum(parseInt(e.target.value));
                          loadEpisodes(parseInt(e.target.value));
                        }}
                      >
                        {seasons.map((s: any) => (
                          <option key={s.season_number} value={s.season_number} className="bg-bg-base text-white">Season {s.season_number}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loadingEpisodes ? (
                    <div className="text-center p-12 text-text-secondary"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /><p>Loading episodes...</p></div>
                  ) : (episodes.length === 0 && jikanEpisodes.length === 0) ? (
                    <div className="text-center p-12 text-text-secondary">
                      <p className="mb-4">No episodes available</p>
                      {item.videos?.results?.find((v: any) => v.type === 'Trailer') && (
                        <div className="max-w-md mx-auto aspect-video rounded-xl overflow-hidden border border-white/10">
                          <iframe 
                            src={`https://www.youtube.com/embed/${item.videos.results.find((v: any) => v.type === 'Trailer').key}`}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col md:grid md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 md:gap-4">
                      {episodes.length > 0 ? episodes.map((ep: any) => {
                        const isActive = ep.episode_number === episodeNum;
                        const progressData = watchProgress[`s${seasonNum}e${ep.episode_number}`];
                        const progressPercent = progressData ? Math.min(100, (progressData.timestamp / (progressData.duration || 2400)) * 100) : 0;
                        const isWatched = progressPercent > 95;

                        return (
                          <div 
                            key={ep.id}
                            className={`bg-glass-bg border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative hover:border-accent hover:shadow-[0_10px_30px_rgba(255,69,0,0.1)] flex flex-row md:flex-col h-[85px] md:h-auto ${isActive ? 'border-accent bg-accent/10' : 'border-white/10'} ${isWatched ? 'opacity-60' : ''}`}
                            onClick={() => {
                              setEpisodeNum(ep.episode_number);
                              document.querySelector('.player-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <div className="w-[110px] md:w-full h-full md:h-[160px] relative shrink-0">
                              <img src={ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : 'https://via.placeholder.com/400x225?text=No+Image'} alt={ep.name} className="w-full h-full object-cover block" />
                              
                              {/* Progress Bar */}
                              {progressPercent > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                  <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                                </div>
                              )}

                              {isActive && (
                                <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                                  <PlayCircle className="w-6 h-6 text-white animate-pulse" />
                                </div>
                              )}

                              {isWatched && !isActive && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[0.6rem] font-bold text-white border border-white/10 uppercase">
                                    Watched
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="p-2 md:p-4 flex-1 min-w-0 flex flex-col justify-center md:justify-start">
                              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                                <div className="text-text-secondary text-[0.6rem] md:text-sm font-semibold uppercase tracking-wider">E{ep.episode_number} {ep.runtime ? `• ${ep.runtime}m` : ''}</div>
                                {isActive && <div className="hidden md:block bg-accent text-white px-2 py-0.5 rounded text-[0.6rem] font-bold">NOW PLAYING</div>}
                              </div>
                              <div className="text-[0.8rem] md:text-base font-semibold mb-0.5 md:mb-2 line-clamp-1 md:line-clamp-2 text-text-primary">{ep.name || `Episode ${ep.episode_number}`}</div>
                              <div className="text-[0.65rem] md:text-sm text-text-secondary leading-tight line-clamp-1 md:line-clamp-2">{ep.overview || 'No description available.'}</div>
                            </div>
                          </div>
                        );
                      }) : jikanEpisodes.map((ep: any) => {
                        const epNum = ep.mal_id;
                        const isActive = epNum === episodeNum;
                        
                        return (
                          <div 
                            key={ep.mal_id}
                            className={`bg-glass-bg border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative hover:border-accent hover:shadow-[0_10px_30px_rgba(255,69,0,0.1)] flex flex-row md:flex-col h-[85px] md:h-auto ${isActive ? 'border-accent bg-accent/10' : 'border-white/10'}`}
                            onClick={() => {
                              setEpisodeNum(epNum);
                              document.querySelector('.player-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <div className="w-[110px] md:w-full h-full md:h-[160px] relative shrink-0 bg-modal-bg flex items-center justify-center">
                              <Tv className="w-8 h-8 text-white/20" />
                              {isActive && (
                                <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                                  <PlayCircle className="w-6 h-6 text-white animate-pulse" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 md:p-4 flex-1 min-w-0 flex flex-col justify-center md:justify-start">
                              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                                <div className="text-text-secondary text-[0.6rem] md:text-sm font-semibold uppercase tracking-wider">E{epNum}</div>
                                {isActive && <div className="hidden md:block bg-accent text-white px-2 py-0.5 rounded text-[0.6rem] font-bold">NOW PLAYING</div>}
                              </div>
                              <div className="text-[0.8rem] md:text-base font-semibold mb-0.5 md:mb-2 line-clamp-1 md:line-clamp-2 text-text-primary">{ep.title || `Episode ${epNum}`}</div>
                              <div className="text-[0.65rem] md:text-sm text-text-secondary leading-tight line-clamp-1 md:line-clamp-2">MAL ID: {ep.mal_id}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xl font-semibold mb-6">{comments.length} Comments</h3>
                
                <div className="flex gap-4 mb-8">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-[#ff6b35] flex items-center justify-center font-bold text-lg text-white shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Add a comment..." 
                      className="w-full bg-transparent border-none border-b border-white/10 text-white py-2 text-sm outline-none transition-colors focus:border-accent"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    {commentText.length > 0 && (
                      <div className="flex gap-3 mt-3 justify-end">
                        <button className="px-5 py-2 rounded-full border-none cursor-pointer font-semibold transition-colors bg-transparent text-text-secondary hover:text-white" onClick={() => setCommentText('')}>Cancel</button>
                        <button className="px-5 py-2 rounded-full border-none cursor-pointer font-semibold transition-colors bg-accent text-white hover:brightness-110" onClick={handlePostComment}>Comment</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {comments.length === 0 ? (
                    <div className="text-center p-8 text-text-secondary">No comments yet. Be the first to comment!</div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-4">
                        {comment.photoURL ? (
                          <img src={comment.photoURL} alt={comment.nickname} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-[#ff6b35] flex items-center justify-center font-bold text-lg text-white shrink-0">
                            {comment.nickname?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold mb-1">
                            {comment.nickname} <span className="text-text-secondary font-normal text-sm ml-2">{getTimeAgo(comment.timestamp?.toDate?.() || new Date())}</span>
                          </div>
                          <div className="text-text-secondary leading-[1.5] mb-2">{comment.text}</div>
                          <div className="flex gap-6 items-center">
                            <button className="bg-transparent border-none text-text-secondary cursor-pointer flex items-center gap-1.5 text-sm transition-colors hover:text-white" onClick={() => handleLikeComment(comment.id)}>
                              <ThumbsUp className="w-3.5 h-3.5" /> {comment.likes || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-[400px] bg-[#0a0f19]/95 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col transition-all duration-300 ${isSidebarMinimized ? 'h-[60px] lg:h-auto lg:p-0' : 'h-[400px] lg:h-auto'}`}>
            <div 
              className="p-4 lg:p-6 text-lg font-semibold flex items-center justify-between gap-2 cursor-pointer lg:cursor-default bg-glass-bg lg:bg-transparent shrink-0"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsSidebarMinimized(!isSidebarMinimized);
                }
              }}
            >
              <div className="flex items-center gap-2"><PlayCircle className="w-5 h-5 text-accent" /> Up Next</div>
              <div className="lg:hidden text-accent">
                {isSidebarMinimized ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-4 lg:p-6 pt-0 lg:pt-0 transition-all duration-300 ${isSidebarMinimized ? 'hidden lg:block' : 'block'}`}>
              {recommendations.map(rec => {
                const recTitle = rec.title || rec.name;
                const backdrop = rec.backdrop_path ? `https://image.tmdb.org/t/p/w500${rec.backdrop_path}` : `https://image.tmdb.org/t/p/w500${rec.poster_path}`;
                return (
                  <div 
                    key={rec.id} 
                    className="flex gap-3 mb-4 cursor-pointer p-2 rounded-lg transition-colors hover:bg-glass-bg"
                    onClick={() => {
                      onClose();
                      onOpenDetail(rec.id, mediaType);
                    }}
                  >
                    <img src={backdrop} alt={recTitle} className="w-[160px] h-[90px] rounded-lg object-cover shrink-0" />
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-sm font-semibold mb-1 line-clamp-2">{recTitle}</div>
                      <div className="text-text-secondary text-xs">
                        {rec.vote_average?.toFixed(1) || 'N/A'} ⭐ • {rec.release_date?.slice(0,4) || rec.first_air_date?.slice(0,4) || 'N/A'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
