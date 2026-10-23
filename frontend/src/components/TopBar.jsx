import {
  Cpu,
  MapPin,
  Globe,
  Video,
  Activity,
  QrCode,
  Users,
} from 'lucide-react';
import FoldText from './FoldText';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'AI Dashboard', icon: <Cpu size={15} /> },
  { id: 'setup',    label: 'Venue Setup',   icon: <MapPin size={15} /> },
  { id: 'map',      label: 'Geo Map',       icon: <Globe size={15} /> },
  { id: 'live',     label: 'Live Feeds',    icon: <Video size={15} /> },
  { id: 'zones',    label: 'Zone Monitor',  icon: <Activity size={15} /> },
  { id: 'qr',      label: 'QR Portal',     icon: <QrCode size={15} /> },
  { id: 'attendee', label: 'Attendee View', icon: <Users size={15} /> },
];

export default function TopBar({ activeView = 'dashboard', setActiveView }) {
  return (
    <header className="fixed-topbar" id="main-topbar">
      {/* Left: Brand with FoldText */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => setActiveView && setActiveView('dashboard')}
          title="Pravaah Crowd Command"
        >
          <div className="topbar-logo-wrap">
            <img src="/logoo.png" alt="Pravaah Logo" className="topbar-logo" />
          </div>
          <div className="topbar-brand-title-wrap">
            <FoldText
              text="Pravaah"
              foldStyle="paper"
              splitBy="char"
              hinge="top"
              trigger="mount"
              foldAngle={92}
              duration={0.7}
              stagger={0.045}
              staggerFrom="start"
              ease="power3.out"
              hoverRefold={true}
              refoldRadius={160}
              refoldAngle={45}
              perspective={800}
              creaseShading={0.45}
              fontSize="1.9rem"
              fontWeight={800}
              color="var(--color-indigo-ink-950)"
              className="topbar-foldtext"
            />
          </div>
        </button>
      </div>

      {/* Center: Modern Interactive Navigation */}
      <nav className="topbar-center-nav">
        <div className="topbar-nav-pill-group">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                className={`topbar-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveView && setActiveView(item.id)}
              >
                <span className="topbar-nav-icon">{item.icon}</span>
                <span className="topbar-nav-label">{item.label}</span>
                {isActive && <span className="topbar-active-glow" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: Balanced Spacer */}
      <div className="topbar-spacer" aria-hidden="true" />
    </header>
  );
}
