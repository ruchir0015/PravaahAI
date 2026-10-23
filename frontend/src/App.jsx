import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import ZoneMap from './components/ZoneMap.jsx';
import QRPortal from './components/QRPortal.jsx';
import AttendeeView from './components/AttendeeView.jsx';

const VIEWS = {
  setup: VenueSetup,
  live: LiveFeed,
  zones: ZoneMap,
  qr: QRPortal,
  attendee: AttendeeView,
};

function App() {
  const [activeView, setActiveView] = useState('setup');
  const [venueData, setVenueData] = useState(null);
  const [zoneData, setZoneData] = useState(null);

  const ActiveComponent = VIEWS[activeView];

  return (
    <div style={{ display: 'flex', height: '100svh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <ActiveComponent
          venueData={venueData}
          setVenueData={setVenueData}
          zoneData={zoneData}
          setZoneData={setZoneData}
          setActiveView={setActiveView}
        />
      </main>
    </div>
  );
}

export default App;
