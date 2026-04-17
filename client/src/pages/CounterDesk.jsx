import { useState } from 'react'
import { API_BASE } from '../constants'

function CounterDesk({ cases, setCases, doctors }) {
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    phone: '',
    cnic: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  })

  const addCase = () => {
    if (!form.patientName || !form.phone || !form.doctorName) return
    const selectedDoctor = doctors.find((d) => d.name === form.doctorName)
    fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({
        ...form,
        doctorId: selectedDoctor?.id || '',
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.message || 'Failed to create appointment')
        return body
      })
      .then((created) => {
        setError('')
        setCases((prev) => [{ ...created, id: created._id }, ...prev])
      })
      .catch((err) => setError(err.message))
  }

  return (
    <section className="form-panel">
      <h2>Counter Desk</h2>
      <p>Book appointment with only software-registered doctors.</p>
      <div className="form-grid">
        <input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
        <select value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })}>
          <option value="">Select doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.name}>{d.name} - {d.specialization}</option>
          ))}
        </select>
        <input type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
        <input type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} />
        <input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
      <button type="button" onClick={addCase}>Create Appointment & Send to Doctor</button>
      {error ? <p className="error-text">{error}</p> : null}
      <p className="muted">Total cases created: {cases.length}</p>
    </section>
  )
}

export default CounterDesk
