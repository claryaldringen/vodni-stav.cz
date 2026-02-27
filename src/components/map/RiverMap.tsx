'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface StationPoint {
  lat: number;
  lon: number;
  name: string;
  slug: string;
}

interface RiverMapProps {
  stations: StationPoint[];
  riverId: number;
}

const FitBounds = ({ stations, geojson }: { stations: StationPoint[]; geojson: FeatureCollection | null }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);

    for (const s of stations) {
      bounds.extend([s.lat, s.lon]);
    }

    if (geojson) {
      const geoLayer = L.geoJSON(geojson);
      bounds.extend(geoLayer.getBounds());
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, stations, geojson]);

  return null;
};

const RiverMap = ({ stations, riverId }: RiverMapProps) => {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`/api/rivers/${riverId}/geometry`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setGeojson(data);
      })
      .catch(() => {});
  }, [riverId]);

  const center = stations.length > 0 ? [stations[0].lat, stations[0].lon] as [number, number] : [49.8, 15.5] as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: 400, width: '100%', borderRadius: 8 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations.map((s) => (
        <Marker key={`${s.lat}-${s.lon}`} position={[s.lat, s.lon]} icon={defaultIcon}>
          <Popup>
            <a href={`/stanice/${s.slug}`} style={{ fontWeight: 600 }}>
              {s.name}
            </a>
          </Popup>
        </Marker>
      ))}
      {geojson && (
        <GeoJSON data={geojson} style={{ color: '#1976d2', weight: 3, opacity: 0.7 }} />
      )}
      <FitBounds stations={stations} geojson={geojson} />
    </MapContainer>
  );
};

export default RiverMap;
