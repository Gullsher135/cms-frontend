import { useState } from "react";

const API_URL = "https://cms-backend-bjd0.onrender.com";

function AdminPortal({
  doctors,
  doctorRequests,
  onApproveRequest,
  onRejectRequest,
  onAddDoctor,
  onUpdateDoctor,
  onDeleteDoctor,
}) {
  const [newDoctor, setNewDoctor] = useState({
    fullName: "",
    specialization: "",
    username: "",
    password: "",
    consultFee: "",
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const [editDoctor, setEditDoctor] = useState({
    name: "",
    specialization: "",
    username: "",
    consultFee: "",
    password: "",
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to get doctor ID regardless of field name
  const getDoctorId = (doctor) => doctor?._id || doctor?.id;

  // Find selected doctor using either _id or id
  const selectedDoctor = doctors.find(
    (d) => getDoctorId(d) === selectedDoctorId,
  );

  const selectDoctor = (doctor) => {
    const doctorId = getDoctorId(doctor);
    if (selectedDoctorId === doctorId) {
      setSelectedDoctorId(null);
      return;
    }

    setSelectedDoctorId(doctorId);

    setEditDoctor({
      name: doctor.name || "",
      specialization: doctor.specialization || "",
      username: doctor.username || "",
      consultFee: doctor.consultFee || "",
      password: "",
    });
  };

  const handleDoctorUpdate = () => {
    if (!selectedDoctor) {
      showNotification("error", "No doctor selected");
      return;
    }

    const doctorId = getDoctorId(selectedDoctor);
    if (!doctorId) {
      showNotification("error", "Invalid doctor ID");
      return;
    }

    const payload = {
      name: editDoctor.name,
      specialization: editDoctor.specialization,
      username: editDoctor.username,
      consultFee: editDoctor.consultFee || "2000",
    };

    if (editDoctor.password) {
      payload.password = editDoctor.password;
    }

    onUpdateDoctor(doctorId, payload)
      .then(() => showNotification("success", "Doctor updated successfully"))
      .catch((err) => showNotification("error", err.message));
  };

  const handleDoctorDelete = (doctorId, doctorName) => {
    if (!doctorId) {
      showNotification("error", "Invalid doctor ID");
      return;
    }

    const token = localStorage.getItem("cms_token");

    fetch(`${API_URL}/api/doctors/${doctorId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        return res.json();
      })
      .then(() => {
        showNotification("success", `${doctorName} deleted`);
        onDeleteDoctor(doctorId);
        if (selectedDoctorId === doctorId) setSelectedDoctorId(null);
      })
      .catch((err) => {
        showNotification("error", err.message);
      });
  };

  // Stop propagation so clicks inside edit area don't close the card
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

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
        {doctors.length ? (
          doctors.map((doctor) => {
            const doctorId = getDoctorId(doctor);
            return (
              <article
                key={doctorId}
                className={`doctor-card ${selectedDoctorId === doctorId ? "active" : ""}`}
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

                {selectedDoctorId === doctorId && (
                  <div className="doctor-card-body" onClick={stopPropagation}>
                    <div className="doctor-edit-form">
                      <input
                        placeholder="Name"
                        value={editDoctor.name}
                        onChange={(e) =>
                          setEditDoctor({ ...editDoctor, name: e.target.value })
                        }
                        onClick={stopPropagation}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          border: "none",
                          outline: "1px solid ",
                        }}
                      />

                      <input
                        placeholder="Specialization"
                        value={editDoctor.specialization}
                        onChange={(e) =>
                          setEditDoctor({
                            ...editDoctor,
                            specialization: e.target.value,
                          })
                        }
                        onClick={stopPropagation}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          border: "none",
                          outline: "1px solid ",
                        }}
                      />

                      <input
                        placeholder="Username"
                        value={editDoctor.username}
                        onChange={(e) =>
                          setEditDoctor({
                            ...editDoctor,
                            username: e.target.value,
                          })
                        }
                        onClick={stopPropagation}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          border: "none",
                          outline: "1px solid ",
                        }}
                      />

                      <input
                        placeholder="Fee"
                        value={editDoctor.consultFee}
                        onChange={(e) =>
                          setEditDoctor({
                            ...editDoctor,
                            consultFee: e.target.value,
                          })
                        }
                        onClick={stopPropagation}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          border: "none",
                          outline: "1px solid ",
                        }}
                      />

                      <input
                        placeholder="New Password"
                        value={editDoctor.password}
                        onChange={(e) =>
                          setEditDoctor({
                            ...editDoctor,
                            password: e.target.value,
                          })
                        }
                        onClick={stopPropagation}
                        style={{
                          padding: "8px",
                          borderRadius: "4px",
                          border: "none",
                          outline: "1px solid ",
                        }}
                      />
                    </div>

                    <div
                      className="doctor-card-actions"
                      onClick={stopPropagation}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoctorUpdate();
                        }}
                        disabled={
                          !editDoctor.name ||
                          !editDoctor.specialization ||
                          !editDoctor.username
                        }
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoctorDelete(doctorId, doctor.name);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
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
          {doctorRequests.length ? (
            doctorRequests.map((r) => (
              <tr key={r._id}>
                <td>{r.fullName}</td>
                <td>{r.specialization}</td>
                <td>{r.preferredUsername}</td>
                <td>
                  <button onClick={() => onApproveRequest(r._id)}>
                    Approve
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => onRejectRequest(r._id)}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No requests</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ADD DOCTOR */}
      <h3>Add Doctor</h3>

      <div className="form-grid">
        <input
          placeholder="Name"
          value={newDoctor.fullName}
          onChange={(e) =>
            setNewDoctor({ ...newDoctor, fullName: e.target.value })
          }
        />

        <input
          placeholder="Specialization"
          value={newDoctor.specialization}
          onChange={(e) =>
            setNewDoctor({ ...newDoctor, specialization: e.target.value })
          }
        />

        <input
          placeholder="Username"
          value={newDoctor.username}
          onChange={(e) =>
            setNewDoctor({ ...newDoctor, username: e.target.value })
          }
        />

        <input
          placeholder="Password"
          value={newDoctor.password}
          onChange={(e) =>
            setNewDoctor({ ...newDoctor, password: e.target.value })
          }
        />

        <input
          placeholder="Fee"
          value={newDoctor.consultFee}
          onChange={(e) =>
            setNewDoctor({ ...newDoctor, consultFee: e.target.value })
          }
        />
      </div>

      <button
        type="button"
        disabled={
          !newDoctor.fullName ||
          !newDoctor.specialization ||
          !newDoctor.username ||
          !newDoctor.password
        }
        onClick={() => {
          onAddDoctor({
            name: newDoctor.fullName,
            specialization: newDoctor.specialization,
            username: newDoctor.username,
            password: newDoctor.password,
            consultFee: newDoctor.consultFee || "2000",
          })
            .then(() => {
              showNotification("success", "Doctor added");
              setNewDoctor({
                fullName: "",
                specialization: "",
                username: "",
                password: "",
                consultFee: "",
              });
            })
            .catch((err) => showNotification("error", err.message));
        }}
      >
        Create Doctor
      </button>

      <p>Total doctors: {doctors.length}</p>
    </section>
  );
}

export default AdminPortal;
