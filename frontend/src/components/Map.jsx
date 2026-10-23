
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Map.css';

const MAPBOX_TOKEN = 'token here';

export default function Map() {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [77.1025, 28.7041],
      zoom: 12,
    });

    mapInstance.current = map;

    map.addControl(new mapboxgl.NavigationControl());

    map.on('error', (event) => {
      console.error('Mapbox error:', event.error);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return <div className="map-container" ref={mapContainer} />;
}
