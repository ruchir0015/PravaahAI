import { useState, useEffect } from 'react';
import './App.css';
import TopBar from './components/TopBar.jsx';
import CrowdDashboard from './components/CrowdDashboard.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import AttendeeView from './components/AttendeeView.jsx';

import Grainient from './components/Grainient';

// Authority views (shown with authority topbar)
const VIEWS = {
  dashboard: CrowdDashboard,
  setup: VenueSetup,
};

// Visitor view (separate standalone view opened via QR scan)
const VISITOR_VIEWS = {
  attendee: AttendeeView,
};

function normalizeView(v) {
  const clean = (v || '').toLowerCase().replace('#', '').trim();
  if (VIEWS[clean]) return clean;
  if (VISITOR_VIEWS[clean]) return clean;
  if (clean === 'venue' || clean === 'camera' || clean === 'cameras') return 'setup';
  if (clean === 'qr' || clean === 'pass' || clean === 'visitor') return 'attendee';
  if (clean === 'live' || clean === 'zones' || clean === 'map') return 'dashboard';
  return 'dashboard';
}

function getInitialView() {
  const hash = window.location.hash;
  if (hash) return normalizeView(hash);
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab) return normalizeView(tab);
  return 'dashboard';
}

function App() {
  const [activeView, setActiveViewState] = useState(getInitialView);
  const [venueData, setVenueData] = useState(null);
  const [zoneData, setZoneData] = useState(null);

  const setActiveView = (view) => {
    const target = normalizeView(view);
    setActiveViewState(target);
    window.location.hash = target;
  };

  useEffect(() => {
    const onHashChange = () => {
      const target = normalizeView(window.location.hash);
      setActiveViewState(target);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Visitor view is a completely separate experience opened via QR scan
  const isVisitorView = activeView === 'attendee';
  const ActiveComponent = isVisitorView ? AttendeeView : (VIEWS[activeView] || CrowdDashboard);

  return (
    <div className="app-root">
      {/* Universal Grainient WebGL Animated Background */}
      <div className="app-grainient-bg" aria-hidden="true">
        <Grainient
          colors={["#06070a", "#10131d", "#181d2e", "#3a4460", "#06070a"]}
          angle={55}
          flow={0.9}
          scale={1.1}
          speed={1.2}
          silk={0.4}
          grainAmount={0.08}
          grainAnimated={true}
        />
      </div>

      {/* Hide navbar on visitor view — it is a separate thing opened by QR */}
      {!isVisitorView && (
        <TopBar activeView={activeView} setActiveView={setActiveView} />
      )}
      <div className={`app-shell ${isVisitorView ? 'visitor-mode' : ''}`}>
        <main className="main-content">
          <ActiveComponent
            venueData={venueData}
            setVenueData={setVenueData}
            zoneData={zoneData}
            setZoneData={setZoneData}
            setActiveView={setActiveView}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
