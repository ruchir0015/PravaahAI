import './Sidebar.css';
import ShinyText from './react-bits/ShinyText.jsx';

const NAV_ITEMS = [
  { id: 'setup',    icon: '🗺️',  label: 'Venue Setup',     badge: null },
  { id: 'map',      icon: '🌐',  label: 'Geo Map',         badge: 'GPS' },
  { id: 'live',     icon: '📹',  label: 'Live Feeds',      badge: 'LIVE' },
  { id: 'zones',    icon: '🔴',  label: 'Zone Monitor',    badge: '6' },
  { id: 'qr',      icon: '📲',  label: 'QR Portal',       badge: null },
  { id: 'attendee', icon: '👤',  label: 'Attendee View',   badge: null },
];

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-wrap">
          <span className="brand-icon">⚡</span>
          <div className="brand-icon-halo" />
        </div>
        <div className="brand-text">
          <div className="brand-name">
            <ShinyText text="Pravaah" speed={4.5} />
          </div>
          <div className="brand-sub">Crowd Command</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MONITORING CONSOLE</div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              {isActive && <div className="nav-active-pill" />}
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className={`nav-badge ${item.badge === 'LIVE' ? 'nav-badge-live' : item.badge === 'GPS' ? 'nav-badge-gps' : ''}`}>
                  {item.badge}
                </span>
              )}
              {isActive && <span className="nav-dot" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-status-card">
          <div className="status-indicator">
            <span className="status-ping" />
            <span className="status-dot online" />
          </div>
          <div className="status-info">
            <span className="status-title">System Online</span>
            <span className="status-sub">All nodes operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
