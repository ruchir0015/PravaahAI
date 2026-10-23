import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  Check,
  Save,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import TechText from './TechText';
import './VenueSetup.css';

const SAMPLE_ZONES = [
  { id: 'main-stage',   label: 'Main Stage',      x: 45, y: 30, w: 20, h: 15, color: 'red'    },
  { id: 'food-court',   label: 'Food Court',       x: 15, y: 55, w: 25, h: 20, color: 'yellow' },
  { id: 'entry-gate-a', label: 'Entry Gate A',     x: 5,  y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'entry-gate-b', label: 'Entry Gate B',     x: 78, y: 80, w: 15, h: 10, color: 'green'  },
  { id: 'merch-zone',   label: 'Merch & Exhibits', x: 70, y: 30, w: 20, h: 20, color: 'green'  },
];

const ZONE_COLOR_MAP = {
  red:    { bg: 'var(--danger-bg)',   border: 'var(--danger-solid)', label: 'var(--danger-text)' },
  yellow: { bg: 'var(--warning-bg)',  border: 'var(--warning-solid)', label: 'var(--warning-text)' },
  green:  { bg: 'var(--success-bg)',  border: 'var(--success-solid)', label: 'var(--success-text)' },
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

  const isSaveDisabled = !mapImage || !venueName.trim();

  return (
    <div className="venue-setup">
      <header className="page-header">
        <div>
          <h1 className="page-title">Venue Setup</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text="Upload venue floor plan & calibrate crowd sectors"
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
        <div className="header-actions">
          {saved ? (
            <button
              id="save-venue-btn"
              type="button"
              className="btn-saved-badge"
              onClick={handleSave}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Saved &amp; Active</span>
            </button>
          ) : (
            <button
              id="save-venue-btn"
              type="button"
              className="btn-save-action"
              disabled={isSaveDisabled}
              onClick={handleSave}
            >
              <Save size={16} strokeWidth={2} />
              <span>Save &amp; Activate</span>
            </button>
          )}
        </div>
      </header>

      <div className="setup-body">
        <div className="setup-left">
          <div className="app-card setup-card">
            <h2 className="section-title">Event Details</h2>
            <label className="field-label" htmlFor="venue-name-input">Venue / Event Name</label>
            <input
              id="venue-name-input"
              className="field-input"
              placeholder="e.g. TechTrix 2026 – Hall A"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>

          <div className="app-card setup-card">
            <h2 className="section-title">Upload Floor Plan</h2>
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
              id="map-dropzone"
            >
              <input {...getInputProps()} />
              {mapImage ? (
                <div className="drop-preview">
                  <div className="drop-check-icon">
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="drop-preview-title">Floor plan loaded</div>
                    <div className="drop-preview-sub">Click or drag a new image to replace</div>
                  </div>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <div className="drop-icon-box">
                    <UploadCloud size={24} strokeWidth={1.75} />
                  </div>
                  <span className="drop-text">Drop your venue map here</span>
                  <span className="drop-hint">PNG, JPG, SVG supported</span>
                  <button
                    type="button"
                    className="btn-secondary btn-demo-load"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadDemoMap();
                    }}
                  >
                    <FileText size={15} />
                    <span>Load Demo Blueprint</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="app-card setup-card">
            <h2 className="section-title">Zone Legend</h2>
            <div className="legend">
              {[
                { c: 'red', title: 'Critical Alert', desc: 'Evacuate or redirect crowd flow' },
                { c: 'yellow', title: 'Moderate Density', desc: 'Approaching capacity, monitor closely' },
                { c: 'green', title: 'Clear & Optimal', desc: 'Normal traffic flow below limits' },
              ].map(({ c, title, desc }) => (
                <div key={c} className="legend-row">
                  <span className={`legend-dot dot-${c}`} />
                  <div className="legend-info">
                    <div className="legend-label">{title}</div>
                    <div className="legend-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="app-card map-canvas-card">
          <div className="card-row">
            <div>
              <h2 className="section-title">Floor Plan Preview</h2>
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
                      type="button"
                      id={`zone-${z.id}`}
                      className="zone-overlay"
                      style={{
                        left: `${z.x}%`,
                        top: `${z.y}%`,
                        width: `${z.w}%`,
                        height: `${z.h}%`,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                        color: c.label,
                      }}
                      onClick={() => cycleColor(z.id)}
                      title={`${z.label} — click to change status`}
                    >
                      <span className="zone-dot-marker" style={{ backgroundColor: c.border }} />
                      <span className="zone-label">{z.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="canvas-empty">
                <ImageIcon className="canvas-empty-icon" size={44} strokeWidth={1.5} />
                <div className="canvas-empty-title">Upload a floor plan to preview zones</div>
                <p className="canvas-empty-sub">Once uploaded, you can calibrate sensors and monitor live attendee density</p>
              </div>
            )}
          </div>

          {saved && (
            <div className="canvas-footer-banner">
              <span className="banner-msg">Venue configuration synchronized</span>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveView('zones')}
              >
                <span>Go to Zone Monitor</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
