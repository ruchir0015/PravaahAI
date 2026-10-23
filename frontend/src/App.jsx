import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar.jsx';
import VenueSetup from './components/VenueSetup.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import ZoneMap from './components/ZoneMap.jsx';
import QRPortal from './components/QRPortal.jsx';
import AttendeeView from './components/AttendeeView.jsx';
import Map from './components/Map.jsx';
import DotGridBackground from './components/react-bits/DotGridBackground.jsx';
import ClickSpark from './components/react-bits/ClickSpark.jsx';

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
    <div className="app-shell">
      <DotGridBackground />
      <ClickSpark />
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
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
  );
}

export default App;
