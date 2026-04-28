import { useState, useEffect } from 'react'
import CaseTable from '../components/CaseTable'
import { API_BASE } from '../constants'
import { 
  Pill, 
  Plus, 
  Upload, 
  Edit2, 
  Trash2, 
  Minus, 
  Plus as PlusIcon, 
  AlertCircle, 
  Package, 
  DollarSign, 
  ClipboardList, 
  X, 
  Save,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

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

  // Helper to format currency
  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`

  return (
    <div className="pharmacy-desk-upgraded" style={{ animation: "fadeIn 0.4s ease-out" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .pharmacy-desk-upgraded .modern-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e9edf2;
          transition: all 0.2s ease;
        }
        .pharmacy-desk-upgraded .form-icon-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .pharmacy-desk-upgraded .form-icon-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
        .pharmacy-desk-upgraded .form-icon-group input,
        .pharmacy-desk-upgraded .form-icon-group select {
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
        .modern-button-danger {
          background: #fee2e2;
          color: #b91c1c;
        }
        .modern-button-danger:hover {
          background: #fecaca;
        }
        .medicine-card-modern {
          background: white;
          border-radius: 20px;
          border: 1px solid #e9edf2;
          padding: 1rem;
          transition: all 0.2s;
        }
        .medicine-card-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }
        .badge-low-stock {
          background: #fef3c7;
          color: #d97706;
          padding: 0.2rem 0.5rem;
          border-radius: 30px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .modal-overlay-modern {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content-modern {
          background: white;
          border-radius: 32px;
          padding: 1.5rem;
          width: 500px;
          max-width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideIn 0.3s ease-out;
        }
        .input-group-modal {
          display: grid;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .input-group-modal label {
          font-weight: 500;
          font-size: 0.85rem;
          color: #1e293b;
        }
        .input-group-modal input {
          padding: 0.6rem 1rem;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .input-group-modal input:focus {
          outline: none;
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "0.5rem" }}>
            <Pill size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, background: "linear-gradient(135deg, #0f5ea8, #1b76c8)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Pharmacy Desk
            </h2>
            <p style={{ margin: "0.2rem 0 0", color: "#5b6e8c" }}>
              Manage medicine inventory, dispense prescriptions, track stock levels
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="modern-button modern-button-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Medicine
        </button>
        <label className="modern-button modern-button-secondary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          <Upload size={16} /> Upload CSV
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
        {uploading && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#0f5ea8" }}><Package size={16} /> Processing...</span>}
      </div>

      {/* Medicine Inventory */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Package size={18} color="#0f5ea8" /> Medicine Inventory
          <span className="badge-low-stock" style={{ marginLeft: "0.5rem" }}>{localCatalog.length} items</span>
        </h3>
        {localCatalog.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#5b6e8c" }}>
            <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
            <p>No medicines in catalog. Add some using the form or CSV.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {localCatalog.map((med) => {
              const isLowStock = med.quantity <= (med.threshold || 10)
              return (
                <div key={med._id} className="medicine-card-modern" style={{ borderLeft: isLowStock ? `4px solid #f59e0b` : `4px solid #10b981` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{med.name}</h4>
                      <div style={{ fontSize: "0.75rem", color: "#5b6e8c", marginTop: "0.2rem" }}>
                        {med.mg && <span>{med.mg}</span>}
                        {med.formula && <span> | {med.formula}</span>}
                      </div>
                    </div>
                    {isLowStock && <span className="badge-low-stock">Low Stock</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                    <span><DollarSign size={14} style={{ display: "inline" }} /> {formatPKR(med.price)}</span>
                    <span><strong>Stock:</strong> <span style={{ color: isLowStock ? "#d97706" : "#10b981", fontWeight: 600 }}>{med.quantity}</span></span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="modern-button modern-button-outline" style={{ padding: "0.3rem 0.8rem" }} onClick={() => adjustStock(med._id, 1)} disabled={loadingStock}>
                      <TrendingUp size={14} /> +1
                    </button>
                    <button className="modern-button modern-button-outline" style={{ padding: "0.3rem 0.8rem" }} onClick={() => adjustStock(med._id, -1)} disabled={med.quantity <= 0 || loadingStock}>
                      <TrendingDown size={14} /> -1
                    </button>
                    <button className="modern-button modern-button-secondary" style={{ padding: "0.3rem 0.8rem" }} onClick={() => openEditModal(med)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="modern-button modern-button-danger" style={{ padding: "0.3rem 0.8rem" }} onClick={() => deleteMedicine(med._id, med.name)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending Prescriptions */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ClipboardList size={18} color="#0f5ea8" /> Pending Prescriptions
          <span className="badge-low-stock" style={{ marginLeft: "0.5rem", background: "#e0f2fe", color: "#0369a1" }}>{pending.length} pending</span>
        </h3>
        <CaseTable
          cases={pending}
          actions={(c) => (
            <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem" }}>
                <strong>Token:</strong> {c.token || 'Pending reception token'}
              </div>
              <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem" }}>
                <strong>Rx:</strong> {(c.prescriptions || []).map((m) => `${m.name} (${formatPKR(m.price)})`).join(', ') || 'No prescription'}
              </div>
              <div className="form-icon-group">
                <ClipboardList size={16} />
                <input
                  placeholder="Dispense notes"
                  value={dispenseNote[c.id] || ''}
                  onChange={(e) => setDispenseNote({ ...dispenseNote, [c.id]: e.target.value })}
                />
              </div>
              <button className="modern-button modern-button-success" onClick={() => handleDispense(c)}>
                <Pill size={16} /> Dispense Medicines
              </button>
            </div>
          )}
        />
      </div>

      {/* CSV hint */}
      <div className="form-panel" style={{ background: "white", borderRadius: "28px", padding: "1rem 1.5rem" }}>
        <p className="muted" style={{ fontSize: "0.8rem", color: "#5b6e8c", margin: 0 }}>
          📄 CSV format: name, mg, formula, quantity, price (first row as header). Example: Paracetamol,500mg,Acetaminophen,100,25
        </p>
      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="modal-overlay-modern" onClick={() => setShowAddModal(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Add New Medicine</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="input-group-modal"><label>Medicine Name *</label><input value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} /></div>
            <div className="input-group-modal"><label>Strength (mg)</label><input value={newMedicine.mg} onChange={(e) => setNewMedicine({ ...newMedicine, mg: e.target.value })} /></div>
            <div className="input-group-modal"><label>Formula / Generic Name</label><input value={newMedicine.formula} onChange={(e) => setNewMedicine({ ...newMedicine, formula: e.target.value })} /></div>
            <div className="input-group-modal"><label>Initial Quantity *</label><input type="number" value={newMedicine.quantity} onChange={(e) => setNewMedicine({ ...newMedicine, quantity: parseInt(e.target.value) || 0 })} /></div>
            <div className="input-group-modal"><label>Price (PKR) *</label><input type="number" value={newMedicine.price} onChange={(e) => setNewMedicine({ ...newMedicine, price: parseFloat(e.target.value) || 0 })} /></div>
            <div className="input-group-modal"><label>Low Stock Threshold</label><input type="number" value={newMedicine.threshold} onChange={(e) => setNewMedicine({ ...newMedicine, threshold: parseInt(e.target.value) || 10 })} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button className="modern-button modern-button-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="modern-button modern-button-primary" onClick={handleAddMedicine}>Save Medicine</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditModal && editingMedicine && (
        <div className="modal-overlay-modern" onClick={() => setShowEditModal(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Edit Medicine</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="input-group-modal"><label>Medicine Name</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="input-group-modal"><label>Strength (mg)</label><input value={editForm.mg} onChange={(e) => setEditForm({ ...editForm, mg: e.target.value })} /></div>
            <div className="input-group-modal"><label>Formula / Generic Name</label><input value={editForm.formula} onChange={(e) => setEditForm({ ...editForm, formula: e.target.value })} /></div>
            <div className="input-group-modal"><label>Price (PKR)</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} /></div>
            <div className="input-group-modal"><label>Low Stock Threshold</label><input type="number" value={editForm.threshold} onChange={(e) => setEditForm({ ...editForm, threshold: parseInt(e.target.value) || 10 })} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button className="modern-button modern-button-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="modern-button modern-button-primary" onClick={handleEditMedicine}>Update Medicine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PharmacyDesk