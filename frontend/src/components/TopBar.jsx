import { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Sparkles,
  QrCode,
  X,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import FoldText from './FoldText';
import './TopBar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: <Compass size={15} strokeWidth={2.2} /> },
  { id: 'setup',     label: 'Fairgrounds & Cameras', icon: <MapPin size={15} strokeWidth={2.2} /> },
];

export default function TopBar({ activeView = 'dashboard', setActiveView }) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  // Auto-fetch detected server IP from backend
  useEffect(() => {
    fetch('/api/system/network')
      .then(res => res.json())
      .then(data => {
        if (data && data.primary_ip) {
          setNetworkInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  // Universal QR URL for All Visitors - Public Cloud Deployment
  const universalQrUrl = useMemo(() => {
    if (customUrl.trim()) return customUrl.trim();
    if (networkInfo?.visitor_url) return networkInfo.visitor_url;
    if (networkInfo?.public_url) return `${networkInfo.public_url}/?visitor=1#attendee`;
    if (typeof window === 'undefined') return 'https://e88928053e6601.lhr.life/?visitor=1#attendee';

    // If on actual domain / remote tunnel IP, use that host
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `${window.location.protocol}//${window.location.hostname}${port}/?visitor=1#attendee`;
    }

    // Default to the live public tunnel so anyone can scan over 4G/5G/LTE with NO hotspot required!
    return 'https://e88928053e6601.lhr.life/?visitor=1#attendee';
  }, [customUrl, networkInfo]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(universalQrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <header className="fixed-topbar" id="main-topbar">
        {/* Left: Brand Logo and Title */}
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-brand-btn"
            onClick={() => setActiveView && setActiveView('dashboard')}
            title="Pravaah · Crowd & Fleet Operations"
          >
            <div className="topbar-logo-wrap">
              <img src="/logoo.png" alt="Pravaah Logo" className="topbar-logo" />
            </div>
            <div className="topbar-brand-info">
              <div className="topbar-brand-title-wrap">
                <FoldText
                  text="Pravaah"
                  foldStyle="paper"
                  splitBy="char"
                  hinge="top"
                  trigger="mount"
                  foldAngle={92}
                  duration={0.7}
                  stagger={0.045}
                  staggerFrom="start"
                  ease="power3.out"
                  hoverRefold={true}
                  refoldRadius={160}
                  refoldAngle={45}
                  perspective={800}
                  creaseShading={0}
                  fontSize="2.4rem"
                  fontWeight={800}
                  color="#09090b"
                  className="topbar-foldtext"
                />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Clean 2-Item Navigation */}
        <nav className="topbar-center-nav">
          <div className="topbar-nav-pill-group">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id || (item.id === 'dashboard' && (activeView === 'live' || activeView === 'zones'));
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  className={`topbar-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveView && setActiveView(item.id)}
                >
                  <span className="topbar-nav-icon">{item.icon}</span>
                  <span className="topbar-nav-label">{item.label}</span>
                  {isActive && <span className="topbar-active-glow" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Visitor QR Button */}
        <div className="topbar-right">
          <button
            type="button"
            id="topbar-qr-btn"
            className="topbar-qr-btn"
            onClick={() => setShowQRModal(true)}
            title="Show Universal QR Pass for Visitors to Scan"
          >
            <QrCode size={14} />
            <span>Visitor QR</span>
          </button>
        </div>
      </header>

      {/* Universal Visitor QR Pass Modal */}
      {showQRModal && (
        <div className="topbar-modal-backdrop" onClick={() => setShowQRModal(false)}>
          <div className="topbar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="topbar-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="topbar-modal-icon-badge">
                  <QrCode size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="topbar-modal-title">Universal Visitor Pass</h3>
                  <p className="topbar-modal-sub">Scan to open live interactive guide on any phone</p>
                </div>
              </div>
              <button
                type="button"
                className="topbar-modal-close"
                onClick={() => setShowQRModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="topbar-modal-qr-container">
              <div className="topbar-qr-box">
                <QRCodeSVG
                  value={universalQrUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="topbar-qr-hint">
                One single universal pass for all venue visitors. Scan with any phone camera to view live queue times, navigation route &amp; event pass.
              </p>
            </div>

            {/* URL Display / Edit Mode */}
            <div className="topbar-modal-url-box">
              {isEditingUrl ? (
                <input
                  type="text"
                  className="topbar-url-input"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="Paste ngrok, localtunnel, or custom domain..."
                  autoFocus
                />
              ) : (
                <span className="topbar-url-text">{universalQrUrl}</span>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="topbar-url-copy-btn"
                  onClick={() => setIsEditingUrl(!isEditingUrl)}
                  title="Edit or paste public tunnel / custom domain URL"
                >
                  <span>{isEditingUrl ? 'Done' : 'Edit IP/Tunnel'}</span>
                </button>
                <button
                  type="button"
                  className="topbar-url-copy-btn"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick Network Diagnostics Note */}
            <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
              <div className="font-semibold text-emerald-400 mb-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Direct Global Cloud Access (No Hotspot Required)</span>
              </div>
              <div className="text-zinc-300">• <strong>Scan from Any Mobile Device:</strong> Works seamlessly over cellular 4G/5G, LTE, or any external Wi-Fi. You do <em>not</em> need to be on the same hotspot.</div>
              <div className="text-zinc-400 mt-0.5">• <strong>Target URL:</strong> <code className="text-emerald-400 bg-black/60 px-1 py-0.5 rounded font-mono text-[10.5px]">{universalQrUrl}</code></div>
            </div>

            <div className="topbar-modal-actions mt-3">
              <button
                type="button"
                className="topbar-modal-preview-btn"
                onClick={() => window.open(universalQrUrl, '_blank')}
              >
                <ExternalLink size={14} />
                <span>Open in New Tab (Preview Companion)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
