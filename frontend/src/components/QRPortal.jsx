import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRPortal.css';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import ShinyText from './react-bits/ShinyText.jsx';
import StarBorder from './react-bits/StarBorder.jsx';
import DecryptedText from './react-bits/DecryptedText.jsx';

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

  return (
    <div className="qr-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <ShinyText text="QR Credential Portal" speed={3.5} />
          </h1>
          <p className="page-sub">Issue cryptographic digital passes for dynamic venue routing</p>
        </div>
        <StarBorder
          onClick={() => setActiveView('attendee')}
          id="preview-attendee-btn"
          color="var(--color-periwinkle-300)"
        >
          <span>👤 Preview Attendee View</span>
        </StarBorder>
      </header>

      <div className="qr-body">
        {/* Form Card */}
        <SpotlightCard className="qr-card add-card" spotlightColor="rgba(104, 84, 222, 0.15)">
          <h3 className="card-title">Register Attendee</h3>
          <div className="form-group">
            <label className="field-label" htmlFor="new-attendee-name">Full Name</label>
            <input
              id="new-attendee-name"
              className="field-input mb-12"
              placeholder="e.g. Ananya Reddy"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="new-ticket-type">Pass Tier</label>
            <select
              id="new-ticket-type"
              className="field-input mb-16"
              value={newTicket}
              onChange={(e) => setNewTicket(e.target.value)}
            >
              <option value="General">General Admission</option>
              <option value="VIP">VIP Access</option>
              <option value="Press">Press / Media</option>
            </select>
          </div>

          <button
            className="btn-create"
            onClick={handleAdd}
            id="add-attendee-btn"
          >
            + Issue Pass &amp; Generate QR
          </button>
        </SpotlightCard>

        {/* List Card */}
        <SpotlightCard className="qr-card attendee-list-card" spotlightColor="rgba(54, 87, 252, 0.15)">
          <div className="card-row">
            <h3 className="card-title">Attendees Directory</h3>
            <span className="attendee-count-chip">{attendees.length} Passes</span>
          </div>

          <div className="attendee-list">
            {attendees.map((a) => {
              const isSel = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  id={`attendee-${a.id}`}
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
        </SpotlightCard>

        {/* QR Preview Card */}
        <SpotlightCard className="qr-card qr-display-card" spotlightColor="rgba(0, 255, 136, 0.12)">
          {selected ? (
            <>
              <div className="qr-header-wrap">
                <span className="qr-badge-top">DIGITAL CREDENTIAL</span>
                <h3 className="qr-attendee-title">
                  <DecryptedText text={selected.name} animateOn="mount" speed={20} />
                </h3>
              </div>

              <div className="qr-pass-box" id="qr-box">
                <div className="qr-glow-halo" />
                <div className="qr-svg-wrap">
                  <QRCodeSVG
                    value={qrPayload(selected)}
                    size={180}
                    bgColor="transparent"
                    fgColor="#eceafb"
                    level="H"
                  />
                </div>
                <div className="qr-pass-tag">PRAVAAH SECURE ACCESS</div>
              </div>

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
                  <span className="qr-info-val" style={{ color: 'var(--color-onyx-500)' }}>
                    Active
                  </span>
                </div>
              </div>

              <p className="qr-hint">
                Scan to launch interactive mobile wayfinding with dynamic crowd redirection
              </p>
            </>
          ) : (
            <div className="placeholder-card">Select an attendee to view credential</div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
