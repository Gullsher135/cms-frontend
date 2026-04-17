function CaseTable({ cases, actions, onViewTimeline }) {
  if (!cases.length) return <p className="muted">No records available.</p>

  const getSla = (caseItem) => {
    const hours = (Date.now() - new Date(caseItem.createdAt || Date.now()).getTime()) / 3600000
    if (hours < 2) return { label: 'On Track', cls: 'sla-good' }
    if (hours < 6) return { label: 'Attention', cls: 'sla-warn' }
    return { label: 'Delayed', cls: 'sla-bad' }
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Case ID</th><th>Patient</th><th>Doctor</th><th>Status</th><th>SLA</th><th>Tests</th><th>Invoice</th><th>Token</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const sla = getSla(c)
            return (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.patientName}</td>
                <td>{c.doctorName}</td>
                <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                <td><span className={`status-badge ${sla.cls}`}>{sla.label}</span></td>
                <td>{c.recommendedTests?.length ? c.recommendedTests.map(t => t.name).join(', ') : '-'}</td>
                <td>{c.invoiceAmount ? `PKR ${c.invoiceAmount}` : '-'}</td>
                <td>{c.token || '-'}</td>
                <td>
                  <div className="table-actions">
                    {actions ? actions(c) : null}
                    {onViewTimeline ? (
                      <button type="button" className="secondary-btn" onClick={() => onViewTimeline(c.id)}>
                        View Timeline
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
  )
}

export default CaseTable
