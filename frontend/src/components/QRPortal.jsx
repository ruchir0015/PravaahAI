import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, Plus, Download } from 'lucide-react';
import TechText from './TechText';
import './QRPortal.css';

const SAMPLE_ATTENDEES = [
  { id: 'ATT-001', name: 'Arjun Sharma',  ticket: 'VIP',      gate: 'Gate A' },
  { id: 'ATT-002', name: 'Priya Mehta',   ticket: 'General',  gate: 'Gate B' },
  { id: 'ATT-003', name: 'Ravi Kumar',    ticket: 'General',  gate: 'Gate A' },
  { id: 'ATT-004', name: 'Sneha Patel',   ticket: 'VIP',      gate: 'Gate A' },
];

export default function QRPortal({ setActiveView }) {
  const [selected, setSelected] = useState(SAMPLE_ATTENDEES[0]);
  const [newName, setNewName] = useState('');
  const [newTicket, setNewTicket] = useState('General');
  const [attendees, setAttendees] = useState(SAMPLE_ATTENDEES);

  const qrPayload = (att) =>
    JSON.stringify({
      id: att.id,
      name: att.name,
      ticket: att.ticket,
      gate: att.gate,
      venueUrl: window.location.href + '#attendee',
    });

  const handleAdd = () => {
    if (!newName.trim()) return;
    const att = {
      id: `ATT-${String(attendees.length + 1).padStart(3, '0')}`,
      name: newName.trim(),
      ticket: newTicket,
      gate: newTicket === 'VIP' ? 'Gate A' : 'Gate B',
    };
    setAttendees((prev) => [...prev, att]);
    setSelected(att);
    setNewName('');
  };

  const handleDownloadPng = () => {
    const svgEl = document.querySelector('.qr-code-box svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width || 200;
      canvas.height = img.height || 200;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${selected.id}-pass.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="qr-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">QR Credential Portal</h1>
          <div className="techttext-subheading-wrap">
            <TechText
              text="Issue digital credentials & dynamic venue passes"
              fontWeight={600}
              fontSize={15}
              align="left"
              color="#1b1056"
              accentColor="#4329d6"
              reveal="off"
              selection={false}
              labels={false}
              specks={0}
              sweep={false}
              clickKick
              draggable
              guides={false}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('attendee')}
          id="preview-attendee-btn"
          className="btn-primary"
        >
          <Eye size={16} strokeWidth={2} />
          <span>Preview Attendee View</span>
        </button>
      </header>

      <div className="qr-body">
        <div className="app-card qr-card add-card">
          <h2 className="section-title">Register Attendee</h2>
          <div className="form-group">
            <label className="field-label" htmlFor="new-attendee-name">Full Name</label>
            <input
              id="new-attendee-name"
              className="field-input"
              placeholder="e.g. Ananya Reddy"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="new-ticket-type">Pass Tier</label>
            <select
              id="new-ticket-type"
              className="field-input"
              value={newTicket}
              onChange={(e) => setNewTicket(e.target.value)}
            >
              <option value="General">General Admission</option>
              <option value="VIP">VIP Access</option>
              <option value="Press">Press / Media</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary btn-full"
            onClick={handleAdd}
            id="add-attendee-btn"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Issue Pass &amp; Generate QR</span>
          </button>
        </div>

        <div className="app-card qr-card attendee-list-card">
          <div className="card-row">
            <h2 className="section-title">Attendees Directory</h2>
            <span className="attendee-count-chip">{attendees.length} Passes</span>
          </div>

          <div className="attendee-list">
            {attendees.map((a) => {
              const isSel = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  id={`attendee-${a.id}`}
                  type="button"
                  className={`attendee-row ${isSel ? 'active' : ''}`}
                  onClick={() => setSelected(a)}
                >
                  <div className="att-avatar">{a.name[0]}</div>
                  <div className="att-info">
                    <div className="att-name">{a.name}</div>
                    <div className="att-meta">
                      <span>{a.id}</span> · <span>{a.gate}</span>
                    </div>
                  </div>
                  <div className={`ticket-badge ticket-${a.ticket.toLowerCase()}`}>
                    {a.ticket}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="app-card qr-card qr-display-card">
          {selected ? (
            <>
              <div className="qr-header-wrap">
                <span className="field-label">DIGITAL CREDENTIAL</span>
                <h2 className="section-title qr-attendee-title">{selected.name}</h2>
              </div>

              <div className="qr-code-box" id="qr-box">
                <QRCodeSVG
                  value={qrPayload(selected)}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0d082b"
                  level="H"
                />
              </div>

              <p className="qr-caption">PRAVAAH SECURE ACCESS · {selected.id}</p>

              <button
                type="button"
                className="btn-secondary btn-full btn-download-png"
                onClick={handleDownloadPng}
              >
                <Download size={15} strokeWidth={2} />
                <span>Download PNG</span>
              </button>

              <div className="qr-info-grid">
                <div className="qr-info-item">
                  <span className="qr-info-label">Pass ID</span>
                  <span className="qr-info-val">{selected.id}</span>
                </div>
                <div className="qr-info-item">
                  <span className="qr-info-label">Access Tier</span>
                  <span className="qr-info-val">{selected.ticket}</span>
                </div>
                <div className="qr-info-item">
                  <span className="qr-info-label">Designated Entry</span>
                  <span className="qr-info-val">{selected.gate}</span>
                </div>
                <div className="qr-info-item">
                  <span className="qr-info-label">Routing Status</span>
                  <span className="qr-info-val qr-status-active">Active</span>
                </div>
              </div>
            </>
          ) : (
            <div className="placeholder-card">Select an attendee to view credential</div>
          )}
        </div>
      </div>
    </div>
  );
}
