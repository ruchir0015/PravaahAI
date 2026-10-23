import {
  Compass,
  MapPin,
  Sparkles,
} from 'lucide-react';
import FoldText from './FoldText';
import PillNav from './PillNav';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', href: '#dashboard', icon: <Compass size={15} strokeWidth={2.2} /> },
  { id: 'setup',     label: 'Fairgrounds & Cameras', href: '#setup', icon: <MapPin size={15} strokeWidth={2.2} /> },
  { id: 'attendee',  label: 'Visitor Pass & Guide', href: '#attendee', icon: <Sparkles size={15} strokeWidth={2.2} /> },
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

  const handleLogoClick = (event) => {
    event?.preventDefault();
    if (setActiveView) {
      setActiveView('dashboard');
    }
  };

  return (
    <header className="fixed-topbar" id="main-topbar">
      {/* Left: Pravaah Brand Mark */}
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => setActiveView && setActiveView('dashboard')}
          title="Pravaah · Unified Event Crowd Command"
        >
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
                fontSize="1.95rem"
                fontWeight={800}
                color="#0d082b"
                className="topbar-foldtext"
              />
            </div>
          </div>
        </button>
      </div>

      {/* Center: React Bits PillNav with Logo first and 3 Navigation Items */}
      <nav className="topbar-center-nav">
        <PillNav
          logo="/logoo.png"
          logoAlt="Pravaah Logo"
          logoHref="#dashboard"
          onLogoClick={handleLogoClick}
          items={NAV_ITEMS}
          activeHref={currentHref}
          onItemClick={handleItemClick}
          theme="light"
          layout="joined"
          itemStyle="pill"
          hoverEffect="fill"
          indicator="dot"
          size="md"
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

