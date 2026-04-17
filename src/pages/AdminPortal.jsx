import { useState } from 'react'

function AdminPortal({ doctors, doctorRequests, onApproveRequest, onRejectRequest, onAddDoctor, onUpdateDoctor, onDeleteDoctor }) {
  const [newDoctor, setNewDoctor] = useState({
    fullName: '',
    specialization: '',
    username: '',
    password: '',
    consultFee: '',
  })
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)
  const [editDoctor, setEditDoctor] = useState({
    name: '',
    specialization: '',
    username: '',
    consultFee: '',
    password: '',
  })
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    window.setTimeout(() => setNotification(null), 3000)
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  const selectDoctor = (doctor) => {
    if (selectedDoctorId === doctor.id) {
      setSelectedDoctorId(null)
      return
    }
    setSelectedDoctorId(doctor.id)
    setEditDoctor({
      name: doctor.name,
      specialization: doctor.specialization,
      username: doctor.username,
      consultFee: doctor.consultFee || '',
      password: '',
    })
  }

  const handleDoctorUpdate = () => {
    if (!selectedDoctor) return
    const payload = {
      name: editDoctor.name,
      specialization: editDoctor.specialization,
      username: editDoctor.username,
      consultFee: editDoctor.consultFee || '2000',
    }
    if (editDoctor.password) payload.password = editDoctor.password
    onUpdateDoctor(selectedDoctor.id, payload)
      .then(() => showNotification('success', 'Doctor updated successfully'))
      .catch((err) => showNotification('error', `Update failed: ${err.message}`))
  }

  const handleDoctorDelete = () => {
    if (!selectedDoctor) return
    if (window.confirm(`Delete ${selectedDoctor.name}? This action cannot be undone.`)) {
      onDeleteDoctor(selectedDoctor.id)
        .then(() => {
          showNotification('success', 'Doctor deleted successfully')
          setSelectedDoctorId(null)
        })
        .catch((err) => {
          showNotification('error', `Delete failed: ${err.message}`)
        })
    }
  }

  return (
    <section className="form-panel">
      <h2>Admin Hospital Control</h2>
      <p>Manage doctor onboarding, audit live providers, and edit or remove doctors from one place.</p>
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <h3>Registered Doctors</h3>
      <div className="doctor-card-list">
        {doctors.length ? doctors.map((doctor) => (
          <article
            key={doctor.id}
            className={`doctor-card ${selectedDoctorId === doctor.id ? 'active' : ''}`}
            onClick={() => selectDoctor(doctor)}
          >
            <div className="doctor-card-header">
              <div>
                <h4>{doctor.name}</h4>
                <p className="muted">{doctor.specialization}</p>
              </div>
              <small>{doctor.username}</small>
            </div>
            <div className="doctor-card-meta">
              <span>Fee: PKR {doctor.consultFee || '2000'}</span>
              <span className="status-badge status-doctor">Doctor</span>
            </div>
            <p className="muted">Click this card to open the full-width management panel for this doctor.</p>
            {selectedDoctorId === doctor.id && (
              <div className="doctor-card-body">
                <div className="doctor-edit-form">
                  <input placeholder="Doctor full name" value={editDoctor.name} onChange={(e) => setEditDoctor({ ...editDoctor, name: e.target.value })} />
                  <input placeholder="Specialization" value={editDoctor.specialization} onChange={(e) => setEditDoctor({ ...editDoctor, specialization: e.target.value })} />
                  <input placeholder="Username" value={editDoctor.username} onChange={(e) => setEditDoctor({ ...editDoctor, username: e.target.value })} />
                  <input placeholder="Consulting fee" value={editDoctor.consultFee} onChange={(e) => setEditDoctor({ ...editDoctor, consultFee: e.target.value })} />
                  <input placeholder="New password (leave blank to keep current)" value={editDoctor.password} onChange={(e) => setEditDoctor({ ...editDoctor, password: e.target.value })} />
                </div>
                <div className="doctor-card-actions">
                  <button type="button" onClick={handleDoctorUpdate} disabled={!editDoctor.name || !editDoctor.specialization || !editDoctor.username}>
                    Save Changes
                  </button>
                  <button type="button" className="secondary-btn" onClick={handleDoctorDelete}>
                    Delete Doctor
                  </button>
                </div>
              </div>
            )}
          </article>
        )) : (
          <p>No registered doctors yet.</p>
        )}
      </div>

      <h3>Pending Doctor Requests</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Specialization</th><th>Username</th><th>Action</th></tr>
          </thead>
          <tbody>
            {doctorRequests.length ? doctorRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{r.specialization}</td>
                <td>{r.preferredUsername}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => onApproveRequest(r.id)}>Approve</button>
                    <button type="button" className="secondary-btn" onClick={() => onRejectRequest(r.id)}>Reject</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan="4">No pending requests.</td></tr>}
          </tbody>
        </table>
      </div>
      <h3>Add Doctor Directly</h3>
      <div className="form-grid">
        <input placeholder="Doctor full name" value={newDoctor.fullName} onChange={(e) => setNewDoctor({ ...newDoctor, fullName: e.target.value })} />
        <input placeholder="Specialization" value={newDoctor.specialization} onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })} />
        <input placeholder="Username" value={newDoctor.username} onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })} />
        <input placeholder="Password" value={newDoctor.password} onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })} />
        <input placeholder="Consulting fee" value={newDoctor.consultFee} onChange={(e) => setNewDoctor({ ...newDoctor, consultFee: e.target.value })} />
      </div>
      <button
        type="button"
        disabled={!newDoctor.fullName || !newDoctor.specialization || !newDoctor.username || !newDoctor.password}
        onClick={() => {
          onAddDoctor({
            name: newDoctor.fullName,
            specialization: newDoctor.specialization,
            username: newDoctor.username,
            password: newDoctor.password,
            consultFee: newDoctor.consultFee || '2000',
          })
            .then(() => {
              showNotification('success', 'Doctor created successfully')
              setNewDoctor({ fullName: '', specialization: '', username: '', password: '', consultFee: '' })
            })
            .catch((err) => showNotification('error', `Create failed: ${err.message}`))
        }}
      >
        Create Doctor Portal
      </button>
      <p className="muted">Total active doctors: {doctors.length}</p>
    </section>
  )
}

export default AdminPortal
