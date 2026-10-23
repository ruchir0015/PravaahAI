import { useState } from 'react';
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
} from 'lucide-react';
import TechText from './TechText';
import './AttendeeView.css';

const DESTINATIONS = [
  { id: 'main-stage',  label: 'Main Stage',      Icon: Mic,         status: 'danger',  eta: '12 min', alt: 'Via Gate B side path' },
  { id: 'food-court',  label: 'Food Court',       Icon: Utensils,    status: 'warning', eta: '5 min',  alt: 'Follow corridor B markers' },
  { id: 'merch-zone',  label: 'Merch & Exhibits', Icon: ShoppingBag, status: 'success', eta: '3 min',  alt: 'Direct route clear' },
  { id: 'vip-lounge',  label: 'VIP Lounge',       Icon: Sparkles,    status: 'success', eta: '4 min',  alt: 'Left from main entrance' },
  { id: 'restrooms',   label: 'Restrooms',         Icon: DoorOpen,    status: 'success', eta: '2 min',  alt: 'Near Gate A signage' },
  { id: 'first-aid',   label: 'First Aid',         Icon: HeartPulse,  status: 'success', eta: '1 min',  alt: 'Emergency access lane' },
  { id: 'exit',        label: 'Exit / Gate B',     Icon: LogOut,      status: 'success', eta: '6 min',  alt: 'Clear route to Gate B' },
];

const STATUS_MAP = {
  danger:  { label: 'HIGH CROWD', text: 'var(--danger-text)',  bg: 'var(--danger-bg)',  border: 'var(--danger-solid)',  fill: 'var(--danger-bg)',  stroke: 'var(--danger-solid)' },
  warning: { label: 'MODERATE',   text: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-solid)', fill: 'var(--warning-bg)', stroke: 'var(--warning-solid)' },
  success: { label: 'OPTIMAL',    text: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-solid)', fill: 'var(--success-bg)', stroke: 'var(--success-solid)' },
};

const ZONES = [
  { id: 'main-stage',   label: 'Main Stage',      x: 38, y: 10, w: 24, h: 20, status: 'danger'  },
  { id: 'merch-zone',   label: 'Merch & Exhibits', x: 68, y: 10, w: 24, h: 20, status: 'success' },
  { id: 'food-court',   label: 'Food Court',       x: 8,  y: 36, w: 24, h: 22, status: 'warning' },
  { id: 'vip-lounge',   label: 'VIP Lounge',       x: 38, y: 36, w: 24, h: 20, status: 'success' },
  { id: 'entry-gate-a', label: 'Gate A',            x: 8,  y: 68, w: 20, h: 16, status: 'success' },
  { id: 'entry-gate-b', label: 'Gate B',            x: 72, y: 68, w: 20, h: 16, status: 'success' },
];

const YOU_X = 50;
const YOU_Y = 90;

export default function AttendeeView({ venueData }) {
  const [chosen, setChosen] = useState(null);

  const dest = chosen ? DESTINATIONS.find((d) => d.id === chosen) : null;
  const destZone = chosen ? ZONES.find((z) => z.id === chosen) : null;

  const destCx = destZone ? destZone.x + destZone.w / 2 : null;
  const destCy = destZone ? destZone.y + destZone.h / 2 : null;

  return (
    <div className="attendee-page">
      <header className="att-header">
        <div className="att-brand">
          <div className="att-brand-logo-wrap">
            <img src="/logoo.png" alt="Pravaah" className="att-brand-logo" />
          </div>
          <span className="att-brand-name">Pravaah</span>
        </div>
        <div className="att-venue">
          {venueData?.name ?? 'TechTrix 2026 — Hall A'}
        </div>
        <div className="att-ticket-chip">
          <span className="att-chip-dot" />
          <span>PASS ACTIVE · ATT-001</span>
        </div>
      </header>

      <div className="att-body">
        <div className="att-map-wrap">
          <svg
            className="att-map-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Venue map"
          >
            {ZONES.map((z) => {
              const s = STATUS_MAP[z.status];
              const isSelected = chosen === z.id;
              return (
                <g key={z.id}>
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx="1.5"
                    fill={s.fill}
                    stroke={s.stroke}
                    strokeWidth={isSelected ? '0.8' : '0.5'}
                    opacity={isSelected ? 1 : 0.85}
                  />
                  <text
                    x={z.x + z.w / 2}
                    y={z.y + z.h - 2.5}
                    textAnchor="middle"
                    className="map-zone-label"
                    fill={s.text}
                  >
                    {z.label}
                  </text>
                </g>
              );
            })}

            {destZone && (
              <line
                x1={YOU_X}
                y1={YOU_Y}
                x2={destCx}
                y2={destCy}
                stroke="var(--accent)"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                strokeLinecap="round"
              />
            )}

            <circle
              cx={YOU_X}
              cy={YOU_Y}
              r="2"
              fill="var(--accent)"
              stroke="white"
              strokeWidth="0.8"
            />
            <circle
              cx={YOU_X}
              cy={YOU_Y}
              r="4"
              fill="var(--accent)"
              opacity="0.15"
            />
            <text
              x={YOU_X}
              y={YOU_Y + 6.5}
              textAnchor="middle"
              className="map-you-label"
            >
              You are here
            </text>

            {destZone && (
              <circle
                cx={destCx}
                cy={destCy}
                r="2.5"
                fill="var(--danger-solid)"
                stroke="white"
                strokeWidth="0.8"
              />
            )}
          </svg>

          <div className="att-legend-bar">
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <div key={k} className="att-legend-item">
                <span className="legend-dot" style={{ backgroundColor: v.border }} />
                <span className="legend-item-label">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="att-panel">
          <div className="att-panel-header">
            <h2 className="section-title">Where do you want to go?</h2>
            <div className="techttext-subheading-wrap" style={{ maxWidth: '360px', height: '26px' }}>
              <TechText
                text="Real-time route guidance avoiding congestion"
                fontWeight={600}
                fontSize={14}
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

          <div className="dest-list">
            {DESTINATIONS.map((d) => {
              const s = STATUS_MAP[d.status];
              const isChosen = chosen === d.id;
              const DestIcon = d.Icon;
              return (
                <button
                  key={d.id}
                  id={`dest-${d.id}`}
                  type="button"
                  className={`dest-card ${isChosen ? 'dest-selected' : ''}`}
                  onClick={() => setChosen(isChosen ? null : d.id)}
                >
                  <div className="dest-icon-box">
                    <DestIcon size={18} strokeWidth={2} />
                  </div>
                  <div className="dest-info">
                    <div className="dest-name">{d.label}</div>
                    <div className="dest-alt">{d.alt}</div>
                  </div>
                  <div className="dest-right">
                    <div className="dest-eta">
                      <Clock size={11} strokeWidth={2} />
                      <span>{d.eta}</span>
                    </div>
                    <div
                      className="dest-status-pill"
                      style={{
                        color: s.text,
                        backgroundColor: s.bg,
                        borderColor: s.border,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {dest && (
            <div className="route-info-card app-card">
              <div className="route-info-title">
                <div className="route-title-left">
                  <Navigation size={14} strokeWidth={2} className="route-nav-icon" />
                  <span>Optimized Path: {dest.label}</span>
                </div>
                <span className="route-eta-badge">{dest.eta}</span>
              </div>
              <div className="route-steps">
                <div className="route-step">
                  <span className="step-num">1</span>
                  <span>Start at your current position (Gate A area)</span>
                </div>
                <div className="route-step">
                  <span className="step-num">2</span>
                  <span>{dest.alt}</span>
                </div>
                <div className="route-step">
                  <span className="step-num">3</span>
                  <span>Arrive at {dest.label}</span>
                </div>
              </div>
              {dest.status === 'danger' && (
                <div className="route-warning">
                  <AlertTriangle size={14} strokeWidth={2} className="warning-icon" />
                  <span>This zone is at peak capacity. An alternate path is recommended.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
