import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Compass,
  Video,
  Map as MapIcon,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  X,
  Radio,
  Sliders,
  RefreshCw,
  Cpu,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Car,
  Navigation,
  Lock,
  Unlock,
  Activity,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import './CrowdDashboard.css';

const API = 'http://localhost:5050';
const POLL_MS = 2000;

// Base Fleet Assets along Venue Corridors (Synchronized with backend corridors C1-C4)
const INITIAL_FLEET = [
  {
    id: 'FLT-101',
    label: 'North Shuttle Alpha',
    corridor: 'C1',
    route: 'C1 · North Axis',
    speed: 42.0,
    eta: '+02:14',
    passengers: 48,
    capacity: 60,
    geofence: 'in-bounds',
    driver: {
      name: 'Suresh K. Patel',
      phone: '+91 98201 44921',
      cdl: 'CDL-MH-042021-9941',
      shift: '06:00 - 14:00 (6.2h)',
      heartRate: 74,
      cabinTemp: 22.4,
    },
    x: 28,
    y: 35,
    vx: 0.12,
    vy: 0.08,
  },
  {
    id: 'FLT-102',
    label: 'Express Concourse Bus',
    corridor: 'C2',
    route: 'C2 · South Arterial',
    speed: 36.5,
    eta: '+04:40',
    passengers: 58,
    capacity: 60, // 96.6% -> Over-capacity warning
    geofence: 'warning',
    driver: {
      name: 'Rameshwar Yadav',
      phone: '+91 94150 88204',
      cdl: 'CDL-UP-201900-5120',
      shift: '08:00 - 16:00 (4.1h)',
      heartRate: 82,
      cabinTemp: 23.1,
    },
    x: 62,
    y: 42,
    vx: -0.15,
    vy: 0.05,
  },
  {
    id: 'FLT-103',
    label: 'Metro Transit Feeder',
    corridor: 'C1',
    route: 'C1 · Metro Plaza',
    speed: 40.0,
    eta: '+01:10',
    passengers: 32,
    capacity: 50,
    geofence: 'in-bounds',
    driver: {
      name: 'Devendra Verma',
      phone: '+91 91200 33819',
      cdl: 'CDL-DL-202208-1104',
      shift: '05:30 - 13:30 (7.0h)',
      heartRate: 71,
      cabinTemp: 21.8,
    },
    x: 45,
    y: 25,
    vx: 0.09,
    vy: -0.06,
  },
  {
    id: 'FLT-104',
    label: 'Ring Perimeter Bus 04',
    corridor: 'C3',
    route: 'C3 · Outer Ring',
    speed: 56.0,
    eta: '+07:30',
    passengers: 42,
    capacity: 50,
    geofence: 'breach', // Breach warning
    driver: {
      name: 'Gurpreet Singh',
      phone: '+91 98114 77209',
      cdl: 'CDL-PB-201804-3329',
      shift: '07:00 - 15:00 (5.4h)',
      heartRate: 88,
      cabinTemp: 24.2,
    },
    x: 82,
    y: 68,
    vx: -0.18,
    vy: -0.12,
  },
  {
    id: 'FLT-105',
    label: 'Emergency Response Unit',
    corridor: 'C4',
    route: 'C4 · Service Gate',
    speed: 28.0,
    eta: '+00:45',
    passengers: 4,
    capacity: 8,
    geofence: 'in-bounds',
    driver: {
      name: 'Capt. Arvind Rao',
      phone: '+91 99880 12345',
      cdl: 'CDL-EMG-201701-0012',
      shift: 'Standby Ready',
      heartRate: 68,
      cabinTemp: 20.5,
    },
    x: 18,
    y: 72,
    vx: 0.05,
    vy: -0.04,
  },
  {
    id: 'FLT-106',
    label: 'Autonomous Evacuation Pod',
    corridor: 'C2',
    route: 'C2 · Central Quad',
    speed: 22.0,
    eta: '+03:00',
    passengers: 12,
    capacity: 16,
    geofence: 'in-bounds',
    driver: {
      name: 'AI Remote Dispatch Unit 2',
      phone: 'ENC-VOIP-CH-09',
      cdl: 'AUTONOMOUS-LVL-4',
      shift: 'Continuous Battery 84%',
      heartRate: 0,
      cabinTemp: 21.0,
    },
    x: 52,
    y: 56,
    vx: 0.08,
    vy: 0.10,
  },
  {
    id: 'FLT-107',
    label: 'East Lot Feeder Shuttle',
    corridor: 'C3',
    route: 'C3 · Overflow Lot',
    speed: 48.0,
    eta: '+05:15',
    passengers: 39,
    capacity: 50,
    geofence: 'in-bounds',
    driver: {
      name: 'Manoj Kumar Tiwari',
      phone: '+91 97210 55198',
      cdl: 'CDL-BR-202009-4412',
      shift: '09:00 - 17:00 (3.2h)',
      heartRate: 76,
      cabinTemp: 22.8,
    },
    x: 74,
    y: 84,
    vx: -0.11,
    vy: 0.07,
  },
  {
    id: 'FLT-108',
    label: 'Marshal Patrol Vehicle',
    corridor: 'C1',
    route: 'C1 · North Perimeter',
    speed: 34.0,
    eta: '+01:50',
    passengers: 2,
    capacity: 5,
    geofence: 'in-bounds',
    driver: {
      name: 'Inspector Vikram Sen',
      phone: '+91 98390 66210',
      cdl: 'CDL-POL-201602-8819',
      shift: '04:00 - 12:00 (7.8h)',
      heartRate: 79,
      cabinTemp: 22.0,
    },
    x: 36,
    y: 18,
    vx: 0.14,
    vy: 0.05,
  },
];

export default function CrowdDashboard() {
  const [status, setStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('gis'); // 'gis' | 'video'
  const [fleetList, setFleetList] = useState(INITIAL_FLEET);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'WARN' | 'CRIT'
  const [globalPIIRevealed, setGlobalPIIRevealed] = useState(false);
  const [inlineRevealedIds, setInlineRevealedIds] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [dispatcherNotes, setDispatcherNotes] = useState([
    { time: '01:42:10', note: 'Morning corridor sweep confirmed: C1 and C3 clear.' },
    { time: '01:45:30', note: 'FLT-104 alerted regarding outer perimeter boundary advisory.' },
  ]);
  const [noteInput, setNoteInput] = useState('');

  // ── Poll Live Backend AI Pipeline ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [stRes, dsRes] = await Promise.all([
        fetch(`${API}/api/status`, { signal: AbortSignal.timeout(3000) }),
        fetch(`${API}/api/datasets`, { signal: AbortSignal.timeout(2500) })
      ]);

      if (stRes.ok) {
        const d = await stRes.json();
        if (d.status !== 'warming_up') {
          setStatus(d);
        }
      }
      if (dsRes.ok) {
        const ds = await dsRes.json();
        setDatasets(ds.datasets || []);
      }
    } catch {
      // Backend handles fallback
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  // ── Smooth Asset Coordinate Simulation (Synchronized with Corridor Speeds) ─
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setFleetList(prev => prev.map(v => {
        let newX = v.x + v.vx;
        let newY = v.y + v.vy;
        let newVx = v.vx;
        let newVy = v.vy;

        // Bounce within vector boundaries (12 to 88 percent)
        if (newX < 12 || newX > 88) newVx = -newVx;
        if (newY < 15 || newY > 88) newVy = -newVy;

        // Read real corridor speed if available from backend status
        let liveSpeed = v.speed;
        if (status?.corridors?.[v.corridor]?.speed_kmh) {
          liveSpeed = status.corridors[v.corridor].speed_kmh;
        }

        return {
          ...v,
          x: Math.max(10, Math.min(90, newX)),
          y: Math.max(12, Math.min(90, newY)),
          vx: newVx,
          vy: newVy,
          speed: liveSpeed
        };
      }));
    }, 400);

    return () => clearInterval(moveTimer);
  }, [status]);

  // ── Dataset Switcher ───────────────────────────────────────────────────────
  const handleSwitchDataset = async (datasetId) => {
    setIsSwitching(true);
    try {
      await fetch(`${API}/api/dataset/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId }),
      });
      await fetchStatus();
    } catch (e) {
      console.error('Dataset switch error', e);
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Action Execution (Field Marshal Diversion Dispatch) ───────────────────
  const handleExecuteAction = async (sugg) => {
    try {
      const res = await fetch(`${API}/api/action/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sugg.id,
          action: sugg.action || 'DIVERSION_DISPATCH',
          target: sugg.targets?.join(', ') || sugg.zone || 'All Units',
          operator: 'Chief Control Room Watch Officer',
        }),
      });
      if (res.ok) {
        setActionNotice(`Directive Dispatched: ${sugg.action || 'Reroute'} to Field Marshals`);
        setTimeout(() => setActionNotice(null), 5000);
        await fetchStatus();
      }
    } catch (e) {
      console.error('Dispatch failed', e);
    }
  };

  // ── Open Drawer for Selected Vehicle ───────────────────────────────────────
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDrawerOpen(true);
  };

  // ── Toggle Single Driver Inline PII ────────────────────────────────────────
  const handleToggleInlinePII = (e, id) => {
    e.stopPropagation();
    setInlineRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Add Dispatcher Note ────────────────────────────────────────────────────
  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setDispatcherNotes(prev => [
      { time: timeStr, note: noteInput.trim() },
      ...prev,
    ]);
    setNoteInput('');
  };

  // ── Filter Fleet ───────────────────────────────────────────────────────────
  const filteredFleet = useMemo(() => {
    if (fleetFilter === 'ACTIVE') return fleetList.filter(v => v.geofence === 'in-bounds');
    if (fleetFilter === 'WARN')   return fleetList.filter(v => v.geofence === 'warning' || (v.passengers / v.capacity >= 0.85));
    if (fleetFilter === 'CRIT')   return fleetList.filter(v => v.geofence === 'breach' || (v.passengers / v.capacity >= 0.95));
    return fleetList;
  }, [fleetList, fleetFilter]);

  // ── Streaming Incident & Crowd Alerts (Chroma-Keyed) ───────────────────────
  const alertsList = useMemo(() => {
    const list = [];
    const zonesObj = status?.zones || {};

    // 1. Crowd Density Alerts from backend CSRNet / LSTM
    Object.values(zonesObj).forEach(z => {
      if (z.color === 'RED') {
        list.push({
          id: `crw-${z.id}`,
          type: 'CROWD',
          level: 'critical', // Module 2: alert-critical
          title: `CRITICAL CROWD SURGE · ${z.label || z.id}`,
          desc: `Zone occupancy at ${z.saturation_pct}% (${z.count}/${z.capacity}). LSTM indicates sustained bottleneck.`,
          time: 'LIVE INFRA',
          action: `Deploy Field Marshals to ${z.id}`,
        });
      } else if (z.color === 'YELLOW') {
        list.push({
          id: `crw-${z.id}`,
          type: 'CROWD',
          level: 'warning', // Module 2: alert-warning
          title: `ELEVATED DENSITY · ${z.label || z.id}`,
          desc: `Zone density at ${z.saturation_pct}%. Pre-emptive ingress diversion advised.`,
          time: 'TRENDING',
          action: `Pre-route Turnstiles at ${z.id}`,
        });
      }
    });

    // 2. Fleet Geofence & Capacity Alerts
    fleetList.forEach(v => {
      const sat = v.passengers / v.capacity;
      if (v.geofence === 'breach') {
        list.push({
          id: `flt-${v.id}-breach`,
          type: 'FLEET',
          level: 'critical', // Module 2: alert-critical
          title: `GEOFENCE PERIMETER BREACH · ${v.id}`,
          desc: `${v.label} crossed boundary limit on ${v.route}. Speed: ${v.speed} km/h. Coordinates require immediate re-anchoring.`,
          time: 'JUST NOW',
          action: `Transmit Halt Waypoint to ${v.id}`,
        });
      } else if (sat >= 0.90) {
        list.push({
          id: `flt-${v.id}-cap`,
          type: 'FLEET',
          level: 'warning', // Module 2: alert-warning
          title: `OVER-CAPACITY VEHICLE · ${v.id}`,
          desc: `${v.label} carrying ${v.passengers}/${v.capacity} passengers (${Math.round(sat * 100)}%). Recommend bypass next pickup point.`,
          time: '01:48:22',
          action: `Dispatch Auxiliary Feeder`,
        });
      }
    });

    // 3. Nominal System Heartbeats
    list.push({
      id: 'nom-corridor',
      type: 'TELEMETRY',
      level: 'neutral', // Module 2: alert-neutral
      title: 'ARTERY CORRIDORS NOMINAL',
      desc: 'Corridors C1, C2, C3, and C4 operating within nominal Level of Service parameters.',
      time: '01:46:00',
      action: null,
    });
    list.push({
      id: 'nom-mesh',
      type: 'INFRA',
      level: 'neutral',
      title: 'SURVEILLANCE INGRESS SECURED',
      desc: 'Optical CSRNet density mesh synchronized with 4 sector bounding frustums.',
      time: '01:44:12',
      action: null,
    });

    return list;
  }, [status, fleetList]);

  const activeDataset = status?.dataset || {};
  const venueTitle = activeDataset.venue_name || 'ShanghaiTech Urban Pedestrian Concourse';

  return (
    <div className="telemetry-dashboard font-sans">
      {/* ── Top Bar: Control Room Telemetry Header ── */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <h1 className="text-sm font-extrabold tracking-tight text-white uppercase font-mono">
              PRAVAAH COMMAND // {venueTitle}
            </h1>
          </div>

          {/* Dataset Switcher Chips */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider">BENCHMARK:</span>
            {datasets.map(ds => (
              <button
                key={ds.id}
                type="button"
                className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded transition-all duration-150 ${
                  activeDataset.id === ds.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                disabled={isSwitching}
                onClick={() => handleSwitchDataset(ds.id)}
              >
                {ds.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Global Telemetry Vitals & PII Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded">
            <span className="text-zinc-400">LATENCY: <strong className="text-white tabular-nums">14ms</strong></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">FPS: <strong className="text-white tabular-nums">25.0</strong></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">GEOFENCE: <strong className="text-amber-400">1 CAUTION</strong></span>
          </div>

          {/* Master PII Masking Toggle */}
          <button
            type="button"
            className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded border transition-all duration-150 ${
              globalPIIRevealed
                ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            onClick={() => setGlobalPIIRevealed(prev => !prev)}
            title="Toggle Operator PII Masking Protocol"
          >
            {globalPIIRevealed ? <Unlock size={13} /> : <Lock size={13} />}
            <span>{globalPIIRevealed ? 'PII UNMASKED' : 'PII PROTECTED'}</span>
          </button>
        </div>
      </header>

      {/* Action Dispatch Toast */}
      {actionNotice && (
        <div className="mx-4 mt-2 p-2.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── FIXED SPATIAL LAYOUT: 3-Column Command View ── */}
      <main className="command-grid-layout">
        {/* ====================================================================
            COLUMN 1: Live Fleet Vehicle Status List (Compact Tabular Metrics)
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col">
          <div className="panel-header-bar">
            <div className="panel-title-group">
              <Car size={14} className="text-indigo-400" />
              <h2 className="panel-title">Fleet Asset Telematics</h2>
              <span className="panel-badge">{filteredFleet.length} UNITS</span>
            </div>
            <button
              onClick={() => {
                setSelectedVehicle(fleetList[0]);
                setIsDrawerOpen(true);
              }}
              className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <span>LOGS</span>
              <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="fleet-filter-bar">
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFleetFilter('ALL')}
            >
              ALL ({fleetList.length})
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setFleetFilter('ACTIVE')}
            >
              ACTIVE (6)
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'WARN' ? 'active' : ''}`}
              onClick={() => setFleetFilter('WARN')}
            >
              WARN (1)
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'CRIT' ? 'active' : ''}`}
              onClick={() => setFleetFilter('CRIT')}
            >
              CRIT (1)
            </button>
          </div>

          {/* Tabular Data Grid (Strict Zero Shift) */}
          <div className="fleet-table-container">
            <table className="fleet-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>VEHICLE</th>
                  <th style={{ width: '90px' }}>ROUTE</th>
                  <th style={{ width: '56px' }}>SPD</th>
                  <th style={{ width: '54px' }}>ETA</th>
                  <th style={{ width: '80px' }}>CAPACITY</th>
                  <th style={{ width: '74px' }}>GEOFENCE</th>
                  <th>DRIVER PII</th>
                </tr>
              </thead>
              <tbody>
                {filteredFleet.map((v) => {
                  const sat = v.passengers / v.capacity;
                  const satPct = Math.round(sat * 100);
                  const isPIIRevealed = globalPIIRevealed || inlineRevealedIds[v.id];
                  const isSelected = selectedVehicle?.id === v.id;

                  return (
                    <tr
                      key={v.id}
                      className={`fleet-row ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelectVehicle(v)}
                    >
                      {/* Vehicle ID */}
                      <td className="tabular-stat font-bold text-white">
                        {v.id}
                      </td>

                      {/* Route */}
                      <td className="text-[11px] text-zinc-300 truncate" title={v.route}>
                        {v.route}
                      </td>

                      {/* Speed */}
                      <td className="tabular-stat text-zinc-200">
                        {v.speed.toFixed(0)} <span className="text-[9px] text-zinc-500">k</span>
                      </td>

                      {/* ETA */}
                      <td className="tabular-stat text-emerald-400 font-semibold">
                        {v.eta}
                      </td>

                      {/* Capacity Meter */}
                      <td>
                        <div className="capacity-meter-wrap">
                          <div className="capacity-meter-bar">
                            <div
                              className={`capacity-meter-fill ${
                                sat >= 0.95 ? 'critical' : sat >= 0.85 ? 'warning' : 'normal'
                              }`}
                              style={{ width: `${Math.min(100, satPct)}%` }}
                            />
                          </div>
                          <span className="tabular-stat text-[10px] text-zinc-300">
                            {satPct}%
                          </span>
                        </div>
                      </td>

                      {/* Geofence Status */}
                      <td>
                        <span
                          className={`geofence-badge ${
                            v.geofence === 'breach'
                              ? 'breach'
                              : v.geofence === 'warning'
                              ? 'warning'
                              : 'in-bounds'
                          }`}
                        >
                          {v.geofence === 'breach'
                            ? 'BREACH'
                            : v.geofence === 'warning'
                            ? 'WARN'
                            : 'ARMED'}
                        </span>
                      </td>

                      {/* Driver PII (Dynamic Progressive Disclosure) */}
                      <td>
                        <div className="flex items-center justify-between">
                          <span className={isPIIRevealed ? 'pii-revealed text-[11px]' : 'pii-masked text-[10.5px]'}>
                            {isPIIRevealed ? v.driver.name.split(' ')[0] : '••••••••'}
                          </span>
                          <button
                            type="button"
                            className="pii-toggle-btn"
                            onClick={(e) => handleToggleInlinePII(e, v.id)}
                            title={isPIIRevealed ? 'Mask Driver PII' : 'Reveal Driver PII'}
                          >
                            {isPIIRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================================
            COLUMN 2: Interactive Spatial Map Canvas (60% Split / Center)
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col relative">
          <div className="panel-header-bar">
            <div className="panel-title-group">
              <Navigation size={14} className="text-emerald-400" />
              <h2 className="panel-title">Spatial Vector GIS &amp; Thermal Mesh</h2>
            </div>

            {/* Map Mode Toggle: Vector GIS vs Optical Video Feed */}
            <div className="map-mode-toggle">
              <button
                type="button"
                className={`map-mode-btn ${activeTab === 'gis' ? 'active' : ''}`}
                onClick={() => setActiveTab('gis')}
              >
                <MapIcon size={12} />
                <span>Vector GIS</span>
              </button>
              <button
                type="button"
                className={`map-mode-btn ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <Video size={12} />
                <span>Thermal Vision</span>
              </button>
            </div>
          </div>

          {/* Viewport Canvas */}
          <div className="map-canvas-container">
            {activeTab === 'gis' ? (
              <>
                {/* Vector Geographical & Corridor SVG Canvas */}
                <svg
                  className="vector-map-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <radialGradient id="corridorGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1f1f23" strokeWidth="0.3" />
                    </pattern>
                  </defs>

                  {/* Dark Grid Canvas Backdrop */}
                  <rect width="100" height="100" fill="#09090b" />
                  <rect width="100" height="100" fill="url(#gridPattern)" />

                  {/* Calibrated Artery Corridors (C1 to C4) */}
                  <path
                    d="M 15 35 L 85 35"
                    stroke="#27272a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 15 35 L 85 35"
                    stroke="#4338ca"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />

                  <path
                    d="M 50 15 L 50 85"
                    stroke="#27272a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 50 15 L 50 85"
                    stroke="#059669"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />

                  <circle cx="50" cy="50" r="30" fill="url(#corridorGlow)" />
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.6"
                    strokeDasharray="1 3"
                  />

                  {/* Geofence Perimeter Bounds (Dashed Crimson Limit) */}
                  <rect
                    x="8"
                    y="10"
                    width="84"
                    height="80"
                    rx="4"
                    fill="none"
                    stroke="rgba(239, 68, 68, 0.4)"
                    strokeWidth="0.6"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="12"
                    y="14"
                    fill="#ef4444"
                    fontSize="2.2"
                    fontFamily="JetBrains Mono"
                    fontWeight="700"
                    letterSpacing="0.08em"
                  >
                    GEOFENCE PERIMETER BOUNDARY [AUTHORIZED ENCLAVE]
                  </text>

                  {/* Live Crowd Density Sectors (From Backend Status) */}
                  {status?.zones &&
                    Object.values(status.zones).map((z) => {
                      const bbox = z.bbox || [0.1, 0.1, 0.4, 0.4];
                      const bx = bbox[0] * 100;
                      const by = bbox[1] * 100;
                      const bw = (bbox[2] - bbox[0]) * 100;
                      const bh = (bbox[3] - bbox[1]) * 100;
                      const isRed = z.color === 'RED';
                      const isYellow = z.color === 'YELLOW';

                      return (
                        <g key={z.id}>
                          <rect
                            x={bx + 1}
                            y={by + 1}
                            width={bw - 2}
                            height={bh - 2}
                            rx="2"
                            fill={
                              isRed
                                ? 'rgba(239, 68, 68, 0.18)'
                                : isYellow
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(16, 185, 129, 0.08)'
                            }
                            stroke={
                              isRed
                                ? '#ef4444'
                                : isYellow
                                ? '#f59e0b'
                                : 'rgba(16, 185, 129, 0.5)'
                            }
                            strokeWidth={isRed ? '1.2' : '0.6'}
                          />
                          <text
                            x={bx + 3}
                            y={by + 5.5}
                            fill="#f4f4f5"
                            fontSize="2.4"
                            fontFamily="JetBrains Mono"
                            fontWeight="800"
                          >
                            {z.id} · {z.saturation_pct}%
                          </text>
                          <text
                            x={bx + 3}
                            y={by + 8.5}
                            fill="#a1a1aa"
                            fontSize="1.8"
                            fontFamily="sans-serif"
                          >
                            Headcount: {z.count}
                          </text>
                        </g>
                      );
                    })}

                  {/* Live Fleet Vehicle Asset Dots */}
                  {fleetList.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    const isBreach = v.geofence === 'breach';

                    return (
                      <g
                        key={v.id}
                        transform={`translate(${v.x}, ${v.y})`}
                        className="cursor-pointer"
                        onClick={() => handleSelectVehicle(v)}
                      >
                        {/* Pulse Ring for Selected or Breach Vehicle */}
                        {(isSelected || isBreach) && (
                          <circle
                            r="4.2"
                            fill="none"
                            stroke={isBreach ? '#ef4444' : '#6366f1'}
                            strokeWidth="0.6"
                            className="animate-ping"
                          />
                        )}

                        {/* Dot Core */}
                        <circle
                          r="2.2"
                          fill={isBreach ? '#ef4444' : isSelected ? '#ffffff' : '#38bdf8'}
                          stroke="#09090b"
                          strokeWidth="0.6"
                        />

                        {/* Heading Vector Arrow */}
                        <line
                          x1="0"
                          y1="0"
                          x2={v.vx * 15}
                          y2={v.vy * 15}
                          stroke={isBreach ? '#ef4444' : '#38bdf8'}
                          strokeWidth="0.6"
                        />

                        {/* Asset Tag */}
                        <rect
                          x="3.2"
                          y="-2.5"
                          width="12"
                          height="4.2"
                          rx="1"
                          fill="rgba(9, 9, 11, 0.9)"
                          stroke={isSelected ? '#ffffff' : '#27272a'}
                          strokeWidth="0.4"
                        />
                        <text
                          x="9.2"
                          y="0.4"
                          fill="#f4f4f5"
                          fontSize="2.1"
                          fontFamily="JetBrains Mono"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {v.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Overlaid Live Coordinate Counters HUD */}
                <div className="map-hud-overlay map-hud-top-left">
                  <div className="text-[10px] text-zinc-400 font-bold tracking-wider">
                    TELEMETRY GPS HUD
                  </div>
                  <div className="text-[11px] text-white">
                    LAT: <span className="tabular-stat font-bold">28.6139° N</span> · LON:{' '}
                    <span className="tabular-stat font-bold">77.2090° E</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-500">
                    ALT: <span className="tabular-stat text-zinc-300">216.4m</span> · GRID REF:{' '}
                    <span className="text-zinc-300">IND-ND-44</span> · SAT: 14 FIX
                  </div>
                </div>

                {/* Bottom Corridor Speeds & Headcount Ribbon */}
                <div className="map-hud-overlay map-hud-bottom-bar">
                  <div className="flex items-center gap-4">
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">C1 (NORTH):</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C1?.speed_kmh || 44} km/h
                      </span>
                    </div>
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">C2 (SOUTH):</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C2?.speed_kmh || 38} km/h
                      </span>
                    </div>
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">C3 (OUTER):</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C3?.speed_kmh || 58} km/h
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] text-zinc-400">
                      TOTAL VENUE INGRESS:{' '}
                      <strong className="text-emerald-400 font-bold tabular-nums">
                        {status?.total_count || 18} VISITORS
                      </strong>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Live Optical Stream View with Continuous Spatial Density Heatmaps */
              <div className="video-canvas-wrap">
                <img
                  src={`${API}/api/video_feed`}
                  alt="Live AI Surveillance Feed with Continuous CSRNet Heatmaps"
                  className="video-stream-img"
                />
                <div className="absolute top-3 left-3 bg-zinc-950/85 border border-zinc-800 px-3 py-1.5 rounded font-mono text-[10.5px] text-white backdrop-blur">
                  <span className="text-emerald-400 font-bold">● LIVE STREAM</span> · 1080p @ 25 FPS · CSRNet + YOLOv8n
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            COLUMN 3: Streaming Incident / Crowd Alert Feed
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col">
          <div className="panel-header-bar">
            <div className="panel-title-group">
              <ShieldAlert size={14} className="text-amber-400" />
              <h2 className="panel-title">Streaming Incidents</h2>
              <span className="panel-badge">{alertsList.length} LOGS</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">REAL-TIME</span>
          </div>

          {/* MODULE 2: Alert Feed with Strict Chroma-Keying (400ms Smooth Zero Shift) */}
          <div className="alert-feed-container">
            {alertsList.map((a) => (
              <div
                key={a.id}
                className={`alert-card ${
                  a.level === 'critical'
                    ? 'alert-critical'
                    : a.level === 'warning'
                    ? 'alert-warning'
                    : 'alert-neutral'
                }`}
              >
                <div className="alert-card-header">
                  <span className="alert-badge">{a.type}</span>
                  <span className="alert-time">{a.time}</span>
                </div>
                <div className="alert-title">{a.title}</div>
                <div className="alert-desc">{a.desc}</div>

                {/* Direct Action Dispatch Button */}
                {a.action && (
                  <button
                    type="button"
                    className="alert-action-btn"
                    onClick={() =>
                      handleExecuteAction({
                        id: a.id,
                        action: a.action,
                        targets: [a.id],
                      })
                    }
                  >
                    <Send size={11} />
                    <span>{a.action}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ======================================================================
          MODULE 3: Dynamic Progressive Disclosure (Slide-out Dispatcher Drawer)
          ====================================================================== */}
      {isDrawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside className={`dispatcher-drawer ${isDrawerOpen ? 'is-open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title-wrap">
            <span className="drawer-eyebrow">DISPATCHER AUDIT &amp; DRIVER PII</span>
            <h3 className="drawer-title">
              {selectedVehicle ? selectedVehicle.id : 'FLEET LOGS'} · {selectedVehicle?.label}
            </h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setIsDrawerOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {selectedVehicle && (
          <div className="drawer-content">
            {/* Sensitive Driver PII Card */}
            <div className="drawer-section-card">
              <div className="flex items-center justify-between">
                <h4 className="drawer-sec-title">Driver Identity &amp; Credentials</h4>
                <span className="text-[9.5px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  CLEARANCE LVL 3
                </span>
              </div>

              <div className="drawer-grid-2col">
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Driver Legal Name:</span>
                  <span className="drawer-metric-val font-sans">
                    {globalPIIRevealed ? selectedVehicle.driver.name : '•••• •••• ••••'}
                  </span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Contact / Cellular:</span>
                  <span className="drawer-metric-val">
                    {globalPIIRevealed ? selectedVehicle.driver.phone : '•••• ••••'}
                  </span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">CDL License #:</span>
                  <span className="drawer-metric-val">
                    {globalPIIRevealed ? selectedVehicle.driver.cdl : '••••••••••••'}
                  </span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Active Shift Duration:</span>
                  <span className="drawer-metric-val">{selectedVehicle.driver.shift}</span>
                </div>
              </div>
            </div>

            {/* Live Vehicle Telemetrics */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Real-Time Vehicle Telemetry</h4>
              <div className="drawer-grid-2col">
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Corridor Speed:</span>
                  <span className="drawer-metric-val text-white">
                    {selectedVehicle.speed.toFixed(1)} km/h
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Geofence Status:</span>
                  <span
                    className={`drawer-metric-val ${
                      selectedVehicle.geofence === 'breach'
                        ? 'text-red-400'
                        : selectedVehicle.geofence === 'warning'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedVehicle.geofence.toUpperCase()}
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Passenger Onboard:</span>
                  <span className="drawer-metric-val">
                    {selectedVehicle.passengers} / {selectedVehicle.capacity}
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Driver Vitals:</span>
                  <span className="drawer-metric-val text-emerald-400">
                    {selectedVehicle.driver.heartRate > 0
                      ? `${selectedVehicle.driver.heartRate} BPM (Normal)`
                      : 'AI Pod (Autonomous)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Operator Radio & Emergency Directives */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Dispatcher Emergency Directives</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition"
                  onClick={() => alert(`Transmitting VoIP PTT signal to ${selectedVehicle.id}...`)}
                >
                  <PhoneCall size={13} className="text-emerald-400" />
                  <span>VOIP RADIO PTT</span>
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-xs font-mono font-bold text-red-200 flex items-center gap-1.5 transition"
                  onClick={() =>
                    handleExecuteAction({
                      id: `halt-${selectedVehicle.id}`,
                      action: `EMERGENCY GEOFENCE HALT: ${selectedVehicle.id}`,
                      targets: [selectedVehicle.id],
                    })
                  }
                >
                  <AlertTriangle size={13} className="text-red-400" />
                  <span>HALT FLEET</span>
                </button>
              </div>
            </div>

            {/* Dispatcher Incident Log */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Dispatcher Incident Notes</h4>
              <div className="drawer-log-list">
                {dispatcherNotes.map((entry, idx) => (
                  <div key={idx} className="drawer-log-item">
                    <span className="drawer-log-time">{entry.time}</span>
                    <span className="text-zinc-200">{entry.note}</span>
                  </div>
                ))}
              </div>

              <div className="drawer-input-row">
                <input
                  type="text"
                  className="drawer-input"
                  placeholder="Append dispatch note..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  type="button"
                  className="drawer-post-btn"
                  onClick={handleAddNote}
                >
                  LOG
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
