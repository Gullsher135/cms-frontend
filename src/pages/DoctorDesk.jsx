import { useMemo, useState } from 'react'
import { API_BASE } from '../constants'
import CaseTable from '../components/CaseTable'

const API_URL = "https://cms-backend-bjd0.onrender.com";

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

  const pending = cases.filter(
    (c) => c.status === 'doctor' && c.doctorName === session.name && (!filterDay || c.appointmentDate === filterDay)
  )

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
    } else if (completedFilter === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
    }

    return { start, end }
  }

  const { start: filterStart, end: filterEnd } = getDateRange()

  const completedCases = cases.filter(
    (c) =>
      c.doctorName === session.name &&
      c.status !== 'doctor' &&
      c.createdAt &&
      new Date(c.createdAt) >= filterStart &&
      new Date(c.createdAt) <= filterEnd
  )

  const [slots, setSlots] = useState([{ day: 'Monday', from: '09:00', to: '13:00' }])

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

      <h3>Pending Patients</h3>

      <CaseTable
        cases={pending}
        actions={(c) => (
          <>
            <input
              placeholder="Diagnosis"
              value={diagnosis[c.id] || ''}
              onChange={(e) => setDiagnosis({ ...diagnosis, [c.id]: e.target.value })}
            />

            {/* MEDICINES */}
            <input
              placeholder="Search medicines"
              value={medSearch[c.id] || ''}
              onChange={(e) => setMedSearch({ ...medSearch, [c.id]: e.target.value })}
            />

            <div className="chip-row">
              {(filteredMeds[c.id] || []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelectedMeds((prev) => ({
                      ...prev,
                      [c.id]: [...(prev[c.id] || []), { id: m.id, name: m.name, price: m.price }],
                    }))
                  }
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* TESTS */}
            <input
              placeholder="Search tests"
              value={testSearch[c.id] || ''}
              onChange={(e) => setTestSearch({ ...testSearch, [c.id]: e.target.value })}
            />

            <div className="chip-row">
              {(filteredTests[c.id] || []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSelectedTests((prev) => ({
                      ...prev,
                      [c.id]: [...(prev[c.id] || []), { id: t.id, name: t.name, price: t.price }],
                    }))
                  }
                >
                  {t.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdate(c.id, {
                  diagnosis: diagnosis[c.id] || 'General consult',
                  prescriptions: selectedMeds[c.id] || [],
                  recommendedTests: selectedTests[c.id] || [],
                  status: 'reception',

                  // 🔥 NEW (initial consultation → sab new hain)
                  newlyAddedPrescriptions: selectedMeds[c.id] || [],
                  newlyAddedTests: selectedTests[c.id] || [],
                })
              }
            >
              Send to Reception
            </button>
          </>
        )}
      />

      <h3>Completed Patients</h3>

      {completedCases.map((c) => (
        <div key={c.id}>

          {/* ADD NEW MEDICINE */}
          <input
            placeholder="Add medicine"
            value={newMedSearch[c.id] || ''}
            onChange={(e) => setNewMedSearch({ ...newMedSearch, [c.id]: e.target.value })}
          />

          {medicines
            .filter((m) =>
              m.name.toLowerCase().includes((newMedSearch[c.id] || '').toLowerCase())
            )
            .slice(0, 3)
            .map((m) => (
              <button
                key={m.id}
                onClick={() => {

                  const existing = c.prescriptions || []

                  const newItem = { id: m.id, name: m.name, price: m.price }

                  const updated = [...existing, newItem]

                  // 🔥 NEW LOGIC
                  const newlyAdded = [newItem]

                  onUpdate(c.id, {
                    prescriptions: updated,
                    newlyAddedPrescriptions: newlyAdded,
                  })
                }}
              >
                + {m.name}
              </button>
            ))}

          {/* ADD NEW TEST */}
          <input
            placeholder="Add test"
            value={newTestSearch[c.id] || ''}
            onChange={(e) => setNewTestSearch({ ...newTestSearch, [c.id]: e.target.value })}
          />

          {labTests
            .filter((t) =>
              t.name.toLowerCase().includes((newTestSearch[c.id] || '').toLowerCase())
            )
            .slice(0, 3)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => {

                  const existing = c.recommendedTests || []

                  const newItem = { id: t.id, name: t.name, price: t.price }

                  const updated = [...existing, newItem]

                  // 🔥 NEW LOGIC
                  const newlyAdded = [newItem]

                  onUpdate(c.id, {
                    recommendedTests: updated,
                    newlyAddedTests: newlyAdded,
                  })
                }}
              >
                + {t.name}
              </button>
            ))}
        </div>
      ))}
    </section>
  )
}

export default DoctorDesk
