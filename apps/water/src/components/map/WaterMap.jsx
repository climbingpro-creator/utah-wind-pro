import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { generateFisheryProfile } from '@utahwind/weather';
import SyntheticFishingCard from './SyntheticFishingCard';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const UTAH_CENTER = [40.35, -111.70];
const DEFAULT_ZOOM = 9;
const DEFAULT_ELEVATION = 4500;

function createPinIcon() {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2px solid #fff;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(16,185,129,0.5);
      display: flex; align-items: center; justify-content: center;
    "><div style="transform: rotate(45deg); color: white; font-size: 12px; font-weight: 900;">🎣</div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function PinDropListener({ onPinDrop }) {
  useMapEvents({ click(e) { onPinDrop?.([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export function WaterMap({ currentWeatherData = {} }) {
  const [droppedPin, setDroppedPin] = useState(null);
  const [fishProfile, setFishProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  const abortRef = useRef(0);

  const handlePinDrop = useCallback(async (coords) => {
    const requestId = ++abortRef.current;
    setDroppedPin(coords);
    setHasDroppedPin(true);
    setIsLoading(true);
    setFishProfile(null);

    try {
      const profile = await generateFisheryProfile(
        coords[0], coords[1],
        DEFAULT_ELEVATION,
        currentWeatherData,
      );
      if (requestId === abortRef.current) {
        setFishProfile(profile);
      }
    } catch (err) {
      console.error('Fishery profile error:', err);
    } finally {
      if (requestId === abortRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentWeatherData]);

  const handleClear = useCallback(() => {
    setDroppedPin(null);
    setFishProfile(null);
    setIsLoading(false);
  }, []);

  return (
    <div className="card !p-0 overflow-hidden relative">
      {/* Instructional banner */}
      {!hasDroppedPin && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/80 backdrop-blur-sm border border-emerald-500/20 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-200">
              Tap anywhere to analyze water conditions
            </span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-80 sm:h-96 cursor-crosshair">
        <MapContainer
          center={UTAH_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <PinDropListener onPinDrop={handlePinDrop} />

          {droppedPin && (
            <Marker position={droppedPin} icon={createPinIcon()} />
          )}
        </MapContainer>
      </div>

      {/* Floating card */}
      {(isLoading || fishProfile) && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[9999]">
          <SyntheticFishingCard
            data={fishProfile}
            isLoading={isLoading}
            onClose={handleClear}
          />
        </div>
      )}
    </div>
  );
}

export default WaterMap;
