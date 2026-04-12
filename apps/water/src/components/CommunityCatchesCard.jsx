import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, ChevronRight, MapPin, Heart, MessageCircle } from 'lucide-react';

const API_BASE = '/api/community/post';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SKY_EMOJI = { sunny: '☀️', 'partly-cloudy': '⛅', overcast: '☁️', rain: '🌧️', snow: '🌨️' };

function weatherBadge(post) {
  if (!post.weather_temp && !post.weather_wind && !post.weather_sky) return null;
  const parts = [];
  if (post.weather_sky) parts.push(SKY_EMOJI[post.weather_sky] || '');
  if (post.weather_temp != null) parts.push(`${post.weather_temp}°`);
  if (post.weather_wind != null) parts.push(`🌬️ ${post.weather_wind}mph`);
  return parts.join(' ');
}

function CatchCard({ post, onClick }) {
  const likes = post.like_count || 0;
  const comments = post.comment_count || 0;
  const badge = weatherBadge(post);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[72%] sm:w-[45%] snap-center relative rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={post.photo_url}
          alt={post.caption || 'Catch'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Environmental data badge — top-right (user-reported) */}
        {badge && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] font-semibold bg-black/40 text-white/90 backdrop-blur-sm">
            {badge}
          </span>
        )}

        {/* Species badge — top-left */}
        {post.species && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/80 text-white backdrop-blur-sm">
            {post.species}
          </span>
        )}

        {/* Scrim gradient overlay — bottom 40% */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Text content on scrim */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-bold text-white">
                {(post.display_name || 'A')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-white truncate">{post.display_name || 'Angler'}</span>
            <span className="text-[8px] text-white/50 shrink-0 ml-auto">{timeAgo(post.created_at)}</span>
          </div>

          {post.caption && (
            <p className="text-[9px] text-white/70 leading-snug line-clamp-2 mb-1">{post.caption}</p>
          )}

          <div className="flex items-center justify-between">
            {post.location_name ? (
              <span className="flex items-center gap-0.5 text-[8px] text-white/50 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0" /> {post.location_name}
              </span>
            ) : <span />}

            {/* Engagement icons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                <Heart className="w-3 h-3" /> {likes}
              </span>
              <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                <MessageCircle className="w-3 h-3" /> {comments}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function CommunityCatchesCard({ onViewAll }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}?limit=10&offset=0`);
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        if (!cancelled) setPosts(data.posts || []);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll, posts]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Community Catches</span>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map(i => <div key={i} className="flex-shrink-0 w-[72%] aspect-[3/4] rounded-2xl bg-slate-700/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Community Catches</span>
          </div>
          <button onClick={onViewAll} className="flex items-center gap-0.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Share yours <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center py-4">No catches shared yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Community Catches</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">{posts.length}+</span>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {posts.slice(0, 10).map(post => (
            <CatchCard key={post.id} post={post} onClick={onViewAll} />
          ))}
        </div>
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-slate-800/80 to-transparent pointer-events-none rounded-r-2xl" />
        )}
      </div>
    </div>
  );
}
