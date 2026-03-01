import { useState, useEffect } from 'react';
import { X, Star, Heart, Plus, Play, Check } from 'lucide-react';
import { tmdb } from '../lib/tmdb';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export function DetailModal({ isOpen, onClose, movieId, mediaType, onWatchNow, onShowConfirm }: any) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLiked, setUserLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

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

  const trailer = item?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-start md:items-center justify-center z-[4000] animate-fadeIn overflow-y-auto pt-20 pb-10 px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full h-auto md:max-h-[90vh] md:max-w-[600px] bg-bg-base rounded-2xl border border-white/10 relative animate-scaleIn scrollbar-hide p-5 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 z-50 text-white/40 hover:text-white transition-colors p-2" 
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] text-text-secondary">
            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div>
          </div>
        ) : item ? (
          <div className="flex flex-col gap-6">
            
            {/* Top Section: Side-by-Side Thumbnail Layout */}
            <div className="flex gap-4 md:gap-6">
              {/* Left Column: Thumbnail */}
              <div className="w-[38%] shrink-0">
                <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shadow-xl">
                  <img 
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                    alt={item.title || item.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Column: Info & Actions */}
              <div className="flex-1 flex flex-col justify-between py-0.5 overflow-hidden">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-extrabold leading-tight text-white line-clamp-2">
                    {item.title || item.name} <span className="text-text-secondary font-normal">({(item.release_date || item.first_air_date)?.slice(0,4)})</span>
                  </h2>
                  
                  <div className="mt-2.5 space-y-1 text-[0.8rem] md:text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium opacity-70">State:</span>
                      <span className="text-white/90 capitalize">{item.status || 'Released'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-accent fill-current" />
                      <span className="font-bold text-white">{item.vote_average?.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-medium opacity-70">Genre:</span>
                      <span className="text-white/90">{item.genres?.map((g: any) => g.name).slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons (Bottom Right) */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button 
                    className="bg-accent text-white px-4 py-2 rounded-full text-[0.7rem] font-bold flex items-center gap-1.5 hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-accent/20"
                    onClick={() => {
                      onClose();
                      onWatchNow(item, mediaType);
                    }}
                  >
                    <Play className="w-3 h-3 fill-current" /> Watch Now
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${userLiked ? 'text-accent bg-accent/10' : 'text-white/60 bg-white/5 hover:bg-white/10'}`}
                      onClick={handleLike}
                      title="Like"
                    >
                      <Heart className={`w-4.5 h-4.5 ${userLiked ? 'fill-current' : ''}`} />
                    </button>

                    <button 
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${inWatchlist ? 'text-accent bg-accent/10' : 'text-white/60 bg-white/5 hover:bg-white/10'}`}
                      onClick={handleWatchlist}
                      title="Add to List"
                    >
                      {inWatchlist ? <Check className="w-4.5 h-4.5" /> : <Plus className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Synopsis */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-bold mb-2 text-white uppercase tracking-widest opacity-90">Synopsis</h3>
              <p className="text-text-secondary text-[0.85rem] leading-relaxed">
                {item.overview || 'The plot remains a mystery. Dive in to discover the story.'}
              </p>
            </div>

            {/* Bottom Section: Trailer */}
            {trailer && (
              <div className="mt-2">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <iframe 
                    src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`} 
                    allowFullScreen 
                    className="absolute inset-0 w-full h-full border-none"
                  ></iframe>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[300px] text-red-500">
            Failed to load content. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
