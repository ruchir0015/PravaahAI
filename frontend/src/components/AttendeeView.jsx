import { useState, useEffect } from 'react';
import {
  Mic,
  Utensils,
  ShoppingBag,
  Sparkles,
  DoorOpen,
  HeartPulse,
  LogOut,
  Clock,
  AlertTriangle,
  MapPin,
  Navigation,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import TechText from './TechText';
import './AttendeeView.css';

const API = "http://localhost:5050";
const POLL_MS = 2500;

const STATUS_MAP = {
  RED:    { label: 'HIGH CROWD · AVOID', text: '#ff3b5c',  bg: 'rgba(255,59,92,0.18)', border: '#ff3b5c',  fill: 'rgba(255,59,92,0.22)', stroke: '#ff3b5c' },
  YELLOW: { label: 'MODERATE FLOW',      text: '#ffc107', bg: 'rgba(255,193,7,0.16)', border: '#ffc107', fill: 'rgba(255,193,7,0.20)', stroke: '#ffc107' },
  GREEN:  { label: 'OPTIMAL · SAFE',     text: '#00ff88', bg: 'rgba(0,255,136,0.14)', border: '#00ff88', fill: 'rgba(0,255,136,0.18)', stroke: '#00ff88' },
};

const YOU_X = 50;
const YOU_Y = 88;

export default function AttendeeView({ venueData }) {
  const [status, setStatus] = useState(null);
  const [chosenId, setChosenId] = useState(null);

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
        console.warn('Backend not accessible for attendee portal');
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
  const venueTitle = venueData?.name || activeDataset.venue_name || 'Active Venue Concourse';
  const suggestions = status?.suggestions || [];

  // Map backend zones to attendee destinations
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

  // Find green alternative if chosen is red
  const greenAlts = destinations.filter(d => d.color === 'GREEN');
  const recommendedAlt = greenAlts.length > 0 ? greenAlts[0].label : 'External Open Plaza';

  return (
    <div className="attendee-page">
      <header className="att-header">
        <div className="att-brand">
          <div className="att-brand-logo-wrap">
            <img src="/logoo.png" alt="Pravaah" className="att-brand-logo" />
          </div>
          <span className="att-brand-name">Pravaah Attendee Portal</span>
        </div>
        <div className="att-venue">
          {venueTitle}
        </div>
        <div className="att-ticket-chip">
          <span className="att-chip-dot" />
          <span>LIVE CROWD TELEMETRY · ATT-001</span>
        </div>
      </header>

      <div className="att-body">
        {/* Dynamic Vector Venue Map with AI Path Guidance */}
        <div className="att-map-wrap">
          <svg
            className="att-map-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Venue map"
          >
            {/* Baseplate and flow grid */}
            <rect width="100" height="100" fill="#09061e" />
            <path d="M 10 50 L 90 50 M 50 10 L 50 90" stroke="rgba(104, 84, 222, 0.12)" strokeWidth="0.5" strokeDasharray="2 2" />

            {/* Calibrated Sectors */}
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
                    rx="2"
                    fill={s.fill}
                    stroke={isSelected ? '#ffffff' : s.stroke}
                    strokeWidth={isSelected ? '1.2' : '0.6'}
                    opacity={isSelected ? 1 : 0.85}
                  />
                  <text
                    x={d.cx}
                    y={d.cy - 1}
                    textAnchor="middle"
                    className="map-zone-label"
                    fill="#ffffff"
                    fontSize="3.2"
                    fontWeight="800"
                  >
                    {d.id}
                  </text>
                  <text
                    x={d.cx}
                    y={d.cy + 3.5}
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

            {/* Dynamic AI Navigation Vector from You to Destination */}
            {chosenDest && (
              <line
                x1={YOU_X}
                y1={YOU_Y}
                x2={chosenDest.cx}
                y2={chosenDest.cy}
                stroke={chosenDest.color === 'RED' ? '#ff3b5c' : '#00ff88'}
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                strokeLinecap="round"
              />
            )}

            {/* "You Are Here" Marker */}
            <circle
              cx={YOU_X}
              cy={YOU_Y}
              r="2.2"
              fill="#4329d6"
              stroke="white"
              strokeWidth="0.8"
            />
            <circle
              cx={YOU_X}
              cy={YOU_Y}
              r="4.5"
              fill="#4329d6"
              opacity="0.25"
            />
            <text
              x={YOU_X}
              y={YOU_Y + 6.5}
              textAnchor="middle"
              className="map-you-label"
              fill="#c5bdf5"
              fontSize="2.5"
              fontWeight="700"
            >
              You are here
            </text>

            {/* Target Destination Pin */}
            {chosenDest && (
              <circle
                cx={chosenDest.cx}
                cy={chosenDest.cy}
                r="2.6"
                fill={STATUS_MAP[chosenDest.color]?.stroke || '#00ff88'}
                stroke="white"
                strokeWidth="0.8"
              />
            )}
          </svg>

          {/* Legend */}
          <div className="att-legend-bar">
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <div key={k} className="att-legend-item">
                <span className="legend-dot" style={{ backgroundColor: v.border }} />
                <span className="legend-item-label">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Destination Guidance Panel */}
        <div className="att-panel">
          <div className="att-panel-header">
            <h2 className="section-title">Where do you want to go?</h2>
            <div className="techttext-subheading-wrap" style={{ maxWidth: '360px', height: '26px' }}>
              <TechText
                text="AI crowd rerouting and live queue avoidance"
                fontWeight={600}
                fontSize={13.5}
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

          {/* Real Calibrated Sectors List */}
          <div className="dest-list">
            {destinations.map((d) => {
              const s = STATUS_MAP[d.color] || STATUS_MAP.GREEN;
              const isChosen = chosenDest?.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  id={`dest-${d.id}`}
                  className={`dest-card ${isChosen ? 'dest-chosen' : ''}`}
                  onClick={() => setChosenId(d.id)}
                >
                  <div className="dest-left">
                    <div className="dest-icon-box" style={{ background: s.bg, borderColor: s.border }}>
                      <Navigation size={18} color={s.text} />
                    </div>
                    <div className="dest-info">
                      <div className="dest-name">{d.label}</div>
                      <div className="dest-eta-row">
                        <span className="dest-eta">Density: {d.saturation.toFixed(0)}%</span>
                        <span className="dest-dot">·</span>
                        <span className="dest-alt" style={{ color: s.text }}>
                          {d.color === 'RED' ? 'High Crush Risk' : d.color === 'YELLOW' ? 'Moderate Queue' : 'Fast Free Flow'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="dest-status-badge"
                    style={{
                      color: s.text,
                      backgroundColor: s.bg,
                      borderColor: s.border,
                    }}
                  >
                    {d.color}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Navigation Directive Banner */}
          {chosenDest && (
            <div className="att-route-card">
              <div className="att-route-header">
                <span className="att-route-title">AI ROUTE RECOMMENDATION</span>
                <span className="att-route-dest">{chosenDest.label}</span>
              </div>
              {chosenDest.color === 'RED' ? (
                <div className="att-route-warn">
                  <AlertTriangle size={16} color="#ff3b5c" />
                  <span>
                    <strong>CONGESTION WARNING:</strong> {chosenDest.label} is currently RED ({chosenDest.saturation.toFixed(0)}% saturation).
                    Authorities advise rerouting to <strong>{recommendedAlt}</strong> to bypass turnstile queues.
                  </span>
                </div>
              ) : (
                <div className="att-route-ok">
                  <ShieldCheck size={16} color="#00ff88" />
                  <span>
                    <strong>CLEAR ROUTE:</strong> {chosenDest.label} is operating in free-flow state ({chosenDest.saturation.toFixed(0)}% density). Direct route clear.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
