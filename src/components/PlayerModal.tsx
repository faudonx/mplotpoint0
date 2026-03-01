import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Expand, ThumbsUp, ThumbsDown, Share2, Plus, List, PlayCircle, Loader2, Calendar, Star, ChevronDown, ChevronUp, LogOut, Film, Tv } from 'lucide-react';
import { tmdb } from '../lib/tmdb';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, updateDoc, increment, limit } from 'firebase/firestore';

export function PlayerModal({ isOpen, onClose, item, mediaType, initialSeason = 1, initialEpisode = 1, onOpenDetail, onShowRestricted, onOpenAuth, onOpenWatchlist }: any) {
  const [seasonNum, setSeasonNum] = useState(initialSeason);
  const [episodeNum, setEpisodeNum] = useState(initialEpisode);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
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
  
  // Search & User Menu State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const data = await tmdb.searchMulti(searchQuery);
          if (data && data.results) {
            setSearchResults(data.results.slice(0, 6));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      signOut(auth);
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
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadData();
  }, [isOpen, item, mediaType]);

  const loadEpisodes = async (season: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await tmdb.getTVEpisodes(item.id, season);
      if (data && data.episodes) setEpisodes(data.episodes);
    } catch (e) {
      console.error(e);
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

  const userInitial = userData?.nickname?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';
  const nickname = userData?.nickname || auth.currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] animate-fadeIn">
      <div className="w-full h-full bg-modal-bg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#050a10]/95 p-3 md:p-4 md:px-8 flex items-center justify-between gap-4 border-b border-white/10 shrink-0 backdrop-blur-md flex-wrap">
          <div className="flex items-center gap-3 md:gap-6 order-1">
            <button className="bg-transparent border-none text-white p-1.5 md:p-2 rounded-full cursor-pointer transition-colors hover:text-accent hover:bg-white/10 flex items-center justify-center" onClick={onClose}>
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="text-lg md:text-2xl font-bold tracking-tighter bg-gradient-to-br from-white to-accent bg-clip-text text-transparent">
              MPlotPoint
            </div>
          </div>

          <div className="order-2 md:order-3 ml-auto md:ml-0">
            {auth.currentUser ? (
              <div className="relative">
                <div 
                  className={`flex items-center gap-2 md:gap-3 bg-glass-bg px-3 md:px-4 py-1.5 rounded-full cursor-pointer border-2 transition-all duration-300 ${showDropdown ? 'border-accent bg-[#1e2d46]/60' : 'border-transparent hover:border-accent hover:bg-[#1e2d46]/60'}`}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Avatar" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-accent object-cover" />
                  ) : (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-accent to-[#ff6b35] flex items-center justify-center font-bold text-xs md:text-sm text-white border-2 border-accent">
                      {userInitial}
                    </div>
                  )}
                  <span className="text-sm font-medium hidden md:block">{nickname}</span>
                  <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                </div>
                
                {showDropdown && (
                  <div className="absolute top-[calc(100%+0.8rem)] right-0 w-[240px] md:w-[280px] max-w-[90vw] bg-modal-bg backdrop-blur-xl border border-white/10 rounded-2xl p-2 z-[150] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slideDown origin-top-right">
                    <div className="p-3 md:p-4 border-b border-white/10 mb-2">
                      <div className="font-semibold text-sm md:text-base mb-1 truncate">{nickname}</div>
                      <div className="text-xs md:text-sm text-text-secondary truncate">{auth.currentUser.email}</div>
                    </div>
                    
                    <button 
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 text-text-primary hover:bg-accent/10 hover:border-l-4 hover:border-l-accent hover:pl-[calc(0.75rem-4px)]"
                      onClick={() => {
                        setShowDropdown(false);
                        onClose();
                        onOpenWatchlist();
                      }}
                    >
                      <List className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                      <span className="text-sm md:text-base">My Watchlist</span>
                    </button>
                    
                    <button 
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 hover:border-l-4 hover:border-l-[#ff6b6b] hover:pl-[calc(0.75rem-4px)] border-t border-white/10 mt-2"
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="w-4 h-4 md:w-5 md:h-5 text-[#ff6b6b]" />
                      <span className="text-sm md:text-base">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-4 md:px-6 py-1.5 md:py-2 rounded-full font-semibold text-xs md:text-sm cursor-pointer transition-all duration-300 hover:bg-white/20 hover:-translate-y-0.5 hover:border-accent"
                onClick={() => { onClose(); onOpenAuth(); }}
              >
                Login
              </button>
            )}
          </div>

          <div className="relative flex-1 max-w-[400px] mx-auto order-3 md:order-2 w-full" ref={searchRef}>
            <div className="bg-[#1e2d46]/60 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,69,0,0.2),0_4px_20px_rgba(0,0,0,0.3)] focus-within:bg-[#1e2d46]/80">
              <Search className="text-text-secondary w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search movies & TV..." 
                className="bg-transparent border-none text-white outline-none w-full text-sm placeholder:text-text-secondary/70" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 w-full md:w-[380px] max-h-[400px] md:max-h-[450px] overflow-y-auto bg-modal-bg backdrop-blur-xl border border-white/10 rounded-2xl mt-2 md:mt-3 z-[150] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slideDown">
                {searchResults.map((searchItem) => {
                  if (!searchItem.poster_path && !searchItem.profile_path) return null;
                  const searchTitle = searchItem.title || searchItem.name;
                  const date = searchItem.release_date || searchItem.first_air_date;
                  const year = date ? date.slice(0,4) : '';
                  const searchMediaType = searchItem.media_type === 'movie' ? 'movie' : (searchItem.media_type === 'tv' ? 'tv' : null);
                  if (!searchMediaType) return null;
                  const poster = searchItem.poster_path ? `https://image.tmdb.org/t/p/w92${searchItem.poster_path}` : 'https://via.placeholder.com/92x138?text=No+Image';
                  
                  return (
                    <div 
                      key={searchItem.id} 
                      className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3.5 cursor-pointer border-b border-white/5 transition-colors hover:bg-accent/10 hover:border-l-4 hover:border-l-accent hover:pl-[calc(0.625rem-4px)] md:hover:pl-2.5"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        onClose();
                        if (!auth.currentUser) onShowRestricted();
                        else onOpenDetail(searchItem.id, searchMediaType);
                      }}
                    >
                      <img src={poster} alt={searchTitle} className="w-10 h-[60px] md:w-12 md:h-[75px] object-cover rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-0.5 md:mb-1 truncate">{searchTitle}</div>
                        <div className="text-xs text-text-secondary flex items-center gap-1.5">
                          {searchMediaType === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                          {searchMediaType === 'movie' ? 'Movie' : 'TV'} {year ? `• ${year}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-bg-base min-h-0">
            
            {/* Video Player */}
            <div className="w-full relative pb-[56.25%] bg-black shrink-0 group">
              <iframe src={embedUrl} allowFullScreen className="absolute top-0 left-0 w-full h-full border-none"></iframe>
              <button 
                className="absolute bottom-4 right-4 bg-black/70 border-none text-white px-4 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 z-10 transition-colors hover:bg-black/90 hidden md:flex opacity-0 group-hover:opacity-100"
                onClick={() => {
                  const iframe = document.querySelector('iframe');
                  if (iframe?.requestFullscreen) iframe.requestFullscreen();
                }}
              >
                <Expand className="w-4 h-4" /> Fullscreen
              </button>
            </div>

            {/* Info Section */}
            <div className="p-6 md:px-8">
              <h2 className="text-2xl font-bold mb-2">{title}{mediaType === 'tv' ? ` - S${seasonNum}E${episodeNum}` : ''}</h2>
              <div className="flex items-center gap-8 text-text-secondary text-sm mb-6 flex-wrap">
                <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4" /> {(Math.random() * 5 + 0.5).toFixed(1)}M views</span>
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
                  ) : episodes.length === 0 ? (
                    <div className="text-center p-12 text-text-secondary"><p>No episodes available</p></div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                      {episodes.map((ep: any) => {
                        const isActive = ep.episode_number === episodeNum && seasonNum === seasonNum;
                        return (
                          <div 
                            key={ep.id}
                            className={`bg-glass-bg border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative hover:-translate-y-1 hover:border-accent hover:shadow-[0_10px_30px_rgba(255,69,0,0.2)] ${isActive ? 'border-accent bg-accent/10' : 'border-white/10'}`}
                            onClick={() => {
                              setEpisodeNum(ep.episode_number);
                              document.querySelector('.player-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            {isActive && <div className="absolute top-2 right-2 bg-accent text-white px-2 py-1 rounded text-xs font-bold z-10">NOW PLAYING</div>}
                            <img src={ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : 'https://via.placeholder.com/400x225?text=No+Image'} alt={ep.name} className="w-full h-[160px] object-cover block" />
                            <div className="p-4">
                              <div className="text-text-secondary text-sm mb-1 font-semibold">Episode {ep.episode_number}</div>
                              <div className="text-base font-semibold mb-2 line-clamp-2">{ep.name || `Episode ${ep.episode_number}`}</div>
                              <div className="text-sm text-text-secondary leading-[1.4] line-clamp-2">{ep.overview || 'No description available.'}</div>
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
