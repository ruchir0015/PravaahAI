import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import TechText from './TechText';
import './Map.css';

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAP_TOKEN ||
  import.meta.env.map_token ||
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.MAP_TOKEN ||
  '';

export default function Map({ venueData }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const [coords, setCoords] = useState({ lng: 77.1025, lat: 28.7041, zoom: 12 });

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox access token is missing. Please set map_token in .env');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [coords.lng, coords.lat],
      zoom: coords.zoom,
      attributionControl: false,
    });

    map.on('load', () => {
      const el = document.createElement('div');
      el.className = 'geo-venue-marker';
      el.innerHTML = `
        <div class="geo-marker-pin">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      new mapboxgl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="color: #0d082b; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; padding: 4px;">
              <strong>${venueData?.name || 'TechTrix 2026 Venue'}</strong><br/>
              <span style="color: #3c5d57; font-size: 11px;">Main Operations Sector</span>
            </div>
          `)
        )
        .addTo(map);
    });

    map.on('move', () => {
      const center = map.getCenter();
      setCoords({
        lng: center.lng,
        lat: center.lat,
        zoom: map.getZoom(),
      });
    });

    mapInstance.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('error', (event) => {
      console.error('Mapbox error:', event.error);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [venueData]);

  return (
    <div className="geo-map-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Geo GIS &amp; Perimeter Radar</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text="Global positioning telemetry & perimeter radar"
              fontWeight={600}
              fontSize={15}
              align="left"
              color="#1b1056"
              accentColor="#4329d6"
              reveal="off"
              selection={false}
              labels={false}
              specks={0}
              sweep={false}
              clickKick
              draggable
              guides={false}
            />
          </div>
        </div>
        <div className="geo-status-badge">
          <span className="gps-live-dot" />
          <span>SATELLITE LOCK ACQUIRED</span>
        </div>
      </header>

      <div className="geo-map-body">
        <div className="app-card geo-map-card">
          <div className="map-container" ref={mapContainer} />

          <div className="geo-floating-hud">
            <div className="hud-metric">
              <span className="hud-label">LATITUDE</span>
              <span className="hud-val">{coords.lat.toFixed(4)}° N</span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">LONGITUDE</span>
              <span className="hud-val">{coords.lng.toFixed(4)}° E</span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">ZOOM LEVEL</span>
              <span className="hud-val">{coords.zoom.toFixed(1)}x</span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">STYLE</span>
              <span className="hud-val hud-style-tag">LIGHT V11</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
