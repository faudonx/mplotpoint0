import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { tmdb } from './lib/tmdb';

import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MediaRow } from './components/MediaRow';
import { AuthModal } from './components/AuthModal';
import { DetailModal } from './components/DetailModal';
import { PlayerModal } from './components/PlayerModal';
import { ConfirmModal } from './components/ConfirmModal';
import { RestrictedModal } from './components/RestrictedModal';
import { WatchlistModal } from './components/WatchlistModal';

import { Film, Tv, PlaySquare, Heart } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRestrictedOpen, setIsRestrictedOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);

  // Active item state
  const [activeMovieId, setActiveMovieId] = useState<number | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<'movie' | 'tv'>('movie');
  const [activeItem, setActiveItem] = useState<any>(null);

  // Confirm modal state
  const [confirmProps, setConfirmProps] = useState({
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDetail = (id: number, mediaType: 'movie' | 'tv') => {
    setActiveMovieId(id);
    setActiveMediaType(mediaType);
    setIsDetailOpen(true);
    // If player is open, we might want to keep it or close it. 
    // Usually, opening a new detail should at least hide the player or close it.
    setIsPlayerOpen(false); 
  };

  const handleGoHome = (targetId?: string) => {
    setIsDetailOpen(false);
    setIsPlayerOpen(false);
    setIsWatchlistOpen(false);
    setIsAuthOpen(false);
    setIsRestrictedOpen(false);
    setIsConfirmOpen(false);
    
    if (typeof targetId === 'string' && targetId) {
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleWatchNow = (item: any, mediaType: 'movie' | 'tv') => {
    setActiveItem(item);
    setActiveMediaType(mediaType);
    setIsPlayerOpen(true);
  };

  const handleShowRestricted = () => {
    setIsPlayerOpen(false);
    setIsRestrictedOpen(true);
  };

  const handleOpenAuth = () => {
    setIsPlayerOpen(false);
    setIsAuthOpen(true);
  };

  const handleOpenWatchlist = () => {
    setIsPlayerOpen(false);
    setIsWatchlistOpen(true);
  };

  const handleShowConfirm = (title: string, message: string, type: string, onConfirm: () => void) => {
    setConfirmProps({ title, message, type, onConfirm });
    setIsConfirmOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans">
      <Header 
        user={user} 
        onOpenAuth={handleOpenAuth}
        onOpenWatchlist={handleOpenWatchlist}
        onShowRestricted={handleShowRestricted}
        onOpenDetail={handleOpenDetail}
        onGoHome={handleGoHome}
      />

      <main>
        <Hero 
          user={user}
          onOpenDetail={handleOpenDetail}
          onShowRestricted={handleShowRestricted}
        />

        <div id="movies">
          <MediaRow 
            title="Popular Movies" 
            icon={Film} 
            fetchFn={tmdb.getPopularMovies} 
            mediaType="movie"
            user={user}
            onOpenDetail={handleOpenDetail}
            onShowRestricted={handleShowRestricted}
          />
        </div>

        <div id="tv">
          <MediaRow 
            title="Popular TV Shows" 
            icon={Tv} 
            fetchFn={tmdb.getPopularTV} 
            mediaType="tv"
            user={user}
            onOpenDetail={handleOpenDetail}
            onShowRestricted={handleShowRestricted}
          />
        </div>

        <div id="anime">
          <MediaRow 
            icon={PlaySquare} 
            title="Popular Anime" 
            fetchFn={tmdb.getAnime} 
            mediaType="tv"
            user={user}
            onOpenDetail={handleOpenDetail}
            onShowRestricted={handleShowRestricted}
          />
        </div>

        <div id="kdrama">
          <MediaRow 
            title="Popular K-Drama" 
            icon={Heart} 
            fetchFn={tmdb.getKDrama} 
            mediaType="tv"
            user={user}
            onOpenDetail={handleOpenDetail}
            onShowRestricted={handleShowRestricted}
          />
        </div>
      </main>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />

      <DetailModal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        movieId={activeMovieId}
        mediaType={activeMediaType}
        onWatchNow={handleWatchNow}
        onShowConfirm={handleShowConfirm}
      />

      <PlayerModal 
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        item={activeItem}
        mediaType={activeMediaType}
        onOpenDetail={handleOpenDetail}
        onShowRestricted={handleShowRestricted}
        onOpenAuth={handleOpenAuth}
        onOpenWatchlist={handleOpenWatchlist}
      />

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title={confirmProps.title}
        message={confirmProps.message}
        type={confirmProps.type}
        onConfirm={() => {
          confirmProps.onConfirm();
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <RestrictedModal 
        isOpen={isRestrictedOpen}
        onClose={() => setIsRestrictedOpen(false)}
        onLogin={() => {
          setIsRestrictedOpen(false);
          handleOpenAuth();
        }}
      />

      <WatchlistModal 
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        onOpenDetail={handleOpenDetail}
        onShowConfirm={handleShowConfirm}
      />
    </div>
  );
}
