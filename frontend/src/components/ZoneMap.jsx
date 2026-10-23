import { useState, useEffect } from 'react';
import './ZoneMap.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import DecryptedText from './react-bits/DecryptedText.jsx';

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
  red:    { bg: 'rgba(255, 59, 92, 0.25)',   border: '#ff3b5c', text: '#ff8ca0' },
  yellow: { bg: 'rgba(255, 193, 7, 0.25)',   border: '#ffc107', text: '#ffe082' },
  green:  { bg: 'rgba(0, 255, 136, 0.25)',   border: '#00ff88', text: '#99ffcf' },
};

const ALERTS = [
  { id: 1, time: '14:32:08', zone: 'Main Stage', msg: 'Capacity at 92% — dispatch redirect beacons', level: 'red' },
  { id: 2, time: '14:28:44', zone: 'Food Court', msg: 'Density rising, open auxiliary corridor B', level: 'yellow' },
  { id: 3, time: '14:15:19', zone: 'Entry Gate A', msg: 'Flow rate normalised, gate cleared', level: 'green' },
];

export default function ZoneMap({ venueData, zoneData }) {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setZones((prev) =>
        prev.map((z) => ({
          ...z,
          density: Math.min(100, Math.max(5, z.density + (Math.random() * 8 - 4))),
        }))
      );
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const sel = selected ? zones.find((z) => z.id === selected) : null;

  return (
    <div className="zone-map-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <ShinyText text="Zone Monitor" speed={3.5} />
          </h1>
          <p className="page-sub">
            {venueData ? venueData.name : 'Real-time telemetry and crowd density matrix'}
          </p>
        </div>
        <div className="zone-stats-bar">
          {[
            ['red', 'Critical', zones.filter((z) => getColor(z.density) === 'red').length],
            ['yellow', 'Moderate', zones.filter((z) => getColor(z.density) === 'yellow').length],
            ['green', 'Clear', zones.filter((z) => getColor(z.density) === 'green').length],
          ].map(([c, label, count]) => (
            <div key={c} className={`zone-stat-badge stat-badge-${c}`}>
              <span className="stat-indicator-dot" />
              <span className="zone-stat-count">{count}</span>
              <span className="zone-stat-label">{label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="zone-body">
        {/* Map Canvas */}
        <SpotlightCard className="zone-canvas-card" spotlightColor="rgba(104, 84, 222, 0.14)">
          <div className="canvas-header-row">
            <div>
              <h3 className="card-title">Venue Heatmap &amp; Sensor Grid</h3>
              <span className="hint-text">Select any sector for telemetry inspection</span>
            </div>
            <div className="telemetry-badge">
              <span className="telemetry-pulse" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>

          <div className="zone-canvas">
            <div className="canvas-grid-lines" />
            {venueData?.mapImage && (
              <img src={venueData.mapImage} alt="venue" className="zone-map-img" />
            )}
            {zones.map((z) => {
              const color = getColor(z.density);
              const c = COLOR_MAP[color];
              const isSel = selected === z.id;
              return (
                <button
                  key={z.id}
                  id={`zone-btn-${z.id}`}
                  className={`zone-block ${isSel ? 'zone-selected' : ''}`}
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    width: `${z.w}%`,
                    height: `${z.h}%`,
                    background: c.bg,
                    borderColor: c.border,
                  }}
                  onClick={() => setSelected(isSel ? null : z.id)}
                >
                  <span className="zone-block-label" style={{ color: c.text }}>{z.label}</span>
                  <span className="zone-block-density" style={{ color: c.text }}>
                    {Math.round(z.density)}%
                  </span>
                  <div className="zone-pulse" style={{ background: c.border }} />
                </button>
              );
            })}
          </div>
        </SpotlightCard>

        {/* Right side panel */}
        <div className="zone-right">
          {/* Detail card */}
          {sel ? (
            <SpotlightCard className="zone-detail-card" spotlightColor="rgba(53, 76, 253, 0.16)">
              <div className="detail-header">
                <div>
                  <div className="detail-tag">SECTOR DETAILS</div>
                  <h3 className="detail-zone-name">{sel.label}</h3>
                </div>
                <span
                  className="detail-status-pill"
                  style={{
                    color: COLOR_MAP[getColor(sel.density)].text,
                    background: COLOR_MAP[getColor(sel.density)].bg,
                    borderColor: COLOR_MAP[getColor(sel.density)].border,
                  }}
                >
                  {getColor(sel.density).toUpperCase()}
                </span>
              </div>

              <div className="detail-metrics">
                <div className="detail-metric-item">
                  <span className="metric-label">Density Ratio</span>
                  <strong className="metric-val" style={{ color: COLOR_MAP[getColor(sel.density)].text }}>
                    {Math.round(sel.density)}%
                  </strong>
                </div>
                <div className="detail-metric-item">
                  <span className="metric-label">Estimated Occupancy</span>
                  <strong className="metric-val">
                    {Math.round((sel.density / 100) * sel.capacity)} / {sel.capacity}
                  </strong>
                </div>
              </div>

              <div className="detail-bar-wrap">
                <div
                  className="detail-bar-fill"
                  style={{
                    width: `${sel.density}%`,
                    background: COLOR_MAP[getColor(sel.density)].border,
                    boxShadow: `0 0 10px ${COLOR_MAP[getColor(sel.density)].border}`,
                  }}
                />
              </div>
            </SpotlightCard>
          ) : (
            <SpotlightCard className="zone-detail-placeholder" spotlightColor="rgba(180, 169, 239, 0.1)">
              <div className="placeholder-icon">🎯</div>
              <div className="placeholder-text">Click any zone to inspect telemetry</div>
              <span className="placeholder-sub">Real-time attendee density, capacity thresholds, and flow rate</span>
            </SpotlightCard>
          )}

          {/* Alerts card */}
          <SpotlightCard className="alerts-card" spotlightColor="rgba(255, 59, 92, 0.12)">
            <div className="alerts-header">
              <h3 className="card-title">Event Dispatch Alerts</h3>
              <span className="alerts-count-chip">3 Active</span>
            </div>

            <div className="alerts-list">
              {ALERTS.map((a) => (
                <div key={a.id} className={`alert-item alert-${a.level}`}>
                  <div className="alert-meta-row">
                    <span className="alert-time">{a.time}</span>
                    <span className="alert-zone-badge">{a.zone}</span>
                  </div>
                  <div className="alert-msg">
                    <DecryptedText text={a.msg} animateOn="mount" speed={20} />
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}
