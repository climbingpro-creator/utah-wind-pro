import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, X, MapPin, Send, ArrowLeft, ImagePlus, Loader2, Trash2, MessageCircle, Heart, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@utahwind/database';
import { FISHING_LOCATIONS } from '../components/FishingMode';

const API_BASE = '/api/community/post';
const LIKE_API = '/api/community/like';
const COMMENT_API = '/api/community/comment';

const SKY_OPTIONS = [
  { id: 'sunny', emoji: '☀️', label: 'Sunny' },
  { id: 'partly-cloudy', emoji: '⛅', label: 'Partly Cloudy' },
  { id: 'overcast', emoji: '☁️', label: 'Overcast' },
  { id: 'rain', emoji: '🌧️', label: 'Rain' },
  { id: 'snow', emoji: '🌨️', label: 'Snow' },
];

const SKY_EMOJI = { sunny: '☀️', 'partly-cloudy': '⛅', overcast: '☁️', rain: '🌧️', snow: '🌨️' };

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

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

function weatherBadge(post) {
  if (!post.weather_temp && !post.weather_wind && !post.weather_sky) return null;
  const parts = [];
  if (post.weather_sky) parts.push(SKY_EMOJI[post.weather_sky] || '');
  if (post.weather_temp != null) parts.push(`${post.weather_temp}°`);
  if (post.weather_wind != null) parts.push(`🌬️ ${post.weather_wind}mph`);
  return parts.join(' ');
}

function CommentSection({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${COMMENT_API}?postId=${postId}`)
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(COMMENT_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ postId, body: newComment.trim() }),
      });
      const data = await resp.json();
      if (resp.ok && data.comment) {
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  async function handleDeleteComment(commentId) {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${COMMENT_API}?id=${commentId}`, { method: 'DELETE', headers });
      if (resp.ok) setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  }

  return (
    <div className="border-t border-slate-700/30 mt-2 pt-2">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" /></div>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-1.5 text-[10px]">
                  <span className="font-semibold text-slate-300 shrink-0">{c.display_name || 'Angler'}</span>
                  <span className="text-slate-400 flex-1">{c.body}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-slate-600 hover:text-red-400 shrink-0">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                maxLength={500}
                className="flex-1 rounded-lg bg-slate-800/50 border border-slate-700/50 px-2 py-1 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 disabled:opacity-30 hover:bg-cyan-500/30 transition-colors"
              >
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          ) : (
            <p className="text-[9px] text-slate-600">Sign in to comment</p>
          )}
        </>
      )}
    </div>
  );
}

function PostCard({ post, currentUserId, onDelete, onUpdate, user }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [editSpecies, setEditSpecies] = useState(post.species || '');
  const [saving, setSaving] = useState(false);
  const isOwner = currentUserId && post.user_id === currentUserId;
  const badge = weatherBadge(post);

  async function handleLike() {
    if (!currentUserId) return;
    const prev = liked;
    setLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(LIKE_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch { setLiked(prev); setLikeCount(c => prev ? c + 1 : c - 1); }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}?id=${post.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          caption: editCaption.trim(),
          species: editSpecies.trim() || null,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.post) {
        onUpdate(data.post);
        setEditing(false);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
        <img
          src={post.photo_url}
          alt={post.caption || 'Catch photo'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {post.species && !editing && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 text-white backdrop-blur-sm">
            {post.species}
          </span>
        )}
        {badge && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[9px] font-semibold bg-black/40 text-white/90 backdrop-blur-sm">
            {badge}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">
                {(post.display_name || 'A')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-semibold text-white truncate">{post.display_name || 'Angler'}</span>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(post.created_at)}</span>
        </div>

        {editing ? (
          <div className="space-y-2 mb-2">
            <textarea
              value={editCaption}
              onChange={e => setEditCaption(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <input
              value={editSpecies}
              onChange={e => setEditSpecies(e.target.value)}
              placeholder="Species"
              className="w-full rounded-lg bg-slate-800 border border-slate-600 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />} Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditCaption(post.caption || ''); setEditSpecies(post.species || ''); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.caption && (
              <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">{post.caption}</p>
            )}
          </>
        )}

        <div className="flex items-center gap-3">
          {post.location_name && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <MapPin className="w-3 h-3" />
              {post.location_name}
            </span>
          )}
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={handleLike}
              className={`flex items-center gap-0.5 text-[10px] transition-colors ${liked ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'}`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-rose-400' : ''}`} /> {likeCount}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-0.5 text-[10px] transition-colors ${showComments ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'}`}
            >
              <MessageCircle className="w-3 h-3" /> {post.comment_count || 0}
              {showComments ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>
          {isOwner && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-cyan-400 transition-colors"
              title="Edit post"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {isOwner && !editing && (
            <button
              onClick={() => confirmDelete ? onDelete(post.id) : setConfirmDelete(true)}
              className={`flex items-center gap-1 text-[10px] transition-colors ${confirmDelete ? 'text-red-400 font-semibold' : 'text-slate-600 hover:text-red-400'}`}
            >
              <Trash2 className="w-3 h-3" />
              {confirmDelete ? 'Confirm?' : ''}
            </button>
          )}
        </div>
        {showComments && <CommentSection postId={post.id} user={user} />}
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [species, setSpecies] = useState('');
  const [locationId, setLocationId] = useState('');
  const [weatherTemp, setWeatherTemp] = useState('');
  const [weatherWind, setWeatherWind] = useState('');
  const [weatherSky, setWeatherSky] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const locationOptions = Object.entries(FISHING_LOCATIONS).map(([id, loc]) => ({
    id,
    name: loc.name,
  }));

  function compressImage(file, maxDim = 2048, quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    const compressed = await compressImage(file);
    setImage(compressed);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!image) return;
    setUploading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const loc = locationId ? FISHING_LOCATIONS[locationId] : null;
      const resp = await fetch(API_BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image,
          caption: caption.trim(),
          species: species.trim() || null,
          locationId: locationId || null,
          locationName: loc?.name || null,
          weatherTemp: weatherTemp ? parseInt(weatherTemp) : null,
          weatherWind: weatherWind ? parseInt(weatherWind) : null,
          weatherSky: weatherSky || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upload failed');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-bold text-white">Share Your Catch</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {preview ? (
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-800">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setPreview(null); setImage(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-600 hover:border-cyan-500/50 transition-colors flex flex-col items-center justify-center gap-2 bg-slate-800/50"
            >
              <ImagePlus className="w-8 h-8 text-slate-500" />
              <span className="text-sm text-slate-400">Tap to add a photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="What's the story? Flies, conditions, tips..."
            maxLength={500}
            rows={3}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Species</label>
              <input
                value={species}
                onChange={e => setSpecies(e.target.value)}
                placeholder="e.g. Brown Trout"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Location</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Select water...</option>
                {locationOptions.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Weather at catch */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">Conditions at Catch</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {SKY_OPTIONS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setWeatherSky(weatherSky === s.id ? '' : s.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    weatherSky === s.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-slate-500 mb-0.5 block">Temp (°F)</label>
                <input
                  type="number"
                  value={weatherTemp}
                  onChange={e => setWeatherTemp(e.target.value)}
                  placeholder="e.g. 62"
                  min={-20}
                  max={120}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-0.5 block">Wind (mph)</label>
                <input
                  type="number"
                  value={weatherWind}
                  onChange={e => setWeatherWind(e.target.value)}
                  placeholder="e.g. 5"
                  min={0}
                  max={100}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={!image || uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Share with Community'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CommunityFeed({ onBack }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchFeed = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await resp.json();
      if (resp.ok) {
        setPosts(prev => offset === 0 ? (data.posts || []) : [...prev, ...(data.posts || [])]);
        setTotal(data.total || 0);
      }
    } catch (_err) { /* network error */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeed(0); }, [fetchFeed]);

  async function handleDelete(postId) {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_BASE}?id=${postId}`, { method: 'DELETE', headers });
      if (resp.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setTotal(prev => prev - 1);
      }
    } catch (_err) { /* ignore */ }
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchFeed(next * PAGE_SIZE);
  }

  return (
    <div className="min-h-[60vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-cyan-400" />
              Community Catches
            </h2>
            <p className="text-[11px] text-slate-500">{total} {total === 1 ? 'post' : 'posts'} from Utah anglers</p>
          </div>
        </div>
        {user ? (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            Share Catch
          </button>
        ) : (
          <button
            onClick={() => { window.location.hash = '#login'; }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Sign in to post
          </button>
        )}
      </div>

      {posts.length === 0 && !loading && (
        <div className="text-center py-16">
          <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-400 mb-1">No catches shared yet</h3>
          <p className="text-xs text-slate-500">Be the first to share your Utah catch!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onDelete={handleDelete}
            onUpdate={(updated) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
            user={user}
          />
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {!loading && posts.length < total && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Load More
          </button>
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setPage(0); fetchFeed(0); }}
        />
      )}
    </div>
  );
}
