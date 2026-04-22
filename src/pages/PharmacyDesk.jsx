import { useState, useEffect } from 'react'
import CaseTable from '../components/CaseTable'
import { API_BASE } from '../constants'

function PharmacyDesk({ cases, onUpdate, catalog, onAddMedicine }) {
  const pending = cases.filter((c) => c.pharmacyStatus === 'pending' || c.status === 'pharmacy')
  const [dispenseNote, setDispenseNote] = useState({})
  const [localCatalog, setLocalCatalog] = useState(catalog)
  const [loadingStock, setLoadingStock] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', mg: '', formula: '', price: 0, threshold: 10 })

  const [newMedicine, setNewMedicine] = useState({
    name: '', mg: '', formula: '', quantity: 0, price: 0, threshold: 10,
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setLocalCatalog(catalog)
  }, [catalog])

  const refreshCatalog = async () => {
    const token = localStorage.getItem('cms_token') || ''
    try {
      const res = await fetch(`${API_BASE}/catalog/medicines`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch catalog')
      const data = await res.json()
      setLocalCatalog(data)
    } catch (err) {
      console.error('Refresh catalog error:', err)
    }
  }

  const updateStock = async (medicineId, newQuantity) => {
    if (!medicineId) throw new Error('Medicine ID is missing')
    const token = localStorage.getItem('cms_token') || ''
    const response = await fetch(`${API_BASE}/medicines/${medicineId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: Number(newQuantity) }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`)
    }
    return response.json()
  }

  const updateMedicine = async (medicineId, data) => {
    const token = localStorage.getItem('cms_token') || ''
    const response = await fetch(`${API_BASE}/medicines/${medicineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Update failed')
    }
    return response.json()
  }

  const deleteMedicine = async (medicineId, medicineName) => {
    if (!confirm(`Delete "${medicineName}"? This cannot be undone if not used in prescriptions.`)) return
    const token = localStorage.getItem('cms_token') || ''
    const response = await fetch(`${API_BASE}/medicines/${medicineId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Delete failed')
    }
    alert(`"${medicineName}" deleted successfully`)
    await refreshCatalog()
  }

  const handleAddMedicine = async () => {
    if (!newMedicine.name || !newMedicine.price) {
      alert('Please fill at least name and price')
      return
    }
    try {
      await onAddMedicine({
        ...newMedicine,
        quantity: Number(newMedicine.quantity),
        price: Number(newMedicine.price),
        threshold: Number(newMedicine.threshold),
      })
      setShowAddModal(false)
      setNewMedicine({ name: '', mg: '', formula: '', quantity: 0, price: 0, threshold: 10 })
      await refreshCatalog()
    } catch (err) {
      alert('Failed to add medicine: ' + err.message)
    }
  }

  const handleEditMedicine = async () => {
    if (!editingMedicine) return
    try {
      await updateMedicine(editingMedicine._id, {
        name: editForm.name,
        mg: editForm.mg,
        formula: editForm.formula,
        price: Number(editForm.price),
        threshold: Number(editForm.threshold),
      })
      setShowEditModal(false)
      setEditingMedicine(null)
      await refreshCatalog()
      alert('Medicine updated successfully')
    } catch (err) {
      alert('Update failed: ' + err.message)
    }
  }

  const openEditModal = (med) => {
    setEditingMedicine(med)
    setEditForm({
      name: med.name || '',
      mg: med.mg || '',
      formula: med.formula || '',
      price: med.price || 0,
      threshold: med.threshold || 10,
    })
    setShowEditModal(true)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target.result
      const rows = text.split('\n').map(row => row.split(','))
      const headers = rows[0].map(h => h.trim().toLowerCase())
      const required = ['name', 'mg', 'formula', 'quantity', 'price']
      const missing = required.filter(r => !headers.includes(r))
      if (missing.length) {
        alert(`CSV missing columns: ${missing.join(', ')}`)
        setUploading(false)
        return
      }
      const nameIdx = headers.indexOf('name')
      const mgIdx = headers.indexOf('mg')
      const formulaIdx = headers.indexOf('formula')
      const qtyIdx = headers.indexOf('quantity')
      const priceIdx = headers.indexOf('price')
      
      const medicines = []
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i]
        if (cols.length < 5) continue
        const name = cols[nameIdx]?.trim()
        if (!name) continue
        medicines.push({
          name,
          mg: cols[mgIdx]?.trim() || '',
          formula: cols[formulaIdx]?.trim() || '',
          quantity: Number(cols[qtyIdx]) || 0,
          price: Number(cols[priceIdx]) || 0,
          threshold: 10,
        })
      }
      if (medicines.length === 0) {
        alert('No valid medicines found in file')
        setUploading(false)
        return
      }
      try {
        for (const med of medicines) {
          await onAddMedicine(med)
        }
        alert(`Successfully added ${medicines.length} medicines`)
        await refreshCatalog()
      } catch (err) {
        alert('Bulk import failed: ' + err.message)
      }
      setUploading(false)
      e.target.value = ''
    }
    reader.onerror = () => {
      alert('Failed to read file')
      setUploading(false)
    }
    reader.readAsText(file)
  }

  const handleDispense = async (caseItem) => {
    const prescriptions = caseItem.prescriptions || []
    for (const med of prescriptions) {
      const catalogMed = localCatalog.find(m => m._id === med.id || m._id === med._id || m.name === med.name)
      if (!catalogMed) {
        alert(`Medicine "${med.name}" not found in catalog`)
        return
      }
      if (catalogMed.quantity < 1) {
        alert(`Insufficient stock for "${med.name}". Available: ${catalogMed.quantity}`)
        return
      }
    }
    try {
      for (const med of prescriptions) {
        const catalogMed = localCatalog.find(m => m._id === med.id || m._id === med._id || m.name === med.name)
        const newQty = catalogMed.quantity - 1
        await updateStock(catalogMed._id, newQty)
      }
      await refreshCatalog()
      await onUpdate(caseItem.id, {
        medicines: dispenseNote[caseItem.id] || '-',
        pharmacyStatus: 'done',
        status: 'closed',
        timelineAction: 'Medicines dispensed',
        timelineNote: `Dispensed ${prescriptions.map(m => m.name).join(', ')}`,
      })
      alert('Medicines dispensed successfully')
    } catch (err) {
      alert('Dispensing failed: ' + err.message)
    }
  }

  const adjustStock = async (medicineId, delta) => {
    if (loadingStock || !medicineId) return
    const med = localCatalog.find(m => m._id === medicineId)
    if (!med) {
      alert('Medicine not found')
      return
    }
    const newQty = med.quantity + delta
    if (newQty < 0) {
      alert('Stock cannot be negative')
      return
    }
    setLoadingStock(true)
    try {
      await updateStock(medicineId, newQty)
      await refreshCatalog()
    } catch (err) {
      alert('Failed to update stock: ' + err.message)
    } finally {
      setLoadingStock(false)
    }
  }

  return (
    <section className="form-panel">
      <h2>Pharmacy Desk</h2>
      <p>Manage medicine inventory, dispense prescriptions, track stock.</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button type="button" className="secondary-btn" onClick={() => setShowAddModal(true)}>
          + Add Medicine
        </button>
        <label className="secondary-btn" style={{ cursor: 'pointer' }}>
          📂 Upload CSV
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
        {uploading && <span>Uploading...</span>}
      </div>

      <h3>Medicine Inventory</h3>
      {localCatalog.length === 0 ? (
        <p className="muted">No medicines in catalog. Add some using the form or CSV.</p>
      ) : (
        <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {localCatalog.map((med) => (
            <div key={med._id} className="medicine-card" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem', background: med.quantity <= (med.threshold || 10) ? '#fff3e0' : '#fff' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{med.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                {med.mg && <span><strong>Strength:</strong> {med.mg} </span>}
                {med.formula && <span>| <strong>Formula:</strong> {med.formula}</span>}
              </div>
              <div style={{ marginTop: '6px' }}>
                <strong>Price:</strong> PKR {med.price}
              </div>
              <div>
                <strong>Stock:</strong> <span style={{ color: med.quantity <= (med.threshold || 10) ? 'red' : 'green', fontWeight: 'bold' }}>{med.quantity}</span>
                {med.quantity <= (med.threshold || 10) && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#d32f2f' }}>(Low stock)</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => adjustStock(med._id, 1)} disabled={loadingStock}>+1</button>
                <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => adjustStock(med._id, -1)} disabled={med.quantity <= 0 || loadingStock}>-1</button>
                <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => openEditModal(med)}>✏️ Edit</button>
                <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', color: '#d32f2f' }} onClick={() => deleteMedicine(med._id, med.name)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3>Pending Prescriptions</h3>
      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <p className="muted inline-text">Token: {c.token || 'Pending reception token'}</p>
            <p className="muted inline-text">
              Rx: {(c.prescriptions || []).map((m) => `${m.name} (${m.price})`).join(', ') || 'No prescription'}
            </p>
            <input
              placeholder="Dispense notes"
              value={dispenseNote[c.id] || ''}
              onChange={(e) => setDispenseNote({ ...dispenseNote, [c.id]: e.target.value })}
            />
            <button type="button" onClick={() => handleDispense(c)}>
              Dispense Medicines
            </button>
          </>
        )}
      />

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h3>Add New Medicine</h3>
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Medicine Name *</label><input value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Strength (mg)</label><input value={newMedicine.mg} onChange={(e) => setNewMedicine({ ...newMedicine, mg: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Formula / Generic Name</label><input value={newMedicine.formula} onChange={(e) => setNewMedicine({ ...newMedicine, formula: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Initial Quantity *</label><input type="number" value={newMedicine.quantity} onChange={(e) => setNewMedicine({ ...newMedicine, quantity: parseInt(e.target.value) || 0 })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Price (PKR) *</label><input type="number" value={newMedicine.price} onChange={(e) => setNewMedicine({ ...newMedicine, price: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Low Stock Threshold</label><input type="number" value={newMedicine.threshold} onChange={(e) => setNewMedicine({ ...newMedicine, threshold: parseInt(e.target.value) || 10 })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="button" onClick={handleAddMedicine}>Save Medicine</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditModal && editingMedicine && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h3>Edit Medicine</h3>
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Medicine Name</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Strength (mg)</label><input value={editForm.mg} onChange={(e) => setEditForm({ ...editForm, mg: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Formula / Generic Name</label><input value={editForm.formula} onChange={(e) => setEditForm({ ...editForm, formula: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Price (PKR)</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Low Stock Threshold</label><input type="number" value={editForm.threshold} onChange={(e) => setEditForm({ ...editForm, threshold: parseInt(e.target.value) || 10 })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="button" onClick={handleEditMedicine}>Update Medicine</button>
            </div>
          </div>
        </div>
      )}

      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
        CSV format: name, mg, formula, quantity, price (first row as header). Example: Paracetamol,500mg,Acetaminophen,100,25
      </p>
    </section>
  )
}

export default PharmacyDesk