import './Sidebar.css';
import {
  Cpu,
  MapPin,
  Globe,
  Video,
  Activity,
  QrCode,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', Icon: Cpu,      label: 'AI Dashboard',    badge: 'AI' },
  { id: 'setup',    Icon: MapPin,   label: 'Venue Setup',     badge: null },
  { id: 'map',      Icon: Globe,    label: 'Geo Map',         badge: 'GPS' },
  { id: 'live',     Icon: Video,    label: 'Live Feeds',      badge: 'LIVE' },
  { id: 'zones',    Icon: Activity, label: 'Zone Monitor',    badge: '6' },
  { id: 'qr',      Icon: QrCode,   label: 'QR Portal',       badge: null },
  { id: 'attendee', Icon: Users,    label: 'Attendee View',   badge: null },
];

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <img src="/logoo.png" alt="Pravaah" className="brand-logo" />
        </div>
        <div className="brand-text">
          <span className="brand-name">Pravaah</span>
          <span className="brand-sub">CROWD COMMAND</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MONITORING CONSOLE</div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              {isActive && <span className="nav-active-bar" />}
              <ItemIcon className="nav-icon" size={18} strokeWidth={2} />
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className={`nav-badge ${item.badge === 'LIVE' ? 'nav-badge-live' : item.badge === 'GPS' ? 'nav-badge-gps' : item.badge === 'AI' ? 'nav-badge-ai' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-status-row">
          <span className="status-dot-online" />
          <div className="status-meta">
            <span className="status-label">System Online</span>
            <span className="status-sub">All nodes operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
