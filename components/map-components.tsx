"use client";

// Public map components — wraps the Leaflet-dependent inner components with
// next/dynamic + ssr: false so they only load on the client side.
// Also exports the Google Maps link button (no Leaflet needed).

import dynamic from "next/dynamic";

// Lazy-load the Leaflet components (ssr: false prevents the "window is not
// defined" error during server-side rendering).
const MapPickerInner = dynamic(() => import("./map-inner").then((m) => m.MapPickerInner), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-border bg-muted/30 animate-pulse" style={{ height: 300 }} />,
});

const MapViewInner = dynamic(() => import("./map-inner").then((m) => m.MapViewInner), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-border bg-muted/30 animate-pulse" style={{ height: 250 }} />,
});

export function MapPicker(props: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }) {
  return <MapPickerInner {...props} />;
}

export function MapView(props: { lat: number; lng: number; height?: number }) {
  return <MapViewInner {...props} />;
}

// Opens Google Maps with the coordinates (for navigation on the operator's phone).
export function OpenInGoogleMapsButton({ lat, lng }: { lat: number; lng: number }) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-orange-brand hover:underline font-medium"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      Open in Google Maps
    </a>
  );
}
