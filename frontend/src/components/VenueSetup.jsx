import { useCallback, useState, useEffect, useRef } from 'react';
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
  Navigation,
  X,
  DoorOpen,
  Eye,
  Radio,
  Move,
  Maximize2,
  SlidersHorizontal,
  Link2,
  Crosshair
} from 'lucide-react';
import './VenueSetup.css';

const API = "http://localhost:5050";

export default function VenueSetup({ setVenueData, setZoneData, setActiveView }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState('pets2009');
  const [mapImage, setMapImage] = useState('/pets-campus-plan.svg');
  const [mapFile, setMapFile] = useState(null);
  const [venueName, setVenueName] = useState('University of Reading – Whiteknights Campus');

  // Multiple Labeled CCTV Cameras Registry
  const [cameras, setCameras] = useState([
    {
      id: 'CAM-01',
      label: 'Main Gate & Entry Turnstiles',
      sourceName: 'Campus CCTV Sequence 01',
      file: null,
      fileSize: null,
      isAiActive: true,
      status: 'LIVE'
    },
    {
      id: 'CAM-02',
      label: 'North Concourse Corridor',
      sourceName: 'Promenade Sequence 02',
      file: null,
      fileSize: null,
      isAiActive: false,
      status: 'LIVE'
    }
  ]);

  // Venue Gates & Access Points
  const [gates, setGates] = useState([
    { id: 'G1', label: 'Gate A – North Entrance', type: 'ENTRY', x: 16, y: 86 },
    { id: 'G2', label: 'Gate B – South Grand Plaza', type: 'ENTRY', x: 84, y: 86 },
    { id: 'G3', label: 'Exit 01 – West Emergency Gate', type: 'EMERGENCY', x: 50, y: 15 }
  ]);

  // Calibrated Sectors with assigned camera_id
  const [zones, setZones] = useState([
    { id: 'P1', label: 'Sector P1 – North Pathway Entry',   x: 26, y: 28, w: 22, h: 20, capacity: 15, camera_id: 'CAM-01' },
    { id: 'P2', label: 'Sector P2 – Central Promenade',     x: 52, y: 28, w: 22, h: 20, capacity: 18, camera_id: 'CAM-02' },
    { id: 'P3', label: 'Sector P3 – South Campus Junction', x: 52, y: 54, w: 22, h: 20, capacity: 20, camera_id: 'CAM-01' },
    { id: 'P4', label: 'Sector P4 – West Pavilion Quad',    x: 26, y: 54, w: 22, h: 20, capacity: 12, camera_id: 'CAM-02' },
  ]);

  // Interactive Dragging on Map Blueprint
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedGateId, setSelectedGateId] = useState(null);
  const [activeCanvasTab, setActiveCanvasTab] = useState('all'); // 'all' | 'zones' | 'gates' | 'cctv'
  const [draggingItem, setDraggingItem] = useState(null);
  const mapCanvasRef = useRef(null);

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
          
          if (vData.cameras && vData.cameras.length > 0) {
            setCameras(vData.cameras.map((c, i) => ({
              id: c.id || `CAM-0${i + 1}`,
              label: c.name || c.label || `Camera ${i + 1}`,
              sourceName: c.source || 'Active Stream',
              file: null,
              fileSize: null,
              isAiActive: i === 0,
              status: c.status || 'LIVE'
            })));
          }

          if (vData.gates && vData.gates.length > 0) {
            setGates(vData.gates);
          }

          if (vData.zones && vData.zones.length > 0) {
            setZones(vData.zones.map((z, idx) => ({
              id: z.id,
              label: z.label,
              x: Math.round(z.bbox ? z.bbox[0] * 100 : (z.x || 20)),
              y: Math.round(z.bbox ? z.bbox[1] * 100 : (z.y || 20)),
              w: Math.round(z.bbox ? (z.bbox[2] - z.bbox[0]) * 100 : (z.w || 25)),
              h: Math.round(z.bbox ? (z.bbox[3] - z.bbox[1]) * 100 : (z.h || 20)),
              capacity: z.capacity || 20,
              camera_id: z.camera_id || (vData.cameras?.[idx % (vData.cameras.length || 1)]?.id || 'CAM-01')
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
    setMapFile(file);
    const url = URL.createObjectURL(file);
    setMapImage(url);
    setActiveDatasetId('custom');
    setDeployed(false);
  }, []);

  const { getRootProps: getMapRootProps, getInputProps: getMapInputProps, isDragActive: isMapDragActive } = useDropzone({
    onDrop: onDropMap,
    accept: { 'image/*': [] },
    multiple: false,
  });

  // Switch Dataset Preset
  const handleSelectPreset = async (dsId) => {
    setIsDeploying(true);
    setActiveDatasetId(dsId);
    setMapFile(null);
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

        // Populate default preset cameras
        const presetCameras = [
          { id: 'CAM-01', label: `${active.name} – Turnstiles Cam`, sourceName: `${active.name} Primary Feed`, file: null, isAiActive: true, status: 'LIVE' },
          { id: 'CAM-02', label: `${active.name} – Concourse Link`, sourceName: `${active.name} Auxiliary Feed`, file: null, isAiActive: false, status: 'LIVE' }
        ];
        setCameras(presetCameras);

        // Populate default preset gates
        const presetGates = [
          { id: 'G1', label: 'Gate A – Main Entry', type: 'ENTRY', x: 18, y: 86 },
          { id: 'G2', label: 'Gate B – Secondary Exit', type: 'EXIT', x: 82, y: 86 }
        ];
        setGates(presetGates);

        if (active.zones) {
          const mapped = active.zones.map((z, idx) => ({
            id: z.id,
            label: z.label,
            x: Math.round(z.bbox[0] * 100),
            y: Math.round(z.bbox[1] * 100),
            w: Math.round((z.bbox[2] - z.bbox[0]) * 100),
            h: Math.round((z.bbox[3] - z.bbox[1]) * 100),
            capacity: z.capacity,
            camera_id: idx % 2 === 0 ? 'CAM-01' : 'CAM-02'
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

  // ── Multi-Camera Handlers ──
  const handleAddCamera = () => {
    const nextNum = cameras.length + 1;
    const newId = `CAM-${nextNum < 10 ? '0' + nextNum : nextNum}`;
    const newCam = {
      id: newId,
      label: `Camera ${newId} – Sector Feed`,
      sourceName: 'Upload video file below',
      file: null,
      fileSize: null,
      isAiActive: false,
      status: 'CONFIG'
    };
    setCameras(prev => [...prev, newCam]);
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleUpdateCamera = (id, field, value) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleDeleteCamera = (id) => {
    if (cameras.length <= 1) return;
    setCameras(prev => prev.filter(c => c.id !== id));
    // Reassign any zones pointing to deleted camera
    const fallbackId = cameras.find(c => c.id !== id)?.id || 'CAM-01';
    setZones(prev => prev.map(z => z.camera_id === id ? { ...z, camera_id: fallbackId } : z));
    setDeployed(false);
  };

  const handleSetAiActiveCamera = (id) => {
    setCameras(prev => prev.map(c => ({
      ...c,
      isAiActive: c.id === id
    })));
    setDeployed(false);
  };

  const handleCameraFileChange = (camId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameras(prev => prev.map(c => {
      if (c.id === camId) {
        return {
          ...c,
          file,
          sourceName: file.name,
          fileSize: (file.size / (1024 * 1024)).toFixed(1),
          status: 'READY'
        };
      }
      return c;
    }));
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleClearCameraFile = (camId) => {
    setCameras(prev => prev.map(c => {
      if (c.id === camId) {
        return {
          ...c,
          file: null,
          sourceName: 'Preset camera feed active',
          fileSize: null,
          status: 'LIVE'
        };
      }
      return c;
    }));
    setDeployed(false);
  };

  // ── Gate Handlers ──
  const handleAddGate = () => {
    const nextIdx = gates.length + 1;
    const newId = `G${nextIdx}`;
    const newGate = {
      id: newId,
      label: `Gate ${newId} – Concourse Entry`,
      type: 'ENTRY',
      x: 20 + (nextIdx * 15) % 65,
      y: 80
    };
    setGates(prev => [...prev, newGate]);
    setSelectedGateId(newId);
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleUpdateGate = (id, field, value) => {
    setGates(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleDeleteGate = (id) => {
    setGates(prev => prev.filter(g => g.id !== id));
    setDeployed(false);
  };

  // ── Sector Handlers ──
  const handleAddZone = () => {
    const nextIdx = zones.length + 1;
    const defaultCamId = cameras[nextIdx % cameras.length]?.id || 'CAM-01';
    const newZ = {
      id: `Z${nextIdx}`,
      label: `Sector Z${nextIdx} – Auxiliary Concourse`,
      x: 10 + (nextIdx * 12) % 60,
      y: 10 + (nextIdx * 10) % 60,
      w: 24,
      h: 18,
      capacity: 25,
      camera_id: defaultCamId
    };
    setZones(prev => [...prev, newZ]);
    setSelectedZoneId(newZ.id);
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  const handleDeleteZone = (id) => {
    setZones(prev => prev.filter(z => z.id !== id));
    setDeployed(false);
  };

  const handleUpdateZone = (id, field, value) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
    setActiveDatasetId('custom');
    setDeployed(false);
  };

  // ── Interactive Map Mouse Drag Handler ──
  const handleMouseDownItem = (e, type, id, mode = 'move') => {
    e.stopPropagation();
    e.preventDefault();
    if (!mapCanvasRef.current) return;

    if (type === 'zone') {
      const targetZone = zones.find(z => z.id === id);
      if (!targetZone) return;
      setDraggingItem({
        type: 'zone',
        id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origX: targetZone.x,
        origY: targetZone.y,
        origW: targetZone.w,
        origH: targetZone.h,
      });
      setSelectedZoneId(id);
    } else if (type === 'gate') {
      const targetGate = gates.find(g => g.id === id);
      if (!targetGate) return;
      setDraggingItem({
        type: 'gate',
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: targetGate.x,
        origY: targetGate.y,
      });
      setSelectedGateId(id);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingItem || !mapCanvasRef.current) return;
      const rect = mapCanvasRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - draggingItem.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - draggingItem.startY) / rect.height) * 100;

      if (draggingItem.type === 'zone') {
        if (draggingItem.mode === 'resize') {
          const newW = Math.max(8, Math.min(90, Math.round(draggingItem.origW + dxPct)));
          const newH = Math.max(8, Math.min(90, Math.round(draggingItem.origH + dyPct)));
          setZones(prev => prev.map(z => z.id === draggingItem.id ? { ...z, w: newW, h: newH } : z));
        } else {
          const newX = Math.max(0, Math.min(100 - draggingItem.origW, Math.round(draggingItem.origX + dxPct)));
          const newY = Math.max(0, Math.min(100 - draggingItem.origH, Math.round(draggingItem.origY + dyPct)));
          setZones(prev => prev.map(z => z.id === draggingItem.id ? { ...z, x: newX, y: newY } : z));
        }
        setDeployed(false);
      } else if (draggingItem.type === 'gate') {
        const newX = Math.max(2, Math.min(98, Math.round(draggingItem.origX + dxPct)));
        const newY = Math.max(2, Math.min(98, Math.round(draggingItem.origY + dyPct)));
        setGates(prev => prev.map(g => g.id === draggingItem.id ? { ...g, x: newX, y: newY } : g));
        setDeployed(false);
      }
    };

    const handleMouseUp = () => {
      if (draggingItem) setDraggingItem(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingItem]);

  // ── Deploy Calibration to Backend ──
  const handleDeploy = async () => {
    if (!venueName.trim() || zones.length === 0) return;
    setIsDeploying(true);

    try {
      // 1. Upload custom video files for each camera with uploaded media
      let primaryVideoSource = null;
      for (const cam of cameras) {
        if (cam.file) {
          const fd = new FormData();
          fd.append('video', cam.file);
          fd.append('camera_id', cam.id);
          fd.append('label', cam.label);
          const vidRes = await fetch(`${API}/api/upload/video`, { method: 'POST', body: fd });
          if (vidRes.ok) {
            const vidData = await vidRes.json();
            if (cam.isAiActive || !primaryVideoSource) {
              primaryVideoSource = vidData.video_path;
            }
          }
        }
      }

      // 2. Upload custom ground map blueprint if provided
      let finalMapUrl = mapImage;
      if (mapFile) {
        const fd = new FormData();
        fd.append('map', mapFile);
        const mapRes = await fetch(`${API}/api/upload/map`, { method: 'POST', body: fd });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          if (mapData.map_url) {
            finalMapUrl = mapData.map_url.startsWith('http') ? mapData.map_url : `${API}${mapData.map_url}`;
            setMapImage(finalMapUrl);
          }
        }
      }

      // 3. Calibrate venue name, map image, cameras, gates, and zones in backend AI engine
      const payload = {
        venue_name: venueName,
        map_image: finalMapUrl,
        video_source: primaryVideoSource || undefined,
        cameras: cameras.map(c => ({
          id: c.id,
          name: c.label,
          status: c.status,
          source: c.sourceName,
          is_ai_active: c.isAiActive
        })),
        gates: gates.map(g => ({
          id: g.id,
          name: g.label,
          type: g.type,
          x: g.x,
          y: g.y
        })),
        zones: zones.map(z => ({
          id: z.id,
          label: z.label,
          capacity: Number(z.capacity) || 20,
          camera_id: z.camera_id || cameras[0]?.id || 'CAM-01',
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
        setVenueData?.({ name: venueName, mapImage: finalMapUrl });
        setZoneData?.(zones);
        setDeployed(true);
        setToastMsg(`Synchronized ${zones.length} sectors, ${cameras.length} CCTV cameras, and ${gates.length} gates with AI pipeline!`);
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
        </div>
      </div>

      {/* ── Main Setup Grid ── */}
      <div className="setup-body">
        {/* Left Column: Side Section Calibration Management */}
        <div className="setup-left">
          {/* Card 1: Venue Details */}
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

          {/* Card 2: Ground Map Blueprint Upload */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <h2 className="section-title">Venue Ground Map</h2>
              <span className="chip-badge">{mapFile ? 'Custom Blueprint' : 'Floor Plan'}</span>
            </div>
            <div
              {...getMapRootProps()}
              className={`dropzone ${isMapDragActive ? 'drag-active' : ''}`}
            >
              <input {...getMapInputProps()} />
              {mapFile ? (
                <div className="drop-preview">
                  <div className="drop-check-icon">
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="drop-preview-title truncate">{mapFile.name}</div>
                    <div className="drop-preview-sub">{(mapFile.size / 1024).toFixed(0)} KB · Custom Map Ready</div>
                  </div>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMapFile(null);
                      setMapImage(
                        activeDatasetId === 'shanghaitech'
                          ? '/shanghaitech-map.svg'
                          : activeDatasetId === 'crowd_default'
                          ? '/sample-floorplan.svg'
                          : '/pets-campus-plan.svg'
                      );
                      setDeployed(false);
                    }}
                    title="Reset to preset blueprint"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : mapImage ? (
                <div className="drop-preview">
                  <div className="drop-check-icon">
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="drop-preview-title">Floorplan blueprint active</div>
                    <div className="drop-preview-sub">Drag new SVG/PNG/JPG to replace</div>
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

          {/* Card 3: Multiple Labeled CCTV Video Feeds */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <div>
                <h2 className="section-title">CCTV Video Feeds ({cameras.length})</h2>
                <span className="field-hint">Upload or link multiple labeled camera footages</span>
              </div>
              <button
                type="button"
                className="btn-add-sector"
                onClick={handleAddCamera}
                title="Add new CCTV camera feed"
              >
                <Plus size={13} />
                <span>Add Camera</span>
              </button>
            </div>

            <div className="vs-cctv-list">
              {cameras.map((c) => (
                <div key={c.id} className={`vs-cam-item ${c.isAiActive ? 'is-active-cam' : ''}`}>
                  <div className="vs-cam-top-row">
                    <div className="flex items-center gap-2">
                      <span className="cam-badge-id">{c.id}</span>
                      <span className={`cam-status-dot ${c.file ? 'ready' : 'live'}`} />
                      <span className="cam-status-label">{c.file ? 'Ready to Sync' : c.status}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={`btn-cam-pill ${c.isAiActive ? 'active' : ''}`}
                        onClick={() => handleSetAiActiveCamera(c.id)}
                        title="Set as active stream for real-time neural crowd estimation"
                      >
                        <Radio size={11} />
                        <span>{c.isAiActive ? 'AI Stream Active' : 'Make AI Primary'}</span>
                      </button>

                      {cameras.length > 1 && (
                        <button
                          type="button"
                          className="btn-del-sector"
                          onClick={() => handleDeleteCamera(c.id)}
                          title="Remove camera"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Camera Label Input */}
                  <div className="mt-2">
                    <label className="cam-label-tag">Camera Label &amp; Location:</label>
                    <input
                      className="cam-label-input"
                      value={c.label}
                      onChange={(e) => handleUpdateCamera(c.id, 'label', e.target.value)}
                      placeholder="e.g. Turnstile Gate A - Concourse"
                    />
                  </div>

                  {/* Camera Source / Upload Box */}
                  <div className="mt-2">
                    {c.file ? (
                      <div className="cam-file-preview">
                        <Video size={14} className="text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <div className="cam-file-name truncate">{c.file.name}</div>
                          <div className="cam-file-meta">{c.fileSize} MB · Custom Upload</div>
                        </div>
                        <button
                          type="button"
                          className="text-zinc-400 hover:text-red-400 p-1"
                          onClick={() => handleClearCameraFile(c.id)}
                          title="Remove custom video footage"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="cam-upload-prompt">
                        <label className="btn-cam-upload" htmlFor={`cam-file-${c.id}`}>
                          <UploadCloud size={13} />
                          <span>Upload Footage (MP4/AVI)</span>
                          <input
                            id={`cam-file-${c.id}`}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleCameraFileChange(c.id, e)}
                          />
                        </label>
                        <span className="cam-source-hint truncate">{c.sourceName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Venue Gates & Access Points */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <div>
                <h2 className="section-title">Venue Access Gates ({gates.length})</h2>
                <span className="field-hint">Mark gates &amp; drag them on the map blueprint</span>
              </div>
              <button
                type="button"
                className="btn-add-sector"
                onClick={handleAddGate}
                title="Mark new access gate"
              >
                <Plus size={13} />
                <span>Add Gate</span>
              </button>
            </div>

            <div className="vs-gates-list">
              {gates.map((g) => (
                <div
                  key={g.id}
                  className={`vs-gate-item ${selectedGateId === g.id ? 'is-selected-gate' : ''}`}
                  onClick={() => setSelectedGateId(g.id)}
                >
                  <div className="vs-gate-main-row">
                    <div className="gate-id-tag">
                      <DoorOpen size={12} />
                      <span>{g.id}</span>
                    </div>
                    <input
                      className="gate-name-input"
                      value={g.label}
                      onChange={(e) => handleUpdateGate(g.id, 'label', e.target.value)}
                      placeholder="e.g. Gate A – North Entrance"
                    />
                    <select
                      className="gate-type-select"
                      value={g.type}
                      onChange={(e) => handleUpdateGate(g.id, 'type', e.target.value)}
                    >
                      <option value="ENTRY">Entry</option>
                      <option value="EXIT">Exit</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="TURNSTILE">Turnstile</option>
                    </select>
                    {gates.length > 1 && (
                      <button
                        type="button"
                        className="btn-del-sector"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGate(g.id);
                        }}
                        title="Delete Gate"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="gate-pos-row">
                    <span className="gate-pos-pill">X: {g.x}% · Y: {g.y}%</span>
                    <span className="gate-drag-tip">Drag directly on map to position</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Calibrated Sectors & Camera Coverage Linkage */}
          <div className="app-card setup-card">
            <div className="card-header-flex">
              <div>
                <h2 className="section-title">Calibrated Sectors ({zones.length})</h2>
                <span className="field-hint">Link which labeled CCTV camera covers each sector</span>
              </div>
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
              {zones.map((z) => (
                <div
                  key={z.id}
                  className={`vs-sector-row ${selectedZoneId === z.id ? 'is-selected-zone' : ''}`}
                  onClick={() => setSelectedZoneId(z.id)}
                >
                  <div className="sector-pill-id">{z.id}</div>
                  <div className="sector-row-fields">
                    <input
                      className="sector-name-input"
                      value={z.label}
                      onChange={(e) => handleUpdateZone(z.id, 'label', e.target.value)}
                      placeholder="Sector Label"
                    />

                    <div className="sector-meta-grid">
                      {/* CCTV Camera Coverage Link */}
                      <div className="sector-cam-assign">
                        <span className="cap-label">Covered by CCTV:</span>
                        <select
                          className="sector-cam-select"
                          value={z.camera_id || cameras[0]?.id || 'CAM-01'}
                          onChange={(e) => handleUpdateZone(z.id, 'camera_id', e.target.value)}
                        >
                          {cameras.map((cam) => (
                            <option key={cam.id} value={cam.id}>
                              {cam.id} · {cam.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Capacity */}
                      <div className="sector-cap-wrap">
                        <span className="cap-label">Cap:</span>
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

                    <div className="sector-coords-hint">
                      Bounds: {z.x}%, {z.y}% · Size: {z.w}×{z.h}% · (Drag or resize on map)
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-del-sector"
                    title="Delete Sector"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteZone(z.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Spatial Map & Coverage Frustum Visualizer */}
        <div className="app-card map-canvas-card">
          <div className="card-row">
            <div>
              <h2 className="section-title">Ground Map &amp; CCTV Coverage Frustum</h2>
              <span className="hint-text">
                Drag sectors to calibrate coverage; drag gates to position access doors. Sightlines connect labeled CCTV feeds to each sector.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="zone-count-chip">
                {zones.length} Sectors Calibrated
              </div>
              <div className="cam-count-chip">
                {cameras.length} CCTV Cameras
              </div>
              <div className="gate-count-chip">
                {gates.length} Gates
              </div>
            </div>
          </div>

          {/* Mode Toolbar */}
          <div className="map-toolbar">
            <div className="map-toolbar-group">
              <button
                type="button"
                className={`map-tb-btn ${activeCanvasTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCanvasTab('all')}
              >
                <Layers size={13} />
                <span>All Overlays</span>
              </button>
              <button
                type="button"
                className={`map-tb-btn ${activeCanvasTab === 'zones' ? 'active' : ''}`}
                onClick={() => setActiveCanvasTab('zones')}
              >
                <Crosshair size={13} />
                <span>Sectors Only</span>
              </button>
              <button
                type="button"
                className={`map-tb-btn ${activeCanvasTab === 'gates' ? 'active' : ''}`}
                onClick={() => setActiveCanvasTab('gates')}
              >
                <DoorOpen size={13} />
                <span>Gates Only</span>
              </button>
              <button
                type="button"
                className={`map-tb-btn ${activeCanvasTab === 'cctv' ? 'active' : ''}`}
                onClick={() => setActiveCanvasTab('cctv')}
              >
                <Video size={13} />
                <span>CCTV Sightlines</span>
              </button>
            </div>

            <div className="map-toolbar-hint">
              <Move size={12} />
              <span>Interactive: Drag any sector or gate directly on the blueprint</span>
            </div>
          </div>

          {/* Interactive Calibration Canvas */}
          <div className="map-canvas" ref={mapCanvasRef}>
            <div className="canvas-grid-bg" />

            {mapImage ? (
              <>
                <img src={mapImage} alt="Venue Map Blueprint" className="map-img select-none pointer-events-none" />

                {/* Gates Overlay */}
                {(activeCanvasTab === 'all' || activeCanvasTab === 'gates') && gates.map((g) => {
                  const isSelected = selectedGateId === g.id;
                  return (
                    <div
                      key={g.id}
                      className={`map-gate-marker ${isSelected ? 'is-selected' : ''} type-${g.type.toLowerCase()}`}
                      style={{
                        left: `${g.x}%`,
                        top: `${g.y}%`,
                      }}
                      onMouseDown={(e) => handleMouseDownItem(e, 'gate', g.id)}
                      title={`Drag to reposition ${g.label}`}
                    >
                      <div className="gate-marker-pin">
                        <DoorOpen size={13} />
                      </div>
                      <div className="gate-marker-pill">
                        <span className="gate-pill-id">{g.id}</span>
                        <span className="gate-pill-label">{g.label}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Calibrated Sectors Overlay */}
                {(activeCanvasTab === 'all' || activeCanvasTab === 'zones' || activeCanvasTab === 'cctv') && zones.map((z) => {
                  const isSelected = selectedZoneId === z.id;
                  const matchedCam = cameras.find(c => c.id === z.camera_id) || cameras[0];

                  return (
                    <div
                      key={z.id}
                      className={`zone-overlay-calibrated ${isSelected ? 'is-selected-zone-box' : ''}`}
                      style={{
                        left: `${z.x}%`,
                        top: `${z.y}%`,
                        width: `${z.w}%`,
                        height: `${z.h}%`,
                      }}
                      onMouseDown={(e) => handleMouseDownItem(e, 'zone', z.id, 'move')}
                      title="Drag to move sector; drag corner grip to resize"
                    >
                      {/* Zone Header */}
                      <div className="calib-zone-header">
                        <span className="calib-zone-id">{z.id}</span>
                        <span className="calib-zone-cap">Cap: {z.capacity}</span>
                      </div>

                      {/* Zone Label */}
                      <div className="calib-zone-label">{z.label}</div>

                      {/* Camera Coverage Badge */}
                      <div className="calib-cam-badge">
                        <Video size={10} className="text-indigo-400" />
                        <span className="truncate">
                          {matchedCam ? `${matchedCam.id} · ${matchedCam.label}` : (z.camera_id || 'CAM-01')}
                        </span>
                      </div>

                      {/* CCTV Coverage Frustum Sightline Handle */}
                      {(activeCanvasTab === 'all' || activeCanvasTab === 'cctv') && (
                        <div className="calib-cctv-cone" title={`Camera Sightline: ${matchedCam?.label || 'CCTV'}`}>
                          <div className="cctv-cone-apex">
                            <Radio size={11} className="text-cyan-400" />
                          </div>
                          <div className="cctv-cone-field" />
                        </div>
                      )}

                      {/* Resize Handle */}
                      <div
                        className="calib-reticle-handle"
                        onMouseDown={(e) => handleMouseDownItem(e, 'zone', z.id, 'resize')}
                        title="Click & drag to resize sector boundaries"
                      >
                        <Maximize2 size={10} />
                      </div>
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
                <span>Multi-camera CCTV calibration active &amp; streaming to neural engine</span>
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
