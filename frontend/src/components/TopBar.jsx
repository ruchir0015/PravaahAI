import {
  Compass,
  MapPin,
  Sparkles,
} from 'lucide-react';
import FoldText from './FoldText';
import PillNav from './PillNav';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', href: '#dashboard' },
  { id: 'setup',     label: 'Fairgrounds & Cameras', href: '#setup' },
  { id: 'attendee',  label: 'Visitor Pass & Guide', href: '#attendee' },
];

export default function TopBar({ activeView = 'dashboard', setActiveView }) {
  const currentHref =
    activeView === 'live' || activeView === 'zones'
      ? '#dashboard'
      : `#${activeView}`;

  const handleItemClick = (item, index, event) => {
    event?.preventDefault();
    if (item?.id && setActiveView) {
      setActiveView(item.id);
    }
  };

  return (
    <header className="fixed-topbar" id="main-topbar">
      {/* Left: Brand with Pravaah Logo and FoldText */}
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
                color="#0d082b"
                className="topbar-foldtext"
              />
            </div>
          </div>
        </button>
      </div>

      {/* Center: React Bits PillNav stretched across center with larger text and no icons */}
      <nav className="topbar-center-nav">
        <PillNav
          items={NAV_ITEMS}
          activeHref={currentHref}
          onItemClick={handleItemClick}
          theme="light"
          layout="joined"
          itemStyle="pill"
          hoverEffect="fill"
          indicator="dot"
          size="xl"
          surface="glass"
          highlightColor="#4329d6"
          highlightTextColor="#ffffff"
        />
      </nav>

      {/* Right: Balance spacing for centered navigation */}
      <div className="topbar-right" />
    </header>
  );
}

