const IMAGE_POOLS = {
  kiting: [
    '/images/kiting-utah-lake.png',
    '/images/kite-beach-epic.png',
    '/images/foilboard-sunset.png',
  ],
  snowkiting: [
    '/images/snowkite-strawberry.png',
    '/images/winter-blue.png',
  ],
  sailing: [
    '/images/storm-clouds.png',
    '/images/marsh-clouds.png',
    '/images/lake-sunset.png',
  ],
  boating: [
    '/images/wake-wave-sunset.png',
    '/images/wakesurf-boat.png',
    '/images/wake-wave-sun.png',
    '/images/glass-water-mirror.png',
  ],
  paddling: [
    '/images/paddling-utah-lake.png',
    '/images/glass-water-mirror.png',
    '/images/marsh-golden.png',
    '/images/glass-morning.png',
  ],
  paragliding: [
    '/images/storm-clouds.png',
    '/images/marsh-clouds.png',
  ],
  fishing: [
    '/images/fishing-casting.png',
    '/images/driftboat-river.png',
    '/images/fishing-trout.png',
    '/images/fishing-brown-canyon.png',
    '/images/river-canyon-green.png',
    '/images/brown-trout-net.png',
    '/images/trout-golden-reservoir.png',
    '/images/cutthroat-pink.png',
  ],
  windsurfing: [
    '/images/foilboard-sunset.png',
    '/images/kiting-utah-lake.png',
  ],
};

const MOOD_POOLS = {
  epic: [
    '/images/kite-beach-epic.png',
    '/images/kiting-utah-lake.png',
    '/images/foilboard-sunset.png',
  ],
  good: [
    '/images/river-canyon-green.png',
    '/images/driftboat-river.png',
    '/images/fishing-casting.png',
    '/images/storm-clouds.png',
  ],
  calm: [
    '/images/glass-water-mirror.png',
    '/images/glass-morning.png',
    '/images/marsh-golden.png',
    '/images/paddling-utah-lake.png',
  ],
  mixed: [
    '/images/wake-wave-sun.png',
    '/images/marsh-clouds.png',
    '/images/lake-sunset.png',
  ],
  neutral: [
    '/images/utah-lake-ice-sunset.png',
    '/images/winter-blue.png',
    '/images/river-canyon.png',
  ],
};

const USER_PHOTOS_KEY = 'utahwind_user_photos';

function getUserPhotos() {
  try {
    const stored = localStorage.getItem(USER_PHOTOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addUserPhoto(photo) {
  const photos = getUserPhotos();
  photos.push({
    ...photo,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    submittedAt: new Date().toISOString(),
    approved: true,
  });
  localStorage.setItem(USER_PHOTOS_KEY, JSON.stringify(photos));
  return photos;
}

function removeUserPhoto(id) {
  const photos = getUserPhotos().filter(p => p.id !== id);
  localStorage.setItem(USER_PHOTOS_KEY, JSON.stringify(photos));
  return photos;
}

function getPoolWithUserPhotos(poolName, poolType = 'activity') {
  const base = poolType === 'mood' ? MOOD_POOLS[poolName] : IMAGE_POOLS[poolName];
  if (!base) return [];

  const userPhotos = getUserPhotos()
    .filter(p => p.category === poolName || p.categories?.includes(poolName))
    .map(p => p.dataUrl || p.url)
    .filter(Boolean);

  return [...base, ...userPhotos];
}

function getDailyIndex(pool, salt = '') {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 86400000
  );
  const hash = (dayOfYear * 2654435761 + hashStr(salt)) >>> 0;
  return hash % pool.length;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getRotatingImage(poolName, poolType = 'activity', salt = '') {
  const pool = getPoolWithUserPhotos(poolName, poolType);
  if (!pool.length) return null;
  const idx = getDailyIndex(pool, poolName + salt);
  return pool[idx];
}

export function getRandomImage(poolName, poolType = 'activity') {
  const pool = getPoolWithUserPhotos(poolName, poolType);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export {
  IMAGE_POOLS,
  MOOD_POOLS,
  getUserPhotos,
  addUserPhoto,
  removeUserPhoto,
  getPoolWithUserPhotos,
};
