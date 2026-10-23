import { useState, useEffect } from 'react';
import { Crosshair, Radio, TrendingUp, TrendingDown } from 'lucide-react';
import TechText from './TechText';
import './ZoneMap.css';

const INITIAL_ZONES = [
  { id: 'main-stage',    label: 'Main Stage',      x: 38, y: 22, w: 24, h: 18, density: 92, capacity: 500, trend: 'up' },
  { id: 'food-court',    label: 'Food Court',       x: 12, y: 52, w: 28, h: 20, density: 65, capacity: 300, trend: 'up' },
  { id: 'entry-gate-a',  label: 'Entry Gate A',     x: 4,  y: 78, w: 18, h: 12, density: 38, capacity: 200, trend: 'down' },
  { id: 'entry-gate-b',  label: 'Entry Gate B',     x: 76, y: 78, w: 18, h: 12, density: 42, capacity: 200, trend: 'stable' },
  { id: 'merch-zone',    label: 'Merch & Exhibits', x: 66, y: 22, w: 22, h: 20, density: 55, capacity: 250, trend: 'down' },
  { id: 'vip-lounge',   label: 'VIP Lounge',        x: 38, y: 45, w: 22, h: 14, density: 28, capacity: 100, trend: 'stable' },
];

function getColorKey(density) {
  if (density >= 80) return 'danger';
  if (density >= 50) return 'warning';
  return 'success';
}

const COLOR_MAP = {
  danger:  { bg: 'var(--danger-bg)',   border: 'var(--danger-solid)', text: 'var(--danger-text)', label: 'Critical' },
  warning: { bg: 'var(--warning-bg)',  border: 'var(--warning-solid)', text: 'var(--warning-text)', label: 'Moderate' },
  success: { bg: 'var(--success-bg)',  border: 'var(--success-solid)', text: 'var(--success-text)', label: 'Clear' },
};

const ALERTS = [
  { id: 1, time: '14:32:08', zone: 'Main Stage', msg: 'Capacity at 92% — dispatch redirect beacons', level: 'danger' },
  { id: 2, time: '14:28:44', zone: 'Food Court', msg: 'Density rising, open auxiliary corridor B', level: 'warning' },
  { id: 3, time: '14:15:19', zone: 'Entry Gate A', msg: 'Flow rate normalised, gate cleared', level: 'success' },
];

export default function ZoneMap({ venueData }) {
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
          <h1 className="page-title">Zone Monitor</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text={venueData ? `${venueData.name} · Real-time crowd density` : 'Real-time telemetry and crowd density matrix'}
              fontWeight={600}
              fontSize={15}
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
        <div className="zone-stats-bar">
          {[
            { key: 'danger', label: 'Critical', count: zones.filter((z) => getColorKey(z.density) === 'danger').length },
            { key: 'warning', label: 'Moderate', count: zones.filter((z) => getColorKey(z.density) === 'warning').length },
            { key: 'success', label: 'Clear', count: zones.filter((z) => getColorKey(z.density) === 'success').length },
          ].map(({ key, label, count }) => {
            const c = COLOR_MAP[key];
            return (
              <div
                key={key}
                className="zone-stat-badge"
                style={{ backgroundColor: c.bg, borderColor: c.border }}
              >
                <span className="stat-indicator-dot" style={{ backgroundColor: c.border }} />
                <span className="zone-stat-count" style={{ color: c.text }}>{count}</span>
                <span className="zone-stat-label" style={{ color: c.text }}>{label}</span>
              </div>
            );
          })}
        </div>
      </header>

      <div className="zone-body">
        <div className="app-card zone-canvas-card">
          <div className="canvas-header-row">
            <div>
              <h2 className="section-title">Venue Heatmap &amp; Sensor Grid</h2>
              <span className="hint-text">Select any sector for telemetry inspection</span>
            </div>
            <div className="telemetry-badge">
              <Radio size={14} className="telemetry-icon" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>

          <div className="zone-canvas">
            <div className="canvas-grid-lines" />
            {venueData?.mapImage && (
              <img src={venueData.mapImage} alt="venue" className="zone-map-img" />
            )}
            {zones.map((z) => {
              const colorKey = getColorKey(z.density);
              const c = COLOR_MAP[colorKey];
              const isSel = selected === z.id;
              return (
                <button
                  key={z.id}
                  id={`zone-btn-${z.id}`}
                  type="button"
                  className={`zone-block ${isSel ? 'zone-selected' : ''}`}
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    width: `${z.w}%`,
                    height: `${z.h}%`,
                    backgroundColor: c.bg,
                    borderColor: isSel ? 'var(--accent)' : c.border,
                  }}
                  onClick={() => setSelected(isSel ? null : z.id)}
                >
                  <div className="zone-block-header">
                    <span className="zone-block-label" style={{ color: c.text }}>{z.label}</span>
                    {z.trend === 'up' ? (
                      <TrendingUp size={13} style={{ color: c.text }} />
                    ) : z.trend === 'down' ? (
                      <TrendingDown size={13} style={{ color: c.text }} />
                    ) : null}
                  </div>
                  <div className="zone-block-density" style={{ color: c.text }}>
                    {Math.round(z.density)}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="zone-right">
          {sel ? (
            <div className="app-card zone-detail-card">
              <div className="detail-header">
                <div>
                  <span className="field-label">SECTOR DETAILS</span>
                  <h3 className="section-title detail-zone-name">{sel.label}</h3>
                </div>
                <span
                  className="detail-status-pill"
                  style={{
                    color: COLOR_MAP[getColorKey(sel.density)].text,
                    backgroundColor: COLOR_MAP[getColorKey(sel.density)].bg,
                    borderColor: COLOR_MAP[getColorKey(sel.density)].border,
                  }}
                >
                  {COLOR_MAP[getColorKey(sel.density)].label.toUpperCase()}
                </span>
              </div>

              <div className="detail-metrics">
                <div className="detail-metric-item">
                  <span className="metric-label">Density Ratio</span>
                  <span className="metric-val" style={{ color: COLOR_MAP[getColorKey(sel.density)].text }}>
                    {Math.round(sel.density)}%
                  </span>
                </div>
                <div className="detail-metric-item">
                  <span className="metric-label">Estimated Occupancy</span>
                  <span className="metric-val">
                    {Math.round((sel.density / 100) * sel.capacity)} / {sel.capacity}
                  </span>
                </div>
              </div>

              <div className="detail-bar-wrap">
                <div
                  className="detail-bar-fill"
                  style={{
                    width: `${sel.density}%`,
                    backgroundColor: COLOR_MAP[getColorKey(sel.density)].border,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="app-card zone-detail-placeholder">
              <Crosshair size={32} className="placeholder-icon" strokeWidth={1.5} />
              <div className="placeholder-text">Click any zone to inspect telemetry</div>
              <span className="placeholder-sub">Real-time attendee density, capacity thresholds, and flow rate</span>
            </div>
          )}

          <div className="app-card alerts-card">
            <div className="alerts-header">
              <h3 className="section-title">Event Dispatch Alerts</h3>
              <span className="alerts-count-chip">3 Active</span>
            </div>

            <div className="alerts-list">
              {ALERTS.map((a) => {
                const c = COLOR_MAP[a.level];
                return (
                  <div
                    key={a.id}
                    className="alert-item"
                    style={{
                      borderLeftColor: c.border,
                      backgroundColor: c.bg,
                    }}
                  >
                    <div className="alert-meta-row">
                      <span className="alert-time">{a.time}</span>
                      <span className="alert-zone-badge" style={{ color: c.text }}>{a.zone}</span>
                    </div>
                    <div className="alert-msg">{a.msg}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
