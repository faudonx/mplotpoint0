import { useState, useEffect } from 'react';
import { Play, Plus, PlayCircle } from 'lucide-react';
import { tmdb } from '../lib/tmdb';

export function Hero({ onOpenDetail, user, onShowRestricted }: any) {
  const [movies, setMovies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const data = await tmdb.getNowPlaying();
        if (data && data.results && data.results.length > 3) {
          setMovies(data.results.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
  }, []);

  if (loading || movies.length === 0) {
    return (
      <section className="h-screen flex items-center justify-center relative px-6 md:px-16">
        <div className="text-center">Loading...</div>
      </section>
    );
  }

  const activeMovie = movies[currentIndex];

  const handleAction = () => {
    if (!user) onShowRestricted();
    else onOpenDetail(activeMovie.id, 'movie');
  };

  return (
    <section className="h-screen flex flex-col xl:flex-row items-center justify-center xl:justify-between relative px-6 md:px-16 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-700 ease-in-out brightness-[0.85]"
        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${activeMovie?.backdrop_path})` }}
      />
      <div 
        className="absolute inset-0 z-10 pointer-events-none" 
        style={{
          background: `linear-gradient(90deg, #050a10 5%, rgba(5,10,16,0.3) 45%, rgba(5,10,16,0.15) 95%), linear-gradient(0deg, #050a10 0%, transparent 25%)`
        }}
      />

      <div className="max-w-full xl:max-w-[550px] z-20 relative text-center xl:text-left mt-20 xl:mt-0">
        <h1 className="text-[clamp(2.5rem,5vw,4.2rem)] font-extrabold leading-[1.05] mb-5 text-shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-gradient-to-br from-white to-[#e0e0ff] bg-clip-text text-transparent">
          {activeMovie?.title}
        </h1>
        
        <div className="flex items-center justify-center xl:justify-start gap-4 mb-6 text-[0.95rem] font-semibold">
          <span>{activeMovie?.release_date?.slice(0,4)}</span>
          <span className="bg-accent px-3 py-1 rounded text-white text-[0.85rem] font-bold">
            {activeMovie?.adult ? '18+' : '12+'}
          </span>
          <span>Action</span>
        </div>
        
        <p className="text-text-secondary leading-[1.7] mb-9 text-[1.05rem] max-w-[500px] mx-auto xl:mx-0">
          {activeMovie?.overview?.length > 200 ? activeMovie.overview.slice(0, 200) + '...' : activeMovie?.overview}
        </p>
        
        <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-start">
          <button 
            className="bg-accent text-white border-none px-9 py-3.5 rounded-full font-bold text-[1.05rem] cursor-pointer flex items-center gap-2.5 transition-all duration-300 shadow-[0_6px_25px_rgba(255,69,0,0.4)] hover:brightness-110 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(255,69,0,0.6)]"
            onClick={handleAction}
          >
            <Play className="w-5 h-5 fill-current" /> WATCH
          </button>
          <button 
            className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-9 py-3.5 rounded-full font-semibold text-[1.05rem] cursor-pointer transition-all duration-300 hover:bg-white/20 hover:-translate-y-1 hover:border-accent flex items-center gap-2.5"
            onClick={handleAction}
          >
            <Plus className="w-5 h-5" /> MY LIST
          </button>
        </div>
      </div>

      <div className="hidden xl:flex items-center justify-center relative w-[48vw] h-[420px] z-20 hero-carousel">
        {movies.map((m, index) => {
          let className = "carousel-item absolute w-[210px] h-[315px] rounded-2xl bg-cover bg-center cursor-pointer shadow-[0_25px_50px_rgba(0,0,0,0.7)]";
          let style: any = { backgroundImage: `url(https://image.tmdb.org/t/p/w500${m.poster_path})` };
          
          if (index === currentIndex) {
            className += " active";
          } else if (index === currentIndex - 1) {
            className += " prev";
          } else if (index === currentIndex + 1) {
            className += " next";
          } else {
            style.display = 'none';
          }

          return (
            <div 
              key={m.id}
              className={className}
              style={style}
              onClick={() => setCurrentIndex(index)}
            />
          );
        })}
      </div>

      <div 
        className="relative xl:absolute bottom-0 xl:bottom-10 left-0 xl:left-16 flex items-center justify-center xl:justify-start gap-2.5 cursor-pointer font-semibold transition-colors duration-200 text-text-secondary hover:text-accent mt-8 xl:mt-0 z-20"
        onClick={handleAction}
      >
        <PlayCircle className="w-6 h-6" /> WATCH TRAILER
      </div>
    </section>
  );
}
