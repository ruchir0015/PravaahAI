import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Download,
  Users,
  Compass,
  ArrowRight,
  Check
} from 'lucide-react';
import TechText from './TechText';
import './AttendeeView.css';

const API = "http://localhost:5050";
const POLL_MS = 2500;

const STATUS_MAP = {
  RED:    { label: 'Congested · High Queue', text: '#ff3b5c', bg: 'rgba(255,59,92,0.14)', border: '#ff3b5c' },
  YELLOW: { label: 'Moderate Flow · 4m Wait', text: '#f59e0b', bg: 'rgba(245,158,11,0.14)', border: '#f59e0b' },
  GREEN:  { label: 'Free Flow · Direct Access', text: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981' },
};

const YOU_X = 50;
const YOU_Y = 88;

export default function AttendeeView({ venueData }) {
  const [status, setStatus] = useState(null);
  const [chosenId, setChosenId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [attendeeName, setAttendeeName] = useState("Arjun Sharma");
  const [passDownloaded, setPassDownloaded] = useState(false);

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
        console.warn('Backend offline');
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, POLL_MS);
    return () => {
      unmounted = true;
      clearInterval(iv);
    };
  }, [chosenId]);

  const zonesObj = status?.zones || {};
  const activeDataset = status?.dataset || {};
  const venueTitle = venueData?.name || activeDataset.venue_name || 'Annual Regional Festival Ground';

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
  const recommendedAlt = greenAlts.length > 0 ? greenAlts[0].label : 'East Open Promenade';

  const downloadPass = () => {
    setPassDownloaded(true);
    setTimeout(() => setPassDownloaded(false), 3000);
  };

  return (
    <div className="attendee-fair-page">
      {/* ── Top Header ── */}
      <header className="fair-header">
        <div className="fair-header-left">
          <div className="fair-badge">
            <span className="fair-badge-dot" />
            <span>FESTIVAL VISITOR COMPANION · मेला साथी</span>
          </div>
          <h1 className="fair-title">{venueTitle}</h1>
          <p className="fair-subtitle">
            Live queue tracker, digital entry pass, and smooth pedestrian route recommendations
          </p>
        </div>

        {/* Quick QR Pass Chip */}
        <div className="fair-pass-chip" onClick={() => setShowQRModal(true)}>
          <div className="pass-chip-qr">
            <QRCodeSVG value={`PRAVAAH-PASS-${attendeeName}`} size={32} bgColor="#ffffff" fgColor="#0b091a" />
          </div>
          <div className="pass-chip-info">
            <span className="pass-chip-name">{attendeeName}</span>
            <span className="pass-chip-tier">ACTIVE EVENT PASS · TAP TO VIEW</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="fair-body-grid">
        {/* Left: Walking Map with Real Crowd Flow */}
        <div className="fair-map-card">
          <div className="fair-map-header">
            <div>
              <h2 className="section-title">Fairground Navigation &amp; Walking Vector</h2>
              <span className="hint-text">Green routes bypass turnstile bottlenecks automatically</span>
            </div>
            <span className="live-flow-chip">
              <ShieldCheck size={14} color="#10b981" />
              <span>LIVE SENSING</span>
            </span>
          </div>

          <div className="fair-map-viewport">
            <svg
              className="fair-map-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Ground backdrop */}
              <rect width="100" height="100" fill="#070514" />
              <path d="M 0 50 L 100 50 M 50 0 L 50 100" stroke="rgba(245, 158, 11, 0.08)" strokeWidth="0.5" strokeDasharray="3 3" />

              {/* Sectors */}
              {destinations.map((d) => {
                const s = STATUS_MAP[d.color] || STATUS_MAP.GREEN;
                const isSelected = chosenDest?.id === d.id;
                return (
                  <g key={d.id} onClick={() => setChosenId(d.id)} style={{ cursor: 'pointer' }}>
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
                    >
                      {d.saturation.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* Walking vector to chosen sector */}
              {chosenDest && (
                <line
                  x1={YOU_X}
                  y1={YOU_Y}
                  x2={chosenDest.cx}
                  y2={chosenDest.cy}
                  stroke={chosenDest.color === 'RED' ? '#ff3b5c' : '#10b981'}
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                />
              )}

              {/* You are here indicator */}
              <circle cx={YOU_X} cy={YOU_Y} r="2.4" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx={YOU_X} cy={YOU_Y} r="5" fill="#f59e0b" opacity="0.2" />
              <text x={YOU_X} y={YOU_Y + 7} textAnchor="middle" fill="#fcd34d" fontSize="2.8" fontWeight="800">
                You Are Here
              </text>

              {/* Destination pin */}
              {chosenDest && (
                <circle
                  cx={chosenDest.cx}
                  cy={chosenDest.cy}
                  r="2.8"
                  fill={STATUS_MAP[chosenDest.color]?.border || '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Right: Where to Go & Route Suggestion */}
        <div className="fair-destinations-card">
          <div className="dest-header">
            <h2 className="section-title">Fair Sectors &amp; Pavilions</h2>
            <span className="hint-text">Select your destination for live wait times</span>
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
                  onClick={() => setChosenId(d.id)}
                >
                  <div className="dest-row-left">
                    <span className="dest-dot" style={{ backgroundColor: s.border }} />
                    <div className="dest-names">
                      <span className="dest-title">{d.label}</span>
                      <span className="dest-wait" style={{ color: s.text }}>{s.label}</span>
                    </div>
                  </div>
                  <span className="dest-sat-chip" style={{ color: s.text, borderColor: s.border }}>
                    {d.saturation.toFixed(0)}% Dense
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clean Guidance Box */}
          {chosenDest && (
            <div className={`fair-guidance-box ${chosenDest.color === 'RED' ? 'is-warn' : 'is-ok'}`}>
              <div className="guidance-header">
                <Compass size={16} />
                <span>AI FLOW RECOMMENDATION</span>
              </div>
              <p className="guidance-msg">
                {chosenDest.color === 'RED' ? (
                  <>
                    <strong>High Congestion at {chosenDest.label}.</strong> Turnstiles are experiencing bottleneck ingress. We recommend taking the perimeter path toward <strong>{recommendedAlt}</strong> for a shorter wait.
                  </>
                ) : (
                  <>
                    <strong>Route is Clear to {chosenDest.label}.</strong> Ingress is operating with zero bottleneck. Follow the direct lighted pathway.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Digital Pass Modal ── */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-tag">DIGITAL FESTIVAL PASS</span>
              <button type="button" className="btn-close-modal" onClick={() => setShowQRModal(false)}>✕</button>
            </div>

            <div className="modal-qr-box">
              <QRCodeSVG
                value={`PRAVAAH-PASS-${attendeeName}-${Date.now()}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#0a081a"
                level="Q"
              />
            </div>

            <div className="modal-attendee-info">
              <span className="modal-name">{attendeeName}</span>
              <span className="modal-tier">FAST-TRACK ENTRY · VIP ACCESS</span>
              <span className="modal-sub">Scan at fairground turnstiles or gate beacons</span>
            </div>

            <button
              type="button"
              className="btn-download-pass"
              onClick={downloadPass}
            >
              {passDownloaded ? (
                <>
                  <Check size={16} />
                  <span>Pass Saved to Wallet</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Save Digital Pass</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
