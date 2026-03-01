import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Star, Heart, Plus, Play, Check } from 'lucide-react';
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

  const handleRating = async (rating: number) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const ratingRef = doc(db, 'ratings', `${uid}_${mediaType}_${movieId}`);
    await setDoc(ratingRef, { userId: uid, movieId, mediaType, value: rating, timestamp: new Date() });
    setUserRating(rating);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[90%] max-w-[1000px] bg-modal-bg rounded-2xl p-8 border border-white/10 relative max-h-[90vh] overflow-y-auto animate-scaleIn">
        <button className="absolute top-4 right-6 text-white hover:text-accent transition-colors z-10" onClick={onClose}>
          <X className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="text-center p-8">Loading...</div>
        ) : item ? (
          <div className="flex gap-6 md:gap-8 flex-col md:flex-row">
            <div className="w-[140px] md:w-[260px] md:flex-[0_0_260px] mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-[0_20px_30px_black] shrink-0">
              <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={item.title || item.name} className="w-full h-auto block" />
            </div>
            
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h2 className="text-3xl md:text-[2.5rem] font-bold mb-2">{item.title || item.name}</h2>
              
              <div className="flex gap-4 md:gap-6 text-text-secondary my-4 flex-wrap justify-center md:justify-start">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {item.release_date?.slice(0,4) || item.first_air_date?.slice(0,4)}</span>
                {item.runtime && <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {item.runtime} min</span>}
                <span className="flex items-center gap-2"><Star className="w-4 h-4" /> {item.vote_average?.toFixed(1) || '?'}</span>
              </div>
              
              <p className="my-6 text-text-secondary leading-[1.6]">{item.overview || 'No overview available.'}</p>
              
              <div className="flex gap-4 flex-wrap my-8">
                <button 
                  className="px-7 py-3 rounded-full font-semibold border-none cursor-pointer bg-accent text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:brightness-110"
                  onClick={handleLike}
                >
                  <Heart className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} /> {userLiked ? 'Liked' : 'Like'}
                </button>
                <button 
                  className="px-7 py-3 rounded-full font-semibold border-2 border-accent cursor-pointer bg-transparent text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:bg-accent/10"
                  onClick={handleWatchlist}
                >
                  {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {inWatchlist ? 'In List' : 'Add to List'}
                </button>
                <button 
                  className="px-7 py-3 rounded-full font-semibold border-none cursor-pointer bg-accent text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:brightness-110 md:ml-auto"
                  onClick={() => {
                    onClose();
                    onWatchNow(item, mediaType);
                  }}
                >
                  <Play className="w-5 h-5 fill-current" /> Watch Now
                </button>
              </div>
              
              <div className="flex items-center gap-2 my-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    className={`w-7 h-7 cursor-pointer transition-all duration-200 ${star <= userRating ? 'text-[#ffb400] fill-current drop-shadow-[0_0_15px_gold]' : 'text-[#aaa]'}`}
                    onClick={() => handleRating(star)}
                  />
                ))}
              </div>
              
              {item.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') && (
                <div className="mt-4 rounded-xl overflow-hidden">
                  <iframe 
                    width="100%" 
                    height="315" 
                    src={`https://www.youtube.com/embed/${item.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube').key}`} 
                    allowFullScreen 
                    className="border-none"
                  ></iframe>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-red-500">Error loading details.</div>
        )}
      </div>
    </div>
  );
}
