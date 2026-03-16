import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Upload, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { addUserPhoto, getUserPhotos, removeUserPhoto, IMAGE_POOLS } from '../config/imagePool';

const CATEGORIES = [
  { id: 'kiting', label: 'Kiting' },
  { id: 'snowkiting', label: 'Snowkiting' },
  { id: 'sailing', label: 'Sailing' },
  { id: 'boating', label: 'Boating' },
  { id: 'paddling', label: 'Paddling' },
  { id: 'fishing', label: 'Fishing' },
  { id: 'paragliding', label: 'Paragliding' },
  { id: 'windsurfing', label: 'Windsurfing' },
];

export default function PhotoSubmit({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [caption, setCaption] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState('submit'); // 'submit' | 'gallery'
  const [userPhotos, setUserPhotos] = useState(() => getUserPhotos());

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const toggleCategory = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!preview || selectedCategories.length === 0) return;
    const photos = addUserPhoto({
      dataUrl: preview,
      categories: selectedCategories,
      category: selectedCategories[0],
      caption,
      submitter: 'User',
    });
    setUserPhotos(photos);
    setPreview(null);
    setSelectedCategories([]);
    setCaption('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleDelete = (id) => {
    const photos = removeUserPhoto(id);
    setUserPhotos(photos);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <div className={`relative w-full max-w-lg rounded-xl overflow-hidden ${
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-sky-500" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Community Photos</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-[var(--border-color)]">
            {[
              { id: 'submit', label: 'Submit Photo', icon: Upload },
              { id: 'gallery', label: `My Photos (${userPhotos.length})`, icon: ImageIcon },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? 'text-sky-500 border-b-2 border-sky-500'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'submit' ? (
              <div className="space-y-4">
                {/* Upload Zone */}
                {preview ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={preview} alt="Preview" className="w-full h-48 sm:h-56 object-cover object-center" />
                    <button
                      onClick={() => setPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full h-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
                      isDark
                        ? 'border-slate-600 hover:border-sky-500/50 hover:bg-sky-500/5'
                        : 'border-slate-300 hover:border-sky-400 hover:bg-sky-50'
                    }`}
                  >
                    <Camera className="w-8 h-8 text-[var(--text-tertiary)]" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Tap to upload a photo</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG up to 5MB</p>
                    </div>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  className="hidden"
                />

                {/* Category Selection */}
                <div>
                  <label className="data-label block mb-2">What activity does this photo show?</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                          selectedCategories.includes(cat.id)
                            ? 'bg-sky-500 text-white border-sky-500'
                            : isDark
                              ? 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-sky-500/40'
                              : 'border-slate-200 text-slate-600 hover:border-sky-400'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="data-label block mb-2">Caption (optional)</label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Epic session at Sandy Beach"
                    maxLength={100}
                    className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${
                      isDark
                        ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500'
                        : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                    }`}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!preview || selectedCategories.length === 0}
                  className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    !preview || selectedCategories.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                      : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                  }`}
                >
                  {submitted ? (
                    <>
                      <Check className="w-4 h-4" />
                      Photo Added!
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Photo
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[var(--text-tertiary)] text-center">
                  Your photo will appear in the image rotation for the selected activities.
                </p>
              </div>
            ) : (
              /* Gallery Tab */
              <div>
                {userPhotos.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">No photos submitted yet</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Switch to "Submit Photo" to add your first one
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {userPhotos.map(photo => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden">
                        <img
                          src={photo.dataUrl || photo.url}
                          alt={photo.caption || 'User photo'}
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] font-medium truncate">
                            {photo.caption || photo.categories?.join(', ')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
