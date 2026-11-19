"use client";

// Internal Leaflet map components — only loaded on the client side via
// next/dynamic with ssr: false (see map-components.tsx).
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const orangeIcon = L.divIcon({
  className: "hc-map-pin",
  html: `<div style="width:28px;height:28px;background:#FF6B35;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const KESSES_CENTER: [number, number] = [0.3500, 35.4000];

export function MapPickerInner({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : KESSES_CENTER;

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height: 300 }}>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onChange={onChange} />
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            icon={orangeIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const pos = m.getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
        <RecenterMap lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], map.getZoom() < 16 ? 16 : map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

export function MapViewInner({
  lat,
  lng,
  height = 250,
}: {
  lat: number;
  lng: number;
  height?: number;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Marker position={[lat, lng]} icon={orangeIcon} />
      </MapContainer>
    </div>
  );
}
