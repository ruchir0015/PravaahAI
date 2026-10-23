import { useState, useEffect } from 'react';
import './App.css';
import TopBar from './components/TopBar.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import ZoneMap from './components/ZoneMap.jsx';
import QRPortal from './components/QRPortal.jsx';
import AttendeeView from './components/AttendeeView.jsx';
import Map from './components/Map.jsx';
import CrowdDashboard from './components/CrowdDashboard.jsx';

const VIEWS = {
  dashboard: CrowdDashboard,
  setup: VenueSetup,
  map: Map,
  live: LiveFeed,
  zones: ZoneMap,
  qr: QRPortal,
  attendee: AttendeeView,
};

function getInitialView() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (VIEWS[hash]) return hash;
  if (hash === 'venue') return 'setup';
  const params = new URLSearchParams(window.location.search);
  const tab = (params.get('tab') || '').toLowerCase();
  if (VIEWS[tab]) return tab;
  if (tab === 'venue') return 'setup';
  return 'dashboard';
}

function App() {
  const [activeView, setActiveViewState] = useState(getInitialView);
  const [venueData, setVenueData] = useState(null);
  const [zoneData, setZoneData] = useState(null);

  const setActiveView = (view) => {
    setActiveViewState(view);
    window.location.hash = view;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VIEWS[hash]) setActiveViewState(hash);
      else if (hash === 'venue') setActiveViewState('setup');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const ActiveComponent = VIEWS[activeView] || CrowdDashboard;

  return (
    <div className="app-root">
      <TopBar activeView={activeView} setActiveView={setActiveView} />
      <div className="app-shell">
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
