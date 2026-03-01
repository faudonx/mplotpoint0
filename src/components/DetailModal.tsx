import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Star, Heart, Plus, Play, Check, Share2, Shield } from 'lucide-react';
import { tmdb } from '../lib/tmdb';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export function DetailModal({ isOpen, onClose, movieId, mediaType, onWatchNow, onShowConfirm }: any) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLiked, setUserLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    if (!isOpen || !movieId || !mediaType) return;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const data = await tmdb.getDetails(movieId, mediaType);
        setItem(data);

        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          const likeDoc = await getDoc(doc(db, 'likes', `${uid}_${mediaType}_${movieId}`));
          setUserLiked(likeDoc.exists());
          
          const watchlistDoc = await getDoc(doc(db, 'watchlist', `${uid}_${mediaType}_${movieId}`));
          setInWatchlist(watchlistDoc.exists());
          
          const ratingDoc = await getDoc(doc(db, 'ratings', `${uid}_${mediaType}_${movieId}`));
          if (ratingDoc.exists()) setUserRating(ratingDoc.data().value);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [isOpen, movieId, mediaType]);

  if (!isOpen) return null;

  const handleLike = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const likeRef = doc(db, 'likes', `${uid}_${mediaType}_${movieId}`);
    
    if (userLiked) {
      await deleteDoc(likeRef);
      setUserLiked(false);
    } else {
      await setDoc(likeRef, { userId: uid, movieId, mediaType, timestamp: new Date() });
      setUserLiked(true);
    }
  };

  const handleWatchlist = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const watchlistRef = doc(db, 'watchlist', `${uid}_${mediaType}_${movieId}`);
    const title = item.title || item.name;
    
    if (inWatchlist) {
      onShowConfirm(
        'Remove from Watchlist',
        `Are you sure you want to remove "${title}" from your watchlist?`,
        'warning',
        async () => {
          await deleteDoc(watchlistRef);
          setInWatchlist(false);
        }
      );
    } else {
      await setDoc(watchlistRef, { userId: uid, movieId, mediaType, addedAt: new Date() });
      setInWatchlist(true);
    }
  };

  const handleShare = () => {
    const title = item.title || item.name;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Watch ${title} on MPlotPoint`,
        text: item.overview,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const getAgeRating = () => {
    if (!item) return 'NR';
    if (mediaType === 'movie') {
      const usRelease = item.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
      return usRelease?.release_dates[0]?.certification || 'NR';
    } else {
      const usRating = item.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
      return usRating?.rating || 'TV-MA';
    }
  };

  const trailer = item?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full h-full md:w-[90%] md:h-[90vh] md:max-w-[1000px] bg-bg-base md:rounded-3xl border-none md:border md:border-white/10 relative overflow-y-auto animate-scaleIn scrollbar-hide">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md text-white p-2 rounded-full hover:bg-accent transition-all duration-200" 
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span>Loading Cinematic Experience...</span>
            </div>
          </div>
        ) : item ? (
          <div className="flex flex-col">
            
            {/* Hero Backdrop */}
            <div className="relative w-full aspect-[16/9] md:aspect-[21/9] shrink-0">
              <img 
                src={`https://image.tmdb.org/t/p/original${item.backdrop_path || item.poster_path}`} 
                alt={item.title || item.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/20 to-transparent"></div>
            </div>

            {/* Content Section */}
            <div className="px-6 pb-12 -mt-12 md:-mt-24 relative z-10">
              
              {/* Title & Metadata Row */}
              <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                {/* Poster (Desktop Only) */}
                <div className="hidden md:block w-[200px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 shrink-0">
                  <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={item.title || item.name} className="w-full h-auto" />
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">{item.title || item.name}</h2>
                  
                  <div className="flex items-center gap-4 flex-wrap text-sm font-medium text-text-secondary">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      {item.release_date?.slice(0,4) || item.first_air_date?.slice(0,4)}
                    </span>
                    {item.runtime ? (
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {item.runtime} min
                      </span>
                    ) : item.episode_run_time?.[0] ? (
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {item.episode_run_time[0]} min
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      <Star className="w-3.5 h-3.5 text-[#ffb400] fill-current" />
                      {item.vote_average?.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5 text-accent" />
                      {getAgeRating()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <button 
                className="w-full h-[56px] rounded-2xl bg-accent text-white font-bold text-lg flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(255,69,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mb-8"
                onClick={() => {
                  onClose();
                  onWatchNow(item, mediaType);
                }}
              >
                <Play className="w-6 h-6 fill-current" /> Play Now
              </button>

              {/* Secondary Actions (YouTube Style) */}
              <div className="flex items-center justify-around mb-10 py-4 border-y border-white/5">
                <button 
                  className="flex flex-col items-center gap-2 text-text-secondary hover:text-accent transition-colors group min-w-[64px] min-h-[64px]"
                  onClick={handleLike}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${userLiked ? 'bg-accent/20 text-accent' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    <Heart className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider">{userLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button 
                  className="flex flex-col items-center gap-2 text-text-secondary hover:text-accent transition-colors group min-w-[64px] min-h-[64px]"
                  onClick={handleWatchlist}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${inWatchlist ? 'bg-accent/20 text-accent' : 'bg-white/5 group-hover:bg-white/10'}`}>
                    {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider">{inWatchlist ? 'In List' : 'Add to List'}</span>
                </button>

                <button 
                  className="flex flex-col items-center gap-2 text-text-secondary hover:text-accent transition-colors group min-w-[64px] min-h-[64px]"
                  onClick={handleShare}
                >
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all duration-200">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider">Share</span>
                </button>
              </div>

              {/* Synopsis */}
              <div className="mb-12">
                <h4 className="text-lg font-bold mb-4 text-white/90">Synopsis</h4>
                <p className="text-[#a0b0c0] leading-relaxed text-[0.95rem] md:text-lg">
                  {item.overview || 'The plot remains a mystery. Dive in to discover the story.'}
                </p>
              </div>

              {/* Trailer Section */}
              {trailer && (
                <div className="mb-8">
                  <h4 className="text-lg font-bold mb-6 text-white/90 flex items-center gap-2">
                    <Play className="w-5 h-5 text-accent" /> Official Trailer
                  </h4>
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <iframe 
                      src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`} 
                      allowFullScreen 
                      className="absolute inset-0 w-full h-full border-none"
                    ></iframe>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-red-500">
            Failed to load content. Please try again later.
          </div>
        )}
      </div>
    </div>
  );
}
