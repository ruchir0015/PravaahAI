import { useState } from 'react';
import './App.css';
import TopBar from './components/TopBar.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import ZoneMap from './components/ZoneMap.jsx';
import QRPortal from './components/QRPortal.jsx';
import AttendeeView from './components/AttendeeView.jsx';
import Map from './components/Map.jsx';
import CrowdDashboard from './components/CrowdDashboard.jsx';
import Grainient from './components/Grainient';

const VIEWS = {
  dashboard: CrowdDashboard,
  setup: VenueSetup,
  map: Map,
  live: LiveFeed,
  zones: ZoneMap,
  qr: QRPortal,
  attendee: AttendeeView,
};

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [venueData, setVenueData] = useState(null);
  const [zoneData, setZoneData] = useState(null);

  const ActiveComponent = VIEWS[activeView] || VenueSetup;

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

