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
  Sparkles
} from 'lucide-react';
import MagicBento from './MagicBento';
import TechText from './TechText';
import './LiveFeed.css';

const CAMERAS = [
  {
    id: 'CAM-02',
    name: 'Main Stage — Front Bowl',
    zone: 'Sector Alpha',
    initialDensity: 94,
    status: 'CRITICAL',
    statusColor: '#ef4444',
    fps: '4K · 60 FPS',
    dots: 36,
  },
  {
    id: 'CAM-01',
    name: 'Gate A — Turnstiles',
    zone: 'Sector North',
    initialDensity: 78,
    status: 'MODERATE',
    statusColor: '#f59e0b',
    fps: '1080p · 30 FPS',
    dots: 22,
  },
  {
    id: 'CAM-03',
    name: 'Food Concourse East',
    zone: 'Sector Delta',
    initialDensity: 61,
    status: 'MODERATE',
    statusColor: '#f59e0b',
    fps: '1080p · 30 FPS',
    dots: 18,
  },
  {
    id: 'CAM-04',
    name: 'Merchandise & Plaza',
    zone: 'Sector Gamma',
    initialDensity: 42,
    status: 'OPTIMAL',
    statusColor: '#00ff88',
    fps: '1080p · 30 FPS',
    dots: 10,
  },
];

/* Custom live camera video simulation card */
function LiveCameraCard({ cam, colSpan = 1, rowSpan = 1 }) {
  const [density, setDensity] = useState(cam.initialDensity);

  useEffect(() => {
    const iv = setInterval(() => {
      setDensity((prev) => {
        const delta = (Math.random() - 0.5) * 5;
        return Math.min(100, Math.max(10, Math.round(prev + delta)));
      });
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  const isCritical = density >= 85;
  const isModerate = density >= 50 && density < 85;
  const statusLabel = isCritical ? 'CRITICAL DENSITY' : isModerate ? 'HIGH FLOW' : 'NOMINAL';
  const statusColor = isCritical ? '#ef4444' : isModerate ? '#f59e0b' : '#00ff88';

  return (
    <div className={`bento-cam-card ${isCritical ? 'is-critical' : ''}`}>
      {/* Top Header info */}
      <div className="bento-cam-header">
        <div className="bento-cam-tag-group">
          <span className="bento-cam-live-indicator">
            <span className="bento-rec-dot" />
            REC
          </span>
          <span className="bento-cam-id">{cam.id}</span>
          <span className="bento-cam-fps">{cam.fps}</span>
        </div>
        <div className="bento-cam-density-pill" style={{ borderColor: `${statusColor}44`, color: statusColor }}>
          <Users size={12} />
          <span>{density}%</span>
        </div>
      </div>

      {/* Surveillance Viewport */}
      <div className="bento-cam-viewport">
        {/* Reticle & AI Bounding Crosshairs */}
        <div className="bento-cam-grid-overlay" />
        <div className="bento-crosshair bento-crosshair-tl" />
        <div className="bento-crosshair bento-crosshair-tr" />
        <div className="bento-crosshair bento-crosshair-bl" />
        <div className="bento-crosshair bento-crosshair-br" />

        {/* Dynamic Edge-detected Crowd Particles */}
        <div className="bento-crowd-particles">
          {Array.from({ length: Math.min(32, Math.round(density / 3)) }).map((_, i) => (
            <span
              key={i}
              className="bento-crowd-dot"
              style={{
                left: `${((i * 17 + (i % 3) * 7) % 86) + 7}%`,
                top: `${((i * 23 + (i % 5) * 11) % 72) + 14}%`,
                backgroundColor: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
                animationDelay: `${(i * 0.15).toFixed(2)}s`,
              }}
            />
          ))}
        </div>

        {/* AI detection banner */}
        <div className="bento-cam-ai-overlay">
          <div className="bento-cam-ai-badge">
            <Activity size={11} />
            <span>AI YOLOv11 · {Math.round(density * 1.8)} HEADS</span>
          </div>
          <span className="bento-cam-time">UTC+05:30 · LIVE</span>
        </div>
      </div>

      {/* Bottom Metadata */}
      <div className="bento-cam-footer">
        <div className="bento-cam-info">
          <span className="bento-cam-name">{cam.name}</span>
          <span className="bento-cam-zone">{cam.zone}</span>
        </div>
        <div className="bento-cam-status-chip" style={{ color: statusColor }}>
          <span className="bento-status-ring" style={{ backgroundColor: statusColor }} />
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

export default function LiveFeed() {
  const [filter, setFilter] = useState('all');

  // MagicBento items combining CCTV stream cards with React Bits interactive visuals
  const bentoItems = [
    {
      id: 'cam-main',
      colSpan: 2,
      rowSpan: 2,
      content: <LiveCameraCard cam={CAMERAS[0]} colSpan={2} rowSpan={2} />,
    },
    {
      id: 'vis-analytics',
      label: 'REAL-TIME METRICS',
      title: 'Crowd Inflow Velocity',
      description: 'Sector inflow rate surging +18% past 15 minutes',
      visual: 'analytics',
      icon: <Activity size={15} color="#8e7ee7" />,
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: 'vis-security',
      label: 'EDGE SURVEILLANCE',
      title: 'Vision Guard Active',
      description: 'Autonomous neural density & anomaly detection online',
      visual: 'security',
      icon: <ShieldAlert size={15} color="#00ff88" />,
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: 'cam-gate',
      colSpan: 1,
      rowSpan: 1,
      content: <LiveCameraCard cam={CAMERAS[1]} />,
    },
    {
      id: 'vis-dashboard',
      label: 'LOAD DISTRIBUTION',
      title: 'Venue Sector Loads',
      description: 'Capacity balance between Gate A, Main Stage, and Exhibits',
      visual: 'dashboard',
      icon: <Layers size={15} color="#354cfd" />,
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: 'vis-automation',
      label: 'AI PROTOCOLS',
      title: 'Crowd Re-Route Dispatch',
      description: 'Auto-adjust digital corridor signage when sector density exceeds 85%',
      visual: 'automation',
      icon: <Radio size={15} color="#6854de" />,
      colSpan: 2,
      rowSpan: 2,
    },
    {
      id: 'cam-food',
      colSpan: 1,
      rowSpan: 1,
      content: <LiveCameraCard cam={CAMERAS[2]} />,
    },
    {
      id: 'cam-merch',
      colSpan: 1,
      rowSpan: 1,
      content: <LiveCameraCard cam={CAMERAS[3]} />,
    },
    {
      id: 'vis-integration',
      label: 'OPS DISPATCH HUB',
      title: 'Command Center Synced',
      description: 'Live alerts forwarded to Field Staff mobile terminals',
      visual: 'integration',
      icon: <Sparkles size={15} color="#b4a9ef" />,
      colSpan: 2,
      rowSpan: 1,
    },
  ];

  return (
    <div className="live-feed-page">
      {/* Page Header */}
      <header className="live-page-header">
        <div className="live-title-group">
          <h1 className="live-heading">Edge Vision Feeds</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text="Neural stream telemetry & crowd density distribution"
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

        <div className="live-stats-bar">
          <div className="live-stat-card">
            <span className="live-stat-label">ACTIVE CAMERAS</span>
            <span className="live-stat-val">6 / 6 ONLINE</span>
          </div>
          <div className="live-stat-card">
            <span className="live-stat-label">AI PROCESSING</span>
            <span className="live-stat-val highlight">YOLOv11 · 14ms</span>
          </div>
          <div className="live-stat-card">
            <span className="live-stat-label">TOTAL ATTENDEES</span>
            <span className="live-stat-val">4,820 DETECTED</span>
          </div>
        </div>
      </header>

      {/* React Bits Magic Bento Container */}
      <div className="magic-bento-section">
        <MagicBento
          items={bentoItems}
          columns={4}
          rowHeight={210}
          gap={14}
          radius={18}
          theme="dark"
          glowColor="#4329d6"
          enableBorderGlow={true}
          enableSpotlight={true}
          spotlightRadius={320}
          enableStars={true}
          particleCount={28}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
        />
      </div>
    </div>
  );
}
