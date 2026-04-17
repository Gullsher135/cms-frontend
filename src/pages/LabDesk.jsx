import { useState } from 'react'
import CaseTable from '../components/CaseTable'

function LabDesk({ cases, onUpdate, catalog, onAddLabTest }) {
  const pending = cases.filter((c) => c.labStatus === 'pending' || c.labStatus === 'in_progress')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  return (
    <section className="form-panel">
      <h2>LIMS Desk</h2>
      <p>Receive patient + doctor info with test token and update lab status.</p>
      <div className="form-grid">
        <input placeholder="Add test name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <button
        type="button"
        className="secondary-btn"
        onClick={() => {
          if (!name || !price) return
          onAddLabTest({ name, price: Number(price) })
          setName('')
          setPrice('')
        }}
      >
        Add Test To Catalog
      </button>
      <p className="muted">Catalog: {(catalog || []).map((t) => `${t.name}(${t.price})`).join(', ') || 'Empty'}</p>
      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <p className="muted inline-text">Token: {c.token || 'Pending reception token'}</p>
            <p className="muted inline-text">Doctor: {c.doctorName}</p>
            <p className="muted inline-text">
              Tests: {(c.recommendedTests || []).map((t) => `${t.name} (${t.price})`).join(', ') || 'No tests'}
            </p>
            <button type="button" className="secondary-btn" onClick={() => onUpdate(c.id, { labStatus: 'in_progress' })}>Mark In Progress</button>
            <button
              type="button"
              onClick={() =>
                onUpdate(c.id, {
                  labStatus: 'done',
                  status: c.pharmacyStatus === 'pending' ? 'pharmacy' : c.status,
                  timelineAction: 'Lab report marked done',
                })
              }
            >
              Mark Done
            </button>
          </>
        )}
      />
    </section>
  )
}

export default LabDesk
