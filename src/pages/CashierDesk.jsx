import { useState } from 'react'
import CaseTable from '../components/CaseTable'

function CashierDesk({ cases, onUpdate }) {
  const pending = cases.filter((c) => c.status === 'cashier')
  const [consultFee, setConsultFee] = useState({})
  const [labFee, setLabFee] = useState({})
  const [pharmFee, setPharmFee] = useState({})

  return (
    <section className="form-panel">
      <h2>Cashier Desk</h2>
      <p>Collect consulting + lab + pharmacy charges, then issue token.</p>
      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <input placeholder="Consulting fee" value={consultFee[c.id] || ''} onChange={(e) => setConsultFee({ ...consultFee, [c.id]: e.target.value })} />
            <input placeholder="Lab fee" value={labFee[c.id] || ''} onChange={(e) => setLabFee({ ...labFee, [c.id]: e.target.value })} />
            <input placeholder="Pharmacy fee" value={pharmFee[c.id] || ''} onChange={(e) => setPharmFee({ ...pharmFee, [c.id]: e.target.value })} />
            <button
              type="button"
              onClick={() => {
                const total = Number(consultFee[c.id] || 0) + Number(labFee[c.id] || 0) + Number(pharmFee[c.id] || 0)
                const needsLab = !!c.recommendedTests?.length
                const needsPharmacy = !!c.prescriptions?.length
                onUpdate(c.id, {
                  billingPaid: true,
                  token: `TKN-${Date.now().toString().slice(-6)}`,
                  invoiceAmount: String(total),
                  status: needsLab ? 'lab' : needsPharmacy ? 'pharmacy' : 'closed',
                  labStatus: needsLab ? 'pending' : 'not_required',
                  pharmacyStatus: needsPharmacy ? 'pending' : 'not_required',
                  timelineAction: 'Cashier collected payment',
                  timelineNote: `Invoice total PKR ${total}`,
                })
              }}
            >
              Collect Payment & Issue Token
            </button>
          </>
        )}
      />
    </section>
  )
}

export default CashierDesk
