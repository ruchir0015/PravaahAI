import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Map.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import DecryptedText from './react-bits/DecryptedText.jsx';

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
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox access token is missing. Please set map_token in .env');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [coords.lng, coords.lat],
      zoom: coords.zoom,
      attributionControl: false,
    });

    map.on('load', () => {
      setMapLoaded(true);

      // Add a stylish pulse marker for the main venue
      const el = document.createElement('div');
      el.className = 'geo-venue-marker';
      el.innerHTML = `
        <div class="geo-marker-pulse"></div>
        <div class="geo-marker-pin">⚡</div>
      `;

      new mapboxgl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="color: #09061e; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600;">
              <strong>${venueData?.name || 'TechTrix 2026 Venue'}</strong><br/>
              <span>Main Operations Sector</span>
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
          <h1 className="page-title">
            <ShinyText text="Geo GIS & Perimeter Radar" speed={3.5} />
          </h1>
          <p className="page-sub">
            Global positioning telemetry &amp; external venue perimeter surveillance
          </p>
        </div>
        <div className="geo-status-badge">
          <span className="gps-live-dot" />
          <span>SATELLITE LOCK ACQUIRED</span>
        </div>
      </header>

      <div className="geo-map-body">
        {/* Main Map Canvas */}
        <SpotlightCard className="geo-map-card" spotlightColor="rgba(54, 87, 252, 0.15)">
          <div className="map-container" ref={mapContainer} />

          {/* Floating Telemetry HUD */}
          <div className="geo-floating-hud">
            <div className="hud-metric">
              <span className="hud-label">LATITUDE</span>
              <span className="hud-val">
                <DecryptedText text={`${coords.lat.toFixed(4)}° N`} speed={20} />
              </span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">LONGITUDE</span>
              <span className="hud-val">
                <DecryptedText text={`${coords.lng.toFixed(4)}° E`} speed={20} />
              </span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">ZOOM LEVEL</span>
              <span className="hud-val">{coords.zoom.toFixed(1)}x</span>
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <span className="hud-label">STYLE</span>
              <span className="hud-val" style={{ color: 'var(--color-onyx-500)' }}>DARK V11</span>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
