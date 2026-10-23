import { useState, useEffect } from 'react';
import {
  Video,
  ShieldAlert,
  Radio,
  Eye,
  Maximize2,
  Users,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  RefreshCw
} from 'lucide-react';
import TechText from './TechText';
import './LiveFeed.css';

const API = "http://localhost:5050";
const POLL_MS = 2000;

const COLOR_MAP = {
  RED:    { fg: '#ff3b5c', bg: 'rgba(255,59,92,0.18)', border: '#ff3b5c', glow: '0 0 16px rgba(255,59,92,0.35)', label: 'CRITICAL' },
  YELLOW: { fg: '#ffc107', bg: 'rgba(255,193,7,0.16)', border: '#ffc107', glow: '0 0 12px rgba(255,193,7,0.3)', label: 'MODERATE' },
  GREEN:  { fg: '#00ff88', bg: 'rgba(0,255,136,0.14)', border: '#00ff88', glow: '0 0 10px rgba(0,255,136,0.25)', label: 'OPTIMAL' },
};

/* Real-Time Live Camera / Sector Card */
function SectorCameraCard({ zone }) {
  const colKey = zone.color || 'GREEN';
  const c = COLOR_MAP[colKey] || COLOR_MAP.GREEN;
  const sat = zone.saturation_pct || 0;

  return (
    <div className={`bento-cam-card ${colKey === 'RED' ? 'is-critical' : ''}`} style={{ borderColor: c.border }}>
      {/* Top Header info */}
      <div className="bento-cam-header">
        <div className="bento-cam-tag-group">
          <span className="bento-cam-live-indicator">
            <span className="bento-rec-dot" />
            LIVE
          </span>
          <span className="bento-cam-id">{zone.id}</span>
          <span className="bento-cam-fps">LIVE SENSING</span>
        </div>
        <div className="bento-cam-density-pill" style={{ borderColor: c.border, color: c.fg, backgroundColor: c.bg }}>
          <Users size={12} />
          <span>{sat.toFixed(0)}% DENSITY</span>
        </div>
      </div>

      {/* Surveillance Mini-Viewport */}
      <div className="bento-cam-viewport">
        <div className="bento-cam-grid-overlay" />
        <div className="bento-crosshair bento-crosshair-tl" />
        <div className="bento-crosshair bento-crosshair-tr" />
        <div className="bento-crosshair bento-crosshair-bl" />
        <div className="bento-crosshair bento-crosshair-br" />

        <div className="bento-cam-center-metric">
          <span className="bento-cam-large-sat" style={{ color: c.fg }}>{sat.toFixed(0)}%</span>
          <span className="bento-cam-large-status">{zone.status_label || zone.color}</span>
        </div>

        {/* AI detection banner */}
        <div className="bento-cam-ai-overlay">
          <div className="bento-cam-ai-badge">
            <Activity size={11} />
            <span>ACTIVE · {zone.count || 0} PERSONS</span>
          </div>
          <span className="bento-cam-time">TREND: {zone.trend} ({zone.forecast_sat ? `${zone.forecast_sat}%` : 'STABLE'})</span>
        </div>
      </div>

      {/* Bottom Metadata */}
      <div className="bento-cam-footer">
        <div className="bento-cam-info">
          <span className="bento-cam-name">{zone.label}</span>
          <span className="bento-cam-zone">Capacity Limit: {zone.capacity || 20}</span>
        </div>
        <div className="bento-cam-status-chip" style={{ color: c.fg }}>
          <span className="bento-status-ring" style={{ backgroundColor: c.fg }} />
          {colKey} ({zone.level})
        </div>
      </div>
    </div>
  );
}

export default function LiveFeed() {
  const [status, setStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [backErr, setBackErr] = useState(false);

  // Poll live backend status
  useEffect(() => {
    let unmounted = false;
    const loadStatus = async () => {
      try {
        const [stRes, dsRes] = await Promise.all([
          fetch(`${API}/api/status`),
          fetch(`${API}/api/datasets`)
        ]);
        if (stRes.ok) {
          const stData = await stRes.json();
          if (!unmounted && stData.zones) {
            setStatus(stData);
            setBackErr(false);
          }
        }
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          if (!unmounted) setDatasets(dsData.datasets || []);
        }
      } catch (e) {
        if (!unmounted) setBackErr(true);
      }
    };

    loadStatus();
    const iv = setInterval(loadStatus, POLL_MS);
    return () => {
      unmounted = true;
      clearInterval(iv);
    };
  }, []);

  const handleSwitchDataset = async (datasetId) => {
    setIsSwitching(true);
    try {
      await fetch(`${API}/api/dataset/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId })
      });
    } catch (e) {
      console.error('Switch error', e);
    } finally {
      setIsSwitching(false);
    }
  };

  const zonesObj = status?.zones || {};
  const zonesList = Object.values(zonesObj);
  const activeDataset = status?.dataset || {};
  const summary = status?.summary || {};

  return (
    <div className="live-feed-page">
      {/* ── Top Header ── */}
      <header className="page-header">
        <div>
          <div className="lf-tag-row">
            <span className="lf-tag-pill">AI CROWD VISION MATRIX</span>
            <span className="lf-status-pill">
              <Radio size={12} className="spin-icon-subtle" />
              {backErr ? 'SERVER DISCONNECTED' : 'STREAM SYNCHRONIZED'}
            </span>
          </div>
          <h1 className="page-title">Live Surveillance Feeds &amp; Continuous Heatmap</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text={`${activeDataset.name || 'PETS 2009 Benchmark'} · Real-time thermal diffusion & calibrated zone status`}
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

        {/* Dataset Quick Switcher */}
        <div className="lf-dataset-switcher">
          <span className="lf-ds-label">BENCHMARK SOURCE:</span>
          {datasets.map((ds) => (
            <button
              key={ds.id}
              type="button"
              className={`lf-ds-btn ${ds.is_active ? 'active' : ''}`}
              disabled={isSwitching}
              onClick={() => handleSwitchDataset(ds.id)}
            >
              {ds.id === 'pets2009' ? '🎓 PETS 2009' : ds.id === 'shanghaitech' ? '🏙️ ShanghaiTech' : '🏟️ Arena Concourse'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Surveillance Layout ── */}
      <div className="lf-main-layout">
        {/* Left: Real-time MJPEG Stream with Continuous Thermal Heatmap */}
        <div className="app-card lf-main-stream-card">
          <div className="lf-stream-header">
            <div className="lf-stream-meta">
              <span className="lf-stream-indicator">● LIVE REC</span>
              <span className="lf-stream-title">{activeDataset.name || 'Primary Feed'}</span>
              <span className="lf-stream-desc">{activeDataset.description || 'Continuous AI Inference Feed'}</span>
            </div>
            <div className="lf-stream-badges">
              <span className="lf-stream-chip red">🔴 {summary.red_zones || 0} RED ZONES</span>
              <span className="lf-stream-chip yellow">🟡 {summary.yellow_zones || 0} YELLOW</span>
              <span className="lf-stream-chip green">🟢 {summary.green_zones || 0} GREEN</span>
            </div>
          </div>

          <div className="lf-stream-viewport">
            <img
              src={`${API}/api/video_feed`}
              alt="Live Surveillance Stream with Heatmap"
              className="lf-mjpeg-stream"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="lf-stream-overlay-hud">
              <span className="lf-hud-model">OPTICAL CAMERA FEED</span>
              <span className="lf-hud-fps">LIVE STREAM</span>
            </div>
          </div>
        </div>

        {/* Right: Dynamic Calibrated Sectors Matrix */}
        <div className="lf-sectors-column">
          <div className="lf-sectors-header">
            <h3 className="section-title">Calibrated Sectors ({zonesList.length})</h3>
            <span className="hint-text">Live telemetry per camera coverage area</span>
          </div>

          <div className="lf-sectors-grid">
            {zonesList.length === 0 ? (
              <div className="lf-loading-box">
                <RefreshCw size={24} className="spin-icon" />
                <span>Loading active camera sectors...</span>
              </div>
            ) : (
              zonesList.map((z) => (
                <SectorCameraCard key={z.id} zone={z} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
