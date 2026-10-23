import { useState, useEffect } from 'react';
import './LiveFeed.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import DecryptedText from './react-bits/DecryptedText.jsx';

const FEEDS = [
  { id: 'CAM-01', label: 'Gate A – Main Entry',   density: 78, trend: 'up'   },
  { id: 'CAM-02', label: 'Main Stage – Front',     density: 95, trend: 'up'   },
  { id: 'CAM-03', label: 'Food Court – East',      density: 62, trend: 'stable'},
  { id: 'CAM-04', label: 'Merch Zone',             density: 41, trend: 'down' },
  { id: 'CAM-05', label: 'Gate B – Exit',          density: 30, trend: 'down' },
  { id: 'CAM-06', label: 'VIP Lounge',             density: 20, trend: 'stable'},
];

function densityColor(d) {
  if (d >= 80) return 'red';
  if (d >= 50) return 'yellow';
  return 'green';
}

function FeedCard({ feed }) {
  const [density, setDensity] = useState(feed.density);
  const color = densityColor(density);

  useEffect(() => {
    const iv = setInterval(() => {
      setDensity((d) => Math.min(100, Math.max(5, d + (Math.random() * 8 - 4))));
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  const colorMap = {
    red: '#ff3b5c',
    yellow: '#ffc107',
    green: 'var(--color-onyx-500)',
  };
  const bgMap = {
    red: 'rgba(255, 59, 92, 0.12)',
    yellow: 'rgba(255, 193, 7, 0.12)',
    green: 'rgba(0, 255, 136, 0.12)',
  };
  const borderMap = {
    red: 'rgba(255, 59, 92, 0.35)',
    yellow: 'rgba(255, 193, 7, 0.35)',
    green: 'rgba(0, 255, 136, 0.35)',
  };

  return (
    <SpotlightCard className="feed-card" id={`feed-${feed.id}`} spotlightColor="rgba(104, 84, 222, 0.16)">
      <div className="feed-header">
        <div className="feed-cam-icon">📹</div>
        <div className="feed-meta">
          <div className="feed-id-tag">
            <DecryptedText text={feed.id} animateOn="mount" speed={25} />
          </div>
          <div className="feed-name">{feed.label}</div>
        </div>
        <div
          className="feed-status-pill"
          style={{
            color: colorMap[color],
            background: bgMap[color],
            borderColor: borderMap[color],
          }}
        >
          <span className="feed-status-dot" style={{ background: colorMap[color] }} />
          {color === 'red' ? 'CRITICAL' : color === 'yellow' ? 'MODERATE' : 'NORMAL'}
        </div>
      </div>

      {/* Simulated high-tech video frame */}
      <div className="feed-video">
        <div className="video-scanlines" />
        <div className="video-hud">
          <span className="hud-rec">● REC</span>
          <span className="hud-fps">30 FPS</span>
        </div>
        <div className="video-content">
          <div className="crowd-sim">
            {Array.from({ length: Math.round(density / 6) }).map((_, i) => (
              <div
                key={i}
                className="crowd-dot"
                style={{
                  left: `${(i * 19) % 85 + 6}%`,
                  top: `${(i * 27) % 70 + 15}%`,
                  animationDelay: `${(i * 0.3) % 2}s`,
                  background: colorMap[color],
                  boxShadow: `0 0 6px ${colorMap[color]}`,
                }}
              />
            ))}
          </div>
          <div className="video-overlay-text">
            <span>FEED://{feed.id}</span>
            <span>RTSP_LIVE_STREAM</span>
          </div>
        </div>
      </div>

      <div className="feed-footer">
        <div className="density-row">
          <span className="density-metric-title">Occupancy Density</span>
          <span className="density-percent" style={{ color: colorMap[color] }}>
            {Math.round(density)}%
          </span>
        </div>
        <div className="density-bar-wrap">
          <div
            className="density-bar"
            style={{
              width: `${density}%`,
              background: `linear-gradient(90deg, var(--color-indigo-ink-500), ${colorMap[color]})`,
              boxShadow: `0 0 8px ${colorMap[color]}`,
            }}
          />
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function LiveFeed() {
  return (
    <div className="live-feed-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <ShinyText text="Live CCTV Feeds" speed={3.5} />
          </h1>
          <p className="page-sub">Edge AI computer vision monitoring all venue sectors</p>
        </div>
        <div className="live-status-badge">
          <span className="live-blinker" />
          <span>6 CHANNELS STREAMING</span>
        </div>
      </header>
      <div className="feeds-grid">
        {FEEDS.map((f) => (
          <FeedCard key={f.id} feed={f} />
        ))}
      </div>
    </div>
  );
}
