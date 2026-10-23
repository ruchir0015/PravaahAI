import { useState, useEffect, useRef, useCallback } from "react";
import "./CrowdDashboard.css";
import SpotlightCard from "./react-bits/SpotlightCard.jsx";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5050";
const POLL_MS = 2000;

// Functional color mapping for graphs and calculated metrics
const COLOR_MAP = {
  RED: {
    fg: "#ff3b5c",
    bg: "rgba(255,59,92,0.16)",
    border: "rgba(255,59,92,0.45)",
    glow: "0 0 14px rgba(255,59,92,0.35)",
  },
  YELLOW: {
    fg: "#ffc107",
    bg: "rgba(255,193,7,0.15)",
    border: "rgba(255,193,7,0.45)",
    glow: "0 0 12px rgba(255,193,7,0.25)",
  },
  GREEN: {
    fg: "#00ff88",
    bg: "rgba(0,255,136,0.12)",
    border: "rgba(0,255,136,0.4)",
    glow: "0 0 12px rgba(0,255,136,0.22)",
  },
};

function useSVGSparkline(history, width = 200, height = 48) {
  if (!history || history.length < 2) return "";
  const values = history.map((p) => (p.saturation != null ? p.saturation : 0));
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  });
  return pts.join(" ");
}

function Sparkline({ history, color = "#6881fd" }) {
  const pts = useSVGSparkline(history);
  if (!pts) return null;
  return (
    <svg viewBox="0 0 200 48" className="sparkline-svg" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon points={`0,48 ${pts} 200,48`} fill={color} fillOpacity="0.14" />
    </svg>
  );
}

// ── Zone Card (100% Dynamic, Functional Colors on Metrics & Graphs) ─────────
function ZoneCard({ zone, histData, forecastModel }) {
  const colKey = zone.color || "GREEN";
  const c = COLOR_MAP[colKey] || COLOR_MAP.GREEN;
  const sat = zone.saturation_pct != null ? zone.saturation_pct : 0;
  const fcSat = zone.forecast_sat;
  const fcCol = zone.forecast_color || "GREEN";
  const fcC = COLOR_MAP[fcCol] || COLOR_MAP.GREEN;

  return (
    <SpotlightCard
      className="cd-zone-card"
      spotlightColor="rgba(0,0,0,0.04)"
      style={{ borderColor: c.border }}
    >
      <div className="cd-zone-header">
        <div>
          <div className="cd-zone-id" style={{ color: c.fg }}>
            {zone.id}{zone.type ? ` · ${zone.type}` : ""}
          </div>
          <div className="cd-zone-label">{zone.label || zone.id}</div>
        </div>
        <div
          className="cd-level-pill"
          style={{
            color: c.fg,
            background: c.bg,
            border: `1.5px solid ${c.border}`,
            boxShadow: c.glow,
          }}
        >
          {zone.level || zone.color}
        </div>
      </div>

      <div className="cd-zone-metrics">
        <div className="cd-metric-col">
          <span className="cd-metric-val" style={{ color: c.fg }}>
            {sat != null ? `${sat.toFixed(0)}%` : "—"}
          </span>
          <span className="cd-metric-lbl">Density Load</span>
        </div>
        <div className="cd-metric-col">
          <span className="cd-metric-val">{zone.status_label || zone.level || "—"}</span>
          <span className="cd-metric-lbl">Flow State</span>
        </div>
        <div className="cd-metric-col">
          <span className="cd-metric-val" style={{ color: c.fg }}>
            {colKey === "RED" ? "CRITICAL" : colKey === "YELLOW" ? "ELEVATED" : "OPTIMAL"}
          </span>
          <span className="cd-metric-lbl">Status</span>
        </div>
      </div>

      {/* Saturation Progress Bar (Color-coded) */}
      <div className="cd-occ-bar-wrap">
        <div
          className="cd-occ-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(0, sat))}%`,
            background: c.fg,
            boxShadow: c.glow,
          }}
        />
      </div>

      {/* Sparkline Graph (Color-coded to zone) */}
      {histData && histData.length > 1 && (
        <div className="cd-sparkline-wrap">
          <Sparkline history={histData} color={c.fg} />
        </div>
      )}

      {/* Predictive Density Trend */}
      {fcSat != null && (
        <div className="cd-forecast-row" style={{ borderTop: `1px solid ${c.border}` }}>
          <div className="cd-fc-left">
            <span className="cd-forecast-badge">PROJECTION</span>
            <span className="cd-forecast-sub">{zone.forecast_model || forecastModel || "Predictive Model"}</span>
          </div>
          <span className="cd-forecast-val" style={{ color: fcC.fg }}>
            {zone.trend || "═"} {fcSat.toFixed(0)}% ({fcCol})
          </span>
        </div>
      )}
    </SpotlightCard>
  );
}

// ── Corridor Card (Functional Colors on Metrics & Graphs) ───────────────────
function CorridorCard({ corridor, histData }) {
  const sat = corridor.saturation_pct != null ? corridor.saturation_pct : 0;
  const colKey = corridor.color || "GREEN";
  const c = COLOR_MAP[colKey] || COLOR_MAP.GREEN;

  return (
    <SpotlightCard
      className="cd-zone-card cd-corridor-card"
      spotlightColor="rgba(0,0,0,0.04)"
      style={{ borderColor: c.border }}
    >
      <div className="cd-zone-header">
        <div>
          <div className="cd-zone-id" style={{ color: "#6881fd" }}>
            {corridor.id}{corridor.type ? ` · ${corridor.type}` : ""}
          </div>
          <div className="cd-zone-label">{corridor.name || corridor.id}</div>
        </div>
        <div
          className="cd-level-pill"
          style={{
            color: c.fg,
            background: c.bg,
            border: `1.5px solid ${c.border}`,
          }}
        >
          {corridor.los || corridor.color}
        </div>
      </div>

      <div className="cd-zone-metrics">
        <div className="cd-metric-col">
          <span className="cd-metric-val" style={{ color: c.fg }}>
            {corridor.vehicles != null ? corridor.vehicles : "—"}
          </span>
          <span className="cd-metric-lbl">Active Veh</span>
        </div>
        <div className="cd-metric-col">
          <span className="cd-metric-val">{corridor.speed_kmh != null ? corridor.speed_kmh : "—"}</span>
          <span className="cd-metric-lbl">Speed (km/h)</span>
        </div>
        <div className="cd-metric-col">
          <span className="cd-metric-val" style={{ color: c.fg }}>
            {sat != null ? `${sat.toFixed(0)}%` : "—"}
          </span>
          <span className="cd-metric-lbl">Saturation</span>
        </div>
      </div>

      {/* Saturation bar */}
      <div className="cd-occ-bar-wrap">
        <div
          className="cd-occ-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, sat))}%`, background: c.fg }}
        />
      </div>

      {/* Sparkline Graph */}
      {histData && histData.length > 1 && (
        <div className="cd-sparkline-wrap">
          <Sparkline history={histData} color="#6881fd" />
        </div>
      )}

      {/* Corridor Signal Info */}
      <div className="cd-corridor-footer">
        <div className="cd-signal-indicator">
          <span
            className="cd-signal-dot"
            style={{
              background: corridor.signal?.includes("GREEN")
                ? "#00ff88"
                : corridor.signal?.includes("AMBER")
                ? "#ffc107"
                : "#ff3b5c",
            }}
          />
          <span>{corridor.signal ? `SIGNAL: ${corridor.signal}` : "ACTIVE MONITOR"}</span>
        </div>
        {corridor.connects && (
          <div className="cd-connects-tag">Connects: {corridor.connects}</div>
        )}
      </div>
    </SpotlightCard>
  );
}

// ── Parking Deck Card (Functional Colors on Badges & Capacity) ─────────────
function ParkingCard({ lot }) {
  const pct = lot.pct != null ? lot.pct : 0;
  const colKey = lot.color || "GREEN";
  const c = COLOR_MAP[colKey] || COLOR_MAP.GREEN;

  return (
    <div className="cd-parking-card" style={{ borderColor: c.border }}>
      <div className="cd-parking-top">
        <span className="cd-parking-name">{lot.name || lot.id}</span>
        <span
          className="cd-parking-badge"
          style={{ color: c.fg, background: c.bg }}
        >
          {colKey} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="cd-parking-bar-wrap">
        <div
          className="cd-parking-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: c.fg }}
        />
      </div>
      <div className="cd-parking-nums">
        <span>Capacity: {lot.occupied != null ? lot.occupied : "—"} / {lot.capacity != null ? lot.capacity : "—"}</span>
        <span
          className="cd-bays-open"
          style={{ color: lot.available < 40 ? "#ff3b5c" : "#00ff88" }}
        >
          {lot.available != null ? `${lot.available} Bays Open` : "—"}
        </span>
      </div>
    </div>
  );
}

// ── Suggestion Card (No emojis, functional accent colors) ───────────────────
function SuggestionItem({ s, onExecute, isExecuted }) {
  const isCrit = s.level === "critical";
  const badgeColor = isCrit ? "#ff3b5c" : "#6881fd";

  return (
    <div
      className={`cd-suggestion-item ${isCrit ? "cd-sugg-crit" : ""}`}
      style={{ borderLeft: `3px solid ${badgeColor}` }}
    >
      <div className="cd-sugg-top">
        <div
          className="cd-sugg-type-badge"
          style={{
            background: isCrit ? "rgba(255,59,92,0.18)" : "rgba(104,129,253,0.18)",
            color: badgeColor,
            border: `1px solid ${isCrit ? "rgba(255,59,92,0.4)" : "rgba(104,129,253,0.4)"}`,
          }}
        >
          {s.type || "DIVERSION"}
        </div>
        <span className="cd-sugg-action-code">{s.action || "DIRECTIVE"}</span>
        <span className="cd-sugg-zone">{s.zone || ""}</span>
      </div>

      <div className="cd-sugg-msg">{s.message || ""}</div>

      {s.targets && s.targets.length > 0 && (
        <div className="cd-sugg-targets">
          <span className="cd-sugg-targets-label">Target Nodes:</span>
          {s.targets.map((t, i) => (
            <span
              key={i}
              className="cd-target-chip"
              style={{
                color: "#00ff88",
                borderColor: "rgba(0,255,136,0.4)",
                background: "rgba(0,255,136,0.12)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {s.impact && (
        <div className="cd-sugg-impact">
          <span className="cd-impact-label" style={{ color: "#00ff88" }}>OPERATIONAL IMPACT</span>
          <span className="cd-impact-text">{s.impact}</span>
        </div>
      )}

      <div className="cd-sugg-bottom">
        <div className="cd-sugg-role">
          Authority: <strong>{s.authority_role || "Command Control"}</strong>
        </div>

        <button
          className={`cd-action-btn ${isExecuted ? "cd-action-done" : ""}`}
          onClick={() => onExecute(s)}
          disabled={isExecuted}
        >
          {isExecuted
            ? "EXECUTED LIVE"
            : isCrit
            ? "DISPATCH PRIORITY DIVERSION"
            : "DISPATCH DIRECTIVE"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function CrowdDashboard() {
  const [status, setStatus] = useState(null);
  const [crowdHistory, setCrowdHistory] = useState({});
  const [traffHistory, setTraffHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [backErr, setBackErr] = useState(false);
  const [lastTs, setLastTs] = useState(null);
  const [videoOk, setVideoOk] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [executedActions, setExecutedActions] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/status`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return;
      const d = await r.json();
      if (d.status === "warming_up") return;
      setStatus(d);
      setLastTs(new Date());
      setBackErr(false);
      setLoading(false);

      // Fetch dynamic histories
      const zoneKeys = Object.keys(d.zones || {});
      const cHistList = await Promise.all(
        zoneKeys.map((z) =>
          fetch(`${API}/api/history/${z}`, { signal: AbortSignal.timeout(2500) })
            .then((res) => res.json())
            .catch(() => null)
        )
      );
      const cMap = {};
      zoneKeys.forEach((z, i) => {
        if (cHistList[i]) cMap[z] = cHistList[i].history || [];
      });
      setCrowdHistory(cMap);

      const corrKeys = Object.keys(d.traffic?.corridors || {});
      const tHistList = await Promise.all(
        corrKeys.map((c) =>
          fetch(`${API}/api/traffic_history/${c}`, { signal: AbortSignal.timeout(2500) })
            .then((res) => res.json())
            .catch(() => null)
        )
      );
      const tMap = {};
      corrKeys.forEach((c, i) => {
        if (tHistList[i]) tMap[c] = tHistList[i].history || [];
      });
      setTraffHistory(tMap);
    } catch {
      setBackErr(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchStatus]);

  const handleExecute = async (sugg) => {
    try {
      const res = await fetch(`${API}/api/action/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sugg.id,
          action: sugg.action,
          target: sugg.targets?.join(", ") || sugg.zone,
          operator: "Authorized Operator",
        }),
      });
      if (res.ok) {
        setExecutedActions((prev) => [...prev, sugg.id]);
        setActionNotice({
          msg: `Directive '${sugg.action}' successfully deployed across field actuators.`,
          time: new Date().toLocaleTimeString(),
        });
        setTimeout(() => setActionNotice(null), 6000);
      }
    } catch (e) {
      console.error("Action execution failed", e);
    }
  };

  const zones = status?.zones || {};
  const traffic = status?.traffic || {};
  const corridors = traffic.corridors || {};
  const parking = traffic.parking || {};
  const alerts = status?.alerts || [];
  const suggestions = status?.suggestions || [];
  const summary = status?.summary || {};
  const modelName = status?.model || "AI Flow Engine";

  const redZones = summary.red_zones ?? Object.values(zones).filter((z) => z.color === "RED").length;
  const yellowZones = summary.yellow_zones ?? Object.values(zones).filter((z) => z.color === "YELLOW").length;
  const greenZones = summary.green_zones ?? Object.values(zones).filter((z) => z.color === "GREEN").length;

  return (
    <div className="cd-page">
      {/* ── Executive Header ─────────────────────────────────────────────── */}
      <header className="cd-header">
        <div>
          <div className="cd-header-pill-row">
            <span className="cd-authority-badge">OFFICIAL AUTHORITY COMMAND CONSOLE</span>
            <span className="cd-model-badge">ENGINE: {modelName}</span>
          </div>
          <h1 className="cd-title">
            Pravaah AI · Spatial Density & Concourse Zones
          </h1>
          <p className="cd-subtitle">
            Continuous Spatial Density Heatmap · Dynamic Zone Categorization · Predictive Trend Forecasting
          </p>
        </div>

        <div className="cd-header-right">
          <div className="cd-view-tabs">
            <button
              className={`cd-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Unified Overview
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "crowd" ? "active" : ""}`}
              onClick={() => setActiveTab("crowd")}
            >
              Density & Heatmap
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "traffic" ? "active" : ""}`}
              onClick={() => setActiveTab("traffic")}
            >
              Arterials & Parking
            </button>
          </div>

          <div className={`cd-backend-pill ${backErr ? "cd-back-err" : "cd-back-ok"}`}>
            <span className="cd-back-dot" />
            {backErr ? "Backend Offline" : `Live Engine · ${lastTs ? lastTs.toLocaleTimeString() : "..."}`}
          </div>
        </div>
      </header>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="cd-toast-notice">
          <div className="cd-toast-content">
            <span className="cd-toast-title">DIRECTIVE DISPATCHED LIVE ({actionNotice.time})</span>
            <span className="cd-toast-msg">{actionNotice.msg}</span>
          </div>
        </div>
      )}

      {/* ── Top Executive Status Bar (Functional Colors on Metric Values) ──── */}
      <div className="cd-summary-bar">
        <SpotlightCard className="cd-summary-card" spotlightColor="rgba(255,59,92,0.12)">
          <div className="cd-sum-label">Critical Zones (High Density)</div>
          <div className="cd-sum-val" style={{ color: "#ff3b5c" }}>
            {loading ? "—" : redZones}
          </div>
          <div className="cd-sum-sub">
            {redZones > 0 ? `${redZones} sectors requiring diversion` : "No critical congestion"}
          </div>
        </SpotlightCard>

        <SpotlightCard className="cd-summary-card" spotlightColor="rgba(255,193,7,0.12)">
          <div className="cd-sum-label">Moderate Zones (Medium Density)</div>
          <div className="cd-sum-val" style={{ color: "#ffc107" }}>
            {loading ? "—" : yellowZones}
          </div>
          <div className="cd-sum-sub">
            {yellowZones > 0 ? `${yellowZones} sectors elevated` : "Nominal density"}
          </div>
        </SpotlightCard>

        <SpotlightCard className="cd-summary-card" spotlightColor="rgba(0,255,136,0.12)">
          <div className="cd-sum-label">Optimal Zones (Low Density)</div>
          <div className="cd-sum-val" style={{ color: "#00ff88" }}>
            {loading ? "—" : greenZones}
          </div>
          <div className="cd-sum-sub">
            {greenZones > 0 ? `${greenZones} sectors free flow` : "No capacity"}
          </div>
        </SpotlightCard>

        <SpotlightCard className="cd-summary-card" spotlightColor="rgba(104,129,253,0.12)">
          <div className="cd-sum-label">Actionable Directives</div>
          <div
            className="cd-sum-val"
            style={{ color: suggestions.length > 0 ? "#ff3b5c" : "#00ff88" }}
          >
            {loading ? "—" : suggestions.length}
          </div>
          <div className="cd-sum-sub">
            {suggestions.length > 0 ? `${suggestions.length} active directives` : "System in equilibrium"}
          </div>
        </SpotlightCard>
      </div>

      {loading && (
        <div className="cd-loading">
          <div className="cd-spinner" />
          <span>Connecting to Pravaah AI Spatial Density Engine...</span>
        </div>
      )}

      {!loading && (
        <div className="cd-body">
          {/* ── Left Column: Video & Zone Grids ───────────────────────────── */}
          <div className="cd-left">
            {/* LIVE SURVEILLANCE FEED */}
            <SpotlightCard className="cd-video-card" spotlightColor="rgba(0,0,0,0.04)">
              <div className="cd-video-header">
                <div>
                  <h3 className="cd-card-title">Live Concourse Heatmap · Zone Boundaries</h3>
                  <p className="cd-card-subtitle">
                    Continuous spatial density heatmap overlay with automated high-contrast zone boundaries
                  </p>
                </div>
                <div className="cd-live-badge">
                  <span className="cd-live-dot" />
                  LIVE HEATMAP ACTIVE
                </div>
              </div>
              <div className="cd-video-wrap">
                <img
                  src={`${API}/api/video_feed`}
                  alt="Live Thermal Density Heatmap"
                  className="cd-video-img"
                  onLoad={() => setVideoOk(true)}
                  onError={() => setVideoOk(false)}
                />
                {!videoOk && (
                  <div className="cd-video-placeholder">
                    <div className="cd-vp-text">FEED STANDBY</div>
                    <div className="cd-vp-sub">Awaiting stream from backend</div>
                  </div>
                )}
                <div className="cd-video-overlay">
                  <span>{status?.mode || "PRAVAAH_AI_LIVE"}</span>
                  <span>{status?.status || "SURVEILLANCE_ACTIVE"}</span>
                </div>
              </div>
            </SpotlightCard>

            {/* CONCOURSE ZONES (Rendered purely from status.zones) */}
            {(activeTab === "all" || activeTab === "crowd") && (
              <div className="cd-section-block">
                <div className="cd-subheading-row">
                  <h2 className="cd-subheading">
                    Concourse Crowd Density Status
                  </h2>
                  <span className="cd-subheading-meta">Categorized by Density Mass</span>
                </div>
                <div className="cd-zones-grid">
                  {Object.values(zones).map((zone) => (
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      histData={crowdHistory[zone.id]}
                      forecastModel={modelName}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ARTERIAL CORRIDORS & PARKING (Rendered purely from status.traffic) */}
            {(activeTab === "all" || activeTab === "traffic") && (
              <div className="cd-section-block">
                <div className="cd-subheading-row">
                  <h2 className="cd-subheading">
                    Vehicular Arterial Corridors & Signals
                  </h2>
                  <span className="cd-subheading-meta">Dynamic Diversion Control</span>
                </div>
                <div className="cd-zones-grid">
                  {Object.values(corridors).map((c) => (
                    <CorridorCard key={c.id} corridor={c} histData={traffHistory[c.id]} />
                  ))}
                </div>

                <div className="cd-parking-section">
                  <div className="cd-parking-header">
                    <span className="cd-parking-title">Parking Decks & Dynamic Redistribution</span>
                    <span className="cd-parking-desc">Automated diversion of incoming arrivals to overflow bays</span>
                  </div>
                  <div className="cd-parking-grid">
                    {Object.values(parking).map((lot) => (
                      <ParkingCard key={lot.id} lot={lot} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Rerouting Directives & Alerts ───────────────── */}
          <div className="cd-right">
            {/* AI REROUTING DIRECTIVES (Rendered purely from status.suggestions) */}
            <SpotlightCard className="cd-suggestions-card" spotlightColor="rgba(104,129,253,0.12)">
              <div className="cd-section-header">
                <div>
                  <h3 className="cd-card-title">
                    AI Concourse Rerouting Directives
                  </h3>
                  <p className="cd-card-subtitle">
                    Automated directives to divert flow away from high-density sectors into optimal zones
                  </p>
                </div>
                <span className="cd-suggestions-count">{suggestions.length} Directives</span>
              </div>

              <div className="cd-suggestions-list">
                {suggestions.length === 0 ? (
                  <div className="cd-no-alerts">
                    No active rerouting directives required. System in equilibrium.
                  </div>
                ) : (
                  suggestions.map((s, i) => (
                    <SuggestionItem
                      key={s.id || i}
                      s={s}
                      onExecute={handleExecute}
                      isExecuted={executedActions.includes(s.id)}
                    />
                  ))
                )}
              </div>
            </SpotlightCard>

            {/* LIVE SYSTEM ALERTS (Rendered purely from status.alerts) */}
            <SpotlightCard className="cd-alerts-card" spotlightColor="rgba(255,59,92,0.12)">
              <div className="cd-section-header">
                <div>
                  <h3 className="cd-card-title">Density Threshold & Surge Alerts</h3>
                  <p className="cd-card-subtitle">Immediate notifications on zone state transitions</p>
                </div>
                {alerts.length > 0 && (
                  <span
                    className="cd-alert-count"
                    style={{ background: "rgba(255,59,92,0.2)", color: "#ff3b5c" }}
                  >
                    {alerts.length} ALERTS
                  </span>
                )}
              </div>
              <div className="cd-alerts-list">
                {alerts.length === 0 ? (
                  <div className="cd-no-alerts" style={{ color: "#00ff88" }}>
                    All concourse zones are currently operating within optimal parameters.
                  </div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className={`cd-alert-item cd-alert-${a.level || "info"}`}>
                      <div className="cd-alert-badge">
                        <span className="cd-alert-tag-type">{a.type || "ALERT"}</span>
                        <span className="cd-alert-zone">{a.zone || ""}</span>
                      </div>
                      <div className="cd-alert-msg">{a.msg}</div>
                    </div>
                  ))
                )}
              </div>
            </SpotlightCard>

            {/* COMPARATIVE MATRIX TABLE (Rendered purely from status.zones and corridors) */}
            <SpotlightCard className="cd-table-card" spotlightColor="rgba(0,0,0,0.04)">
              <div className="cd-section-header">
                <h3 className="cd-card-title">Concourse & Arterial Status Matrix</h3>
              </div>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Sector / Node</th>
                    <th>Type</th>
                    <th>Density Saturation</th>
                    <th>State</th>
                    <th>Projection</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(zones).map((z) => {
                    const c = COLOR_MAP[z.color] || COLOR_MAP.GREEN;
                    return (
                      <tr key={z.id}>
                        <td className="cd-tbl-name">{z.label || z.id}</td>
                        <td className="cd-tbl-type">{z.type || "ZONE"}</td>
                        <td
                          className="cd-tbl-sat"
                          style={{ color: c.fg, fontWeight: 700 }}
                        >
                          {z.saturation_pct != null ? `${z.saturation_pct.toFixed(0)}%` : "—"}
                        </td>
                        <td>
                          <span
                            className="cd-tbl-pill"
                            style={{
                              color: c.fg,
                              background: c.bg,
                              border: `1.5px solid ${c.border}`,
                            }}
                          >
                            {z.level || z.color}
                          </span>
                        </td>
                        <td
                          className="cd-tbl-proj"
                          style={{
                            color:
                              z.forecast_color === "RED"
                                ? "#ff3b5c"
                                : z.forecast_color === "YELLOW"
                                ? "#ffc107"
                                : "#00ff88",
                          }}
                        >
                          {z.trend || "═"} {z.forecast_sat != null ? `${z.forecast_sat.toFixed(0)}% (${z.forecast_color || "OPT"})` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {Object.values(corridors).map((cr) => {
                    const c = COLOR_MAP[cr.color] || COLOR_MAP.GREEN;
                    return (
                      <tr key={cr.id}>
                        <td className="cd-tbl-name">{cr.name || cr.id}</td>
                        <td className="cd-tbl-type" style={{ color: "#6881fd" }}>
                          {cr.type || "CORRIDOR"}
                        </td>
                        <td
                          className="cd-tbl-sat"
                          style={{ color: c.fg, fontWeight: 700 }}
                        >
                          {cr.saturation_pct != null ? `${cr.saturation_pct.toFixed(0)}%` : "—"}
                        </td>
                        <td>
                          <span
                            className="cd-tbl-pill"
                            style={{
                              color: c.fg,
                              background: c.bg,
                              border: `1.5px solid ${c.border}`,
                            }}
                          >
                            {cr.los || cr.color}
                          </span>
                        </td>
                        <td>{cr.speed_kmh != null ? `${cr.speed_kmh} km/h` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SpotlightCard>
          </div>
        </div>
      )}
    </div>
  );
}
