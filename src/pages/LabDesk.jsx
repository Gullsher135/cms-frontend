import { useState } from 'react'
import CaseTable from '../components/CaseTable'
import { 
  FlaskConical, 
  Plus, 
  DollarSign, 
  Tag, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Microscope,
  FileText
} from 'lucide-react'

function LabDesk({ cases, onUpdate, catalog, onAddLabTest }) {
  const pending = cases.filter((c) => c.labStatus === 'pending' || c.labStatus === 'in_progress')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  // Helper to format currency
  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`

  return (
    <div className="lab-desk-upgraded" style={{ animation: "fadeIn 0.4s ease-out" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .lab-desk-upgraded .modern-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e9edf2;
          transition: all 0.2s ease;
        }
        .lab-desk-upgraded .form-icon-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .lab-desk-upgraded .form-icon-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
        .lab-desk-upgraded .form-icon-group input,
        .lab-desk-upgraded .form-icon-group select {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 0.9rem;
          padding: 0.2rem 0;
        }
        .modern-button {
          border: none;
          border-radius: 40px;
          padding: 0.6rem 1.2rem;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modern-button-primary {
          background: linear-gradient(105deg, #0f5ea8, #1b76c8);
          color: white;
          box-shadow: 0 2px 6px rgba(15, 94, 168, 0.2);
        }
        .modern-button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(15, 94, 168, 0.25);
        }
        .modern-button-secondary {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }
        .modern-button-secondary:hover {
          background: #e6edf4;
        }
        .modern-button-success {
          background: #10b981;
          color: white;
        }
        .modern-button-success:hover {
          background: #059669;
        }
        .modern-button-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .catalog-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #eef2ff;
          color: #0f5ea8;
          border-radius: 40px;
          padding: 0.3rem 0.8rem;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .status-badge-pending {
          background: #fef3c7;
          color: #d97706;
          padding: 0.2rem 0.6rem;
          border-radius: 30px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .status-badge-progress {
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.2rem 0.6rem;
          border-radius: 30px;
          font-size: 0.7rem;
          font-weight: 600;
        }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "0.5rem" }}>
            <Microscope size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, background: "linear-gradient(135deg, #0f5ea8, #1b76c8)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              LIMS Desk
            </h2>
            <p style={{ margin: "0.2rem 0 0", color: "#5b6e8c" }}>
              Receive patient + doctor info with test token and update lab status
            </p>
          </div>
        </div>
      </div>

      {/* Add Test to Catalog Section */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} color="#0f5ea8" /> Add Test to Catalog
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-icon-group">
            <FlaskConical size={16} />
            <input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-icon-group">
            <DollarSign size={16} />
            <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="modern-button modern-button-secondary"
          onClick={() => {
            if (!name || !price) return
            onAddLabTest({ name, price: Number(price) })
            setName('')
            setPrice('')
          }}
        >
          <Plus size={16} /> Add Test To Catalog
        </button>
      </div>

      {/* Test Catalog Display */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Tag size={18} color="#0f5ea8" /> Test Catalog
          <span className="catalog-chip" style={{ marginLeft: "0.5rem" }}>{(catalog || []).length} tests</span>
        </h3>
        {(catalog || []).length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem", color: "#5b6e8c" }}>No tests in catalog. Add some using the form above.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {(catalog || []).map((t, idx) => (
              <span key={idx} className="catalog-chip">
                <FlaskConical size={12} /> {t.name} ({formatPKR(t.price)})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pending Lab Tests */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity size={18} color="#0f5ea8" /> Pending Lab Tests
          <span className="status-badge-pending" style={{ marginLeft: "0.5rem" }}>{pending.length} pending</span>
        </h3>
        <CaseTable
          cases={pending}
          actions={(c) => (
            <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.85rem", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "12px" }}>
                <span><strong>Token:</strong> {c.token || 'Pending reception token'}</span>
                <span><strong>Doctor:</strong> {c.doctorName}</span>
              </div>
              <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem" }}>
                <strong>Tests:</strong> {(c.recommendedTests || []).map((t) => `${t.name} (${formatPKR(t.price)})`).join(', ') || 'No tests'}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="modern-button modern-button-secondary" onClick={() => onUpdate(c.id, { labStatus: 'in_progress' })}>
                  <Clock size={14} /> Mark In Progress
                </button>
                <button type="button" className="modern-button modern-button-success" onClick={() => onUpdate(c.id, {
                  labStatus: 'done',
                  status: c.pharmacyStatus === 'pending' ? 'pharmacy' : c.status,
                  timelineAction: 'Lab report marked done',
                })}>
                  <CheckCircle size={14} /> Mark Done
                </button>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}

export default LabDesk