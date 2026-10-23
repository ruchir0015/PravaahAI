import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  ArrowUpRight,
  TrendingUp,
  Car,
  Lock,
  Unlock,
  PhoneCall,
  CheckCircle2,
  Share2,
  Users,
  BellRing,
  Info,
  Zap,
  QrCode,
  Download,
  ExternalLink,
  Copy
} from 'lucide-react';
import './CrowdDashboard.css';

const API = 'http://localhost:5050';
const POLL_MS = 2000;

const VENUE_NAMES = {
  pets2009: 'Campus Grounds',
  shanghaitech: 'Urban Concourse',
  techtrix: 'Grand Arena',
  crowd_default: 'Festival Concourse',
  custom: 'Custom Venue'
};

export default function CrowdDashboard({ setActiveView }) {
  const [status, setStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [fleetEnclave, setFleetEnclave] = useState(null);
  const [fleetList, setFleetList] = useState([]);
  const [activeTab, setActiveTab] = useState('gis'); // 'gis' | 'video'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'WARN' | 'CRIT'
  const [globalPIIRevealed, setGlobalPIIRevealed] = useState(false);
  const [inlineRevealedIds, setInlineRevealedIds] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Universal Visitor QR State
  const [showUniversalQRModal, setShowUniversalQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const universalQrUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:5174/?visitor=1#attendee';
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? '11.20.17.207'
      : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${host}${port}/?visitor=1#attendee`;
  }, []);

  const handleCopyUniversalLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(universalQrUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Automatic Telegram Forwarding State
  const [autoTelegramEnabled, setAutoTelegramEnabled] = useState(true);
  const forwardedAlertsRef = useRef(new Map());

  // Telegram Role-Based Dispatcher State
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(['marshals', 'drivers', 'command']);
  const [alertUrgency, setAlertUrgency] = useState('WARNING');
  const [alertMessage, setAlertMessage] = useState(
    'Notice: Heavy foot traffic near Gate B. Field marshals please guide pedestrians toward North Pathway.'
  );
  const [telegramReceipt, setTelegramReceipt] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Dispatcher Session Notes
  const [dispatcherNotes, setDispatcherNotes] = useState([
    { time: '12:00:15', note: 'Campus venue synchronized. All corridors open.' },
    { time: '12:15:30', note: 'Shuttle routes verified. Headway tracking active.' },
  ]);
  const [noteInput, setNoteInput] = useState('');

  // ── Poll Live Backend Status & Fleet ──────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [stRes, dsRes, fltRes] = await Promise.all([
        fetch(`${API}/api/status`, { signal: AbortSignal.timeout(3000) }),
        fetch(`${API}/api/datasets`, { signal: AbortSignal.timeout(2500) }),
        fetch(`${API}/api/fleet`, { signal: AbortSignal.timeout(2500) })
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
      if (fltRes.ok) {
        const flt = await fltRes.json();
        if (flt.fleet && flt.fleet.length > 0) {
          setFleetList(flt.fleet);
          setFleetEnclave(flt);
        }
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

  // ── Venue / Dataset Switcher ──────────────────────────────────────────────
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
      console.error('Venue switch error', e);
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Action Execution ───────────────────────────────────────────────────────
  const handleExecuteAction = async (sugg) => {
    try {
      const res = await fetch(`${API}/api/action/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sugg.id,
          action: sugg.action || 'DIVERSION_DISPATCH',
          target: sugg.targets?.join(', ') || sugg.zone || 'All Units',
          operator: 'Control Room Officer',
        }),
      });
      if (res.ok) {
        setActionNotice(`Action Dispatched: ${sugg.action || 'Reroute directive sent'}`);
        setTimeout(() => setActionNotice(null), 4500);
        await fetchStatus();
      }
    } catch (e) {
      console.error('Dispatch failed', e);
    }
  };

  // ── Manual Telegram Broadcast ──────────────────────────────────────────────
  const handleDispatchTelegram = async () => {
    if (!alertMessage.trim() || selectedRoles.length === 0) return;
    setIsDispatching(true);
    try {
      const res = await fetch(`${API}/api/telegram/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: selectedRoles,
          message: alertMessage.trim(),
          urgency: alertUrgency,
          channel: 'Control Dispatch Mesh',
          operator: 'Duty Officer'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramReceipt(data.receipt);
        setActionNotice(`Alert broadcast to ${data.receipt.recipients_count} team members`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (e) {
      console.error('Broadcast error', e);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDrawerOpen(true);
  };

  const handleToggleInlinePII = (e, id) => {
    e.stopPropagation();
    setInlineRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  // ── Alerts List (Focused, Human, Non-Technical) ────────────────────────────
  const alertsList = useMemo(() => {
    const list = [];
    const zonesObj = status?.zones || {};

    // 1. Crowd Density Alerts
    Object.values(zonesObj).forEach(z => {
      if (z.color === 'RED') {
        list.push({
          id: `crw-${z.id}`,
          type: 'CROWD',
          level: 'critical',
          title: `CROWD SURGE · ${z.label || z.id}`,
          desc: `Zone occupancy at ${z.saturation_pct}%. Divert incoming visitors to auxiliary pathways.`,
          time: 'Active',
          action: `Deploy Stewards to ${z.id}`,
          canTelegram: true
        });
      } else if (z.color === 'YELLOW') {
        list.push({
          id: `crw-${z.id}`,
          type: 'CROWD',
          level: 'warning',
          title: `ELEVATED FLOW · ${z.label || z.id}`,
          desc: `Zone load at ${z.saturation_pct}%. Pre-emptive entry routing advised.`,
          time: 'Notice',
          action: `Reroute Turnstiles at ${z.id}`,
          canTelegram: true
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
          level: 'critical',
          title: `ROUTE DEVIATION · ${v.id}`,
          desc: `${v.label} moved outside planned corridor on ${v.corridor}. Reroute required.`,
          time: 'Active',
          action: `Redirect ${v.id}`,
          canTelegram: true
        });
      } else if (sat >= 0.90) {
        list.push({
          id: `flt-${v.id}-cap`,
          type: 'FLEET',
          level: 'warning',
          title: `NEAR CAPACITY · ${v.id}`,
          desc: `${v.label} carrying ${v.passengers}/${v.capacity} passengers (${Math.round(sat * 100)}%). Auxiliary shuttle recommended.`,
          time: 'Active',
          action: `Dispatch Auxiliary Feeder`,
          canTelegram: true
        });
      }
    });

    return list;
  }, [status, fleetList]);

  // ── Automatic Telegram Alert Forwarding Engine ─────────────────────────────
  useEffect(() => {
    if (!autoTelegramEnabled || alertsList.length === 0) return;

    const now = Date.now();
    const actionable = alertsList.filter(a => a.level === 'critical' || a.level === 'warning');

    actionable.forEach(alert => {
      const lastSent = forwardedAlertsRef.current.get(alert.id) || 0;
      // 60-second cooldown per distinct incident to prevent spamming
      if (now - lastSent > 60000) {
        forwardedAlertsRef.current.set(alert.id, now);

        const roles = alert.type === 'CROWD' ? ['marshals', 'command', 'public'] : ['drivers', 'command'];
        fetch(`${API}/api/telegram/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roles,
            message: `[AUTO-FORWARD] ${alert.title}: ${alert.desc}`,
            urgency: alert.level === 'critical' ? 'CRITICAL' : 'WARNING',
            channel: 'Automated Telegram Forwarder',
            operator: 'Pravaah Autonomous Dispatch'
          })
        })
        .then(r => r.json())
        .then(data => {
          if (data?.receipt) {
            setTelegramReceipt(data.receipt);
            setActionNotice(`⚡ Auto-Forwarded to Telegram: ${alert.title}`);
            setTimeout(() => setActionNotice(null), 4500);
          }
        })
        .catch(() => {});
      }
    });
  }, [alertsList, autoTelegramEnabled]);

  // ── Executive Summary Metrics (Zerodha / Groww Ticker Style) ───────────────
  const zoneList = useMemo(() => Object.values(status?.zones || {}), [status]);
  const { maxZoneLoad, maxZoneName } = useMemo(() => {
    if (zoneList.length === 0) return { maxZoneLoad: 42, maxZoneName: 'Normal' };
    const sorted = [...zoneList].sort((a, b) => (b.saturation_pct || 0) - (a.saturation_pct || 0));
    const highest = sorted[0];
    return {
      maxZoneLoad: highest.saturation_pct || 0,
      maxZoneName: highest.label ? highest.label.split('–')[0].trim() : highest.id
    };
  }, [zoneList]);

  const activeDataset = status?.dataset || {};
  const currentVenueName = VENUE_NAMES[activeDataset.id] || activeDataset.venue_name || 'Campus Grounds';
  const hasCriticalAlerts = alertsList.some(a => a.level === 'critical');

  const venueOptions = useMemo(() => {
    if (datasets && datasets.length > 0) return datasets;
    return [
      { id: 'pets2009', label: 'Campus Grounds' },
      { id: 'shanghaitech', label: 'Urban Concourse' },
      { id: 'crowd_default', label: 'Festival Concourse' },
    ];
  }, [datasets]);

  return (
    <div className="telemetry-dashboard font-sans">
      {/* ── Top Bar: Executive Operational Summary Ribbon (Groww / Zerodha Style) ── */}
      <header className="kpi-ticker-bar">
        {/* Left: Clean Venue Selector */}
        <div className="ticker-venue-group">
          <div className="ticker-venue-label">
            <span>VENUE</span>
          </div>
          <div className="ticker-venue-pills">
            {venueOptions.map(ds => {
              const friendlyName = VENUE_NAMES[ds.id] || ds.label || ds.id;
              const isActive = (activeDataset.id || 'pets2009') === ds.id;
              return (
                <button
                  key={ds.id}
                  type="button"
                  className={`ticker-venue-btn ${isActive ? 'active' : ''}`}
                  disabled={isSwitching}
                  onClick={() => handleSwitchDataset(ds.id)}
                >
                  {friendlyName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: High-Level Finance-Grade Performance Tickers */}
        <div className="ticker-metrics-group">
          <div className="ticker-kpi-item">
            <span className="ticker-kpi-label">INGRESS</span>
            <span className="ticker-kpi-val text-white tabular-nums">{status?.total_count || 18}</span>
          </div>

          <div className="ticker-divider" />

          <div className="ticker-kpi-item">
            <span className="ticker-kpi-label">PEAK ZONE</span>
            <span className="ticker-kpi-val text-white tabular-nums">{maxZoneLoad}% · {maxZoneName}</span>
          </div>

          <div className="ticker-divider" />

          <div className="ticker-kpi-item">
            <span className="ticker-kpi-label">SHUTTLES</span>
            <span className="ticker-kpi-val text-white tabular-nums">{fleetList.length} Units</span>
          </div>

          <div className="ticker-divider" />

          <div className="ticker-kpi-item">
            <span className="ticker-kpi-label">STATUS</span>
            <span className={`ticker-kpi-val ${hasCriticalAlerts ? 'text-amber-400' : 'text-white'}`}>
              {hasCriticalAlerts ? `${alertsList.length} Alert${alertsList.length > 1 ? 's' : ''}` : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Right: Broadcast Alert Action */}
        <div className="ticker-actions-group">
          {/* Broadcast Alert Button */}
          <button
            type="button"
            className="ticker-broadcast-btn"
            onClick={() => setShowTelegramModal(true)}
            title="Broadcast Alert to Field Staff"
          >
            <Send size={13} />
            <span>Broadcast</span>
          </button>
        </div>
      </header>

      {/* Action Dispatch Toast */}
      {actionNotice && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-zinc-300" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-zinc-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3-COLUMN OPERATIONAL COCKPIT ── */}
      <main className="command-grid-layout">
        {/* ====================================================================
            COLUMN 1: Fleet & Transit Vehicles (Zerodha Watchlist Style)
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col">
          <div className="panel-header-bar">
            <div className="panel-title-group">
              <Car size={15} className="text-zinc-400" />
              <h2 className="panel-title">Fleet &amp; Transit</h2>
              <span className="panel-badge">{filteredFleet.length} ACTIVE</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (fleetList.length > 0) setSelectedVehicle(fleetList[0]);
                setIsDrawerOpen(true);
              }}
              className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <span>Details</span>
              <ArrowUpRight size={12} />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="fleet-filter-bar">
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFleetFilter('ALL')}
            >
              All ({fleetList.length})
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setFleetFilter('ACTIVE')}
            >
              On Route
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'WARN' ? 'active' : ''}`}
              onClick={() => setFleetFilter('WARN')}
            >
              High Load
            </button>
            <button
              type="button"
              className={`fleet-filter-btn ${fleetFilter === 'CRIT' ? 'active' : ''}`}
              onClick={() => setFleetFilter('CRIT')}
            >
              Attention
            </button>
          </div>

          {/* Tabular Data Grid */}
          <div className="fleet-table-container">
            <table className="fleet-table">
              <thead>
                <tr>
                  <th style={{ width: '68px' }}>UNIT</th>
                  <th style={{ width: '92px' }}>ROUTE</th>
                  <th style={{ width: '56px' }}>SPD</th>
                  <th style={{ width: '50px' }}>ETA</th>
                  <th style={{ width: '78px' }}>LOAD</th>
                  <th style={{ width: '74px' }}>STATUS</th>
                  <th>DRIVER</th>
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
                      <td className="text-[11.5px] text-zinc-300 truncate" title={v.route}>
                        {v.corridor} · {v.label.split(' ')[0]}
                      </td>

                      {/* Speed */}
                      <td className="tabular-stat text-zinc-200">
                        {v.speed.toFixed(0)} <span className="text-[9.5px] text-zinc-500">km/h</span>
                      </td>

                      {/* ETA */}
                      <td className="tabular-stat text-zinc-200 font-medium">
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
                          <span className="tabular-stat text-[10.5px] text-zinc-300">
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
                            ? 'DEVIA.'
                            : v.geofence === 'warning'
                            ? 'CAUTION'
                            : 'NORMAL'}
                        </span>
                      </td>

                      {/* Driver Privacy */}
                      <td>
                        <div className="flex items-center justify-between">
                          <span className={isPIIRevealed ? 'pii-revealed text-[11px]' : 'pii-masked text-[10.5px]'}>
                            {isPIIRevealed ? v.driver.name.split(' ')[0] : '••••••••'}
                          </span>
                          <button
                            type="button"
                            className="pii-toggle-btn"
                            onClick={(e) => handleToggleInlinePII(e, v.id)}
                            title={isPIIRevealed ? 'Hide driver name' : 'Show driver name'}
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
            COLUMN 2: Interactive Venue Map & Camera Feed (Visual Canvas)
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col relative">
          <div className="panel-header-bar">
            <div className="panel-title-group">
              <Compass size={15} className="text-zinc-400" />
              <h2 className="panel-title">Venue Overview</h2>
            </div>

            {/* Map Mode Toggle: Interactive Map vs Live Video */}
            <div className="map-mode-toggle">
              <button
                type="button"
                className={`map-mode-btn ${activeTab === 'gis' ? 'active' : ''}`}
                onClick={() => setActiveTab('gis')}
              >
                <MapIcon size={12} />
                <span>Interactive Map</span>
              </button>
              <button
                type="button"
                className={`map-mode-btn ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <Video size={12} />
                <span>Live Camera</span>
              </button>
            </div>
          </div>

          {/* Viewport Canvas */}
          <div className="map-canvas-container">
            {activeTab === 'gis' ? (
              <>
                {/* Vector Map Canvas */}
                <svg
                  className="vector-map-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <radialGradient id="corridorGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1c1c22" strokeWidth="0.3" />
                    </pattern>
                  </defs>

                  {/* Dark Grid Canvas Backdrop */}
                  <rect width="100" height="100" fill="#0c0d12" />
                  <rect width="100" height="100" fill="url(#gridPattern)" />

                  {/* Corridors (C1 to C4) */}
                  <path
                    d="M 15 35 L 85 35"
                    stroke="#22232a"
                    strokeWidth="3.2"
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
                    stroke="#22232a"
                    strokeWidth="3.2"
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
                    stroke="#22232a"
                    strokeWidth="2.2"
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

                  {/* Perimeter Boundary Box */}
                  <rect
                    x="8"
                    y="10"
                    width="84"
                    height="80"
                    rx="4"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.5"
                    strokeDasharray="3 3"
                  />

                  {/* Live Crowd Density Sectors */}
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
                            fontFamily="sans-serif"
                            fontWeight="700"
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

                  {/* Live Fleet Vehicle Markers */}
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
                        {(isSelected || isBreach) && (
                          <circle
                            r="4.2"
                            fill="none"
                            stroke={isBreach ? '#ef4444' : '#10b981'}
                            strokeWidth="0.6"
                            className="animate-ping"
                          />
                        )}

                        <circle
                          r="2.2"
                          fill={isBreach ? '#ef4444' : isSelected ? '#ffffff' : '#38bdf8'}
                          stroke="#0c0d12"
                          strokeWidth="0.6"
                        />

                        <line
                          x1="0"
                          y1="0"
                          x2={v.vx * 8}
                          y2={v.vy * 8}
                          stroke={isBreach ? '#ef4444' : '#38bdf8'}
                          strokeWidth="0.6"
                        />

                        <rect
                          x="3.2"
                          y="-2.5"
                          width="12"
                          height="4.2"
                          rx="1"
                          fill="rgba(12, 13, 18, 0.9)"
                          stroke={isSelected ? '#ffffff' : '#27272a'}
                          strokeWidth="0.4"
                        />
                        <text
                          x="9.2"
                          y="0.4"
                          fill="#f4f4f5"
                          fontSize="2.1"
                          fontFamily="sans-serif"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {v.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Bottom Corridor Speeds & Headcount Ribbon */}
                <div className="map-hud-overlay map-hud-bottom-bar">
                  <div className="flex items-center gap-4">
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">North Pathway:</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C1?.speed_kmh || 44} km/h
                      </span>
                    </div>
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">Central Concourse:</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C2?.speed_kmh || 38} km/h
                      </span>
                    </div>
                    <div className="hud-metric-pill">
                      <span className="hud-metric-label">South Junction:</span>
                      <span className="hud-metric-val">
                        {status?.corridors?.C3?.speed_kmh || 58} km/h
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-300 font-semibold">
                      Venue Total:{' '}
                      <strong className="text-white font-medium tabular-nums">
                        {status?.total_count || 18} visitors
                      </strong>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Live Camera Feed */
              <div className="video-canvas-wrap">
                <img
                  src={`${API}/api/video_feed`}
                  alt="Live Camera Feed"
                  className="video-stream-img"
                />
                <div className="absolute top-3 left-3 bg-zinc-950/85 border border-zinc-800 px-3 py-1.5 rounded-full font-sans text-xs text-white backdrop-blur flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-zinc-200 font-semibold">CCTV FEED</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            COLUMN 3: Live Alerts Feed
            ==================================================================== */}
        <section className="telemetry-panel flex flex-col">
          {/* Alert Feed */}
          <div className="alert-feed-container">
            {alertsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 gap-2">
                <ShieldCheck size={28} className="text-zinc-600" />
                <span className="text-xs font-medium text-zinc-400">All zones &amp; corridors operating smoothly</span>
                <span className="text-[11px] text-zinc-600">No active surges or vehicle deviations</span>
              </div>
            ) : (
              alertsList.map((a) => (
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

                  <div className="flex items-center gap-2 mt-1">
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

                    {/* Send as Telegram Dispatch */}
                    {a.canTelegram && (
                      <button
                        type="button"
                        className="p-1 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10.5px] flex items-center gap-1 font-semibold transition"
                        onClick={() => {
                          setAlertMessage(`Notice [${a.title}]: ${a.desc}`);
                          setAlertUrgency(a.level === 'critical' ? 'CRITICAL' : 'WARNING');
                          setShowTelegramModal(true);
                        }}
                        title="Broadcast alert to team"
                      >
                        <Share2 size={11} />
                        <span>Broadcast</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>


      {/* ======================================================================
          BROADCAST TEAM ALERT MODAL (Clean, Groww/Slack-Grade UI)
          ====================================================================== */}
      {showTelegramModal && (
        <div className="tech-modal-backdrop" onClick={() => setShowTelegramModal(false)}>
          <div className="tech-modal-card" onClick={e => e.stopPropagation()}>
            <div className="tech-modal-header">
              <div className="flex items-center gap-2">
                <BellRing size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Broadcast Alert to Operations Team
                </h3>
              </div>
              <button
                type="button"
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition"
                onClick={() => setShowTelegramModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tech-modal-body">
              {/* Select Recipient Roles */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Select Recipients:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'marshals', label: '👮 Field Marshals', count: '14 active' },
                    { id: 'drivers', label: '🚌 Shuttle Drivers', count: '8 units' },
                    { id: 'medical', label: '🚑 Medical & First Aid', count: '6 teams' },
                    { id: 'command', label: '🏛️ Command & Security', count: '5 staff' },
                    { id: 'public', label: '📱 Public Channel', count: '1,840 attendees' },
                  ].map(role => {
                    const isChecked = selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                          isChecked
                            ? 'bg-emerald-950/50 border-emerald-500 text-white shadow'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                        onClick={() => {
                          setSelectedRoles(prev =>
                            prev.includes(role.id)
                              ? prev.filter(r => r !== role.id)
                              : [...prev, role.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isChecked} readOnly className="pointer-events-none accent-emerald-500" />
                          <span className="font-medium">{role.label}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{role.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Priority Level:
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'CRITICAL', label: 'Urgent' },
                    { id: 'WARNING', label: 'Warning' },
                    { id: 'ADVISORY', label: 'Informational' },
                  ].map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition border ${
                        alertUrgency === u.id
                          ? u.id === 'CRITICAL'
                            ? 'bg-red-950 border-red-500 text-red-200'
                            : u.id === 'WARNING'
                            ? 'bg-amber-950 border-amber-500 text-amber-200'
                            : 'bg-emerald-950 border-emerald-500 text-emerald-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                      onClick={() => setAlertUrgency(u.id)}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Payload Editor */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Broadcast Message:
                </label>
                <textarea
                  className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition"
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                />
              </div>

              {/* Quick Preset Templates */}
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[10.5px] text-zinc-500 font-semibold">Quick Templates:</span>
                <button
                  type="button"
                  className="text-[10.5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-md border border-zinc-800 transition"
                  onClick={() =>
                    setAlertMessage('Notice: Gate B is experiencing elevated queue times. Stewards please guide visitors toward Gate A.')
                  }
                >
                  Crowd Divert
                </button>
                <button
                  type="button"
                  className="text-[10.5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-md border border-zinc-800 transition"
                  onClick={() =>
                    setAlertMessage('Notice: Shuttle FLT-104 route update. Proceed directly to Main Entrance.')
                  }
                >
                  Shuttle Reroute
                </button>
                <button
                  type="button"
                  className="text-[10.5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-md border border-zinc-800 transition"
                  onClick={() =>
                    setAlertMessage('Operational Notice: Turnstiles and pathways flowing smoothly. Regular rotation at 14:00.')
                  }
                >
                  Routine Notice
                </button>
              </div>

              {/* Dispatch Action */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  {telegramReceipt ? (
                    <div className="text-xs text-zinc-300 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Delivered to {telegramReceipt.recipients_count} recipients</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500">
                      Recipients receive push alerts on Telegram and control radios
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg disabled:opacity-50"
                  disabled={isDispatching || selectedRoles.length === 0}
                  onClick={handleDispatchTelegram}
                >
                  <Send size={13} />
                  <span>{isDispatching ? 'Sending...' : 'Send Alert'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          UNIVERSAL VISITOR QR PASS MODAL (For Visitors to Scan at Gates/Kiosks)
          ====================================================================== */}
      {showUniversalQRModal && (
        <div className="tech-modal-backdrop" onClick={() => setShowUniversalQRModal(false)}>
          <div className="tech-modal-card max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="tech-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Universal Visitor Pass &amp; Guide
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Single QR for all guests &amp; attendees to scan
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition"
                onClick={() => setShowUniversalQRModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center gap-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 my-1">
              <div className="p-3 bg-white rounded-xl shadow-2xl">
                <QRCodeSVG
                  value={universalQrUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-[11.5px] text-zinc-400 text-center leading-relaxed max-w-[320px]">
                Visitors scan this QR code with their mobile camera to view real-time gate queue times, walking route, and live festival map.
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-zinc-800 rounded-lg gap-2">
              <span className="text-[11px] font-mono text-indigo-300 truncate">
                {universalQrUrl}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold shrink-0 transition"
                onClick={handleCopyUniversalLink}
              >
                {copiedLink ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg"
                onClick={() => window.open(universalQrUrl, '_blank')}
              >
                <ExternalLink size={14} />
                <span>Open in New Tab (Preview)</span>
              </button>
              <button
                type="button"
                className="py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                onClick={() => window.print()}
              >
                <Download size={14} />
                <span>Print Poster</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          SLIDE-OUT VEHICLE DETAILS DRAWER (Groww Style Asset Sheet)
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
            <span className="drawer-eyebrow">VEHICLE DETAILS</span>
            <h3 className="drawer-title">
              {selectedVehicle ? selectedVehicle.id : 'VEHICLE'} · {selectedVehicle?.label}
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
            {/* Driver Profile Card */}
            <div className="drawer-section-card">
              <div className="flex items-center justify-between">
                <h4 className="drawer-sec-title">Driver Information</h4>
                <span className="text-[10px] text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-medium">
                  ACTIVE SHIFT
                </span>
              </div>

              <div className="drawer-grid-2col">
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Driver Name:</span>
                  <span className="drawer-metric-val font-sans">
                    {globalPIIRevealed ? selectedVehicle.driver.name : '•••• ••••'}
                  </span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Phone:</span>
                  <span className="drawer-metric-val">
                    {globalPIIRevealed ? selectedVehicle.driver.phone : '•••• ••••'}
                  </span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Current Shift:</span>
                  <span className="drawer-metric-val">{selectedVehicle.driver.shift}</span>
                </div>

                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Assigned Route:</span>
                  <span className="drawer-metric-val text-zinc-300">{selectedVehicle.corridor}</span>
                </div>
              </div>
            </div>

            {/* Live Vehicle Telemetrics */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Vehicle Status</h4>
              <div className="drawer-grid-2col">
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Current Speed:</span>
                  <span className="drawer-metric-val text-white tabular-nums">
                    {selectedVehicle.speed.toFixed(1)} km/h
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Route Status:</span>
                  <span
                    className={`drawer-metric-val font-semibold ${
                      selectedVehicle.geofence === 'breach'
                        ? 'text-red-400'
                        : selectedVehicle.geofence === 'warning'
                        ? 'text-amber-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    {selectedVehicle.geofence === 'breach'
                      ? 'Route Deviation'
                      : selectedVehicle.geofence === 'warning'
                      ? 'Approaching Limit'
                      : 'On Planned Route'}
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Passenger Load:</span>
                  <span className="drawer-metric-val tabular-nums">
                    {selectedVehicle.passengers} / {selectedVehicle.capacity} seats ({Math.round((selectedVehicle.passengers / selectedVehicle.capacity) * 100)}%)
                  </span>
                </div>
                <div className="drawer-metric-item">
                  <span className="drawer-metric-label">Estimated Arrival:</span>
                  <span className="drawer-metric-val text-zinc-200 font-semibold tabular-nums">
                    {selectedVehicle.eta}
                  </span>
                </div>
              </div>
            </div>

            {/* Directives & Direct Contact */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Direct Driver Contact</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                  onClick={() => alert(`Connecting voice call to driver of ${selectedVehicle.id}...`)}
                >
                  <PhoneCall size={13} className="text-zinc-300" />
                  <span>Call Driver</span>
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-xs font-semibold text-red-200 flex items-center gap-1.5 transition"
                  onClick={() =>
                    handleExecuteAction({
                      id: `halt-${selectedVehicle.id}`,
                      action: `HOLD SHUTTLE: ${selectedVehicle.id}`,
                      targets: [selectedVehicle.id],
                    })
                  }
                >
                  <AlertTriangle size={13} className="text-red-400" />
                  <span>Hold Shuttle</span>
                </button>
              </div>
            </div>

            {/* Dispatcher Incident Log */}
            <div className="drawer-section-card">
              <h4 className="drawer-sec-title">Operations Notes</h4>
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
                  placeholder="Add note for this vehicle..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  type="button"
                  className="drawer-post-btn"
                  onClick={handleAddNote}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
