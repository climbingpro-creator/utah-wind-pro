import { useMapEvents } from 'react-leaflet';

/**
 * Invisible component that listens for map click events
 * and forwards the coordinates to the parent via callback.
 */
export default function PinDropListener({ onPinDrop }) {
  useMapEvents({
    click(e) {
      onPinDrop?.([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
