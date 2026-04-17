import { useState } from 'react'
import CaseTable from '../components/CaseTable'

function PharmacyDesk({ cases, onUpdate, catalog, onAddMedicine }) {
  const pending = cases.filter((c) => c.pharmacyStatus === 'pending' || c.status === 'pharmacy')
  const [dispenseNote, setDispenseNote] = useState({})
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  return (
    <section className="form-panel">
      <h2>Pharmacy Desk</h2>
      <p>Receive doctor prescriptions and dispense medicines using token.</p>
      <div className="form-grid">
        <input placeholder="Add medicine name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <button
        type="button"
        className="secondary-btn"
        onClick={() => {
          if (!name || !price) return
          onAddMedicine({ name, price: Number(price) })
          setName('')
          setPrice('')
        }}
      >
        Add Medicine To Catalog
      </button>
      <p className="muted">Catalog: {(catalog || []).map((m) => `${m.name}(${m.price})`).join(', ') || 'Empty'}</p>
      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <p className="muted inline-text">Token: {c.token || 'Pending reception token'}</p>
            <p className="muted inline-text">
              Rx: {(c.prescriptions || []).map((m) => `${m.name} (${m.price})`).join(', ') || 'No prescription'}
            </p>
            <input placeholder="Dispense notes" value={dispenseNote[c.id] || ''} onChange={(e) => setDispenseNote({ ...dispenseNote, [c.id]: e.target.value })} />
            <button type="button" onClick={() => onUpdate(c.id, { medicines: dispenseNote[c.id] || '-', pharmacyStatus: 'done', status: 'closed' })}>
              Dispense Medicines
            </button>
          </>
        )}
      />
    </section>
  )
}

export default PharmacyDesk
