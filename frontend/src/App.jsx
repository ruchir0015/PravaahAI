import { useState } from 'react';
import './App.css';
import TopBar from './components/TopBar.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import ZoneMap from './components/ZoneMap.jsx';
import QRPortal from './components/QRPortal.jsx';
import AttendeeView from './components/AttendeeView.jsx';
import Map from './components/Map.jsx';

const VIEWS = {
  setup: VenueSetup,
  map: Map,
  live: LiveFeed,
  zones: ZoneMap,
  qr: QRPortal,
  attendee: AttendeeView,
};

function App() {
  const [activeView, setActiveView] = useState('setup');
  const [venueData, setVenueData] = useState(null);
  const [zoneData, setZoneData] = useState(null);

  const ActiveComponent = VIEWS[activeView] || VenueSetup;

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
