import { useState, useEffect } from 'react';
import { Calendar, Star } from 'lucide-react';

export function MediaRow({ title, icon: Icon, fetchFn, mediaType, onOpenDetail, user, onShowRestricted }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchFn();
      if (data && data.results) {
        setItems(data.results.slice(0, 10));
      } else {
        setError(true);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleItemClick = (id: number) => {
    if (!user) onShowRestricted();
    else onOpenDetail(id, mediaType);
  };

  return (
    <section className="px-6 md:px-16 py-12 relative z-10">
      <h2 className="text-[1.4rem] font-bold mb-6 flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-accent" /> {title}
      </h2>
      
      {loading ? (
        <div className="text-text-secondary text-center p-8">Loading...</div>
      ) : error ? (
        <div 
          className="text-text-secondary text-center p-8 cursor-pointer hover:text-white transition-colors"
          onClick={loadData}
        >
          Failed to load. Click to retry.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {items.map(item => {
            const itemTitle = item.title || item.name;
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/180x270?text=No+Image';
            const year = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || 'N/A';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            const typeLabel = mediaType === 'movie' ? 'Movie' : 'TV Series';

            return (
              <div 
                key={item.id} 
                className="min-w-[150px] w-[150px] md:min-w-[190px] md:w-[190px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] bg-glass-bg border border-glass-border relative movie-card-hover"
                onClick={() => handleItemClick(item.id)}
              >
                <img 
                  src={poster} 
                  alt={itemTitle} 
                  loading="lazy" 
                  className="w-full h-[225px] md:h-[285px] object-cover block transition-transform duration-400 ease-in-out"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-[2]">
                  <div className="text-[0.95rem] font-semibold mb-1.5 line-clamp-2 leading-[1.3] min-h-[2.6em] text-white">
                    {itemTitle}
                  </div>
                  <div className="flex items-center justify-between text-[0.8rem] text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {year}
                    </span>
                    <span className="flex items-center gap-1 text-[#ffb400] font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      {rating}
                    </span>
                  </div>
                  <div className="text-[0.75rem] text-text-secondary uppercase tracking-[0.5px] font-semibold mt-1">
                    {typeLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
