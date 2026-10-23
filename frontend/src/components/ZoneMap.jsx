import { useState, useEffect } from 'react';
import { Crosshair, Radio, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import TechText from './TechText';
import './ZoneMap.css';

const API = "http://localhost:5050";
const POLL_MS = 2000;

const COLOR_MAP = {
  RED:    { bg: 'rgba(255,59,92,0.18)',  border: '#ff3b5c', text: '#ff3b5c', glow: '0 0 16px rgba(255,59,92,0.35)', label: 'Critical' },
  YELLOW: { bg: 'rgba(255,193,7,0.16)', border: '#ffc107', text: '#ffc107', glow: '0 0 12px rgba(255,193,7,0.3)', label: 'Moderate' },
  GREEN:  { bg: 'rgba(0,255,136,0.14)', border: '#00ff88', text: '#00ff88', glow: '0 0 10px rgba(0,255,136,0.25)', label: 'Clear' },
};

export default function ZoneMap({ venueData, setActiveView }) {
  const [status, setStatus] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [backErr, setBackErr] = useState(false);

  useEffect(() => {
    let unmounted = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/api/status`);
        if (res.ok) {
          const data = await res.json();
          if (!unmounted && data.zones) {
            setStatus(data);
            setBackErr(false);
            // Default select first zone if none selected
            if (!selectedZoneId && Object.keys(data.zones).length > 0) {
              setSelectedZoneId(Object.keys(data.zones)[0]);
            }
          }
        }
      } catch (e) {
        if (!unmounted) setBackErr(true);
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, POLL_MS);
    return () => {
      unmounted = true;
      clearInterval(iv);
    };
  }, [selectedZoneId]);

  const zonesObj = status?.zones || {};
  const zonesList = Object.values(zonesObj);
  const activeDataset = status?.dataset || {};
  const mapImage = venueData?.mapImage || activeDataset.map_image || '/pets-campus-plan.svg';
  const venueTitle = venueData?.name || activeDataset.venue_name || 'Active Monitored Sector';
  const alerts = status?.alerts || [];

  const redCount = zonesList.filter(z => z.color === 'RED').length;
  const yellowCount = zonesList.filter(z => z.color === 'YELLOW').length;
  const greenCount = zonesList.filter(z => z.color === 'GREEN').length;

  const selZone = selectedZoneId ? zonesObj[selectedZoneId] : null;

  return (
    <div className="zone-map-page">
      <header className="page-header">
        <div>
          <div className="zm-tag-group">
            <span className="zm-tag">PERIMETER SPATIAL RADAR</span>
            <span className="zm-dataset-tag">
              <Cpu size={12} />
              SOURCE: {activeDataset.name || 'PETS 2009 Benchmark'}
            </span>
          </div>
          <h1 className="page-title">Zone Monitor &amp; Spatial Matrix</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text={`${venueTitle} · Real-time continuous thermal crowd density telemetry`}
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

        {/* Live Color Counters */}
        <div className="zone-stats-bar">
          <div className="zone-stat-badge" style={{ backgroundColor: 'rgba(255,59,92,0.12)', borderColor: '#ff3b5c' }}>
            <span className="stat-indicator-dot" style={{ backgroundColor: '#ff3b5c' }} />
            <span className="zone-stat-count" style={{ color: '#ff3b5c' }}>{redCount}</span>
            <span className="zone-stat-label" style={{ color: '#ff3b5c' }}>Red (Critical)</span>
          </div>

          <div className="zone-stat-badge" style={{ backgroundColor: 'rgba(255,193,7,0.12)', borderColor: '#ffc107' }}>
            <span className="stat-indicator-dot" style={{ backgroundColor: '#ffc107' }} />
            <span className="zone-stat-count" style={{ color: '#ffc107' }}>{yellowCount}</span>
            <span className="zone-stat-label" style={{ color: '#ffc107' }}>Yellow (Elevated)</span>
          </div>

          <div className="zone-stat-badge" style={{ backgroundColor: 'rgba(0,255,136,0.12)', borderColor: '#00ff88' }}>
            <span className="stat-indicator-dot" style={{ backgroundColor: '#00ff88' }} />
            <span className="zone-stat-count" style={{ color: '#00ff88' }}>{greenCount}</span>
            <span className="zone-stat-label" style={{ color: '#00ff88' }}>Green (Optimal)</span>
          </div>
        </div>
      </header>

      <div className="zone-body">
        {/* Main Floor Plan Map Canvas */}
        <div className="app-card zone-canvas-card">
          <div className="canvas-header-row">
            <div>
              <h2 className="section-title">Venue Sensor Grid &amp; Color-Coded Sectors</h2>
              <span className="hint-text">Live crowd flow across fairground sectors</span>
            </div>
            <div className="telemetry-badge">
              <Radio size={14} className="telemetry-icon" />
              <span>{backErr ? 'OFFLINE' : 'LIVE'}</span>
            </div>
          </div>

          <div className="zone-canvas">
            <div className="canvas-grid-lines" />
            {mapImage && (
              <img src={mapImage} alt="venue floorplan" className="zone-map-img" />
            )}

            {/* Calibrated Dynamic Sectors */}
            {zonesList.map((z) => {
              const bbox = z.bbox || [0.1, 0.1, 0.4, 0.4];
              const leftPct = bbox[0] * 100;
              const topPct = bbox[1] * 100;
              const widthPct = (bbox[2] - bbox[0]) * 100;
              const heightPct = (bbox[3] - bbox[1]) * 100;

              const c = COLOR_MAP[z.color] || COLOR_MAP.GREEN;
              const isSel = selectedZoneId === z.id;

              return (
                <button
                  key={z.id}
                  id={`zone-btn-${z.id}`}
                  type="button"
                  className={`zone-block ${isSel ? 'zone-selected' : ''}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    backgroundColor: c.bg,
                    borderColor: isSel ? '#ffffff' : c.border,
                    boxShadow: isSel ? `0 0 20px ${c.border}` : c.glow,
                  }}
                  onClick={() => setSelectedZoneId(z.id)}
                >
                  <div className="zone-block-header">
                    <span className="zone-block-label" style={{ color: c.text }}>{z.label}</span>
                    <span className="zone-block-trend" style={{ color: c.text }}>{z.trend}</span>
                  </div>
                  <div className="zone-block-density" style={{ color: c.text }}>
                    {z.saturation_pct.toFixed(0)}%
                  </div>
                  <div className="zone-block-sub" style={{ color: '#ffffff' }}>
                    {z.color} · {z.status_label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Inspection Column: Telemetry & Real-Time Alerts */}
        <div className="zone-sidebar">
          {selZone ? (
            <div className="app-card zone-detail-card">
              <div className="detail-header">
                <div>
                  <span className="detail-id">{selZone.id} · SECTOR TELEMETRY</span>
                  <h3 className="detail-title">{selZone.label}</h3>
                </div>
                <div
                  className="detail-status-pill"
                  style={{
                    backgroundColor: COLOR_MAP[selZone.color]?.bg,
                    borderColor: COLOR_MAP[selZone.color]?.border,
                    color: COLOR_MAP[selZone.color]?.text,
                  }}
                >
                  {selZone.color} ({selZone.level})
                </div>
              </div>

              {/* Progress Bar */}
              <div className="detail-bar-section">
                <div className="detail-bar-labels">
                  <span>Density Saturation</span>
                  <strong style={{ color: COLOR_MAP[selZone.color]?.text }}>{selZone.saturation_pct}%</strong>
                </div>
                <div className="detail-bar-track">
                  <div
                    className="detail-bar-fill"
                    style={{
                      width: `${Math.min(100, selZone.saturation_pct)}%`,
                      backgroundColor: COLOR_MAP[selZone.color]?.text,
                    }}
                  />
                </div>
              </div>

              {/* Telemetry Numbers */}
              <div className="detail-stats-grid">
                <div className="detail-stat-box">
                  <span className="stat-box-lbl">Headcount</span>
                  <span className="stat-box-val">{selZone.count || 0}</span>
                </div>
                <div className="detail-stat-box">
                  <span className="stat-box-lbl">Capacity</span>
                  <span className="stat-box-val">{selZone.capacity || 20}</span>
                </div>
                <div className="detail-stat-box">
                  <span className="stat-box-lbl">Flow Forecast</span>
                  <span className="stat-box-val" style={{ color: COLOR_MAP[selZone.forecast_color]?.text }}>
                    {selZone.forecast_sat ? `${selZone.forecast_sat}%` : '—'}
                  </span>
                </div>
                <div className="detail-stat-box">
                  <span className="stat-box-lbl">Prediction</span>
                  <span className="stat-box-val" style={{ color: COLOR_MAP[selZone.forecast_color]?.text }}>
                    {selZone.forecast_color} {selZone.trend}
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              {selZone.color === 'RED' ? (
                <div className="detail-action-banner alert-red">
                  <AlertTriangle size={16} />
                  <span>CRITICAL CRUSH RISK: Direct crowd reroute away from {selZone.label}.</span>
                </div>
              ) : selZone.color === 'YELLOW' ? (
                <div className="detail-action-banner alert-yellow">
                  <AlertTriangle size={16} />
                  <span>ELEVATED DENSITY: Monitor influx velocity.</span>
                </div>
              ) : (
                <div className="detail-action-banner alert-green">
                  <ShieldCheck size={16} />
                  <span>OPTIMAL FLOW: Concourse operating safely.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="app-card zone-detail-card empty-card">
              <Crosshair size={32} className="empty-icon" />
              <span>Select any calibrated sector on the map to inspect live AI telemetry</span>
            </div>
          )}

          {/* Live System Alerts Feed */}
          <div className="app-card zone-alerts-card">
            <h3 className="section-title">AI Incident &amp; Reroute Directives</h3>
            <div className="zm-alerts-list">
              {alerts.length === 0 ? (
                <div className="no-alerts-msg">
                  <ShieldCheck size={16} color="#00ff88" />
                  <span>All sectors operating in steady state. Zero critical alerts.</span>
                </div>
              ) : (
                alerts.map((a, idx) => (
                  <div
                    key={idx}
                    className={`zm-alert-item ${a.level === 'critical' ? 'is-crit' : 'is-warn'}`}
                  >
                    <div className="alert-top">
                      <span className="alert-type">{a.type}</span>
                      <span className="alert-zone">{a.zone}</span>
                    </div>
                    <div className="alert-msg">{a.msg}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
