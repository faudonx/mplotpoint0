import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, List, LogOut, Film, Tv } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { tmdb } from '../lib/tmdb';

export function Header({ user, onOpenAuth, onOpenWatchlist, onShowRestricted, onOpenDetail }: any) {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (e) {
          console.warn("Could not fetch user data", e);
        }
      };
      fetchUserData();
    } else {
      setUserData(null);
    }
  }, [user]);

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

  const nickname = userData?.nickname || user?.email?.split('@')[0] || 'User';
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <header className={`fixed top-0 w-full z-[1000] transition-all duration-300 flex flex-wrap items-center justify-between px-4 md:px-16 py-3 md:py-4 gap-y-3 gap-x-4 ${scrolled ? 'bg-[#050a10]/95 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' : 'bg-[#050a10]/85 backdrop-blur-md border-b border-white/10'}`}>
      <div className="text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-br from-white to-accent bg-clip-text text-transparent order-1">
        MPlotPoint
      </div>
      
      <div className="order-2 md:order-4 ml-auto md:ml-0">
        {user ? (
          <div className="relative">
            <div 
              className={`flex items-center gap-2 md:gap-3 bg-glass-bg px-3 md:px-4 py-1.5 rounded-full cursor-pointer border-2 transition-all duration-300 ${showDropdown ? 'border-accent bg-[#1e2d46]/60' : 'border-transparent hover:border-accent hover:bg-[#1e2d46]/60'}`}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Avatar" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-accent object-cover" />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-accent to-[#ff6b35] flex items-center justify-center font-bold text-xs md:text-sm text-white border-2 border-accent">
                  {initial}
                </div>
              )}
              <span className="text-sm font-medium hidden md:block">{nickname}</span>
              <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
            </div>
            
            {showDropdown && (
              <div className="absolute top-[calc(100%+0.8rem)] right-0 w-[240px] md:w-[280px] max-w-[90vw] bg-modal-bg backdrop-blur-xl border border-white/10 rounded-2xl p-2 z-[150] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slideDown origin-top-right">
                <div className="p-3 md:p-4 border-b border-white/10 mb-2">
                  <div className="font-semibold text-sm md:text-base mb-1 truncate">{nickname}</div>
                  <div className="text-xs md:text-sm text-text-secondary truncate">{user.email}</div>
                </div>
                
                <button 
                  className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 text-text-primary hover:bg-accent/10 hover:border-l-4 hover:border-l-accent hover:pl-[calc(0.75rem-4px)]"
                  onClick={() => {
                    setShowDropdown(false);
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
            onClick={onOpenAuth}
          >
            Login
          </button>
        )}
      </div>

      <div className="flex gap-4 md:gap-8 items-center text-sm md:text-base order-3 md:order-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
        <a href="#movies" className="text-text-primary hover:text-accent font-medium transition-colors relative group py-1 whitespace-nowrap">
          Movies
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-200 group-hover:w-full"></span>
        </a>
        <a href="#tv" className="text-text-primary hover:text-accent font-medium transition-colors relative group py-1 whitespace-nowrap">
          TV Shows
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-200 group-hover:w-full"></span>
        </a>
        <a href="#anime" className="text-text-primary hover:text-accent font-medium transition-colors relative group py-1 whitespace-nowrap">
          Anime
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-200 group-hover:w-full"></span>
        </a>
        <a href="#kdrama" className="text-text-primary hover:text-accent font-medium transition-colors relative group py-1 whitespace-nowrap">
          K-Drama
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-200 group-hover:w-full"></span>
        </a>
      </div>

      <div className="relative w-full md:w-80 order-4 md:order-3" ref={searchRef}>
        <div className="search-bar-focus-within bg-[#1e2d46]/60 border border-white/10 rounded-full px-4 py-2 md:py-2.5 flex items-center gap-2.5 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
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
          <div className="absolute top-full right-0 w-full md:w-[380px] max-h-[400px] md:max-h-[450px] overflow-y-auto bg-modal-bg backdrop-blur-xl border border-white/10 rounded-2xl mt-2 md:mt-3 z-[2000] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slideDown">
            {searchResults.map((item) => {
              if (!item.poster_path && !item.profile_path) return null;
              const title = item.title || item.name;
              const date = item.release_date || item.first_air_date;
              const year = date ? date.slice(0,4) : '';
              const mediaType = item.media_type === 'movie' ? 'movie' : (item.media_type === 'tv' ? 'tv' : null);
              if (!mediaType) return null;
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://via.placeholder.com/92x138?text=No+Image';
              
              return (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3.5 cursor-pointer border-b border-white/5 transition-colors hover:bg-accent/10 hover:border-l-4 hover:border-l-accent hover:pl-[calc(0.625rem-4px)] md:hover:pl-2.5"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    if (!user) onShowRestricted();
                    else onOpenDetail(item.id, mediaType);
                  }}
                >
                  <img src={poster} alt={title} className="w-10 h-[60px] md:w-12 md:h-[75px] object-cover rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-0.5 md:mb-1 truncate">{title}</div>
                    <div className="text-xs text-text-secondary flex items-center gap-1.5">
                      {mediaType === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                      {mediaType === 'movie' ? 'Movie' : 'TV'} {year ? `• ${year}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
