import { useState, useEffect } from 'react';
import './LiveFeed.css';

const FEEDS = [
  { id: 'f1', label: 'Gate A – Main Entry',   density: 78, trend: 'up'   },
  { id: 'f2', label: 'Main Stage – Front',     density: 95, trend: 'up'   },
  { id: 'f3', label: 'Food Court – East',      density: 62, trend: 'stable'},
  { id: 'f4', label: 'Merch Zone',             density: 41, trend: 'down' },
  { id: 'f5', label: 'Gate B – Exit',          density: 30, trend: 'down' },
  { id: 'f6', label: 'VIP Lounge',             density: 20, trend: 'stable'},
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
      setDensity((d) => Math.min(100, Math.max(5, d + (Math.random() * 10 - 5))));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const colorMap = { red: '#ef4444', yellow: '#eab308', green: '#22c55e' };
  const bgMap    = { red: 'rgba(239,68,68,0.1)', yellow: 'rgba(234,179,8,0.1)', green: 'rgba(34,197,94,0.1)' };

  return (
    <div className="feed-card" id={`feed-${feed.id}`}>
      <div className="feed-header">
        <div className="feed-cam-icon">📹</div>
        <div className="feed-meta">
          <div className="feed-name">{feed.label}</div>
          <div className="feed-status" style={{ color: colorMap[color], background: bgMap[color] }}>
            ● {color === 'red' ? 'CRITICAL' : color === 'yellow' ? 'MODERATE' : 'CLEAR'}
          </div>
        </div>
        <div className="feed-percent" style={{ color: colorMap[color] }}>
          {Math.round(density)}%
        </div>
      </div>

      {/* Simulated video frame with noise animation */}
      <div className="feed-video">
        <div className="video-scanlines" />
        <div className="video-content">
          <div className="crowd-sim">
            {Array.from({ length: Math.round(density / 5) }).map((_, i) => (
              <div key={i} className="crowd-dot"
                style={{
                  left: `${Math.random() * 85 + 5}%`,
                  top:  `${Math.random() * 75 + 10}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  background: colorMap[color],
                }}
              />
            ))}
          </div>
          <div className="video-overlay-text">LIVE · {feed.label.toUpperCase()}</div>
        </div>
      </div>

      <div className="density-bar-wrap">
        <div className="density-bar" style={{ width: `${density}%`, background: colorMap[color] }} />
      </div>
      <div className="density-label">Density: {Math.round(density)}%</div>
    </div>
  );
}

export default function LiveFeed() {
  return (
    <div className="live-feed-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Live CCTV Feeds</h1>
          <p className="page-sub">Real-time crowd density from all venue cameras</p>
        </div>
        <div className="live-badge">● LIVE</div>
      </header>
      <div className="feeds-grid">
        {FEEDS.map((f) => <FeedCard key={f.id} feed={f} />)}
      </div>
    </div>
  );
}
