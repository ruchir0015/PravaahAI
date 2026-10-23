import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  Check,
  Save,
  Image as ImageIcon,
  ArrowRight,
  Video,
  Layers,
  Sparkles,
  Sliders,
  Plus,
  Trash2,
  Cpu,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Compass,
  Navigation
} from 'lucide-react';
import './VenueSetup.css';

const API = "http://localhost:5050";

const ZONE_COLOR_MAP = {
  red:    { bg: 'var(--danger-bg)',   border: 'var(--danger-solid)', label: 'var(--danger-text)' },
  yellow: { bg: 'var(--warning-bg)',  border: 'var(--warning-solid)', label: 'var(--warning-text)' },
  green:  { bg: 'var(--success-bg)',  border: 'var(--success-solid)', label: 'var(--success-text)' },
};

export default function VenueSetup({ setVenueData, setZoneData, setActiveView }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState('pets2009');
  const [mapImage, setMapImage] = useState('/pets-campus-plan.svg');
  const [venueName, setVenueName] = useState('University of Reading – Whiteknights Campus');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [zones, setZones] = useState([
    { id: 'P1', label: 'Sector P1 – North Pathway Entry',   x: 26, y: 28, w: 22, h: 20, capacity: 15, color: 'green' },
    { id: 'P2', label: 'Sector P2 – Central Promenade',     x: 52, y: 28, w: 22, h: 20, capacity: 18, color: 'yellow' },
    { id: 'P3', label: 'Sector P3 – South Campus Junction', x: 52, y: 54, w: 22, h: 20, capacity: 20, color: 'red' },
    { id: 'P4', label: 'Sector P4 – West Pavilion Quad',    x: 26, y: 54, w: 22, h: 20, capacity: 12, color: 'green' },
  ]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Fetch current backend venue and dataset presets
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [dsRes, venueRes] = await Promise.all([
          fetch(`${API}/api/datasets`),
          fetch(`${API}/api/venue/current`)
        ]);
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          setDatasets(dsData.datasets || []);
          setActiveDatasetId(dsData.active_id || 'pets2009');
        }
        if (venueRes.ok) {
          const vData = await venueRes.json();
          setVenueName(vData.venue_name || 'University of Reading – Whiteknights Campus');
          setMapImage(vData.map_image || '/pets-campus-plan.svg');
          if (vData.zones && vData.zones.length > 0) {
            setZones(vData.zones.map(z => ({
              id: z.id,
              label: z.label,
              x: Math.round(z.bbox ? z.bbox[0] * 100 : (z.x || 20)),
              y: Math.round(z.bbox ? z.bbox[1] * 100 : (z.y || 20)),
              w: Math.round(z.bbox ? (z.bbox[2] - z.bbox[0]) * 100 : (z.w || 25)),
              h: Math.round(z.bbox ? (z.bbox[3] - z.bbox[1]) * 100 : (z.h || 20)),
              capacity: z.capacity || 20,
              color: 'green'
            })));
          }
        }
      } catch (e) {
        console.warn('Backend not responding yet; using local defaults', e);
      }
    }
    loadBackendData();
  }, []);

  // Map Image Dropzone
  const onDropMap = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMapImage(url);
    setDeployed(false);
  }, []);

  const { getRootProps: getMapRootProps, getInputProps: getMapInputProps, isDragActive: isMapDragActive } = useDropzone({
    onDrop: onDropMap,
    accept: { 'image/*': [] },
    multiple: false,
  });

  // Video Dropzone
  const onDropVideo = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setActiveDatasetId('custom');
    setDeployed(false);
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onDropVideo,
    accept: { 'video/*': [] },
    multiple: false,
  });

  // Switch Dataset Preset
  const handleSelectPreset = async (dsId) => {
    setIsDeploying(true);
    setActiveDatasetId(dsId);
    try {
      const res = await fetch(`${API}/api/dataset/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: dsId })
      });
      if (res.ok) {
        const data = await res.json();
        const active = data.active_dataset;
        setVenueName(active.venue_name);
        setMapImage(active.map_image);
        if (active.zones) {
          const mapped = active.zones.map(z => ({
            id: z.id,
            label: z.label,
            x: Math.round(z.bbox[0] * 100),
            y: Math.round(z.bbox[1] * 100),
            w: Math.round((z.bbox[2] - z.bbox[0]) * 100),
            h: Math.round((z.bbox[3] - z.bbox[1]) * 100),
            capacity: z.capacity,
            color: 'green'
          }));
          setZones(mapped);
          setZoneData?.(mapped);
        }
        setVenueData?.({ name: active.venue_name, mapImage: active.map_image });
        setDeployed(true);
        setToastMsg(`Switched to ${active.name}! Live AI pipeline updated.`);
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e) {
      console.error('Preset switch failed:', e);
    } finally {
      setIsDeploying(false);
    }
  };

  // Add Custom Zone
  const handleAddZone = () => {
    const nextIdx = zones.length + 1;
    const newZ = {
      id: `Z${nextIdx}`,
      label: `Sector Z${nextIdx} – Auxiliary Concourse`,
      x: 10 + (nextIdx * 12) % 60,
      y: 10 + (nextIdx * 10) % 60,
      w: 24,
      h: 18,
      capacity: 25,
      color: 'green'
    };
    setZones(prev => [...prev, newZ]);
    setDeployed(false);
  };

  const handleDeleteZone = (id) => {
    setZones(prev => prev.filter(z => z.id !== id));
    setDeployed(false);
  };

  const handleUpdateZone = (id, field, value) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
    setDeployed(false);
  };

  // Deploy Calibration to Backend
  const handleDeploy = async () => {
    if (!venueName.trim() || zones.length === 0) return;
    setIsDeploying(true);

    try {
      // 1. If custom video provided, upload it first
      if (videoFile) {
        const fd = new FormData();
        fd.append('video', videoFile);
        await fetch(`${API}/api/upload/video`, { method: 'POST', body: fd });
      }

      // 2. Calibrate venue & zones
      const payload = {
        venue_name: venueName,
        map_image: mapImage,
        zones: zones.map(z => ({
          id: z.id,
          label: z.label,
          capacity: Number(z.capacity) || 20,
          bbox: [
            z.x / 100.0,
            z.y / 100.0,
            Math.min(1.0, (z.x + z.w) / 100.0),
            Math.min(1.0, (z.y + z.h) / 100.0)
          ]
        }))
      };

      const calRes = await fetch(`${API}/api/venue/calibrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (calRes.ok) {
        setVenueData?.({ name: venueName, mapImage });
        setZoneData?.(zones);
        setDeployed(true);
        setToastMsg(`Successfully deployed ${zones.length} sectors to real-time AI density pipeline!`);
        setTimeout(() => setToastMsg(null), 6000);
      }
    } catch (e) {
      console.error('Calibration error:', e);
      setToastMsg('Error synchronizing with backend AI service.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="venue-setup">
      {/* ── Minimal Classy Header ── */}
      <header className="page-header">
        <div>
          <h1 className="vs-main-title">Fairgrounds &amp; Camera Calibration</h1>
          <p className="vs-page-subtitle">Venue floorplan blueprint, camera coverage zones, and pedestrian route setup</p>
        </div>

        <div className="header-actions">
          <button
            id="deploy-venue-btn"
            type="button"
            className={`btn-save-action ${deployed ? 'is-deployed' : ''}`}
            disabled={isDeploying || !venueName.trim()}
            onClick={handleDeploy}
          >
            {isDeploying ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Synchronizing AI...</span>
              </>
            ) : deployed ? (
              <>
                <Check size={15} strokeWidth={2.5} />
                <span>Deployed &amp; Live</span>
              </>
            ) : (
              <>
                <Sparkles size={15} strokeWidth={2} />
                <span>Deploy to AI Engine</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Deployment Notification Toast */}
      {toastMsg && (
        <div className="vs-toast-banner">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="vs-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* ── Preset Venues Bar ── */}
      <div className="vs-preset-bar">
        <div className="vs-preset-title">
          <Layers size={13} />
          <span>PRESET VENUES &amp; LAYOUTS</span>
        </div>
        <div className="vs-preset-chips">
          <button
            type="button"
            className={`vs-preset-btn ${activeDatasetId === 'pets2009' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('pets2009')}
          >
            <Compass size={18} className="preset-card-icon" />
            <div>
              <div className="preset-name">Campus Grounds</div>
              <div className="preset-sub">University Quad &amp; Fairgrounds</div>
            </div>
          </button>

          <button
            type="button"
            className={`vs-preset-btn ${activeDatasetId === 'shanghaitech' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('shanghaitech')}
          >
            <Navigation size={18} className="preset-card-icon" />
            <div>
              <div className="preset-name">Urban Concourse</div>
              <div className="preset-sub">Pedestrian Corridor &amp; Entry Gates</div>
            </div>
          </button>

          <button
            type="button"
            className={`vs-preset-btn ${activeDatasetId === 'crowd_default' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('crowd_default')}
          >
            <Layers size={18} className="preset-card-icon" />
            <div>
              <div className="preset-name">Festival Concourse</div>
              <div className="preset-sub">Main Exhibition Arena</div>
            </div>
          </button>

          <button
            type="button"
            className={`vs-preset-btn ${activeDatasetId === 'custom' ? 'active' : ''}`}
            onClick={() => {
              setActiveDatasetId('custom');
              setDeployed(false);
            }}
          >
            <UploadCloud size={18} className="preset-card-icon" />
            <div>
              <div className="preset-name">Custom Venue &amp; Map</div>
              <div className="preset-sub">Upload your own camera footage &amp; layout</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Main Setup Grid ── */}
      <div className="setup-body">
        {/* Left Column: Uploads & Calibrated Sectors */}
        <div className="setup-left">
          {/* Venue & Source Details */}
          <div className="app-card setup-card">
            <h2 className="section-title">Venue Details</h2>
            <label className="field-label" htmlFor="venue-name-input">Venue / Campus Name</label>
            <input
              id="venue-name-input"
              className="field-input"
              placeholder="e.g. University of Reading Campus"
              value={venueName}
              onChange={(e) => {
                setVenueName(e.target.value);
                setDeployed(false);
              }}
            />
          </div>

          {/* Upload CCTV Footage */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <h2 className="section-title">Camera Feed Source</h2>
              <span className="chip-badge">Live Source</span>
            </div>
            <div
              {...getVideoRootProps()}
              className={`dropzone ${isVideoDragActive ? 'drag-active' : ''}`}
            >
              <input {...getVideoInputProps()} />
              {videoFile ? (
                <div className="drop-preview">
                  <div className="drop-check-icon">
                    <Video size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="drop-preview-title">{videoFile.name}</div>
                    <div className="drop-preview-sub">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for processing</div>
                  </div>
                </div>
              ) : activeDatasetId === 'pets2009' ? (
                <div className="drop-placeholder">
                  <Video size={22} className="ds-source-icon" />
                  <span className="drop-text">Campus CCTV Feed Active</span>
                  <span className="drop-hint">Real-time camera sequence</span>
                </div>
              ) : activeDatasetId === 'shanghaitech' ? (
                <div className="drop-placeholder">
                  <Video size={22} className="ds-source-icon" />
                  <span className="drop-text">Concourse CCTV Feed Active</span>
                  <span className="drop-hint">Real-time street sequence</span>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <UploadCloud size={24} strokeWidth={1.75} />
                  <span className="drop-text">Drop video file here</span>
                  <span className="drop-hint">MP4, AVI, MKV supported</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Map Floorplan */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <h2 className="section-title">Venue Ground Map</h2>
              <span className="chip-badge">Floor Plan</span>
            </div>
            <div
              {...getMapRootProps()}
              className={`dropzone ${isMapDragActive ? 'drag-active' : ''}`}
            >
              <input {...getMapInputProps()} />
              {mapImage ? (
                <div className="drop-preview">
                  <div className="drop-check-icon">
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="drop-preview-title">Map blueprint active</div>
                    <div className="drop-preview-sub">Click or drag a new map to replace</div>
                  </div>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <UploadCloud size={24} strokeWidth={1.75} />
                  <span className="drop-text">Drop ground map or blueprint here</span>
                  <span className="drop-hint">SVG, PNG, JPG supported</span>
                </div>
              )}
            </div>
          </div>

          {/* Sector Calibration List */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <h2 className="section-title">Calibrated Sectors ({zones.length})</h2>
              <button
                type="button"
                className="btn-add-sector"
                onClick={handleAddZone}
              >
                <Plus size={13} />
                <span>Add Sector</span>
              </button>
            </div>
            <div className="vs-sectors-list">
              {zones.map((z, idx) => (
                <div key={z.id} className="vs-sector-row">
                  <div className="sector-pill-id">{z.id}</div>
                  <div className="sector-row-fields">
                    <input
                      className="sector-name-input"
                      value={z.label}
                      onChange={(e) => handleUpdateZone(z.id, 'label', e.target.value)}
                      placeholder="Sector Label"
                    />
                    <div className="sector-cap-wrap">
                      <span className="cap-label">Capacity:</span>
                      <input
                        type="number"
                        className="sector-cap-input"
                        value={z.capacity}
                        onChange={(e) => handleUpdateZone(z.id, 'capacity', e.target.value)}
                        min={1}
                        max={1000}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-del-sector"
                    title="Delete Sector"
                    onClick={() => handleDeleteZone(z.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Spatial Map & Coverage Visualizer */}
        <div className="app-card map-canvas-card">
          <div className="card-row">
            <div>
              <h2 className="section-title">Ground Map &amp; CCTV Coverage Frustum</h2>
              <span className="hint-text">Calibrated camera coverage boundaries and crowd flow sectors</span>
            </div>
            <div className="zone-count-chip">
              {zones.length} Sectors Calibrated
            </div>
          </div>

          <div className="map-canvas">
            <div className="canvas-grid-bg" />
            {mapImage ? (
              <>
                <img src={mapImage} alt="Venue Map" className="map-img" />
                {zones.map((z) => {
                  return (
                    <div
                      key={z.id}
                      className="zone-overlay-calibrated"
                      style={{
                        left: `${z.x}%`,
                        top: `${z.y}%`,
                        width: `${z.w}%`,
                        height: `${z.h}%`,
                      }}
                    >
                      <div className="calib-zone-header">
                        <span className="calib-zone-id">{z.id}</span>
                        <span className="calib-zone-cap">Cap: {z.capacity}</span>
                      </div>
                      <div className="calib-zone-label">{z.label}</div>
                      <div className="calib-reticle-handle" />
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="canvas-empty">
                <ImageIcon className="canvas-empty-icon" size={44} strokeWidth={1.5} />
                <div className="canvas-empty-title">Select a dataset preset or upload a map</div>
                <p className="canvas-empty-sub">Once calibrated, real-time spatial density and RED/YELLOW/GREEN zones will populate dynamically.</p>
              </div>
            )}
          </div>

          {deployed && (
            <div className="canvas-footer-banner">
              <span className="banner-msg">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Configuration active &amp; streaming to neural engine</span>
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveView('dashboard')}
              >
                <span>Open AI Command Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
