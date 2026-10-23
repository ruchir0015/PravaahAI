import { useState } from 'react';
import './AttendeeView.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import DecryptedText from './react-bits/DecryptedText.jsx';

const DESTINATIONS = [
  { id: 'main-stage',    label: 'Main Stage',      icon: '🎤', status: 'red',    eta: '12 min', alt: 'Via Gate B side path' },
  { id: 'food-court',    label: 'Food Court',       icon: '🍔', status: 'yellow', eta: '5 min',  alt: 'Follow yellow markers' },
  { id: 'merch-zone',    label: 'Merch & Exhibits', icon: '🛍️', status: 'green',  eta: '3 min',  alt: 'Direct route clear' },
  { id: 'vip-lounge',   label: 'VIP Lounge',        icon: '⭐', status: 'green',  eta: '4 min',  alt: 'Left from main entrance' },
  { id: 'restrooms',    label: 'Restrooms',          icon: '🚻', status: 'green',  eta: '2 min',  alt: 'Near Gate A signage' },
  { id: 'first-aid',    label: 'First Aid',          icon: '🏥', status: 'green',  eta: '1 min',  alt: 'Emergency access' },
  { id: 'exit',         label: 'Exit / Gate B',      icon: '🚪', status: 'green',  eta: '6 min',  alt: 'Clear route to Gate B' },
];

const STATUS_MAP = {
  red:    { label: 'HIGH CROWD', color: '#ff3b5c', bg: 'rgba(255, 59, 92, 0.15)', border: 'rgba(255, 59, 92, 0.35)' },
  yellow: { label: 'MODERATE',   color: '#ffc107', bg: 'rgba(255, 193, 7, 0.15)', border: 'rgba(255, 193, 7, 0.35)' },
  green:  { label: 'OPTIMAL',    color: 'var(--color-onyx-500)', bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.35)' },
};

const ZONE_POSITIONS = [
  { id: 'main-stage',   x: 38, y: 22, w: 24, h: 18, color: 'red'    },
  { id: 'food-court',   x: 12, y: 52, w: 28, h: 20, color: 'yellow' },
  { id: 'entry-gate-a', x: 4,  y: 78, w: 18, h: 12, color: 'green'  },
  { id: 'entry-gate-b', x: 76, y: 78, w: 18, h: 12, color: 'green'  },
  { id: 'merch-zone',   x: 66, y: 22, w: 22, h: 20, color: 'green'  },
  { id: 'vip-lounge',  x: 38,  y: 45, w: 22, h: 14, color: 'green'  },
];

const YOU_X = 50, YOU_Y = 88;

export default function AttendeeView({ venueData }) {
  const [chosen, setChosen] = useState(null);

  const dest = chosen ? DESTINATIONS.find((d) => d.id === chosen) : null;
  const destZone = chosen ? ZONE_POSITIONS.find((z) => z.id === chosen) : null;

  return (
    <div className="attendee-page">
      <header className="att-header">
        <div className="att-brand">
          <span className="att-brand-icon">⚡</span>
          <span className="att-brand-name">
            <ShinyText text="Pravaah" speed={4} />
          </span>
        </div>
        <div className="att-venue">
          <DecryptedText
            text={venueData?.name ?? 'TechTrix 2026 — Hall A'}
            animateOn="mount"
            speed={25}
          />
        </div>
        <div className="att-badge">
          <span className="att-badge-dot" />
          <span>PASS ACTIVE · ATT-001</span>
        </div>
      </header>

      <div className="att-body">
        {/* Interactive Map */}
        <div className="att-map-wrap">
          <div className="att-map" id="attendee-map">
            <div className="canvas-grid-lines" />

            {venueData?.mapImage && (
              <img src={venueData.mapImage} alt="venue" className="att-map-img" />
            )}

            {/* Zone overlays */}
            {ZONE_POSITIONS.map((z) => {
              const c = STATUS_MAP[z.color];
              return (
                <div
                  key={z.id}
                  className="att-zone"
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    width: `${z.w}%`,
                    height: `${z.h}%`,
                    background: c.bg,
                    borderColor: c.border,
                  }}
                />
              );
            })}

            {/* Dynamic Route Path */}
            {destZone && (
              <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-onyx-500)" />
                    <stop offset="100%" stopColor="var(--color-periwinkle-400)" />
                  </linearGradient>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="var(--color-periwinkle-300)" />
                  </marker>
                </defs>
                <line
                  x1={YOU_X}
                  y1={YOU_Y}
                  x2={destZone.x + destZone.w / 2}
                  y2={destZone.y + destZone.h / 2}
                  stroke="url(#routeGradient)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                  className="animated-route-line"
                />
              </svg>
            )}

            {/* You Are Here Marker */}
            <div className="you-marker" style={{ left: `${YOU_X}%`, top: `${YOU_Y}%` }}>
              <div className="you-dot">
                <div className="you-dot-inner" />
              </div>
              <div className="you-label">You Are Here</div>
            </div>

            {/* Destination Pin */}
            {destZone && (
              <div
                className="dest-pin"
                style={{
                  left: `${destZone.x + destZone.w / 2}%`,
                  top: `${destZone.y + destZone.h / 2}%`,
                }}
              >
                📍
              </div>
            )}
          </div>

          {/* Map Legend */}
          <div className="att-legend">
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <span key={k} className="att-legend-item" style={{ color: v.color }}>
                <span className="legend-indicator-dot" style={{ background: v.color }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Destination Picker Panel */}
        <div className="att-panel">
          <div className="att-panel-header">
            <h2 className="att-panel-title">Where do you want to go?</h2>
            <p className="att-panel-sub">Smart real-time route bypasses high congestion areas</p>
          </div>

          <div className="dest-list">
            {DESTINATIONS.map((d) => {
              const s = STATUS_MAP[d.status];
              const isChosen = chosen === d.id;
              return (
                <button
                  key={d.id}
                  id={`dest-${d.id}`}
                  className={`dest-card ${isChosen ? 'dest-selected' : ''}`}
                  onClick={() => setChosen(isChosen ? null : d.id)}
                >
                  <span className="dest-icon">{d.icon}</span>
                  <div className="dest-info">
                    <div className="dest-name">{d.label}</div>
                    <div className="dest-alt">{d.alt}</div>
                  </div>
                  <div className="dest-right">
                    <div className="dest-eta">⏱ {d.eta}</div>
                    <div
                      className="dest-status"
                      style={{ color: s.color, background: s.bg, borderColor: s.border }}
                    >
                      {s.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {dest && (
            <SpotlightCard className="route-info-card" spotlightColor="rgba(104, 84, 222, 0.16)">
              <div className="route-info-title">
                <span>Optimized Path: {dest.label}</span>
                <span className="route-eta-badge">{dest.eta}</span>
              </div>
              <div className="route-steps">
                <div className="route-step">
                  <span className="step-num">1</span>
                  <span>Start at your current position (Gate A entrance)</span>
                </div>
                <div className="route-step">
                  <span className="step-num">2</span>
                  <span>{dest.alt}</span>
                </div>
                <div className="route-step">
                  <span className="step-num">3</span>
                  <span>Arrive smoothly at {dest.label}</span>
                </div>
              </div>
              {dest.status === 'red' && (
                <div className="route-warning">
                  ⚠️ This destination is currently at peak capacity. An alternate pathway has been highlighted.
                </div>
              )}
            </SpotlightCard>
          )}
        </div>
      </div>
    </div>
  );
}
