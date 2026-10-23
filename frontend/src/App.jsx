import { useState, useEffect } from 'react';
import './App.css';
import TopBar from './components/TopBar.jsx';
import CrowdDashboard from './components/CrowdDashboard.jsx';
import Grainient from './components/Grainient';
import VenueSetup from './components/VenueSetup.jsx';
import AttendeeView from './components/AttendeeView.jsx';

const VIEWS = {
  dashboard: CrowdDashboard,
  setup: VenueSetup,
  attendee: AttendeeView,
};

function normalizeView(v) {
  const clean = (v || '').toLowerCase().replace('#', '').trim();
  if (VIEWS[clean]) return clean;
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

  const ActiveComponent = VIEWS[activeView] || CrowdDashboard;

  return (
    <div className="app-root">
      {/* Animated Liquid Satin Film-Grain Shader Background */}
      <div className="app-grainient-bg" aria-hidden="true">
        <Grainient
          colors={["#000000", "#373737", "#0a0909", "#25292d", "#33312e"]}
          angle={55}
          flow={0.8}
          silk={0.48}
          grainAmount={0.08}
          speed={0.05}
        />
      </div>

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

