import {
  Compass,
  MapPin,
  Sparkles,
  Radio,
  Waves
} from 'lucide-react';
import FoldText from './FoldText';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: <Compass size={15} strokeWidth={2.2} /> },
  { id: 'setup',     label: 'Fairgrounds & Cameras', icon: <MapPin size={15} strokeWidth={2.2} /> },
  { id: 'attendee',  label: 'Visitor Pass & Guide', icon: <Sparkles size={15} strokeWidth={2.2} /> },
];

export default function TopBar({ activeView = 'dashboard', setActiveView }) {
  return (
    <header className="fixed-topbar" id="main-topbar">
      {/* Left: Brand with Pravaah and Festival Subtitle */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => setActiveView && setActiveView('dashboard')}
          title="Pravaah · Unified Event Crowd Command"
        >
          <div className="topbar-logo-wrap">
            <img src="/logoo.png" alt="Pravaah Logo" className="topbar-logo" />
            <div className="topbar-logo-glow" />
          </div>
          <div className="topbar-brand-info">
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
                fontSize="2.05rem"
                fontWeight={800}
                color="#ffffff"
                className="topbar-foldtext"
              />
            </div>
            <span className="topbar-brand-sub">प्रवाह · Real-Time Crowd &amp; Fleet Command</span>
          </div>
        </button>
      </div>

      {/* Center: Clean 3-Item Navigation */}
      <nav className="topbar-center-nav">
        <div className="topbar-nav-pill-group">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id || (item.id === 'dashboard' && (activeView === 'live' || activeView === 'zones'));
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

      {/* Right: Operational Status Indicator */}
      <div className="topbar-right">
        <div className="topbar-live-status">
          <span className="topbar-status-pulse" />
          <span className="topbar-status-text">SYSTEM HARMONIZED</span>
        </div>
      </div>
    </header>
  );
}
