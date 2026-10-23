import { useState, useMemo } from 'react';
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

  // Universal QR URL for All Visitors
  const universalQrUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:5174/?visitor=1#attendee';
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? '11.20.17.207'
      : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${host}${port}/?visitor=1#attendee`;
  }, []);

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
              <div className="topbar-logo-glow" />
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
                  creaseShading={0.45}
                  fontSize="1.75rem"
                  fontWeight={800}
                  color="#ffffff"
                  className="topbar-foldtext"
                />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Clean 3-Item Navigation */}
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

        {/* Right: Visitor QR & Refined Live Indicator */}
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

          <div className="topbar-live-status">
            <span className="topbar-status-pulse" />
            <span className="topbar-status-text">LIVE</span>
          </div>
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
                One single QR for all venue visitors. Point camera to view live queue times, navigation route &amp; event pass.
              </p>
            </div>

            <div className="topbar-modal-url-box">
              <span className="topbar-url-text">{universalQrUrl}</span>
              <button
                type="button"
                className="topbar-url-copy-btn"
                onClick={handleCopyLink}
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="topbar-modal-actions">
              <button
                type="button"
                className="topbar-modal-preview-btn"
                onClick={() => window.open(universalQrUrl, '_blank')}
              >
                <ExternalLink size={14} />
                <span>Open in New Tab (Preview)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
