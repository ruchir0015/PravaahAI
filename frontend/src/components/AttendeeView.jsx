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
  ShieldAlert
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
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'FAST' | 'GATES'

  // User position & location mode
  const [userPos, setUserPos] = useState({ x: 16, y: 86, label: 'Gate A – North Entrance', isGPS: false });
  const [liveGPSActive, setLiveGPSActive] = useState(false);
  const [gpsData, setGpsData] = useState(null);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0); // 0 to 100%
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [evacuationMode, setEvacuationMode] = useState(false);
  const navTimerRef = useRef(null);
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
  const mapImage = activeDataset.map_image || '/pets-campus-plan.svg';

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

  // ── 3. Live Geolocation Sensor Tracker ─────────────────────────────────────
  const toggleLiveGPS = () => {
    if (liveGPSActive) {
      if (gpsWatchIdRef.current) {
        navigator.geolocation?.clearWatch(gpsWatchIdRef.current);
      }
      setLiveGPSActive(false);
      showToast("Live GPS tracking paused");
      return;
    }

    if (!navigator.geolocation) {
      showToast("Geolocation is not supported on this device/browser");
      return;
    }

    showToast("Connecting to device GPS...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;
        setGpsData({ lat: latitude, lng: longitude, accuracy, heading });
        setLiveGPSActive(true);

        setUserPos(prev => ({
          ...prev,
          label: `GPS Location (±${Math.round(accuracy)}m)`,
          isGPS: true
        }));
      },
      (error) => {
        console.warn("GPS watch error:", error);
        showToast("Location access unavailable. Tap map to place pin.");
        setLiveGPSActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
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

  // ── 4. User Position Controls: Click to Place Pin or Select Gate ───────────
  const handleMapCanvasClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(4, Math.min(96, clickX)));
    const clampedY = Math.round(Math.max(4, Math.min(96, clickY)));

    setUserPos({
      x: clampedX,
      y: clampedY,
      label: `Custom Pin (${clampedX}%, ${clampedY}%)`,
      isGPS: false
    });

    if (isNavigating) {
      setNavProgress(0);
      setNavStepIndex(0);
    }

    showToast(`Location set to (${clampedX}%, ${clampedY}%)`);
  };

  const handleSelectStartingGate = (gate) => {
    setUserPos({
      x: gate.x,
      y: gate.y,
      label: gate.name,
      isGPS: false
    });
    if (isNavigating) {
      setNavProgress(0);
      setNavStepIndex(0);
    }
    showToast(`Starting from ${gate.name}`);
  };

  // ── 5. Intelligent Waypoint Pathfinding ────────────────────────────────────
  const navigationRoute = useMemo(() => {
    if (!activeSector) return [];

    const startX = userPos.x;
    const startY = userPos.y;
    const endX = activeSector.cx;
    const endY = activeSector.cy;

    const transitX = 50;
    const transitY = (startY + endY) / 2;

    const waypoints = [
      {
        x: startX,
        y: startY,
        instruction: `Head out from ${userPos.label}`
      },
      {
        x: transitX,
        y: transitY,
        instruction: `Continue straight along Main Promenade toward ${activeSector.label}`
      },
      {
        x: endX,
        y: endY,
        instruction: `Arrive at ${activeSector.label} Entry Gate`
      }
    ];

    return waypoints;
  }, [userPos, activeSector]);

  // Interpolated walker coordinates based on navProgress
  const walkerPos = useMemo(() => {
    if (navigationRoute.length < 2) return { x: userPos.x, y: userPos.y };

    if (navProgress <= 50) {
      const ratio = navProgress / 50;
      const p0 = navigationRoute[0];
      const p1 = navigationRoute[1];
      return {
        x: p0.x + (p1.x - p0.x) * ratio,
        y: p0.y + (p1.y - p0.y) * ratio
      };
    } else {
      const ratio = (navProgress - 50) / 50;
      const p1 = navigationRoute[1];
      const p2 = navigationRoute[2];
      return {
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio
      };
    }
  }, [navigationRoute, navProgress, userPos]);

  // Distance estimation in real meters
  const routeDistanceMeters = useMemo(() => {
    if (!activeSector) return 80;
    const dx = activeSector.cx - userPos.x;
    const dy = activeSector.cy - userPos.y;
    const mapDist = Math.sqrt(dx * dx + dy * dy);
    return Math.round(mapDist * 3.2);
  }, [activeSector, userPos]);

  const estimatedWalkMinutes = Math.max(1, Math.round(routeDistanceMeters / 75)); // ~75m per min walk

  // ── 6. Navigation Controls ────────────────────────────────────────────────
  const startNavigation = () => {
    setIsNavigating(true);
    setNavProgress(0);
    setNavStepIndex(0);

    if (navTimerRef.current) clearInterval(navTimerRef.current);

    navTimerRef.current = setInterval(() => {
      setNavProgress((prev) => {
        if (prev >= 100) {
          clearInterval(navTimerRef.current);
          showToast(`Arrived at ${activeSector?.label || 'destination'}!`);
          return 100;
        }
        const next = prev + 5;
        if (next > 50 && prev <= 50) setNavStepIndex(1);
        if (next >= 100) setNavStepIndex(2);
        return next;
      });
    }, 450);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setNavProgress(0);
    setNavStepIndex(0);
    if (navTimerRef.current) clearInterval(navTimerRef.current);
    showToast("Navigation stopped");
  };

  const handleTriggerSafeExit = () => {
    const exitGates = gates.filter(g => g.type === 'EXIT' || g.type === 'EMERGENCY');
    const targetExit = exitGates.length > 0 ? exitGates[0] : gates[0];

    setEvacuationMode(true);
    showToast(`Emergency Route Engaged: Guiding to ${targetExit.name}`);
    startNavigation();
  };

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearInterval(navTimerRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filtered sectors for destinations search and categories
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
      {/* ── Google Maps Style Clean Top Bar ── */}
      <header className="gmaps-top-header">
        <div className="gmaps-header-brand">
          <div className="gmaps-pin-icon-wrap">
            <MapPin size={20} className="text-blue-600" fill="#2563eb" />
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
            title="Track my real-time GPS location"
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

      {/* Safety Congestion Alert Banner */}
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
              if (isNavigating) setNavProgress(0);
              showToast(`Rerouted to ${recommendedSector.label}`);
            }}
          >
            <span>Switch to {recommendedSector.id}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Main Structured Two-Column View ── */}
      <div className="gmaps-content-grid">
        {/* Left Column: Interactive Map Card */}
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
          <div className="gmaps-canvas-wrapper">
            <svg
              className="gmaps-blueprint-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              onClick={handleMapCanvasClick}
            >
              <defs>
                <pattern id="gmapsGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.4" />
                </pattern>
                {/* Google Maps Blue GPS Pulse */}
                <radialGradient id="gmapsGpsGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Clean Blueprint Architectural Background */}
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
                      if (isNavigating) setNavProgress(0);
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

              {/* ── Google Maps Route Polyline ── */}
              {isNavigating && navigationRoute.length >= 2 && (
                <polyline
                  points={navigationRoute.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={evacuationMode ? '#dc2626' : '#2563eb'}
                  strokeWidth="2.2"
                  strokeDasharray="3 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Destination Pin */}
              {activeSector && (
                <g>
                  <circle
                    cx={activeSector.cx}
                    cy={activeSector.cy}
                    r="3.4"
                    fill={STATUS_CONFIG[activeSector.color]?.mapStroke || '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <circle cx={activeSector.cx} cy={activeSector.cy} r="1.2" fill="#ffffff" />
                  <text
                    x={activeSector.cx}
                    y={activeSector.cy - 5}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="2.5"
                    fontWeight="800"
                  >
                    Destination
                  </text>
                </g>
              )}

              {/* ── Google Maps Blue Location Pin ("YOU ARE HERE") ── */}
              <g transform={`translate(${userPos.x}, ${userPos.y})`}>
                <circle r="6" fill="url(#gmapsGpsGlow)" />
                <circle r="3" fill="#2563eb" stroke="#ffffff" strokeWidth="1.4" />
                <circle r="1.2" fill="#ffffff" />
                <text
                  x="0"
                  y="-4.5"
                  textAnchor="middle"
                  fill="#1d4ed8"
                  fontSize="2.3"
                  fontWeight="800"
                >
                  YOU ARE HERE
                </text>
              </g>

              {/* ── Dynamic Animated Walker ── */}
              {isNavigating && (
                <g transform={`translate(${walkerPos.x}, ${walkerPos.y})`}>
                  <circle r="6" fill="url(#gmapsGpsGlow)" />
                  <circle r="3.2" fill="#2563eb" stroke="#ffffff" strokeWidth="1.4" />
                  <circle r="1.2" fill="#ffffff" />
                </g>
              )}
            </svg>

            {/* Tap instruction hint */}
            <div className="gmaps-map-hint">
              <MapPin size={12} className="text-blue-600" />
              <span>Tap anywhere on the blueprint to set your location</span>
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
                  <Footprints size={18} className="text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {evacuationMode ? 'Emergency Egress Active' : 'Turn-by-Turn Walk Directions'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {routeDistanceMeters}m · ~{estimatedWalkMinutes} min walk
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600 font-mono">
                  {navProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="gmaps-progress-bar">
                <div className="gmaps-progress-fill" style={{ width: `${navProgress}%` }} />
              </div>

              {/* Current Step Instruction */}
              <div className="gmaps-step-box">
                <div className="flex items-start gap-2.5">
                  <CornerUpRight size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Step {navStepIndex + 1} of {navigationRoute.length}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-0.5 leading-snug">
                      {navigationRoute[navStepIndex]?.instruction || `Proceed toward ${activeSector?.label}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Stop / Reset Controls */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  className="gmaps-btn-stop flex-1"
                  onClick={stopNavigation}
                >
                  <Square size={13} fill="currentColor" />
                  <span>{navProgress >= 100 ? 'End Route' : 'Stop Navigation'}</span>
                </button>
                <button
                  type="button"
                  className="gmaps-btn-subtle"
                  onClick={startNavigation}
                  title="Restart route from departure gate"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="gmaps-destination-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Selected Destination
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {routeDistanceMeters}m away
                </span>
              </div>

              <div className="text-base font-bold text-slate-900 mb-1">
                {activeSector?.label || 'Select a sector'}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Clock size={13} className="text-slate-500" />
                  {STATUS_CONFIG[activeSector?.color]?.label || 'Direct Entry'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-slate-500" />
                  {activeSector?.count} / {activeSector?.capacity} capacity
                </span>
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

          {/* Departure Gate Row */}
          <div className="gmaps-gates-box">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Departure Point:
            </span>
            <div className="flex gap-1.5 flex-wrap">
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
              const isChosen = activeSector?.id === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  className={`gmaps-place-row ${isChosen ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSectorId(s.id);
                    if (isNavigating) setNavProgress(0);
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
