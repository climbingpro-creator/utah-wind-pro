import { useState, useEffect } from 'react';
import { Camera, ChevronRight, MapPin } from 'lucide-react';

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

export default function CommunityCatchesCard({ onViewAll }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}?limit=6&offset=0`);
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        if (!cancelled) setPosts(data.posts || []);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Community Catches</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded-xl bg-slate-700/50 animate-pulse" />)}
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

      <div className="grid grid-cols-3 gap-2">
        {posts.slice(0, 6).map(post => (
          <button key={post.id} onClick={onViewAll} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 cursor-pointer">
            <img
              src={post.photo_url}
              alt={post.caption || 'Catch'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
              {post.species && (
                <span className="text-[8px] font-bold text-emerald-300 block truncate">{post.species}</span>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-white/70 truncate">{post.display_name}</span>
                <span className="text-[7px] text-white/50 shrink-0">{timeAgo(post.created_at)}</span>
              </div>
              {post.location_name && (
                <span className="flex items-center gap-0.5 text-[7px] text-white/40 truncate">
                  <MapPin className="w-2 h-2 shrink-0" /> {post.location_name}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
