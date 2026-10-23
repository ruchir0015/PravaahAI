import { useState, useEffect } from 'react';
import './ZoneMap.css';

const INITIAL_ZONES = [
  { id: 'main-stage',    label: 'Main Stage',      x: 38, y: 22, w: 24, h: 18, density: 92, capacity: 500 },
  { id: 'food-court',    label: 'Food Court',       x: 12, y: 52, w: 28, h: 20, density: 65, capacity: 300 },
  { id: 'entry-gate-a',  label: 'Entry Gate A',     x: 4,  y: 78, w: 18, h: 12, density: 38, capacity: 200 },
  { id: 'entry-gate-b',  label: 'Entry Gate B',     x: 76, y: 78, w: 18, h: 12, density: 42, capacity: 200 },
  { id: 'merch-zone',    label: 'Merch & Exhibits', x: 66, y: 22, w: 22, h: 20, density: 55, capacity: 250 },
  { id: 'vip-lounge',   label: 'VIP Lounge',        x: 38, y: 45, w: 22, h: 14, density: 28, capacity: 100 },
];

function getColor(density) {
  if (density >= 80) return 'red';
  if (density >= 50) return 'yellow';
  return 'green';
}

const COLOR_MAP = {
  red:    { bg: 'rgba(239,68,68,0.3)',    border: '#ef4444', text: '#fca5a5' },
  yellow: { bg: 'rgba(234,179,8,0.3)',    border: '#eab308', text: '#fde047' },
  green:  { bg: 'rgba(34,197,94,0.3)',    border: '#22c55e', text: '#86efac' },
};

const ALERTS = [
  { id: 1, time: '14:32', zone: 'Main Stage', msg: 'Capacity at 92% — redirect attendees', level: 'red' },
  { id: 2, time: '14:28', zone: 'Food Court', msg: 'Density rising, open overflow lane', level: 'yellow' },
  { id: 3, time: '14:15', zone: 'Entry Gate A', msg: 'Flow normalised', level: 'green' },
];

export default function ZoneMap({ venueData, zoneData }) {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setZones((prev) => prev.map((z) => ({
        ...z,
        density: Math.min(100, Math.max(5, z.density + (Math.random() * 8 - 4))),
      })));
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const sel = selected ? zones.find((z) => z.id === selected) : null;

  return (
    <div className="zone-map-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Zone Monitor</h1>
          <p className="page-sub">
            {venueData ? venueData.name : 'Live crowd density across all venue zones'}
          </p>
        </div>
        <div className="zone-stats">
          {[['red','🔴','Critical'],['yellow','🟡','Moderate'],['green','🟢','Clear']].map(([c,e,l]) => (
            <div key={c} className="zone-stat">
              <span>{e}</span>
              <span className="zone-stat-count">{zones.filter(z=>getColor(z.density)===c).length}</span>
              <span className="zone-stat-label">{l}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="zone-body">
        {/* Map */}
        <div className="card zone-canvas-card">
          <h3 className="card-title">Venue Heatmap</h3>
          <div className="zone-canvas">
            {/* Background grid */}
            <div className="canvas-grid" />
            {venueData?.mapImage && (
              <img src={venueData.mapImage} alt="venue" className="zone-map-img" />
            )}
            {zones.map((z) => {
              const color = getColor(z.density);
              const c = COLOR_MAP[color];
              return (
                <button
                  key={z.id}
                  id={`zone-btn-${z.id}`}
                  className={`zone-block ${selected === z.id ? 'zone-selected' : ''}`}
                  style={{
                    left: `${z.x}%`, top: `${z.y}%`,
                    width: `${z.w}%`, height: `${z.h}%`,
                    background: c.bg, border: `2px solid ${c.border}`,
                  }}
                  onClick={() => setSelected(selected === z.id ? null : z.id)}
                >
                  <span className="zone-block-label" style={{ color: c.text }}>{z.label}</span>
                  <span className="zone-block-density" style={{ color: c.text }}>{Math.round(z.density)}%</span>
                  <div className="zone-pulse" style={{ background: c.border }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="zone-right">
          {/* Detail panel */}
          {sel ? (
            <div className="card zone-detail">
              <h3 className="card-title">{sel.label}</h3>
              <div className="detail-row">
                <span>Density</span>
                <strong style={{ color: COLOR_MAP[getColor(sel.density)].text }}>{Math.round(sel.density)}%</strong>
              </div>
              <div className="detail-row">
                <span>Estimated occupancy</span>
                <strong>{Math.round(sel.density / 100 * sel.capacity)} / {sel.capacity}</strong>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <strong style={{ color: COLOR_MAP[getColor(sel.density)].text }}>
                  {getColor(sel.density).toUpperCase()}
                </strong>
              </div>
              <div className="density-bar-wrap mt-12">
                <div className="density-bar" style={{ width: `${sel.density}%`, background: COLOR_MAP[getColor(sel.density)].border }} />
              </div>
            </div>
          ) : (
            <div className="card zone-detail placeholder-card">
              <span style={{ fontSize: 36 }}>👆</span>
              <span>Click a zone to see details</span>
            </div>
          )}

          {/* Alerts */}
          <div className="card alerts-card">
            <h3 className="card-title">Live Alerts</h3>
            <div className="alerts-list">
              {ALERTS.map((a) => (
                <div key={a.id} className={`alert-item alert-${a.level}`}>
                  <div className="alert-row">
                    <span className="alert-time">{a.time}</span>
                    <span className="alert-zone">{a.zone}</span>
                  </div>
                  <div className="alert-msg">{a.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
