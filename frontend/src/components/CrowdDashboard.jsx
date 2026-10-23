import { useState, useEffect, useRef, useCallback } from "react";
import {
  Compass,
  Video,
  Map as MapIcon,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Send,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Car,
  ParkingSquare
} from "lucide-react";
import "./CrowdDashboard.css";
import ShinyText from "./react-bits/ShinyText.jsx";

const API = "http://localhost:5050";
const POLL_MS = 2000;

const COLOR_MAP = {
  RED:    { fg: "#ff3b5c", bg: "rgba(255,59,92,0.14)", border: "#ff3b5c", label: "Critical Bottleneck" },
  YELLOW: { fg: "#f59e0b", bg: "rgba(245,158,11,0.14)", border: "#f59e0b", label: "Elevated Density" },
  GREEN:  { fg: "#10b981", bg: "rgba(16,185,129,0.12)", border: "#10b981", label: "Optimal Flow" },
};

export default function CrowdDashboard() {
  const [status, setStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState("video"); // "video" | "map"
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [executedActions, setExecutedActions] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [backErr, setBackErr] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [stRes, dsRes] = await Promise.all([
        fetch(`${API}/api/status`, { signal: AbortSignal.timeout(3000) }),
        fetch(`${API}/api/datasets`, { signal: AbortSignal.timeout(2500) })
      ]);

      if (stRes.ok) {
        const d = await stRes.json();
        if (d.status !== "warming_up") {
          setStatus(d);
          setBackErr(false);
          if (!selectedZoneId && d.zones && Object.keys(d.zones).length > 0) {
            setSelectedZoneId(Object.keys(d.zones)[0]);
          }
        }
      }
      if (dsRes.ok) {
        const ds = await dsRes.json();
        setDatasets(ds.datasets || []);
      }
    } catch {
      setBackErr(true);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  const handleSwitchDataset = async (datasetId) => {
    setIsSwitching(true);
    try {
      await fetch(`${API}/api/dataset/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId }),
      });
      await fetchStatus();
    } catch (e) {
      console.error("Dataset switch error", e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleExecute = async (sugg) => {
    try {
      const res = await fetch(`${API}/api/action/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sugg.id,
          action: sugg.action,
          target: sugg.targets?.join(", ") || sugg.zone,
          operator: "Chief Event Flow Marshal",
        }),
      });
      if (res.ok) {
        setExecutedActions((prev) => [...prev, sugg.id]);
        setActionNotice({
          msg: `Directive successfully dispatched: Field marshals & digital signage deployed for ${sugg.zone}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setTimeout(() => setActionNotice(null), 6000);
      }
    } catch (e) {
      console.error("Action execution error", e);
    }
  };

  const zones       = status?.zones || {};
  const zonesList   = Object.values(zones);
  const activeDs    = status?.dataset || {};
  const suggestions = status?.suggestions || [];
  const traffic     = status?.traffic || {};
  const corridors   = traffic.corridors || {};
  const parking     = traffic.parking || {};
  const summary     = status?.summary || {};

  const redCount    = summary.red_zones || zonesList.filter((z) => z.color === "RED").length;
  const yellowCount = summary.yellow_zones || zonesList.filter((z) => z.color === "YELLOW").length;

  const isCriticalEvent = redCount > 0;
  const isModerateEvent = !isCriticalEvent && yellowCount > 0;

  const primarySuggestion = suggestions.find(s => s.status === "ACTION_REQUIRED") || suggestions[0];
  const isPrimaryExecuted = primarySuggestion && executedActions.includes(primarySuggestion.id);

  const selectedZone = selectedZoneId ? zones[selectedZoneId] : zonesList[0];

  return (
    <div className="pravaah-command-page">
      {/* ── 1. Hero Safety Pulse Banner (Clear Glanceable Status) ── */}
      <section className={`hero-safety-banner ${isCriticalEvent ? "is-critical" : isModerateEvent ? "is-moderate" : "is-safe"}`}>
        <div className="safety-banner-left">
          <div className="safety-pulse-dot" />
          <div className="safety-banner-text">
            <span className="safety-eyebrow">
              {isCriticalEvent ? "ACTION REQUIRED · HIGH DENSITY" : isModerateEvent ? "ELEVATED CROWD FLOW · MONITORING" : "PRAVAAH HARMONIOUS FLOW · OPTIMAL"}
            </span>
            <h2 className="safety-headline">
              {isCriticalEvent
                ? `${redCount} Sector requiring diversion: High concentration at ${zonesList.find(z => z.color === "RED")?.label || "access gate"}.`
                : isModerateEvent
                ? `Steady crowd ingress: ${yellowCount} sector approaching capacity limits. Flow moving smoothly.`
                : `All ${zonesList.length || 4} fairground sectors operating in safe equilibrium. Zero crush risk.`}
            </h2>
          </div>
        </div>

        {/* Top-Right Dataset Switcher */}
        <div className="dataset-switcher-pill">
          <span className="ds-pill-title">BENCHMARK:</span>
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`ds-pill-btn ${d.is_active ? "active" : ""}`}
              disabled={isSwitching}
              onClick={() => handleSwitchDataset(d.id)}
            >
              {d.id === "pets2009" ? "🎓 PETS 2009" : d.id === "shanghaitech" ? "🏙️ Urban Expo" : "🏟️ Concourse"}
            </button>
          ))}
        </div>
      </section>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="action-toast">
          <CheckCircle2 size={18} color="#10b981" />
          <div className="toast-text">
            <strong>DIRECTIVE DISPATCHED LIVE ({actionNotice.time})</strong>
            <span>{actionNotice.msg}</span>
          </div>
        </div>
      )}

      {/* ── 2. Unified Spatial Canvas (CCTV Heatmap + Blueprint Map) ── */}
      <main className="spatial-command-layout">
        <div className="spatial-canvas-card">
          {/* Header Controls for Canvas */}
          <div className="canvas-header-bar">
            <div className="canvas-header-title">
              <span className="venue-title-badge">{activeDs.venue_name || "Fairgrounds"}</span>
              <span className="venue-name-sub">{activeDs.name || "Live Monitored Site"}</span>
            </div>

            {/* View Toggle: Thermal Vision vs Spatial Blueprint */}
            <div className="canvas-view-toggle">
              <button
                type="button"
                className={`toggle-btn ${activeTab === "video" ? "active" : ""}`}
                onClick={() => setActiveTab("video")}
              >
                <Video size={14} />
                <span>Thermal Vision</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${activeTab === "map" ? "active" : ""}`}
                onClick={() => setActiveTab("map")}
              >
                <MapIcon size={14} />
                <span>Fairground Map</span>
              </button>
            </div>
          </div>

          {/* Main Visual Display */}
          <div className="canvas-viewport">
            {activeTab === "video" ? (
              <div className="video-stream-container">
                <img
                  src={`${API}/api/video_feed`}
                  alt="Live Surveillance Stream with Heatmap"
                  className="live-video-element"
                />
                <div className="video-bottom-hud">
                  <div className="hud-engine-chip">
                    <span className="hud-dot-live" />
                    <span>CSRNet Density Matrix + ShanghaiTech LSTM</span>
                  </div>
                  <div className="hud-stats-chip">
                    <span>Active Ingress: {status?.total_count || 0} Estimated Visitors</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="blueprint-map-container">
                <img
                  src={activeDs.map_image || "/pets-campus-plan.svg"}
                  alt="Fairground Blueprint"
                  className="blueprint-img"
                />
                {zonesList.map((z) => {
                  const bbox = z.bbox || [0.1, 0.1, 0.4, 0.4];
                  const c = COLOR_MAP[z.color] || COLOR_MAP.GREEN;
                  const isSel = selectedZone?.id === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      className={`blueprint-sector-overlay ${isSel ? "is-selected" : ""}`}
                      style={{
                        left: `${bbox[0] * 100}%`,
                        top: `${bbox[1] * 100}%`,
                        width: `${(bbox[2] - bbox[0]) * 100}%`,
                        height: `${(bbox[3] - bbox[1]) * 100}%`,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                      }}
                      onClick={() => setSelectedZoneId(z.id)}
                    >
                      <div className="sector-ov-header">
                        <span className="sector-ov-id">{z.id}</span>
                        <span className="sector-ov-sat" style={{ color: c.fg }}>{z.saturation_pct}%</span>
                      </div>
                      <div className="sector-ov-label">{z.label}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Focused Tactical Sidebar (One Highlighted Action + Focused Sector) ── */}
        <aside className="command-sidebar">
          {/* A. Smart Rerouting Action Card */}
          {primarySuggestion && (
            <div className={`action-highlight-card ${primarySuggestion.level === "critical" ? "is-critical" : ""}`}>
              <div className="action-card-top">
                <span className="action-type-badge">
                  {primarySuggestion.type === "CROWD" ? "👥 CROWD DIVERSION" : "⚡ TRAFFIC & CROWD REROUTE"}
                </span>
                <span className="action-status-pill">
                  {isPrimaryExecuted ? "DISPATCHED" : primarySuggestion.status}
                </span>
              </div>

              <div className="action-main-msg">
                {primarySuggestion.message}
              </div>

              {primarySuggestion.targets && primarySuggestion.targets.length > 0 && (
                <div className="action-target-row">
                  <span className="target-label">Recommended Path:</span>
                  <div className="target-chips">
                    {primarySuggestion.targets.map((t, idx) => (
                      <span key={idx} className="target-chip">
                        🟢 {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {primarySuggestion.impact && (
                <div className="action-impact-text">
                  ✨ {primarySuggestion.impact}
                </div>
              )}

              <button
                type="button"
                className={`btn-dispatch-action ${isPrimaryExecuted ? "is-done" : ""}`}
                disabled={isPrimaryExecuted}
                onClick={() => handleExecute(primarySuggestion)}
              >
                {isPrimaryExecuted ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Directive Deployed &amp; Relieving Bottleneck</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Deploy Diversion to Field Marshals</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* B. Focused Sector Telemetry */}
          {selectedZone && (
            <div className="sector-focused-card">
              <div className="sector-focused-header">
                <div>
                  <span className="sector-sub-tag">SECTOR INSPECTION</span>
                  <h3 className="sector-name-title">{selectedZone.label}</h3>
                </div>
                <span
                  className="sector-color-badge"
                  style={{
                    color: COLOR_MAP[selectedZone.color]?.fg,
                    backgroundColor: COLOR_MAP[selectedZone.color]?.bg,
                    borderColor: COLOR_MAP[selectedZone.color]?.border,
                  }}
                >
                  {selectedZone.color} ({selectedZone.level})
                </span>
              </div>

              {/* Minimal Saturation Bar */}
              <div className="sat-bar-wrap">
                <div className="sat-bar-info">
                  <span>Crowd Density</span>
                  <strong style={{ color: COLOR_MAP[selectedZone.color]?.fg }}>
                    {selectedZone.saturation_pct.toFixed(0)}%
                  </strong>
                </div>
                <div className="sat-track">
                  <div
                    className="sat-fill"
                    style={{
                      width: `${Math.min(100, selectedZone.saturation_pct)}%`,
                      backgroundColor: COLOR_MAP[selectedZone.color]?.fg,
                    }}
                  />
                </div>
              </div>

              {/* 3 Glanceable Metric Boxes */}
              <div className="focused-metrics-grid">
                <div className="f-metric-box">
                  <span className="f-metric-lbl">Headcount</span>
                  <span className="f-metric-val">{selectedZone.count || 0}</span>
                </div>
                <div className="f-metric-box">
                  <span className="f-metric-lbl">Safe Capacity</span>
                  <span className="f-metric-val">{selectedZone.capacity || 20}</span>
                </div>
                <div className="f-metric-box">
                  <span className="f-metric-lbl">LSTM 10m Forecast</span>
                  <span className="f-metric-val" style={{ color: COLOR_MAP[selectedZone.forecast_color]?.fg }}>
                    {selectedZone.forecast_sat ? `${selectedZone.forecast_sat}%` : "—"} {selectedZone.trend}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* C. Outer Ingress & Road Arterials (Compact Calm Strip) */}
          <div className="corridors-compact-card">
            <span className="compact-card-title">Access Roads &amp; Ingress Corridors</span>
            <div className="corridors-pills-row">
              {Object.values(corridors).slice(0, 3).map((c) => (
                <div key={c.id} className="corridor-mini-pill">
                  <span className="corridor-dot" style={{ backgroundColor: c.color === "RED" ? "#ff3b5c" : c.color === "YELLOW" ? "#f59e0b" : "#10b981" }} />
                  <span className="corridor-name">{c.name.split(" ")[0]}</span>
                  <span className="corridor-speed">{c.speed_kmh} km/h</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* ── 4. Sector Status Strip (Glanceable, click to focus) ── */}
      <footer className="sectors-glance-strip">
        <span className="strip-title">FAIRGROUND SECTORS:</span>
        <div className="strip-scroll-row">
          {zonesList.map((z) => {
            const c = COLOR_MAP[z.color] || COLOR_MAP.GREEN;
            const isSel = selectedZone?.id === z.id;
            return (
              <button
                key={z.id}
                type="button"
                className={`sector-strip-pill ${isSel ? "is-active" : ""}`}
                style={{
                  borderColor: isSel ? "#ffffff" : c.border,
                }}
                onClick={() => setSelectedZoneId(z.id)}
              >
                <span className="strip-pill-dot" style={{ backgroundColor: c.fg }} />
                <span className="strip-pill-name">{z.label}</span>
                <span className="strip-pill-sat" style={{ color: c.fg }}>{z.saturation_pct.toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
