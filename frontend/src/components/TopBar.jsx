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
import GooeyNav from './GooeyNav';
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

export default function TopBar({ activeView = 'setup', setActiveView }) {
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeView)
  );

  const handleNavChange = (index) => {
    if (setActiveView && NAV_ITEMS[index]) {
      setActiveView(NAV_ITEMS[index].id);
    }
  };

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
              fontSize="2.05rem"
              fontWeight={800}
              color="#ffffff"
              className="topbar-foldtext"
            />
          </div>
        </button>
      </div>

      {/* Center: React Bits GooeyNav */}
      <div className="topbar-center-nav">
        <GooeyNav
          items={NAV_ITEMS}
          activeIndex={activeIndex}
          onChange={handleNavChange}
          theme="dark"
          size="sm"
          frame={true}
          color="#4329d6"
          activeTextColor="#ffffff"
          colors={['#6854de', '#354cfd', '#8e7ee7', '#00ff88']}
          particleCount={14}
          spread={48}
          animationTime={500}
          timeVariance={250}
          gooeyness={0.55}
          wobble={0.4}
          hoverEffect={true}
        />
      </div>

      {/* Right: Balanced spacer without online box */}
      <div className="topbar-spacer" aria-hidden="true" />
    </header>
  );
}
