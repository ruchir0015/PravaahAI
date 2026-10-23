import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'setup',    icon: '🗺️',  label: 'Venue Setup' },
  { id: 'live',     icon: '📹',  label: 'Live Feeds' },
  { id: 'zones',    icon: '🔴',  label: 'Zone Monitor' },
  { id: 'qr',      icon: '📲',  label: 'QR Portal' },
  { id: 'attendee', icon: '👤',  label: 'Attendee View' },
];

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">⚡</span>
        <div>
          <div className="brand-name">Pravaah</div>
          <div className="brand-sub">Crowd Command</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {activeView === item.id && <span className="nav-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot online" />
        <span>System Online</span>
      </div>
    </aside>
  );
}
