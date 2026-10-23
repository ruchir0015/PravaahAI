import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './VenueSetup.css';

const SAMPLE_ZONES = [
  { id: 'main-stage',   label: 'Main Stage',     x: 45, y: 30, w: 20, h: 15, color: 'red'    },
  { id: 'food-court',   label: 'Food Court',      x: 15, y: 55, w: 25, h: 20, color: 'yellow' },
  { id: 'entry-gate-a', label: 'Entry Gate A',    x: 5,  y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'entry-gate-b', label: 'Entry Gate B',    x: 78, y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'merch-zone',   label: 'Merch & Exhibits', x: 70, y: 30, w: 20, h: 20, color: 'green' },
];

const ZONE_COLOR_MAP = {
  red:    { bg: 'rgba(239,68,68,0.25)',    border: '#ef4444', label: '#fca5a5' },
  yellow: { bg: 'rgba(234,179,8,0.25)',    border: '#eab308', label: '#fde047' },
  green:  { bg: 'rgba(34,197,94,0.25)',    border: '#22c55e', label: '#86efac' },
};

export default function VenueSetup({ setVenueData, setZoneData, setActiveView }) {
  const [mapImage, setMapImage] = useState(null);
  const [venueName, setVenueName] = useState('');
  const [zones, setZones] = useState(SAMPLE_ZONES);
  const [saved, setSaved] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMapImage(url);
    setSaved(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handleSave = () => {
    if (!mapImage || !venueName.trim()) return;
    setVenueData({ name: venueName, mapImage });
    setZoneData(zones);
    setSaved(true);
  };

  const cycleColor = (id) => {
    const ORDER = ['green', 'yellow', 'red'];
    setZones((prev) =>
      prev.map((z) =>
        z.id === id ? { ...z, color: ORDER[(ORDER.indexOf(z.color) + 1) % 3] } : z
      )
    );
  };

  return (
    <div className="venue-setup">
      <header className="page-header">
        <div>
          <h1 className="page-title">Venue Setup</h1>
          <p className="page-sub">Upload your venue floor plan and define crowd zones</p>
        </div>
        <button
          id="save-venue-btn"
          className={`btn-primary ${(!mapImage || !venueName.trim()) ? 'disabled' : ''}`}
          onClick={handleSave}
          disabled={!mapImage || !venueName.trim()}
        >
          {saved ? '✅ Saved' : '💾 Save & Activate'}
        </button>
      </header>

      <div className="setup-body">
        {/* Left panel */}
        <div className="setup-left">
          <div className="card">
            <h3 className="card-title">Event Details</h3>
            <label className="field-label">Venue / Event Name</label>
            <input
              id="venue-name-input"
              className="field-input"
              placeholder="e.g. TechTrix 2026 – Hall A"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>

          <div className="card">
            <h3 className="card-title">Upload Floor Plan</h3>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`} id="map-dropzone">
              <input {...getInputProps()} />
              {mapImage ? (
                <div className="drop-preview">
                  <span className="drop-check">✅</span>
                  <span>Map uploaded — drag a new one to replace</span>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <span className="drop-icon">🗺️</span>
                  <span className="drop-text">Drop your venue map here</span>
                  <span className="drop-hint">PNG, JPG, SVG supported</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Zone Legend</h3>
            <div className="legend">
              {[['red','🔴','Critical — Evacuate / Redirect'],['yellow','🟡','Moderate — Monitor Closely'],['green','🟢','Clear — Normal Flow']].map(([c,e,d]) => (
                <div key={c} className="legend-row">
                  <span>{e}</span>
                  <div>
                    <div className="legend-label" style={{ color: ZONE_COLOR_MAP[c].label }}>{c.charAt(0).toUpperCase()+c.slice(1)}</div>
                    <div className="legend-desc">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — map canvas */}
        <div className="card map-canvas-card">
          <div className="card-row">
            <h3 className="card-title">Floor Plan Preview</h3>
            <span className="hint-text">Click a zone to cycle its status</span>
          </div>
          <div className="map-canvas">
            {mapImage ? (
              <>
                <img src={mapImage} alt="Venue map" className="map-img" />
                {zones.map((z) => {
                  const c = ZONE_COLOR_MAP[z.color];
                  return (
                    <button
                      key={z.id}
                      id={`zone-${z.id}`}
                      className="zone-overlay"
                      style={{
                        left: `${z.x}%`, top: `${z.y}%`,
                        width: `${z.w}%`, height: `${z.h}%`,
                        background: c.bg,
                        border: `2px solid ${c.border}`,
                      }}
                      onClick={() => cycleColor(z.id)}
                      title={`${z.label} — click to change status`}
                    >
                      <span className="zone-label" style={{ color: c.label }}>{z.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="canvas-empty">
                <span style={{ fontSize: 48 }}>🗺️</span>
                <span>Upload a floor plan to preview zones</span>
              </div>
            )}
          </div>
          {saved && (
            <button
              className="btn-secondary mt-8"
              onClick={() => setActiveView('zones')}
            >
              Go to Zone Monitor →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
