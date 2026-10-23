import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './VenueSetup.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import StarBorder from './react-bits/StarBorder.jsx';

const SAMPLE_ZONES = [
  { id: 'main-stage',   label: 'Main Stage',     x: 45, y: 30, w: 20, h: 15, color: 'red'    },
  { id: 'food-court',   label: 'Food Court',      x: 15, y: 55, w: 25, h: 20, color: 'yellow' },
  { id: 'entry-gate-a', label: 'Entry Gate A',    x: 5,  y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'entry-gate-b', label: 'Entry Gate B',    x: 78, y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'merch-zone',   label: 'Merch & Exhibits', x: 70, y: 30, w: 20, h: 20, color: 'green' },
];

const ZONE_COLOR_MAP = {
  red:    { bg: 'rgba(255, 59, 92, 0.22)',   border: '#ff3b5c', label: '#ff8ca0' },
  yellow: { bg: 'rgba(255, 193, 7, 0.22)',   border: '#ffc107', label: '#ffe082' },
  green:  { bg: 'rgba(0, 255, 136, 0.22)',   border: '#00ff88', label: '#99ffcf' },
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

  const loadDemoMap = () => {
    setMapImage('/sample-floorplan.svg');
    if (!venueName.trim()) setVenueName('TechTrix 2026 – Hall A');
    setSaved(false);
  };

  return (
    <div className="venue-setup">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <ShinyText text="Venue Setup" speed={3.5} />
          </h1>
          <p className="page-sub">Upload your venue floor plan and define crowd zones</p>
        </div>
        <div className="header-actions">
          {saved ? (
            <button
              id="save-venue-btn"
              className="btn-saved"
              onClick={handleSave}
            >
              <span className="saved-icon">✓</span> Saved &amp; Live
            </button>
          ) : (
            <StarBorder
              id="save-venue-btn"
              onClick={handleSave}
              className={(!mapImage || !venueName.trim()) ? 'btn-disabled' : ''}
              color="var(--color-indigo-ink-300)"
            >
              <span>💾 Save &amp; Activate</span>
            </StarBorder>
          )}
        </div>
      </header>

      <div className="setup-body">
        {/* Left panel */}
        <div className="setup-left">
          <SpotlightCard className="setup-card" spotlightColor="rgba(142, 126, 231, 0.15)">
            <h3 className="card-title">Event Details</h3>
            <label className="field-label" htmlFor="venue-name-input">Venue / Event Name</label>
            <input
              id="venue-name-input"
              className="field-input"
              placeholder="e.g. TechTrix 2026 – Hall A"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </SpotlightCard>

          <SpotlightCard className="setup-card" spotlightColor="rgba(104, 84, 222, 0.15)">
            <h3 className="card-title">Upload Floor Plan</h3>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`} id="map-dropzone">
              <input {...getInputProps()} />
              {mapImage ? (
                <div className="drop-preview">
                  <span className="drop-check">✓</span>
                  <div>
                    <div className="drop-preview-title">Floor plan loaded</div>
                    <div className="drop-preview-sub">Click or drag a new image to replace</div>
                  </div>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <div className="drop-icon-badge">🗺️</div>
                  <span className="drop-text">Drop your venue map here</span>
                  <span className="drop-hint">PNG, JPG, SVG supported</span>
                  <button
                    type="button"
                    className="btn-load-demo"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadDemoMap();
                    }}
                  >
                    ⚡ Load Demo Blueprint
                  </button>
                </div>
              )}
            </div>
          </SpotlightCard>

          <SpotlightCard className="setup-card" spotlightColor="rgba(0, 255, 136, 0.12)">
            <h3 className="card-title">Zone Legend</h3>
            <div className="legend">
              {[
                ['red', 'Critical Alert', 'Evacuate or redirect crowd flow'],
                ['yellow', 'Moderate Density', 'Approaching capacity, monitor closely'],
                ['green', 'Clear & Optimal', 'Normal traffic flow below limits'],
              ].map(([c, title, desc]) => (
                <div key={c} className="legend-row">
                  <span className={`legend-dot dot-${c}`} />
                  <div>
                    <div className="legend-label" style={{ color: ZONE_COLOR_MAP[c].label }}>
                      {title}
                    </div>
                    <div className="legend-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

        {/* Right — map canvas */}
        <SpotlightCard className="setup-card map-canvas-card" spotlightColor="rgba(54, 87, 252, 0.15)">
          <div className="card-row">
            <div>
              <h3 className="card-title">Floor Plan Preview</h3>
              <span className="hint-text">Interactive zone matrix — click any zone to cycle its status</span>
            </div>
            <div className="zone-count-chip">
              {zones.length} Zones Defined
            </div>
          </div>

          <div className="map-canvas">
            <div className="canvas-grid-bg" />
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
                        left: `${z.x}%`,
                        top: `${z.y}%`,
                        width: `${z.w}%`,
                        height: `${z.h}%`,
                        background: c.bg,
                        borderColor: c.border,
                      }}
                      onClick={() => cycleColor(z.id)}
                      title={`${z.label} — click to change status`}
                    >
                      <span className="zone-indicator-pulse" style={{ background: c.border }} />
                      <span className="zone-label" style={{ color: c.label }}>{z.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="canvas-empty">
                <div className="canvas-empty-icon">🗺️</div>
                <div className="canvas-empty-title">Upload a floor plan to preview zones</div>
                <p className="canvas-empty-sub">Once uploaded, you can calibrate sensors and monitor live attendee density</p>
              </div>
            )}
          </div>

          {saved && (
            <div className="canvas-footer-banner">
              <span className="banner-msg">✓ Venue configuration synchronized</span>
              <button
                className="btn-nav-next"
                onClick={() => setActiveView('zones')}
              >
                Go to Zone Monitor →
              </button>
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
