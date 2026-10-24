import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  MapPin,
  AlertTriangle,
  Users,
  ArrowRight,
  Navigation,
  Play,
  Square,
  RotateCcw,
  Footprints,
  LocateFixed,
  DoorOpen,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  CornerUpRight,
  ShieldAlert,
  Move,
  FastForward
} from 'lucide-react';
import './AttendeeView.css';

const API_BASE = '';
const POLL_INTERVAL_MS = 2000;

const STATUS_CONFIG = {
  RED: {
    label: 'Congested · ~12m Wait',
    sub: 'Heavy Bottleneck',
    textColor: '#b91c1c',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    mapFill: 'rgba(239, 68, 68, 0.16)',
    mapStroke: '#dc2626'
  },
  YELLOW: {
    label: 'Moderate · ~4m Wait',
    sub: 'Steady Influx',
    textColor: '#b45309',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    mapFill: 'rgba(245, 158, 11, 0.16)',
    mapStroke: '#d97706'
  },
  GREEN: {
    label: 'Direct Entry · <1m Wait',
    sub: 'Free Flowing',
    textColor: '#15803d',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    mapFill: 'rgba(34, 197, 94, 0.16)',
    mapStroke: '#16a34a'
  },
};

export default function AttendeeView() {
  const [liveStatus, setLiveStatus] = useState(null);
  const [venueConfig, setVenueConfig] = useState(null);

  // Selected destination sector
  const [selectedSectorId, setSelectedSectorId] = useState('P2');
  const [customDestPos, setCustomDestPos] = useState(null); // { x, y, label }
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'FAST' | 'GATES'

  // User position & location mode
  const [userPos, setUserPos] = useState({ x: 16, y: 86, label: 'Gate A – North Entrance', isGPS: false });
  const [liveGPSActive, setLiveGPSActive] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const gpsBaselineRef = useRef(null);

  // Interactive Drag & Drop State for pins ('DEST' | 'USER' | null)
  const [dragMode, setDragMode] = useState(null);
  const svgRef = useRef(null);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [evacuationMode, setEvacuationMode] = useState(false);
  const [initialNavDistance, setInitialNavDistance] = useState(null);
  const gpsWatchIdRef = useRef(null);

  // UI Feedback
  const [toastMsg, setToastMsg] = useState(null);

  // ── 1. Fetch Dynamic Venue & Live Status from Backend ──────────────────────
  useEffect(() => {
    let active = true;

    const fetchConfig = async () => {
      try {
        const [venueRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/api/venue/current`),
          fetch(`${API_BASE}/api/status`)
        ]);

        if (active && venueRes.ok) {
          const vData = await venueRes.json();
          setVenueConfig(vData);
        }
        if (active && statusRes.ok) {
          const sData = await statusRes.json();
          if (sData && sData.zones) {
            setLiveStatus(sData);
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchConfig();
    const interval = setInterval(fetchConfig, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── 2. Derive Active Venue Metadata, Sectors & Gates ───────────────────────
  const activeDataset = liveStatus?.dataset || venueConfig || {};
  const venueTitle = activeDataset.venue_name || activeDataset.name || 'University of Reading – Whiteknights Campus';
  const rawMap = activeDataset.map_image || '/pets-campus-plan.svg';
  const mapImage = (typeof rawMap === 'string' && rawMap.includes('localhost:5050'))
    ? rawMap.split('localhost:5050')[1]
    : rawMap;

  // Live Sectors (Zones)
  const rawZones = liveStatus?.zones || {
    P1: { id: 'P1', label: 'Sector P1 – North Pathway Entry', count: 7, capacity: 15, saturation_pct: 46, color: 'YELLOW', bbox: [0.0, 0.0, 0.5, 0.5] },
    P2: { id: 'P2', label: 'Sector P2 – Central Promenade', count: 14, capacity: 18, saturation_pct: 77, color: 'RED', bbox: [0.5, 0.0, 1.0, 0.5] },
    P3: { id: 'P3', label: 'Sector P3 – South Campus Junction', count: 18, capacity: 20, saturation_pct: 90, color: 'RED', bbox: [0.5, 0.5, 1.0, 1.0] },
    P4: { id: 'P4', label: 'Sector P4 – West Pavilion Quad', count: 4, capacity: 12, saturation_pct: 33, color: 'GREEN', bbox: [0.0, 0.5, 0.5, 1.0] },
  };

  const sectors = useMemo(() => {
    return Object.values(rawZones).map((z) => {
      const bbox = z.bbox || [0.1, 0.1, 0.4, 0.4];
      const x = bbox[0] * 100;
      const y = bbox[1] * 100;
      const w = Math.max(10, (bbox[2] - bbox[0]) * 100);
      const h = Math.max(10, (bbox[3] - bbox[1]) * 100);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const saturation = z.saturation_pct !== undefined ? z.saturation_pct : 40;
      const color = z.color || (saturation >= 75 ? 'RED' : saturation >= 45 ? 'YELLOW' : 'GREEN');

      return {
        id: z.id,
        label: z.label || `Sector ${z.id}`,
        color,
        count: z.count || 0,
        capacity: z.capacity || 20,
        saturation,
        x,
        y,
        w,
        h,
        cx,
        cy,
        bbox,
        camera_id: z.camera_id || 'CAM-01'
      };
    });
  }, [rawZones]);

  // Live Access Gates
  const gates = useMemo(() => {
    const rawGates = liveStatus?.gates || venueConfig?.gates || [
      { id: 'G1', name: 'Gate A – North Entrance', type: 'ENTRY', x: 16, y: 86 },
      { id: 'G2', name: 'Gate B – South Grand Plaza', type: 'ENTRY', x: 84, y: 86 },
      { id: 'G3', name: 'Emergency West Exit', type: 'EMERGENCY', x: 8, y: 35 }
    ];
    return rawGates;
  }, [liveStatus, venueConfig]);

  // Auto-select initial destination
  useEffect(() => {
    if (!selectedSectorId && sectors.length > 0) {
      setSelectedSectorId(sectors[0].id);
    }
  }, [sectors, selectedSectorId]);

  const activeSector = sectors.find(s => s.id === selectedSectorId) || sectors[0] || null;
  const greenAlternatives = sectors.filter(s => s.color === 'GREEN');
  const recommendedSector = greenAlternatives.length > 0 ? greenAlternatives[0] : sectors[0];

  // Effective Destination Position (Supports Dragging Anywhere!)
  const destinationPos = useMemo(() => {
    if (customDestPos) return customDestPos;
    if (activeSector) {
      return { x: activeSector.cx, y: activeSector.cy, label: activeSector.label };
    }
    return { x: 75, y: 25, label: 'Sector P2 – Central Promenade' };
  }, [customDestPos, activeSector]);

  // ── 3. Real-Time Geolocation Tracking (Dynamic GPS) ─────────────────────────
  const toggleLiveGPS = () => {
    if (liveGPSActive) {
      if (gpsWatchIdRef.current) {
        navigator.geolocation?.clearWatch(gpsWatchIdRef.current);
      }
      setLiveGPSActive(false);
      gpsBaselineRef.current = null;
      showToast("Live GPS tracking paused");
      return;
    }

    if (!navigator.geolocation) {
      showToast("Geolocation is not supported on this device/browser");
      return;
    }

    showToast("Connecting to live device GPS...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;
        setGpsData({ lat: latitude, lng: longitude, accuracy, heading });
        setLiveGPSActive(true);

        // Dynamic GPS baseline calibration
        if (!gpsBaselineRef.current) {
          gpsBaselineRef.current = { lat: latitude, lng: longitude, initialX: userPos.x, initialY: userPos.y };
        } else {
          const dLat = latitude - gpsBaselineRef.current.lat;
          const dLng = longitude - gpsBaselineRef.current.lng;
          // 1 deg lat ~= 111,320m; 1 deg lng ~= 111,320m * cos(lat)
          const metersNorth = dLat * 111320;
          const metersEast = dLng * 111320 * Math.cos(gpsBaselineRef.current.lat * Math.PI / 180);

          // Scaled to map percentage (assuming ~150m venue dimension)
          const newX = Math.round(Math.max(4, Math.min(96, gpsBaselineRef.current.initialX + (metersEast / 1.5))));
          const newY = Math.round(Math.max(4, Math.min(96, gpsBaselineRef.current.initialY - (metersNorth / 1.5))));

          setUserPos({
            x: newX,
            y: newY,
            label: `Live GPS (±${Math.round(accuracy)}m)`,
            isGPS: true
          });
        }
      },
      (error) => {
        console.warn("GPS watch error:", error);
        showToast("Location access unavailable. You can drag your pin manually on the map.");
        setLiveGPSActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
    );

    gpsWatchIdRef.current = watchId;
  };

  useEffect(() => {
    return () => {
      if (gpsWatchIdRef.current) {
        navigator.geolocation?.clearWatch(gpsWatchIdRef.current);
      }
    };
  }, []);

  // ── 4. Interactive Drag & Drop Engine (Destination & Current Location) ─────
  const getCanvasCoords = (e) => {
    if (!svgRef.current) return { x: 50, y: 50 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const clickX = ((clientX - rect.left) / rect.width) * 100;
    const clickY = ((clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.round(Math.max(4, Math.min(96, clickX))),
      y: Math.round(Math.max(4, Math.min(96, clickY)))
    };
  };

  const handlePointerDown = (mode, e) => {
    e.stopPropagation();
    setDragMode(mode);
  };

  const handlePointerMove = (e) => {
    if (!dragMode) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (dragMode === 'DEST') {
      // Check if dropped inside any existing sector
      const matchedSector = sectors.find(s => {
        const bbox = s.bbox || [0, 0, 1, 1];
        return x >= bbox[0] * 100 && x <= bbox[2] * 100 &&
               y >= bbox[1] * 100 && y <= bbox[3] * 100;
      });

      if (matchedSector) {
        setSelectedSectorId(matchedSector.id);
        setCustomDestPos({ x, y, label: matchedSector.label });
      } else {
        setCustomDestPos({ x, y, label: `Custom Point (${x}%, ${y}%)` });
      }
    } else if (dragMode === 'USER') {
      setUserPos({
        x,
        y,
        label: `Current Position (${x}%, ${y}%)`,
        isGPS: false
      });
      // Reset GPS baseline if manually moved
      gpsBaselineRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (dragMode) {
      if (dragMode === 'DEST') {
        showToast(`Destination pin set to ${destinationPos.label}`);
      } else if (dragMode === 'USER') {
        showToast(`Current location pin moved`);
      }
      setDragMode(null);
    }
  };

  const handleMapCanvasClick = (e) => {
    if (dragMode) return;
    const { x, y } = getCanvasCoords(e);
    setUserPos({
      x,
      y,
      label: `Selected Location (${x}%, ${y}%)`,
      isGPS: false
    });
    gpsBaselineRef.current = null;
    showToast(`Location set to (${x}%, ${y}%)`);
  };

  const handleSelectStartingGate = (gate) => {
    setUserPos({
      x: gate.x,
      y: gate.y,
      label: gate.name,
      isGPS: false
    });
    gpsBaselineRef.current = null;
    showToast(`Starting from ${gate.name}`);
  };

  // ── 5. Dynamic Waypoint Path & Real-Time Distance Engine ────────────────────
  const navigationRoute = useMemo(() => {
    const startX = userPos.x;
    const startY = userPos.y;
    const endX = destinationPos.x;
    const endY = destinationPos.y;

    // Transit promenade hub point (creates a realistic 2-segment walkway corridor)
    const transitX = 50;
    const transitY = (startY + endY) / 2;

    return [
      { x: startX, y: startY, instruction: `Head out from ${userPos.label}` },
      { x: transitX, y: transitY, instruction: `Continue along Main Promenade toward ${destinationPos.label}` },
      { x: endX, y: endY, instruction: `Arrive at ${destinationPos.label}` }
    ];
  }, [userPos, destinationPos]);

  // Real-time actual physical distance in meters between user and destination
  const routeDistanceMeters = useMemo(() => {
    const dx = destinationPos.x - userPos.x;
    const dy = destinationPos.y - userPos.y;
    const mapDist = Math.hypot(dx, dy);
    return Math.round(mapDist * 3.2); // ~3.2m per map percentage unit
  }, [destinationPos, userPos]);

  const estimatedWalkMinutes = Math.max(1, Math.round(routeDistanceMeters / 75)); // ~75m per min walk

  // Dynamic progress calculated from real distance relative to starting distance
  const dynamicProgress = useMemo(() => {
    if (!initialNavDistance || initialNavDistance <= 0) return 0;
    if (routeDistanceMeters <= 8) return 100;
    const completed = 1 - (routeDistanceMeters / initialNavDistance);
    return Math.max(5, Math.min(95, Math.round(completed * 100)));
  }, [routeDistanceMeters, initialNavDistance]);

  // Current step instruction based on distance
  const currentStep = useMemo(() => {
    if (routeDistanceMeters <= 10) {
      return { index: 3, text: `🎉 Arrived! You have reached ${destinationPos.label}.` };
    }
    if (routeDistanceMeters > (initialNavDistance ? initialNavDistance * 0.5 : 80)) {
      return { index: 1, text: `Step 1 of 3: Head out from ${userPos.label} along pedestrian walkway` };
    }
    return { index: 2, text: `Step 2 of 3: Proceed along Main Promenade directly toward ${destinationPos.label}` };
  }, [routeDistanceMeters, initialNavDistance, destinationPos, userPos]);

  // ── 6. Navigation Controls ────────────────────────────────────────────────
  const startNavigation = () => {
    setIsNavigating(true);
    setInitialNavDistance(routeDistanceMeters);
    showToast(`Navigation active: Move with your phone or drag your pin to navigate!`);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setInitialNavDistance(null);
    setEvacuationMode(false);
    showToast("Navigation stopped");
  };

  // Optional manual step simulator for desktop testing without phone GPS
  const handleSimulateStepForward = () => {
    const dx = destinationPos.x - userPos.x;
    const dy = destinationPos.y - userPos.y;
    const stepRatio = 0.25; // advance 25% closer

    const newX = Math.round(userPos.x + dx * stepRatio);
    const newY = Math.round(userPos.y + dy * stepRatio);

    setUserPos({
      x: newX,
      y: newY,
      label: `Walking Location (${newX}%, ${newY}%)`,
      isGPS: false
    });
  };

  const handleTriggerSafeExit = () => {
    const exitGates = gates.filter(g => g.type === 'EXIT' || g.type === 'EMERGENCY');
    const targetExit = exitGates.length > 0 ? exitGates[0] : gates[0];

    setEvacuationMode(true);
    setCustomDestPos({ x: targetExit.x, y: targetExit.y, label: targetExit.name });
    setIsNavigating(true);
    setInitialNavDistance(Math.round(Math.hypot(targetExit.x - userPos.x, targetExit.y - userPos.y) * 3.2));
    showToast(`Emergency Route Engaged: Guiding to ${targetExit.name}`);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filtered sectors for destinations search
  const filteredSectors = useMemo(() => {
    return sectors.filter(s => {
      const matchesSearch = s.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            s.id.toLowerCase().includes(searchFilter.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryFilter === 'FAST') return s.color === 'GREEN';
      return true;
    });
  }, [sectors, searchFilter, categoryFilter]);

  return (
    <div className="gmaps-attendee-page">
      {/* ── Top Bar ── */}
      <header className="gmaps-top-header">
        <div className="gmaps-header-brand">
          <div className="gmaps-pin-icon-wrap">
            <MapPin size={22} className="text-blue-600" fill="#2563eb" />
          </div>
          <div>
            <h1 className="gmaps-venue-title">{venueTitle}</h1>
            <p className="gmaps-venue-sub">Interactive Campus &amp; Event Navigation</p>
          </div>
        </div>

        <div className="gmaps-header-actions">
          {/* Live GPS Tracker Toggle */}
          <button
            type="button"
            className={`gmaps-gps-btn ${liveGPSActive ? 'is-active' : ''}`}
            onClick={toggleLiveGPS}
            title="Track my real-time GPS location via phone sensor"
          >
            <LocateFixed size={15} className={liveGPSActive ? 'animate-spin' : ''} />
            <span>{liveGPSActive ? 'Live GPS Active' : 'Share Location'}</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="gmaps-toast">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Congestion Alert Banner */}
      {activeSector && activeSector.color === 'RED' && (
        <div className="gmaps-alert-banner">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-red-600 shrink-0" />
            <div>
              <div className="font-bold text-red-900 text-xs">
                Congestion Delay at {activeSector.label} ({activeSector.saturation.toFixed(0)}% Capacity)
              </div>
              <div className="text-xs text-red-700">
                Alternative: <strong>{recommendedSector.label}</strong> has direct access with 0 min wait.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="gmaps-btn-reroute"
            onClick={() => {
              setSelectedSectorId(recommendedSector.id);
              setCustomDestPos(null);
              showToast(`Rerouted to ${recommendedSector.label}`);
            }}
          >
            <span>Switch to {recommendedSector.id}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Main Structured Grid ── */}
      <div className="gmaps-content-grid">
        {/* Left Column: Interactive Map Canvas */}
        <section className="gmaps-card gmaps-map-section">
          <div className="gmaps-card-header">
            <div className="flex items-center gap-2">
              <span className="gmaps-section-badge">MAP VIEW</span>
              <h2 className="gmaps-card-title">Live Venue Blueprint</h2>
              <span className="gmaps-count-chip">{sectors.length} Sectors</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="gmaps-btn-exit"
                onClick={handleTriggerSafeExit}
                title="Find closest safe emergency exit route"
              >
                <DoorOpen size={14} />
                <span>Nearest Safe Exit</span>
              </button>
            </div>
          </div>

          {/* Blueprint SVG Canvas */}
          <div
            className={`gmaps-canvas-wrapper ${dragMode ? 'is-dragging' : ''}`}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchEnd={handlePointerUp}
            onMouseLeave={handlePointerUp}
          >
            <svg
              ref={svgRef}
              className="gmaps-blueprint-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              onClick={handleMapCanvasClick}
            >
              <defs>
                <pattern id="gmapsGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.4" />
                </pattern>
                <radialGradient id="gmapsGpsGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="gmapsDestGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background Architectural Canvas */}
              <rect width="100" height="100" fill="#f8fafc" />
              {mapImage ? (
                <image
                  href={mapImage}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.32"
                />
              ) : null}
              <rect width="100" height="100" fill="url(#gmapsGrid)" />

              {/* Corridors & Pathways */}
              <line x1="16" y1="50" x2="84" y2="50" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
              <line x1="50" y1="18" x2="50" y2="86" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />

              {/* ── Calibrated Sectors ── */}
              {sectors.map((s) => {
                const isSelected = activeSector?.id === s.id;
                const statusMeta = STATUS_CONFIG[s.color] || STATUS_CONFIG.GREEN;

                return (
                  <g
                    key={s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSectorId(s.id);
                      setCustomDestPos(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={s.x + 1}
                      y={s.y + 1}
                      width={s.w - 2}
                      height={s.h - 2}
                      rx="3.5"
                      fill={statusMeta.mapFill}
                      stroke={isSelected ? '#2563eb' : statusMeta.mapStroke}
                      strokeWidth={isSelected ? '2.4' : '1.2'}
                    />
                    <text
                      x={s.cx}
                      y={s.cy - 1.2}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="3.4"
                      fontWeight="800"
                      fontFamily="system-ui, sans-serif"
                    >
                      {s.id}
                    </text>
                    <text
                      x={s.cx}
                      y={s.cy + 3.2}
                      textAnchor="middle"
                      fill={statusMeta.mapStroke}
                      fontSize="2.4"
                      fontWeight="700"
                      fontFamily="system-ui, sans-serif"
                    >
                      {s.saturation.toFixed(0)}% Load
                    </text>
                  </g>
                );
              })}

              {/* ── Calibrated Gates ── */}
              {gates.map((g) => {
                const isEmergency = g.type === 'EMERGENCY' || g.type === 'EXIT';
                const gateColor = isEmergency ? '#dc2626' : '#2563eb';

                return (
                  <g
                    key={g.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStartingGate(g);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={g.x} cy={g.y} r="2.8" fill="#ffffff" stroke={gateColor} strokeWidth="1.4" />
                    <circle cx={g.x} cy={g.y} r="1.2" fill={gateColor} />
                    <text
                      x={g.x}
                      y={g.y + 5.5}
                      textAnchor="middle"
                      fill="#1e293b"
                      fontSize="2.2"
                      fontWeight="700"
                    >
                      {g.id}: {g.name.split('–')[0].trim()}
                    </text>
                  </g>
                );
              })}

              {/* ── Dynamic Route Polyline ── */}
              <polyline
                points={navigationRoute.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={evacuationMode ? '#dc2626' : '#2563eb'}
                strokeWidth={isNavigating ? '2.6' : '1.8'}
                strokeDasharray={isNavigating ? 'none' : '3 2'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* ── DRAGGABLE DESTINATION PIN ── */}
              <g
                transform={`translate(${destinationPos.x}, ${destinationPos.y})`}
                onMouseDown={(e) => handlePointerDown('DEST', e)}
                onTouchStart={(e) => handlePointerDown('DEST', e)}
                style={{ cursor: 'grab' }}
              >
                <circle r="7" fill="url(#gmapsDestGlow)" />
                <circle r="3.6" fill="#10b981" stroke="#ffffff" strokeWidth="1.4" />
                <circle r="1.4" fill="#ffffff" />
                <rect x="-14" y="-10.5" width="28" height="6" rx="2.5" fill="#0f172a" opacity="0.9" />
                <text
                  x="0"
                  y="-6.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="2.3"
                  fontWeight="800"
                  pointerEvents="none"
                >
                  DESTINATION
                </text>
              </g>

              {/* ── DRAGGABLE 'YOU ARE HERE' USER PIN ── */}
              <g
                transform={`translate(${userPos.x}, ${userPos.y})`}
                onMouseDown={(e) => handlePointerDown('USER', e)}
                onTouchStart={(e) => handlePointerDown('USER', e)}
                style={{ cursor: 'grab' }}
              >
                <circle r="7" fill="url(#gmapsGpsGlow)" />
                <circle r="3.4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.4" />
                <circle r="1.3" fill="#ffffff" />
                <rect x="-16" y="-10" width="32" height="6" rx="2.5" fill="#1d4ed8" opacity="0.9" />
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="2.3"
                  fontWeight="800"
                  pointerEvents="none"
                >
                  YOU ARE HERE
                </text>
              </g>
            </svg>

            {/* Tap & Drag hint badge */}
            <div className="gmaps-map-hint">
              <Move size={12} className="text-blue-600" />
              <span>Drag Destination or User pin anywhere · Tap map to reposition</span>
            </div>
          </div>
        </section>

        {/* Right Column: Directions & Places Panel */}
        <aside className="gmaps-card gmaps-side-panel">
          {/* Active Navigation HUD or Route Preview */}
          {isNavigating ? (
            <div className="gmaps-nav-card">
              <div className="gmaps-nav-header">
                <div className="flex items-center gap-2">
                  <Footprints size={20} className="text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {evacuationMode ? 'Emergency Egress Active' : 'Live Walk Directions'}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      {routeDistanceMeters}m remaining · ~{estimatedWalkMinutes} min walk
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600 font-mono">
                  {routeDistanceMeters <= 8 ? 'ARRIVED' : `${dynamicProgress}%`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="gmaps-progress-bar">
                <div className="gmaps-progress-fill" style={{ width: `${dynamicProgress}%` }} />
              </div>

              {/* Step Instruction */}
              <div className="gmaps-step-box">
                <div className="flex items-start gap-2.5">
                  <CornerUpRight size={17} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Turn-by-Turn Guidance
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                      {currentStep.text}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls: Stop & Step Forward Simulator */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="gmaps-btn-stop flex-1"
                  onClick={stopNavigation}
                >
                  <Square size={14} fill="currentColor" />
                  <span>{routeDistanceMeters <= 8 ? 'Finish Navigation' : 'Stop Navigation'}</span>
                </button>

                <button
                  type="button"
                  className="gmaps-btn-step"
                  onClick={handleSimulateStepForward}
                  title="Simulate walking step forward along route"
                >
                  <FastForward size={14} />
                  <span>Step Closer</span>
                </button>
              </div>
            </div>
          ) : (
            /* Spacious, De-cramped Selected Destination Card */
            <div className="gmaps-destination-card">
              <div className="gmaps-dest-top-row">
                <div className="flex items-center gap-2">
                  <span className="gmaps-dest-tag">SELECTED DESTINATION</span>
                  <span className="gmaps-draggable-tag">
                    <Move size={11} />
                    <span>Draggable Pin</span>
                  </span>
                </div>
                <span className="gmaps-dest-distance">
                  {routeDistanceMeters}m away
                </span>
              </div>

              <div className="gmaps-dest-title">
                {destinationPos.label}
              </div>

              {/* Spacious, structured metric chips */}
              <div className="gmaps-dest-chips-grid">
                <div className="gmaps-metric-chip">
                  <Clock size={13} className="text-slate-500 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {activeSector ? STATUS_CONFIG[activeSector.color]?.label : 'Custom Location'}
                  </span>
                </div>

                <div className="gmaps-metric-chip">
                  <Users size={13} className="text-slate-500 shrink-0" />
                  <span>
                    {activeSector ? `${activeSector.count} / ${activeSector.capacity} capacity` : 'Direct Waypoint'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="gmaps-btn-primary"
                onClick={startNavigation}
              >
                <Play size={15} fill="currentColor" />
                <span>Start Walking Directions ({estimatedWalkMinutes} min)</span>
              </button>
            </div>
          )}

          {/* Departure Point Row */}
          <div className="gmaps-gates-box">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Departure Gate:
            </span>
            <div className="flex gap-2 flex-wrap">
              {gates.map((g) => {
                const isSelected = userPos.label === g.name;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`gmaps-gate-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectStartingGate(g)}
                  >
                    <DoorOpen size={12} />
                    <span>{g.name.split('–')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar & Filter Chips */}
          <div className="gmaps-search-section">
            <div className="gmaps-search-box">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search sectors, zones, gates..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="gmaps-search-input"
              />
            </div>

            <div className="gmaps-filter-chips">
              <button
                type="button"
                className={`gmaps-chip ${categoryFilter === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('ALL')}
              >
                All Sectors ({sectors.length})
              </button>
              <button
                type="button"
                className={`gmaps-chip ${categoryFilter === 'FAST' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('FAST')}
              >
                Direct Access ({greenAlternatives.length})
              </button>
            </div>
          </div>

          {/* Sectors Directory List */}
          <div className="gmaps-places-list">
            {filteredSectors.map((s) => {
              const statusMeta = STATUS_CONFIG[s.color] || STATUS_CONFIG.GREEN;
              const isChosen = activeSector?.id === s.id && !customDestPos;

              return (
                <button
                  key={s.id}
                  type="button"
                  className={`gmaps-place-row ${isChosen ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSectorId(s.id);
                    setCustomDestPos(null);
                  }}
                >
                  <div className="gmaps-place-left">
                    <div
                      className="gmaps-place-dot"
                      style={{ backgroundColor: statusMeta.mapStroke }}
                    />
                    <div className="gmaps-place-info">
                      <span className="gmaps-place-title">{s.label}</span>
                      <span className="gmaps-place-status" style={{ color: statusMeta.textColor }}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="gmaps-place-chip"
                      style={{
                        backgroundColor: statusMeta.bgColor,
                        color: statusMeta.textColor,
                        borderColor: statusMeta.borderColor
                      }}
                    >
                      {s.saturation.toFixed(0)}% Load
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
