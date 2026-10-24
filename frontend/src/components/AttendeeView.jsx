import { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Compass,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Download,
  Users,
  ArrowRight,
  Check,
  ExternalLink,
  Navigation,
  Play,
  Square,
  RotateCcw,
  Footprints,
  Share2,
  LocateFixed,
  Radio,
  DoorOpen,
  LifeBuoy,
  Clock,
  Sparkles,
  Search,
  Eye,
  CheckCircle2,
  Copy,
  Info
} from 'lucide-react';
import './AttendeeView.css';

// In Vite development, relative fetch is automatically proxied to backend port 5050
const API_BASE = '';
const POLL_INTERVAL_MS = 2000;

const STATUS_COLOR_MAP = {
  RED: {
    label: 'Critical · ~12m Wait',
    sub: 'Severe Bottleneck Risk',
    text: '#f87171',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444'
  },
  YELLOW: {
    label: 'Moderate · ~4m Wait',
    sub: 'Steady Influx Flow',
    text: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '#f59e0b'
  },
  GREEN: {
    label: 'Direct Entry · <1m Wait',
    sub: 'Free Flow Access',
    text: '#34d399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981'
  },
};

export default function AttendeeView({ setActiveView }) {
  const [liveStatus, setLiveStatus] = useState(null);
  const [venueConfig, setVenueConfig] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);

  // Selected destination sector
  const [selectedSectorId, setSelectedSectorId] = useState('P2');
  const [searchFilter, setSearchFilter] = useState('');

  // User position & location mode
  // Default entrance location
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

  // Modals & UI Feedback
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customTunnelUrl, setCustomTunnelUrl] = useState('');
  const [isEditingTunnel, setIsEditingTunnel] = useState(false);

  // ── 1. Fetch Dynamic Venue & Live Status from Backend ──────────────────────
  useEffect(() => {
    let active = true;

    const fetchConfig = async () => {
      try {
        const [venueRes, statusRes, netRes] = await Promise.all([
          fetch(`${API_BASE}/api/venue/current`),
          fetch(`${API_BASE}/api/status`),
          fetch(`${API_BASE}/api/system/network`).catch(() => null)
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
        if (active && netRes && netRes.ok) {
          const nData = await netRes.json();
          setNetworkInfo(nData);
        }
      } catch (err) {
        // Fallback gracefully to offline defaults
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

  // Auto-select initial destination if not selected
  useEffect(() => {
    if (!selectedSectorId && sectors.length > 0) {
      setSelectedSectorId(sectors[0].id);
    }
  }, [sectors, selectedSectorId]);

  const activeSector = sectors.find(s => s.id === selectedSectorId) || sectors[0] || null;
  const greenAlternatives = sectors.filter(s => s.color === 'GREEN');
  const recommendedSector = greenAlternatives.length > 0 ? greenAlternatives[0] : sectors[0];

  // ── 3. Universal QR URL for All Visitors ───────────────────────────────────
  const universalQrUrl = useMemo(() => {
    if (customTunnelUrl.trim()) return customTunnelUrl.trim();
    if (typeof window === 'undefined') return 'http://localhost:5174/?visitor=1#attendee';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const host = isLocalhost
      ? (networkInfo?.primary_ip || '11.20.17.207')
      : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${host}${port}/?visitor=1#attendee`;
  }, [customTunnelUrl, networkInfo]);

  // ── 4. Live Geolocation Sensor Tracker ─────────────────────────────────────
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

        // Approximate map position based on slight GPS offset or keep pin anchored with GPS badge
        setUserPos(prev => ({
          ...prev,
          label: `GPS Location (±${Math.round(accuracy)}m)`,
          isGPS: true
        }));
      },
      (error) => {
        console.warn("GPS watch error:", error);
        showToast("Location access denied or unavailable. Tap map to place pin.");
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

  // ── 5. User Position Controls: Click to Place Pin or Select Gate ───────────
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

    showToast(`Current location pin moved to (${clampedX}%, ${clampedY}%)`);
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

  // ── 6. Intelligent Waypoint Pathfinding (Corridors & Avoids Straight Walls) ─
  const navigationRoute = useMemo(() => {
    if (!activeSector) return [];

    const startX = userPos.x;
    const startY = userPos.y;
    const endX = activeSector.cx;
    const endY = activeSector.cy;

    // Corridor transit point (hub through campus promenade at 50%, 50%)
    // Creates a realistic 3-segment walkway path rather than cutting across buildings
    const transitX = 50;
    const transitY = (startY + endY) / 2;

    const waypoints = [
      {
        x: startX,
        y: startY,
        instruction: `Depart from ${userPos.label}`
      },
      {
        x: transitX,
        y: transitY,
        instruction: `Follow illuminated Main Promenade corridor toward ${activeSector.label}`
      },
      {
        x: endX,
        y: endY,
        instruction: `Arrive at ${activeSector.label} Entry Turnstiles`
      }
    ];

    return waypoints;
  }, [userPos, activeSector]);

  // Interpolated walker coordinates based on navProgress
  const walkerPos = useMemo(() => {
    if (navigationRoute.length < 2) return { x: userPos.x, y: userPos.y };

    if (navProgress <= 50) {
      // First leg: waypoint 0 -> waypoint 1
      const ratio = navProgress / 50;
      const p0 = navigationRoute[0];
      const p1 = navigationRoute[1];
      return {
        x: p0.x + (p1.x - p0.x) * ratio,
        y: p0.y + (p1.y - p0.y) * ratio
      };
    } else {
      // Second leg: waypoint 1 -> waypoint 2
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
    return Math.round(mapDist * 3.2); // ~3.2m per map percentage unit
  }, [activeSector, userPos]);

  const estimatedWalkSeconds = Math.round(routeDistanceMeters / 1.3); // 1.3 m/s human walking speed

  // ── 7. Navigation Controls (Start / Stop / Reset) ───────────────────────────
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
        const next = prev + 4;
        if (next > 50 && prev <= 50) setNavStepIndex(1);
        if (next >= 100) setNavStepIndex(2);
        return next;
      });
    }, 500);
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

    // Find nearest or safe exit
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
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(universalQrUrl);
      setCopiedLink(true);
      showToast("Universal pass URL copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Filtered sectors for destinations search
  const filteredSectors = sectors.filter(s =>
    s.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="attendee-fair-page">
      {/* ── Top Floating Companion Header ── */}
      <header className="fair-header">
        <div className="fair-header-left">
          <div className="flex items-center gap-2">
            <span className="live-dot-pulse" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Live Visitor Companion
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Radio size={12} className="animate-pulse" />
              Live AI Sync
            </span>
          </div>
          <h1 className="fair-title">{venueTitle}</h1>
        </div>

        <div className="fair-header-right">
          {/* Live GPS Tracker Toggle */}
          <button
            type="button"
            className={`att-gps-btn ${liveGPSActive ? 'is-active' : ''}`}
            onClick={toggleLiveGPS}
            title="Track my real-time GPS location via phone sensor"
          >
            <LocateFixed size={14} className={liveGPSActive ? 'animate-spin' : ''} />
            <span>{liveGPSActive ? 'Live GPS Active' : 'Share My GPS'}</span>
          </button>

          {/* Universal Visitor Pass QR Button */}
          <button
            type="button"
            id="attendee-qr-btn"
            className="att-visitor-qr-btn"
            onClick={() => setShowQRModal(true)}
            title="Scan or share Universal Visitor QR Pass"
          >
            <QrCode size={14} />
            <span>Visitor QR</span>
          </button>

          {/* Scannable Gate Pass Modal Button */}
          <button
            type="button"
            className="att-pass-badge-btn"
            onClick={() => setShowPassModal(true)}
            title="Show scannable event access pass for turnstile security"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>My Pass</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="att-toast-popup">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Safety Alert Banner (Triggered when congestion is high) */}
      {activeSector && activeSector.color === 'RED' && (
        <div className="att-congestion-banner">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-rose-300 text-xs uppercase tracking-wide">
                Congestion Advisory · {activeSector.label}
              </div>
              <div className="text-xs text-zinc-300">
                Density reaches {activeSector.saturation.toFixed(0)}% saturation. High wait times. Authority recommends diverting to <strong>{recommendedSector.label}</strong>.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="att-btn-reroute-pill"
            onClick={() => {
              setSelectedSectorId(recommendedSector.id);
              if (isNavigating) setNavProgress(0);
              showToast(`Rerouted to ${recommendedSector.label}`);
            }}
          >
            <span>Reroute to {recommendedSector.id}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="fair-body-grid">
        {/* Left Column: Interactive Floorplan Canvas */}
        <div className="fair-map-card">
          <div className="fair-map-header">
            <div className="flex items-center gap-2">
              <h2 className="section-title">Interactive Venue Blueprint</h2>
              <span className="att-meta-chip">
                {sectors.length} Sectors · {gates.length} Gates
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Emergency Safe Exit Button */}
              <button
                type="button"
                className="att-btn-emergency"
                onClick={handleTriggerSafeExit}
                title="Calculate nearest safe emergency exit evacuation path"
              >
                <DoorOpen size={13} />
                <span>Nearest Safe Exit</span>
              </button>
            </div>
          </div>

          {/* Blueprint SVG Map Container */}
          <div className="fair-map-viewport">
            <svg
              className="fair-map-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              onClick={handleMapCanvasClick}
            >
              <defs>
                <pattern id="attGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#161822" strokeWidth="0.35" />
                </pattern>
                <radialGradient id="userGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="walkerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background blueprint image if available, else clean CAD grid */}
              <rect width="100" height="100" fill="#040508" />
              {mapImage ? (
                <image
                  href={mapImage}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.38"
                />
              ) : null}
              <rect width="100" height="100" fill="url(#attGrid)" />

              {/* Main Corridors & Pathways */}
              <line x1="16" y1="50" x2="84" y2="50" stroke="#1c202d" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="18" x2="50" y2="86" stroke="#1c202d" strokeWidth="2.5" strokeLinecap="round" />

              {/* ── Calibrated Sectors ── */}
              {sectors.map((s) => {
                const isSelected = activeSector?.id === s.id;
                const statusMeta = STATUS_COLOR_MAP[s.color] || STATUS_COLOR_MAP.GREEN;

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
                      fill={statusMeta.bg}
                      stroke={isSelected ? '#ffffff' : statusMeta.border}
                      strokeWidth={isSelected ? '1.8' : '0.9'}
                      strokeDasharray={isSelected ? 'none' : 'none'}
                    />
                    <text
                      x={s.cx}
                      y={s.cy - 1.2}
                      textAnchor="middle"
                      fill="#ffffff"
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
                      fill={statusMeta.text}
                      fontSize="2.4"
                      fontWeight="700"
                      fontFamily="system-ui, sans-serif"
                    >
                      {s.saturation.toFixed(0)}% Load
                    </text>
                  </g>
                );
              })}

              {/* ── Calibrated Access Gates ── */}
              {gates.map((g) => {
                const isEntry = g.type === 'ENTRY';
                const isEmergency = g.type === 'EMERGENCY' || g.type === 'EXIT';
                const gateColor = isEmergency ? '#ef4444' : isEntry ? '#38bdf8' : '#fbbf24';

                return (
                  <g
                    key={g.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStartingGate(g);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={g.x} cy={g.y} r="2.8" fill="#090a12" stroke={gateColor} strokeWidth="1.2" />
                    <circle cx={g.x} cy={g.y} r="1.2" fill={gateColor} />
                    <text
                      x={g.x}
                      y={g.y + 5.5}
                      textAnchor="middle"
                      fill={gateColor}
                      fontSize="2.2"
                      fontWeight="700"
                    >
                      {g.id}: {g.name.split('–')[0].trim()}
                    </text>
                  </g>
                );
              })}

              {/* ── Dynamic Waypoint Navigation Path ── */}
              {isNavigating && navigationRoute.length >= 2 && (
                <polyline
                  points={navigationRoute.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={evacuationMode ? '#ef4444' : '#10b981'}
                  strokeWidth="1.5"
                  strokeDasharray="2.5 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Static Destination Pin */}
              {activeSector && (
                <g>
                  <circle
                    cx={activeSector.cx}
                    cy={activeSector.cy}
                    r="3.2"
                    fill={STATUS_COLOR_MAP[activeSector.color]?.border || '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <circle cx={activeSector.cx} cy={activeSector.cy} r="1.2" fill="#ffffff" />
                  <text
                    x={activeSector.cx}
                    y={activeSector.cy - 5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="2.4"
                    fontWeight="800"
                  >
                    Destination
                  </text>
                </g>
              )}

              {/* ── Current User Location Pin ── */}
              <g transform={`translate(${userPos.x}, ${userPos.y})`}>
                <circle r="5" fill="url(#userGlow)" />
                <circle r="2.6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                <circle r="1" fill="#ffffff" />
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="2.3"
                  fontWeight="800"
                >
                  YOU ARE HERE
                </text>
              </g>

              {/* ── Dynamic Animated Walker (When Actively Navigating) ── */}
              {isNavigating && (
                <g transform={`translate(${walkerPos.x}, ${walkerPos.y})`}>
                  <circle r="7" fill="url(#walkerGlow)" />
                  <circle r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                  <circle r="1.2" fill="#ffffff" />
                </g>
              )}
            </svg>

            {/* Tap instruction badge */}
            <div className="att-map-hint-pill">
              <MapPin size={11} className="text-sky-400" />
              <span>Tap anywhere on the blueprint to update your location</span>
            </div>
          </div>
        </div>

        {/* Right Column: Waypoint Navigation Controls & Dynamic Sectors */}
        <div className="fair-destinations-card">
          {/* Active Navigation HUD or Route Launcher */}
          {isNavigating ? (
            <div className="att-nav-active-box">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Footprints size={16} className="text-emerald-400 animate-bounce" />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      {evacuationMode ? 'Evacuation Routing Active' : 'Live Walk Guidance'}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      ~{routeDistanceMeters}m · ~{estimatedWalkSeconds}s walk
                    </div>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {navProgress}%
                </span>
              </div>

              {/* Step Progress Bar */}
              <div className="att-nav-bar">
                <div className="att-nav-fill" style={{ width: `${navProgress}%` }} />
              </div>

              {/* Step-by-Step Directions Banner */}
              <div className="att-step-instruction">
                <div className="font-semibold text-zinc-200 text-xs mb-0.5">
                  Step {navStepIndex + 1} of {navigationRoute.length}:
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">
                  {navigationRoute[navStepIndex]?.instruction || `Proceed toward ${activeSector?.label}`}
                </div>
              </div>

              {/* Stop & Reset Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="att-btn-stop-nav flex-1"
                  onClick={stopNavigation}
                >
                  <Square size={13} fill="currentColor" />
                  <span>{navProgress >= 100 ? 'Finish Route' : 'Stop Navigating'}</span>
                </button>
                <button
                  type="button"
                  className="att-btn-icon"
                  onClick={startNavigation}
                  title="Restart guidance from beginning"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="att-nav-ready-box">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Navigation size={15} className="text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Selected Destination
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  ~{routeDistanceMeters}m away
                </span>
              </div>

              <div className="text-sm font-bold text-white mb-1">
                {activeSector?.label || 'Select a sector'}
              </div>
              <div className="text-xs text-zinc-400 mb-3 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {STATUS_COLOR_MAP[activeSector?.color]?.label || 'Direct Entry'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {activeSector?.count} / {activeSector?.capacity} occupancy
                </span>
              </div>

              <button
                type="button"
                className="att-btn-launch-nav"
                onClick={startNavigation}
              >
                <Play size={15} fill="currentColor" />
                <span>Start Walking Route</span>
              </button>
            </div>
          )}

          {/* Quick Gate Selector ("I entered via...") */}
          <div className="att-starting-gates-row">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Starting Gate:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {gates.map((g) => {
                const isSelected = userPos.label === g.name;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`att-gate-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectStartingGate(g)}
                  >
                    <DoorOpen size={11} />
                    <span>{g.name.split('–')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Sectors Search & Directory */}
          <div className="att-directory-header">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Venue Sectors &amp; Queues
            </span>
            <div className="att-search-wrap">
              <Search size={12} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Filter sectors..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="att-search-input"
              />
            </div>
          </div>

          <div className="dest-list">
            {filteredSectors.map((s) => {
              const statusMeta = STATUS_COLOR_MAP[s.color] || STATUS_COLOR_MAP.GREEN;
              const isChosen = activeSector?.id === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  className={`dest-row-btn ${isChosen ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSectorId(s.id);
                    if (isNavigating) setNavProgress(0);
                  }}
                >
                  <div className="dest-row-left">
                    <span className="dest-dot" style={{ backgroundColor: statusMeta.border }} />
                    <div className="dest-names">
                      <span className="dest-title">{s.label}</span>
                      <span className="dest-wait" style={{ color: statusMeta.text }}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                  <span className="dest-sat-chip" style={{ color: statusMeta.text, borderColor: statusMeta.border }}>
                    {s.saturation.toFixed(0)}% Load
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Universal Visitor Gate Pass Modal ── */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-sky-400" />
                <span className="modal-tag">UNIVERSAL VISITOR PASS QR</span>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowQRModal(false)}>✕</button>
            </div>

            <div className="modal-qr-box">
              <QRCodeSVG
                value={universalQrUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#090818"
                level="Q"
              />
            </div>

            <div className="modal-attendee-info">
              <span className="modal-name">Universal Visitor Guide</span>
              <span className="modal-tier">SCANNABLE QR PASS FOR ALL SMARTPHONES</span>
              <span className="modal-sub">
                Scan with your phone camera to open live venue navigation, crowd queue estimates, and digital pass.
              </span>
            </div>

            {/* Editable Tunnel URL / Local LAN display */}
            <div className="att-modal-url-box mt-3">
              {isEditingTunnel ? (
                <input
                  type="text"
                  value={customTunnelUrl}
                  onChange={(e) => setCustomTunnelUrl(e.target.value)}
                  placeholder="Paste ngrok, localtunnel, or domain..."
                  className="att-modal-url-input"
                  autoFocus
                />
              ) : (
                <span className="att-modal-url-text">{universalQrUrl}</span>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="att-btn-pill-sm"
                  onClick={() => setIsEditingTunnel(!isEditingTunnel)}
                >
                  {isEditingTunnel ? 'Done' : 'Edit Link'}
                </button>
                <button
                  type="button"
                  className="att-btn-pill-sm"
                  onClick={handleCopyLink}
                >
                  {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Network diagnostic tip for phone users */}
            <div className="att-modal-tip">
              <Info size={13} className="text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-zinc-400 leading-normal">
                <strong>Why wouldn't it open on phone?</strong> Make sure your phone is connected to the same Wi-Fi / Hotspot. If your campus/office network isolates devices, run <code className="text-emerald-300">npx localtunnel --port 5174</code> or <code className="text-emerald-300">ngrok http 5174</code>, click <em>Edit Link</em>, and paste the public link.
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-3">
              <a
                href={universalQrUrl}
                target="_blank"
                rel="noreferrer"
                className="att-btn-primary"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab (Preview Companion)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Digital Event & Turnstile Gate Pass Modal ── */}
      {showPassModal && (
        <div className="qr-modal-overlay" onClick={() => setShowPassModal(false)}>
          <div className="qr-modal-card att-event-pass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="modal-tag">AUTHORIZED VISITOR ACCESS PASS</span>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowPassModal(false)}>✕</button>
            </div>

            <div className="att-pass-barcode-box">
              <div className="text-xs font-mono font-bold text-zinc-400 tracking-widest uppercase">
                {venueTitle}
              </div>
              <div className="text-lg font-black text-white mt-1">
                GENERAL ACCESS · PASS #849-PVH
              </div>
              <div className="flex items-center justify-center my-3 bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={`PRAVAAH-PASS-${venueTitle}-GUEST`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Authorized entry at {userPos.label}
              </div>
            </div>

            <div className="flex gap-2 w-full mt-3">
              <button
                type="button"
                className="att-btn-primary flex-1"
                onClick={() => {
                  showToast("Access pass saved to offline cache");
                  setShowPassModal(false);
                }}
              >
                <Download size={14} />
                <span>Save Offline Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
