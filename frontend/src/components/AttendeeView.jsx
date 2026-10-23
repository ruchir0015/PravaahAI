import { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  MapPin,
  Compass,
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
  RotateCcw,
  Footprints,
  Share2
} from 'lucide-react';
import './AttendeeView.css';

const API = "http://localhost:5050";
const POLL_MS = 2500;

const STATUS_MAP = {
  RED:    { label: 'Congested · 8m Wait', text: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
  YELLOW: { label: 'Moderate · 3m Wait',  text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' },
  GREEN:  { label: 'Direct Access',       text: '#a1a1aa', bg: 'rgba(255, 255, 255, 0.04)', border: '#52525b' },
};

const ENTRANCE_X = 50;
const ENTRANCE_Y = 88;

export default function AttendeeView({ venueData, setActiveView }) {
  const [status, setStatus] = useState(null);
  const [chosenId, setChosenId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [passDownloaded, setPassDownloaded] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Interactive Live Navigation State ("Run It All")
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0); // 0 to 100%
  const navIntervalRef = useRef(null);

  // Universal QR URL for All Visitors
  const universalQrUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:5174/#attendee';
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? '11.20.17.207'
      : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${host}${port}/#attendee`;
  }, []);

  useEffect(() => {
    let unmounted = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/api/status`);
        if (res.ok) {
          const data = await res.json();
          if (!unmounted && data.zones) {
            setStatus(data);
            if (!chosenId && Object.keys(data.zones).length > 0) {
              setChosenId(Object.keys(data.zones)[0]);
            }
          }
        }
      } catch (e) {
        // Backend offline fallback
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, POLL_MS);
    return () => {
      unmounted = true;
      clearInterval(iv);
    };
  }, [chosenId]);

  const zonesObj = status?.zones || {
    P1: { id: 'P1', label: 'Sector P1 – North Pathway Entry', count: 6, capacity: 15, saturation_pct: 40, color: 'GREEN', status_label: 'NORMAL', bbox: [0.15, 0.20, 0.40, 0.42] },
    P2: { id: 'P2', label: 'Sector P2 – Central Promenade', count: 12, capacity: 18, saturation_pct: 66, color: 'YELLOW', status_label: 'BUSY', bbox: [0.60, 0.20, 0.85, 0.42] },
    P3: { id: 'P3', label: 'Sector P3 – South Junction', count: 18, capacity: 20, saturation_pct: 90, color: 'RED', status_label: 'SURGE', bbox: [0.60, 0.55, 0.85, 0.77] },
    P4: { id: 'P4', label: 'Sector P4 – West Pavilion', count: 5, capacity: 12, saturation_pct: 41, color: 'GREEN', status_label: 'NORMAL', bbox: [0.15, 0.55, 0.40, 0.77] },
  };
  
  const activeDataset = status?.dataset || {};
  const venueTitle = venueData?.name || activeDataset.venue_name || 'Campus & Festival Fairgrounds';

  const destinations = Object.values(zonesObj).map((z) => {
    const bbox = z.bbox || [0.1, 0.1, 0.4, 0.4];
    const x = bbox[0] * 100;
    const y = bbox[1] * 100;
    const w = (bbox[2] - bbox[0]) * 100;
    const h = (bbox[3] - bbox[1]) * 100;

    return {
      id: z.id,
      label: z.label,
      color: z.color || 'GREEN',
      saturation: z.saturation_pct,
      statusLabel: z.status_label,
      count: z.count,
      capacity: z.capacity,
      x,
      y,
      w,
      h,
      cx: x + w / 2,
      cy: y + h / 2,
    };
  });

  const chosenDest = chosenId ? destinations.find(d => d.id === chosenId) : destinations[0];
  const greenAlts = destinations.filter(d => d.color === 'GREEN');
  const recommendedAlt = greenAlts.length > 0 ? greenAlts[0] : destinations[0];

  // ── "Run Live Navigation" Walking Animation Engine ────────────────────────
  const startNavigation = () => {
    setIsNavigating(true);
    setNavProgress(0);
    if (navIntervalRef.current) clearInterval(navIntervalRef.current);

    navIntervalRef.current = setInterval(() => {
      setNavProgress((prev) => {
        if (prev >= 100) {
          clearInterval(navIntervalRef.current);
          return 100;
        }
        return prev + 5;
      });
    }, 450);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setNavProgress(0);
    if (navIntervalRef.current) clearInterval(navIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      if (navIntervalRef.current) clearInterval(navIntervalRef.current);
    };
  }, []);

  // Compute interpolated walking coordinate along the path
  const targetX = chosenDest ? chosenDest.cx : ENTRANCE_X;
  const targetY = chosenDest ? chosenDest.cy : ENTRANCE_Y - 40;
  const walkerX = ENTRANCE_X + (targetX - ENTRANCE_X) * (navProgress / 100);
  const walkerY = ENTRANCE_Y + (targetY - ENTRANCE_Y) * (navProgress / 100);

  const downloadPass = () => {
    setPassDownloaded(true);
    setTimeout(() => setPassDownloaded(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(universalQrUrl);
    setToastMsg("Universal link copied to clipboard");
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="attendee-fair-page">
      {/* ── Top Header ── */}
      <header className="fair-header">
        <div className="fair-header-left">
          <h1 className="fair-title">{venueTitle}</h1>
        </div>
        <div className="fair-header-right">
          <button
            type="button"
            id="attendee-qr-btn"
            className="att-visitor-qr-btn"
            onClick={() => setShowQRModal(true)}
            title="Scan or share Universal Visitor QR Pass"
          >
            <QrCode size={15} />
            <span>Visitor QR</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="mx-auto py-2 px-4 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 shadow-lg w-fit">
          <Check size={14} className="text-zinc-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="fair-body-grid">
        {/* Left: Interactive Walking Map with Real Crowd Flow */}
        <div className="fair-map-card">
          <div className="fair-map-header">
            <div>
              <h2 className="section-title">Live Map</h2>
            </div>
            <div className="flex items-center gap-2">
              {isNavigating && (
                <span className="nav-pulsing-badge">
                  <Footprints size={12} className="animate-bounce" />
                  <span>WALKING {navProgress}%</span>
                </span>
              )}
            </div>
          </div>

          <div className="fair-map-viewport">
            <svg
              className="fair-map-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id="fairGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1c1c28" strokeWidth="0.3" />
                </pattern>
                <radialGradient id="navGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Ground backdrop */}
              <rect width="100" height="100" fill="#090a10" />
              <rect width="100" height="100" fill="url(#fairGrid)" />

              {/* Main Corridors */}
              <line x1="20" y1="35" x2="80" y2="35" stroke="#1f2330" strokeWidth="3" strokeLinecap="round" />
              <line x1="50" y1="20" x2="50" y2="85" stroke="#1f2330" strokeWidth="3" strokeLinecap="round" />

              {/* Sectors */}
              {destinations.map((d) => {
                const s = STATUS_MAP[d.color] || STATUS_MAP.GREEN;
                const isSelected = chosenDest?.id === d.id;
                return (
                  <g
                    key={d.id}
                    onClick={() => {
                      setChosenId(d.id);
                      if (isNavigating) setNavProgress(0);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={d.x + 1}
                      y={d.y + 1}
                      width={d.w - 2}
                      height={d.h - 2}
                      rx="3"
                      fill={s.bg}
                      stroke={isSelected ? '#ffffff' : s.border}
                      strokeWidth={isSelected ? '1.5' : '0.8'}
                    />
                    <text
                      x={d.cx}
                      y={d.cy - 1}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="3.2"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      {d.id}
                    </text>
                    <text
                      x={d.cx}
                      y={d.cy + 3.2}
                      textAnchor="middle"
                      fill={s.text}
                      fontSize="2.4"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {d.saturation.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* Walking vector to chosen sector */}
              {chosenDest && (
                <line
                  x1={ENTRANCE_X}
                  y1={ENTRANCE_Y}
                  x2={chosenDest.cx}
                  y2={chosenDest.cy}
                  stroke={chosenDest.color === 'RED' ? '#ef4444' : '#10b981'}
                  strokeWidth="1.2"
                  strokeDasharray="2.5 2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Starting Entrance Gate indicator */}
              <circle cx={ENTRANCE_X} cy={ENTRANCE_Y} r="2.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
              <text x={ENTRANCE_X} y={ENTRANCE_Y + 6.5} textAnchor="middle" fill="#38bdf8" fontSize="2.5" fontWeight="700">
                Entrance Gate
              </text>

              {/* Destination pin */}
              {chosenDest && (
                <g>
                  <circle
                    cx={chosenDest.cx}
                    cy={chosenDest.cy}
                    r="3"
                    fill={STATUS_MAP[chosenDest.color]?.border || '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <text
                    x={chosenDest.cx}
                    y={chosenDest.cy - 4.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="2.4"
                    fontWeight="700"
                  >
                    Destination
                  </text>
                </g>
              )}

              {/* Dynamic Animated Walker Pin (When Live Navigation is Running) */}
              {isNavigating && (
                <g transform={`translate(${walkerX}, ${walkerY})`}>
                  <circle r="6" fill="url(#navGlow)" className="animate-ping" />
                  <circle r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                  <circle r="1" fill="#ffffff" />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Right: Where to Go & Route Suggestion ("Run It All") */}
        <div className="fair-destinations-card">
          <div className="dest-header">
            <h2 className="section-title">Destinations</h2>
          </div>

          <div className="dest-list">
            {destinations.map((d) => {
              const s = STATUS_MAP[d.color] || STATUS_MAP.GREEN;
              const isChosen = chosenDest?.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`dest-row-btn ${isChosen ? 'is-selected' : ''}`}
                  onClick={() => {
                    setChosenId(d.id);
                    if (isNavigating) setNavProgress(0);
                  }}
                >
                  <div className="dest-row-left">
                    <span className="dest-dot" style={{ backgroundColor: s.border }} />
                    <div className="dest-names">
                      <span className="dest-title">{d.label}</span>
                      <span className="dest-wait" style={{ color: s.text }}>{s.label}</span>
                    </div>
                  </div>
                  <span className="dest-sat-chip" style={{ color: s.text, borderColor: s.border }}>
                    {d.saturation.toFixed(0)}% Load
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clean Guidance Box or Active Navigation HUD */}
          {isNavigating ? (
            /* Active Live Navigation Card */
            <div className="nav-active-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Footprints size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {navProgress < 100 ? 'Live Navigation Active' : 'Arrived at Destination'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {navProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="nav-progress-bar">
                <div className="nav-progress-fill" style={{ width: `${navProgress}%` }} />
              </div>

              <div className="text-xs text-zinc-200">
                {navProgress < 30 ? (
                  <span>🚶 <strong>Step 1:</strong> Pass through Entrance Gate turnstiles along lighted pathway.</span>
                ) : navProgress < 75 ? (
                  <span>🚶 <strong>Step 2:</strong> Follow illuminated corridor toward {chosenDest?.label}.</span>
                ) : navProgress < 100 ? (
                  <span>🚶 <strong>Step 3:</strong> Arriving at {chosenDest?.label} entrance. Direct access open.</span>
                ) : (
                  <span className="text-emerald-400 font-bold">🎉 Welcome! You have reached {chosenDest?.label}.</span>
                )}
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className="btn-stop-nav flex-1"
                  onClick={stopNavigation}
                >
                  {navProgress >= 100 ? 'Finish Walk' : 'Stop Navigation'}
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center transition"
                  onClick={startNavigation}
                  title="Restart Walking Navigation"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* Navigation Launch Button */
            chosenDest && (
              <div className="flex flex-col gap-3">
                {chosenDest.color === 'RED' && (
                  <div className="fair-reroute-hint">
                    <AlertTriangle size={13} />
                    <span>Congested — try <strong>{recommendedAlt.label}</strong> instead</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-start-navigation"
                  onClick={startNavigation}
                >
                  <Play size={15} fill="currentColor" />
                  <span>Navigate to {chosenDest.label.split('–')[0].trim()}</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Universal Visitor Gate Pass Modal (One QR for Everyone) ── */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-tag">UNIVERSAL VISITOR EVENT PASS</span>
              <button type="button" className="btn-close-modal" onClick={() => setShowQRModal(false)}>✕</button>
            </div>

            <div className="modal-qr-box">
              <QRCodeSVG
                value={universalQrUrl}
                size={210}
                bgColor="#ffffff"
                fgColor="#090818"
                level="Q"
              />
            </div>

            <div className="modal-attendee-info">
              <span className="modal-name">Universal Visitor Pass</span>
              <span className="modal-tier">ONE SCANNABLE QR CODE FOR ALL GUESTS</span>
              <span className="modal-sub">
                Scan with any smartphone camera to open the live fairground map, check queue wait times, and run walking navigation.
              </span>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <a
                href={universalQrUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold text-center flex items-center justify-center gap-2 transition shadow-md"
              >
                <ExternalLink size={14} />
                <span>Open Live Companion in New Tab</span>
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  onClick={handleCopyLink}
                >
                  <Share2 size={13} />
                  <span>Copy QR Link</span>
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  onClick={downloadPass}
                >
                  <Download size={13} />
                  <span>{passDownloaded ? 'Saved!' : 'Save QR'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
