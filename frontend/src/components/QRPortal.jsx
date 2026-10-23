import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
    JSON.stringify({ id: att.id, name: att.name, ticket: att.ticket, gate: att.gate, venueUrl: window.location.href + '#attendee' });

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
          <h1 className="page-title">QR Code Portal</h1>
          <p className="page-sub">Generate & distribute QR codes for attendee venue navigation</p>
        </div>
        <button className="btn-primary" onClick={() => setActiveView('attendee')} id="preview-attendee-btn">
          👤 Preview Attendee View
        </button>
      </header>

      <div className="qr-body">
        {/* Add attendee */}
        <div className="card add-card">
          <h3 className="card-title">Add Attendee</h3>
          <label className="field-label">Full Name</label>
          <input id="new-attendee-name" className="field-input mb-10" placeholder="e.g. Ananya Reddy" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <label className="field-label">Ticket Type</label>
          <select id="new-ticket-type" className="field-input mb-10" value={newTicket} onChange={(e) => setNewTicket(e.target.value)}>
            <option>General</option>
            <option>VIP</option>
            <option>Press</option>
          </select>
          <button className="btn-primary" onClick={handleAdd} id="add-attendee-btn">+ Add &amp; Generate QR</button>
        </div>

        {/* Attendee list */}
        <div className="card attendee-list-card">
          <h3 className="card-title">Attendees ({attendees.length})</h3>
          <div className="attendee-list">
            {attendees.map((a) => (
              <button
                key={a.id}
                id={`attendee-${a.id}`}
                className={`attendee-row ${selected?.id === a.id ? 'active' : ''}`}
                onClick={() => setSelected(a)}
              >
                <div className="att-avatar">{a.name[0]}</div>
                <div className="att-info">
                  <div className="att-name">{a.name}</div>
                  <div className="att-meta">{a.id} · {a.ticket} · {a.gate}</div>
                </div>
                <div className={`ticket-badge ticket-${a.ticket.toLowerCase()}`}>{a.ticket}</div>
              </button>
            ))}
          </div>
        </div>

        {/* QR display */}
        <div className="card qr-display-card">
          {selected ? (
            <>
              <h3 className="card-title">QR Code — {selected.name}</h3>
              <div className="qr-box" id="qr-box">
                <div className="qr-inner">
                  <QRCodeSVG
                    value={qrPayload(selected)}
                    size={200}
                    bgColor="transparent"
                    fgColor="#f0f2ff"
                    level="H"
                  />
                </div>
                <div className="qr-venue-label">Pravaah · Venue Access</div>
              </div>
              <div className="qr-info">
                <div className="qr-info-row"><span>Name</span><strong>{selected.name}</strong></div>
                <div className="qr-info-row"><span>ID</span><strong>{selected.id}</strong></div>
                <div className="qr-info-row"><span>Ticket</span><strong>{selected.ticket}</strong></div>
                <div className="qr-info-row"><span>Entry Gate</span><strong>{selected.gate}</strong></div>
              </div>
              <p className="qr-hint">Attendee scans this to get an interactive venue map with navigation</p>
            </>
          ) : (
            <div className="placeholder-card">Select an attendee to generate QR</div>
          )}
        </div>
      </div>
    </div>
  );
}
