import { Eye, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

function CaseTable({ cases, actions, onViewTimeline }) {
  if (!cases.length) return <p className="muted" style={{ textAlign: "center", padding: "2rem", background: "#f8fafc", borderRadius: "20px", color: "#5b6e8c" }}>📋 No records available.</p>

  const getSla = (caseItem) => {
    const hours = (Date.now() - new Date(caseItem.createdAt || Date.now()).getTime()) / 3600000
    if (hours < 2) return { label: 'On Track', cls: 'sla-good', icon: CheckCircle }
    if (hours < 6) return { label: 'Attention', cls: 'sla-warn', icon: AlertTriangle }
    return { label: 'Delayed', cls: 'sla-bad', icon: Clock }
  }

  return (
    <div className="case-table-upgraded" style={{ animation: "fadeIn 0.3s ease-out" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .case-table-upgraded .modern-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 10px;
          font-size: 0.85rem;
        }
        .case-table-upgraded .modern-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 12px 12px 0 0;
        }
        .case-table-upgraded .modern-table td {
          background: white;
          padding: 1rem;
          border: 1px solid #e9edf2;
          border-left: none;
          border-right: none;
          vertical-align: middle;
        }
        .case-table-upgraded .modern-table tr td:first-child {
          border-left: 1px solid #e9edf2;
          border-radius: 16px 0 0 16px;
        }
        .case-table-upgraded .modern-table tr td:last-child {
          border-right: 1px solid #e9edf2;
          border-radius: 0 16px 16px 0;
        }
        .case-table-upgraded .modern-table tr:hover td {
          background: #fafdff;
          border-color: #cbd5e1;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 40px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: capitalize;
          background: #f1f5f9;
          color: #1e293b;
        }
        .status-doctor { background: #e0f2fe; color: #0369a1; }
        .status-reception { background: #fef3c7; color: #d97706; }
        .status-lab { background: #ede9fe; color: #6b21a5; }
        .status-pharmacy { background: #dcfce7; color: #15803d; }
        .status-closed { background: #d1fae5; color: #065f46; }
        .sla-good { background: #dcfce7; color: #15803d; }
        .sla-warn { background: #fef3c7; color: #d97706; }
        .sla-bad { background: #fee2e2; color: #b91c1c; }
        .table-action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .timeline-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 40px;
          padding: 0.4rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .timeline-btn:hover {
          background: #e6edf4;
          border-color: #cbd5e1;
        }
        @media (max-width: 768px) {
          .case-table-upgraded .modern-table,
          .case-table-upgraded .modern-table tbody,
          .case-table-upgraded .modern-table tr,
          .case-table-upgraded .modern-table td {
            display: block;
            width: 100%;
          }
          .case-table-upgraded .modern-table thead {
            display: none;
          }
          .case-table-upgraded .modern-table tr {
            margin-bottom: 1rem;
            border: 1px solid #e9edf2;
            border-radius: 16px;
            background: white;
          }
          .case-table-upgraded .modern-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            border: none;
            border-bottom: 1px solid #f1f5f9;
          }
          .case-table-upgraded .modern-table td:last-child {
            border-bottom: none;
          }
          .case-table-upgraded .modern-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #475569;
            width: 40%;
          }
        }
      `}</style>

      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="modern-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Tests</th>
              <th>Invoice</th>
              <th>Token</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const sla = getSla(c)
              const SlaIcon = sla.icon
              return (
                <tr key={c.id}>
                  <td data-label="Case ID"><code style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "6px" }}>{c.id}</code></td>
                  <td data-label="Patient"><strong>{c.patientName}</strong></td>
                  <td data-label="Doctor">{c.doctorName}</td>
                  <td data-label="Status"><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                  <td data-label="SLA"><span className={`status-badge ${sla.cls}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><SlaIcon size={12} /> {sla.label}</span></td>
                  <td data-label="Tests">{c.recommendedTests?.length ? c.recommendedTests.map(t => t.name).join(', ') : '-'}</td>
                  <td data-label="Invoice">{c.invoiceAmount ? `PKR ${c.invoiceAmount}` : '-'}</td>
                  <td data-label="Token">{c.token || '-'}</td>
                  <td data-label="Actions">
                    <div className="table-action-buttons">
                      {actions ? actions(c) : null}
                      {onViewTimeline ? (
                        <button type="button" className="timeline-btn" onClick={() => onViewTimeline(c.id)}>
                          <Eye size={12} /> Timeline
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CaseTable