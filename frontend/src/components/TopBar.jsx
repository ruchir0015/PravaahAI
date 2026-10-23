import FoldText from './FoldText';
import GooeyNav from './GooeyNav';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', href: '#dashboard' },
  { id: 'setup',     label: 'Fairgrounds & Cameras', href: '#setup' },
  { id: 'attendee',  label: 'Visitor Pass & Guide', href: '#attendee' },
];

export default function TopBar({ activeView = 'dashboard', setActiveView }) {
  const currentKey = activeView === 'live' || activeView === 'zones' ? 'dashboard' : activeView;
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex(item => item.id === currentKey));

  const handleNavChange = (index, item) => {
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

      {/* Center: React Bits GooeyNav with WebGL droplet physics */}
      <nav className="topbar-center-nav">
        <GooeyNav
          items={NAV_ITEMS}
          activeIndex={activeIndex}
          onChange={handleNavChange}
          theme="light"
          size="lg"
          frame={true}
          color="#4329d6"
          activeTextColor="#ffffff"
          colors={['#4329d6', '#6854de', '#8e7ee7']}
          particleCount={16}
          spread={62}
          animationTime={600}
          timeVariance={250}
          gooeyness={0.55}
          wobble={0.5}
          hoverEffect={true}
        />
      </nav>

      {/* Right: Balance spacing for centered navigation */}
      <div className="topbar-right" />
    </header>
  );
}


