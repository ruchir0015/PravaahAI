import { useState } from 'react';
import './AttendeeView.css';

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
  red:    { label: 'HIGH CROWD', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
  yellow: { label: 'MODERATE',   color: '#eab308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)' },
  green:  { label: 'CLEAR',      color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
};

/* Simulated venue map with zones shown as color-coded regions */
const ZONE_POSITIONS = [
  { id: 'main-stage',   x: 38, y: 22, w: 24, h: 18, color: 'red'    },
  { id: 'food-court',   x: 12, y: 52, w: 28, h: 20, color: 'yellow' },
  { id: 'entry-gate-a', x: 4,  y: 78, w: 18, h: 12, color: 'green'  },
  { id: 'entry-gate-b', x: 76, y: 78, w: 18, h: 12, color: 'green'  },
  { id: 'merch-zone',   x: 66, y: 22, w: 22, h: 20, color: 'green'  },
  { id: 'vip-lounge',  x: 38,  y: 45, w: 22, h: 14, color: 'green'  },
];

// Simple path lines between You are here (50,90) and zones
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
          <span className="att-brand-name">Pravaah</span>
        </div>
        <div className="att-venue">{venueData?.name ?? 'TechTrix 2026 — Hall A'}</div>
        <div className="att-badge">🎟️ General · ATT-001</div>
      </header>

      <div className="att-body">
        {/* Interactive map */}
        <div className="att-map-wrap">
          <div className="att-map" id="attendee-map">
            <div className="canvas-grid" />

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
                    left: `${z.x}%`, top: `${z.y}%`,
                    width: `${z.w}%`, height: `${z.h}%`,
                    background: c.bg, border: `1.5px solid ${c.border}`,
                  }}
                />
              );
            })}

            {/* Route line */}
            {destZone && (
              <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                    <polygon points="0 0, 4 2, 0 4" fill="#6366f1" />
                  </marker>
                </defs>
                <line
                  x1={YOU_X} y1={YOU_Y}
                  x2={destZone.x + destZone.w / 2}
                  y2={destZone.y + destZone.h / 2}
                  stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            )}

            {/* You are here marker */}
            <div className="you-marker" style={{ left: `${YOU_X}%`, top: `${YOU_Y}%` }}>
              <div className="you-dot" />
              <div className="you-label">You are here</div>
            </div>

            {/* Destination pin */}
            {destZone && (
              <div
                className="dest-pin"
                style={{
                  left: `${destZone.x + destZone.w / 2}%`,
                  top:  `${destZone.y + destZone.h / 2}%`,
                }}
              >
                📍
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="att-legend">
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <span key={k} className="att-legend-item" style={{ color: v.color }}>
                ● {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Destination picker */}
        <div className="att-panel">
          <div className="att-panel-header">
            <h2 className="att-panel-title">Where do you want to go?</h2>
            <p className="att-panel-sub">Routes avoid crowded zones automatically</p>
          </div>

          <div className="dest-list">
            {DESTINATIONS.map((d) => {
              const s = STATUS_MAP[d.status];
              return (
                <button
                  key={d.id}
                  id={`dest-${d.id}`}
                  className={`dest-card ${chosen === d.id ? 'dest-selected' : ''}`}
                  onClick={() => setChosen(chosen === d.id ? null : d.id)}
                >
                  <span className="dest-icon">{d.icon}</span>
                  <div className="dest-info">
                    <div className="dest-name">{d.label}</div>
                    <div className="dest-alt">{d.alt}</div>
                  </div>
                  <div className="dest-right">
                    <div className="dest-eta">⏱ {d.eta}</div>
                    <div className="dest-status" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {dest && (
            <div className="route-info">
              <div className="route-info-title">Route to {dest.label}</div>
              <div className="route-steps">
                <div className="route-step">📍 Start at your current location (Gate A entrance)</div>
                <div className="route-step">➡️ {dest.alt}</div>
                <div className="route-step">🏁 Arrive at {dest.label} in approx. {dest.eta}</div>
              </div>
              {dest.status === 'red' && (
                <div className="route-warning">
                  ⚠️ This destination is at HIGH capacity. Consider visiting later or explore alternatives.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
