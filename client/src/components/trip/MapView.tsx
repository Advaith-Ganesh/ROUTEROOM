import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import type { Activity, Place } from '../../api/types';

// Leaflet's default marker images don't resolve correctly through Vite's
// bundler, so we render simple CSS-based circle markers instead of
// depending on those image assets.
function circleIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const destinationIcon = circleIcon('#2f5d50');
const placeIcon = circleIcon('#5b6472');

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

export function MapView({
  destination,
  places,
  activities,
}: {
  destination: { name: string; lat: number; lon: number };
  places: Place[];
  activities?: Activity[];
}) {
  const points: [number, number][] =
    places.length > 0
      ? places.map((p) => [p.lat, p.lon])
      : [[destination.lat, destination.lon]];

  const route: [number, number][] =
    activities?.filter((a) => a.place).map((a) => [a.place.lat, a.place.lon]) ?? [];

  return (
    <MapContainer
      center={[destination.lat, destination.lon]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-80 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
        <Popup>{destination.name}</Popup>
      </Marker>
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lon]} icon={placeIcon}>
          <Popup>
            <strong>{place.name}</strong>
            {place.address && <div className="text-xs text-ink-500">{place.address}</div>}
          </Popup>
        </Marker>
      ))}
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#3a7364', weight: 3 }} />}
      <FitBounds points={points} />
    </MapContainer>
  );
}
