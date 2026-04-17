import { useState } from 'react'

const API_URL = "https://cms-backend-bjd0.onrender.com";

function AdminPortal({
  doctors,
  doctorRequests,
  onApproveRequest,
  onRejectRequest,
  onAddDoctor,
  onUpdateDoctor,
  onDeleteDoctor
}) {

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
    setTimeout(() => setNotification(null), 3000)
  }

  // FIX: use _id instead of id
  const selectedDoctor = doctors.find(d => d._id === selectedDoctorId)

  const selectDoctor = (doctor) => {
    if (selectedDoctorId === doctor._id) {
      setSelectedDoctorId(null)
      return
    }

    setSelectedDoctorId(doctor._id)

    setEditDoctor({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      username: doctor.username || '',
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

    if (editDoctor.password) {
      payload.password = editDoctor.password
    }

    onUpdateDoctor(selectedDoctor._id, payload)
      .then(() => showNotification('success', 'Doctor updated successfully'))
      .catch((err) => showNotification('error', err.message))
  }

  const handleDoctorDelete = () => {
    if (!selectedDoctor) return

    if (window.confirm(`Delete ${selectedDoctor.name}?`)) {
      onDeleteDoctor(selectedDoctor._id)
        .then(() => {
          showNotification('success', 'Doctor deleted successfully')
          setSelectedDoctorId(null)
        })
        .catch((err) => showNotification('error', err.message))
    }
  }

  return (
    <section className="form-panel">

      <h2>Admin Hospital Control</h2>
      <p>Manage doctors, requests and system access.</p>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* DOCTORS LIST */}
      <h3>Registered Doctors</h3>

      <div className="doctor-card-list">
        {doctors.length ? doctors.map((doctor) => (
          <article
            key={doctor._id}
            className={`doctor-card ${selectedDoctorId === doctor._id ? 'active' : ''}`}
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
              <span>Fee: PKR {doctor.consultFee || 2000}</span>
              <span className="status-badge">Doctor</span>
            </div>

            {selectedDoctorId === doctor._id && (
              <div className="doctor-card-body">

                <div className="doctor-edit-form">
                  <input
                    placeholder="Name"
                    value={editDoctor.name}
                    onChange={(e) =>
                      setEditDoctor({ ...editDoctor, name: e.target.value })
                    }
                  />

                  <input
                    placeholder="Specialization"
                    value={editDoctor.specialization}
                    onChange={(e) =>
                      setEditDoctor({ ...editDoctor, specialization: e.target.value })
                    }
                  />

                  <input
                    placeholder="Username"
                    value={editDoctor.username}
                    onChange={(e) =>
                      setEditDoctor({ ...editDoctor, username: e.target.value })
                    }
                  />

                  <input
                    placeholder="Fee"
                    value={editDoctor.consultFee}
                    onChange={(e) =>
                      setEditDoctor({ ...editDoctor, consultFee: e.target.value })
                    }
                  />

                  <input
                    placeholder="New Password"
                    value={editDoctor.password}
                    onChange={(e) =>
                      setEditDoctor({ ...editDoctor, password: e.target.value })
                    }
                  />
                </div>

                <div className="doctor-card-actions">
                  <button
                    type="button"
                    onClick={handleDoctorUpdate}
                    disabled={!editDoctor.name || !editDoctor.specialization || !editDoctor.username}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleDoctorDelete}
                  >
                    Delete
                  </button>
                </div>

              </div>
            )}

          </article>
        )) : (
          <p>No doctors found.</p>
        )}
      </div>

      {/* REQUESTS */}
      <h3>Pending Requests</h3>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Specialization</th>
            <th>Username</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {doctorRequests.length ? doctorRequests.map((r) => (
            <tr key={r._id}>
              <td>{r.fullName}</td>
              <td>{r.specialization}</td>
              <td>{r.preferredUsername}</td>
              <td>
                <button onClick={() => onApproveRequest(r._id)}>Approve</button>
                <button className="secondary-btn" onClick={() => onRejectRequest(r._id)}>
                  Reject
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="4">No requests</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ADD DOCTOR */}
      <h3>Add Doctor</h3>

      <div className="form-grid">
        <input placeholder="Name"
          value={newDoctor.fullName}
          onChange={(e) => setNewDoctor({ ...newDoctor, fullName: e.target.value })}
        />

        <input placeholder="Specialization"
          value={newDoctor.specialization}
          onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
        />

        <input placeholder="Username"
          value={newDoctor.username}
          onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
        />

        <input placeholder="Password"
          value={newDoctor.password}
          onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
        />

        <input placeholder="Fee"
          value={newDoctor.consultFee}
          onChange={(e) => setNewDoctor({ ...newDoctor, consultFee: e.target.value })}
        />
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
          }).then(() => {
            showNotification('success', 'Doctor added')
            setNewDoctor({
              fullName: '',
              specialization: '',
              username: '',
              password: '',
              consultFee: '',
            })
          }).catch(err => showNotification('error', err.message))
        }}
      >
        Create Doctor
      </button>

      <p>Total doctors: {doctors.length}</p>

    </section>
  )
}

export default AdminPortal
