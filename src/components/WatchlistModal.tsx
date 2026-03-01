import { useState, useEffect } from 'react';
import { X, List, Calendar, Star, Loader2, AlertTriangle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { tmdb } from '../lib/tmdb';

export function WatchlistModal({ isOpen, onClose, onOpenDetail, onShowConfirm }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadWatchlist = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(false);
    try {
      const uid = auth.currentUser.uid;
      const q = query(collection(db, 'watchlist'), where('userId', '==', uid));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setItems([]);
        setLoading(false);
        return;
      }

      const promises = snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        try {
          const item = await tmdb.getDetails(data.movieId, data.mediaType);
          return { ...item, docId: docSnap.id, mediaType: data.mediaType };
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(promises);
      setItems(results.filter(Boolean));
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWatchlist();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemove = (docId: string, title: string) => {
    onShowConfirm(
      'Remove from Watchlist',
      `Are you sure you want to remove "${title}" from your watchlist?`,
      'warning',
      async () => {
        try {
          await deleteDoc(doc(db, 'watchlist', docId));
          await loadWatchlist();
        } catch (error) {
          console.error('Error removing from watchlist:', error);
          alert('Failed to remove from watchlist');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center z-[4000] animate-fadeIn overflow-y-auto pt-20 pb-10 px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[1200px] h-auto bg-modal-bg rounded-2xl p-5 md:p-8 border border-white/10 relative animate-scaleIn shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-white/10">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <List className="w-8 h-8 text-accent" /> My Watchlist
          </h2>
          <button className="text-white hover:text-accent transition-colors" onClick={onClose}>
            <X className="w-8 h-8" />
          </button>
        </div>

        {loading ? (
          <div className="text-center p-12 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading your watchlist...</p>
          </div>
        ) : error ? (
          <div className="text-center p-12 text-text-secondary">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-accent" />
            <h3 className="text-2xl font-bold mb-2">Error loading watchlist</h3>
            <p>Please try again later</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-16 text-text-secondary">
            <List className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-2xl font-bold mb-2">Your watchlist is empty</h3>
            <p className="text-base">Start adding movies and shows to your watchlist!</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
            {items.map(item => {
              const title = item.title || item.name;
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/180x270?text=No+Image';
              const year = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || 'N/A';
              const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

              return (
                <div 
                  key={item.id} 
                  className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-glass-bg border border-glass-border hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:border-accent group"
                  onClick={() => {
                    onClose();
                    onOpenDetail(item.id, item.mediaType);
                  }}
                >
                  <button 
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 border-none text-white flex items-center justify-center cursor-pointer opacity-0 transition-all duration-300 z-10 group-hover:opacity-100 hover:bg-[#ff6b6b] hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.docId, title);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img src={poster} alt={title} loading="lazy" className="w-full h-[270px] object-cover block" />
                  <div className="p-4">
                    <div className="text-[0.95rem] font-semibold mb-2 line-clamp-2 leading-[1.3] text-white">
                      {title}
                    </div>
                    <div className="flex items-center justify-between text-[0.8rem] text-text-secondary">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {year}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#ffb400] fill-current" /> {rating}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
