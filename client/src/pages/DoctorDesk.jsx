import { useMemo, useState } from 'react'
import { API_BASE } from '../constants'
import CaseTable from '../components/CaseTable'

function DoctorDesk({ cases, onUpdate, session, labTests, medicines }) {
  const [filterDay, setFilterDay] = useState('')
  const [calendarMode, setCalendarMode] = useState('week')
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10))
  const [completedFilter, setCompletedFilter] = useState('today')
  const [editingPrescriptions, setEditingPrescriptions] = useState({})
  const [editingTests, setEditingTests] = useState({})
  const [editingDiagnosis, setEditingDiagnosis] = useState({})
  const [editingMedicineIdx, setEditingMedicineIdx] = useState({})
  const [editingTestIdx, setEditingTestIdx] = useState({})
  const [newMedSearch, setNewMedSearch] = useState({})
  const [newTestSearch, setNewTestSearch] = useState({})
  const pending = cases.filter(
    (c) => c.status === 'doctor' && c.doctorName === session.name && (!filterDay || c.appointmentDate === filterDay)
  )
  
  // Filter completed cases based on date range
  const getDateRange = () => {
    const now = new Date()
    let start = new Date(now)
    let end = new Date(now)
    end.setHours(23, 59, 59, 999)
    
    if (completedFilter === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (completedFilter === 'week') {
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      end.setDate(now.getDate() + (6 - now.getDay()))
      end.setHours(23, 59, 59, 999)
    } else if (completedFilter === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setDate(0)
      end.setMonth(end.getMonth() + 1)
      end.setHours(23, 59, 59, 999)
    }
    return { start, end }
  }
  
  const { start: filterStart, end: filterEnd } = getDateRange()
  const completedCases = cases.filter(
    (c) => c.doctorName === session.name && c.status !== 'doctor' && c.createdAt && new Date(c.createdAt) >= filterStart && new Date(c.createdAt) <= filterEnd
  )
  const [diagnosis, setDiagnosis] = useState({})
  const [selectedMeds, setSelectedMeds] = useState({})
  const [selectedTests, setSelectedTests] = useState({})
  const [medSearch, setMedSearch] = useState({})
  const [testSearch, setTestSearch] = useState({})
  const filteredMeds = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(medSearch).map(([id, q]) => [
          id,
          medicines.filter((m) => m.name.toLowerCase().includes((q || '').toLowerCase())).slice(0, 8),
        ])
      ),
    [medSearch, medicines]
  )
  const filteredTests = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(testSearch).map(([id, q]) => [
          id,
          labTests.filter((t) => t.name.toLowerCase().includes((q || '').toLowerCase())).slice(0, 8),
        ])
      ),
    [testSearch, labTests]
  )
  const [slots, setSlots] = useState([{ day: 'Monday', from: '09:00', to: '13:00' }])

  const doctorCases = cases.filter((c) => c.doctorName === session.name && c.appointmentDate)
  const start = new Date(anchorDate)
  const span = calendarMode === 'week' ? 7 : 30
  const dayBuckets = Array.from({ length: span }).map((_, idx) => {
    const d = new Date(start)
    d.setDate(start.getDate() + idx)
    const key = d.toISOString().slice(0, 10)
    return {
      key,
      label: d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: calendarMode === 'week' ? 'short' : undefined,
      }),
      count: doctorCases.filter((c) => c.appointmentDate === key).length,
    }
  })

  const saveSlots = () => {
    fetch(`${API_BASE}/doctors/${session.id}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({ availability: slots }),
    })
  }

  return (
    <section className="form-panel">
      <h2>Doctor Desk</h2>
      <p>Doctor portal for your own appointments and patients.</p>
      <div className="form-grid">
        <input type="date" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} />
        <select value={calendarMode} onChange={(e) => setCalendarMode(e.target.value)}>
          <option value="week">Week View</option>
          <option value="month">Month View</option>
        </select>
        <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
      </div>
      <div className="calendar-grid">
        {dayBuckets.map((d) => (
          <button key={d.key} type="button" className="calendar-day" onClick={() => setFilterDay(d.key)}>
            <strong>{d.label}</strong>
            <span>{d.count} appointment(s)</span>
          </button>
        ))}
      </div>
      <button type="button" className="secondary-btn" onClick={saveSlots}>Save Availability/Slots Calendar</button>
      <p className="muted">Slots: {slots.map((s) => `${s.day} ${s.from}-${s.to}`).join(' | ')}</p>
      <h3 style={{ marginTop: '2rem' }}>Pending Patients</h3>
      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <input placeholder="Diagnosis" value={diagnosis[c.id] || ''} onChange={(e) => setDiagnosis({ ...diagnosis, [c.id]: e.target.value })} />
            <input placeholder="Search medicines catalog" value={medSearch[c.id] || ''} onChange={(e) => setMedSearch({ ...medSearch, [c.id]: e.target.value })} />
            <div className="chip-row">
              {(filteredMeds[c.id] || []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setSelectedMeds((prev) => ({
                      ...prev,
                      [c.id]: [...(prev[c.id] || []), { id: m.id, name: m.name, price: m.price }],
                    }))
                  }
                >
                  {m.name} (PKR {m.price})
                </button>
              ))}
            </div>
            <input placeholder="Search lab tests catalog" value={testSearch[c.id] || ''} onChange={(e) => setTestSearch({ ...testSearch, [c.id]: e.target.value })} />
            <div className="chip-row">
              {(filteredTests[c.id] || []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setSelectedTests((prev) => ({
                      ...prev,
                      [c.id]: [...(prev[c.id] || []), { id: t.id, name: t.name, price: t.price }],
                    }))
                  }
                >
                  {t.name} (PKR {t.price})
                </button>
              ))}
            </div>
            <p className="muted inline-text">
              Selected Rx: {(selectedMeds[c.id] || []).map((m) => `${m.name} (${m.price})`).join(', ') || 'None'}
            </p>
            <p className="muted inline-text">
              Selected Tests: {(selectedTests[c.id] || []).map((t) => `${t.name} (${t.price})`).join(', ') || 'None'}
            </p>
            <button
              type="button"
              onClick={() =>
                onUpdate(c.id, {
                  diagnosis: diagnosis[c.id] || 'General consult',
                  prescriptions: selectedMeds[c.id] || [],
                  recommendedTests: selectedTests[c.id] || [],
                  status: 'reception',
                  timelineAction: 'Doctor consultation completed',
                  timelineNote: 'Prescription and tests sent to reception',
                })
              }
            >
              Send to Reception
            </button>
          </>
        )}
      />
      
      <h3 style={{ marginTop: '2rem' }}>Completed Patients - Manage Prescriptions & Tests</h3>
      <div className="form-grid">
        <select value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      {completedCases.length === 0 ? (
        <p className="muted">No completed patients in the selected period.</p>
      ) : (
        <div className="patients-list">
          {completedCases.map((c) => (
            <div key={c.id} className="patient-card" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4>{c.patientName}</h4>
                  <p className="muted">Date: {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`status-badge status-${c.status}`}>{c.status}</span>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h5>Diagnosis:</h5>
                <input
                  type="text"
                  value={editingDiagnosis[c.id] ?? c.diagnosis ?? ''}
                  onChange={(e) => setEditingDiagnosis({ ...editingDiagnosis, [c.id]: e.target.value })}
                  placeholder="Edit diagnosis"
                  style={{ width: '100%', padding: '0.5rem' }}
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    onUpdate(c.id, { diagnosis: editingDiagnosis[c.id] ?? c.diagnosis, timelineAction: 'Diagnosis updated', timelineNote: 'Doctor updated diagnosis' })
                    setEditingDiagnosis({ ...editingDiagnosis, [c.id]: '' })
                  }}
                  style={{ marginTop: '0.5rem' }}
                >
                  Update Diagnosis
                </button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h5>Prescriptions:</h5>
                {(c.prescriptions || []).length === 0 ? (
                  <p className="muted">No prescriptions</p>
                ) : (
                  <div>
                    {(editingPrescriptions[c.id] || c.prescriptions || []).map((med, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: '#f5f5f5', marginBottom: '0.5rem', borderRadius: '4px' }}>
                        {editingMedicineIdx[`${c.id}-${idx}`] ? (
                          <>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])]
                                updated[idx] = { ...med, name: e.target.value }
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated })
                              }}
                              placeholder="Medicine name"
                              style={{ flex: 1, padding: '0.25rem' }}
                            />
                            <input
                              type="number"
                              value={med.price}
                              onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])]
                                updated[idx] = { ...med, price: Number(e.target.value) }
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated })
                              }}
                              placeholder="Price"
                              style={{ width: '80px', padding: '0.25rem' }}
                            />
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => {
                                onUpdate(c.id, { prescriptions: editingPrescriptions[c.id] || c.prescriptions, timelineAction: 'Medicine updated', timelineNote: `Updated ${med.name}` })
                                setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: false })
                              }}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1 }}>{med.name} - PKR {med.price}</span>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: true })}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => {
                            const updated = (editingPrescriptions[c.id] || c.prescriptions || []).filter((_, i) => i !== idx)
                            onUpdate(c.id, { prescriptions: updated, timelineAction: 'Medicine removed', timelineNote: `Removed ${med.name} from prescription` })
                            setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated })
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search & add medicine"
                    value={newMedSearch[c.id] || ''}
                    onChange={(e) => setNewMedSearch({ ...newMedSearch, [c.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.5rem' }}
                  />
                  {medicines
                    .filter((m) => m.name.toLowerCase().includes((newMedSearch[c.id] || '').toLowerCase()))
                    .slice(0, 3)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const updated = [...(editingPrescriptions[c.id] || c.prescriptions || []), { id: m.id, name: m.name, price: m.price }]
                          onUpdate(c.id, { prescriptions: updated, timelineAction: 'Medicine added', timelineNote: `Added ${m.name} to prescription` })
                          setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated })
                          setNewMedSearch({ ...newMedSearch, [c.id]: '' })
                        }}
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        + {m.name}
                      </button>
                    ))}
                </div>
              </div>
              
              <div>
                <h5>Lab Tests:</h5>
                {(c.recommendedTests || []).length === 0 ? (
                  <p className="muted">No tests recommended</p>
                ) : (
                  <div>
                    {(editingTests[c.id] || c.recommendedTests || []).map((test, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: '#f5f5f5', marginBottom: '0.5rem', borderRadius: '4px' }}>
                        {editingTestIdx[`${c.id}-${idx}`] ? (
                          <>
                            <input
                              type="text"
                              value={test.name}
                              onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])]
                                updated[idx] = { ...test, name: e.target.value }
                                setEditingTests({ ...editingTests, [c.id]: updated })
                              }}
                              placeholder="Test name"
                              style={{ flex: 1, padding: '0.25rem' }}
                            />
                            <input
                              type="number"
                              value={test.price}
                              onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])]
                                updated[idx] = { ...test, price: Number(e.target.value) }
                                setEditingTests({ ...editingTests, [c.id]: updated })
                              }}
                              placeholder="Price"
                              style={{ width: '80px', padding: '0.25rem' }}
                            />
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => {
                                onUpdate(c.id, { recommendedTests: editingTests[c.id] || c.recommendedTests, timelineAction: 'Test updated', timelineNote: `Updated ${test.name}` })
                                setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: false })
                              }}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1 }}>{test.name} - PKR {test.price}</span>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: true })}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => {
                            const updated = (editingTests[c.id] || c.recommendedTests || []).filter((_, i) => i !== idx)
                            onUpdate(c.id, { recommendedTests: updated, timelineAction: 'Test removed', timelineNote: `Removed ${test.name} from recommended tests` })
                            setEditingTests({ ...editingTests, [c.id]: updated })
                          }}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search & add test"
                    value={newTestSearch[c.id] || ''}
                    onChange={(e) => setNewTestSearch({ ...newTestSearch, [c.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.5rem' }}
                  />
                  {labTests
                    .filter((t) => t.name.toLowerCase().includes((newTestSearch[c.id] || '').toLowerCase()))
                    .slice(0, 3)
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const updated = [...(editingTests[c.id] || c.recommendedTests || []), { id: t.id, name: t.name, price: t.price }]
                          onUpdate(c.id, { recommendedTests: updated, timelineAction: 'Test added', timelineNote: `Added ${t.name} to recommended tests` })
                          setEditingTests({ ...editingTests, [c.id]: updated })
                          setNewTestSearch({ ...newTestSearch, [c.id]: '' })
                        }}
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        + {t.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default DoctorDesk
