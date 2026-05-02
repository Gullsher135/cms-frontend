import { useState } from "react";
import { Users, UserPlus, CheckCircle, XCircle, Edit2, Trash2, Save, UserCheck, Briefcase, Lock, DollarSign, User } from "lucide-react";

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

  const getDoctorId = (doctor) => doctor?._id || doctor?.id;
  const selectedDoctor = doctors.find((d) => getDoctorId(d) === selectedDoctorId);

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
    if (editDoctor.password) payload.password = editDoctor.password;
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
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (res.status === 404) {
        // Doctor already gone – still refresh UI
        showNotification("info", `${doctorName} already deleted`);
        onDeleteDoctor(doctorId);
        setSelectedDoctorId(null);
        window.location.reload();
        return;
      }
      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`);
      return res.json();
      window.location.reload();
    })
    .then((data) => {
      // Successful deletion (200 OK)
      if (data && data.message !== undefined) {
        showNotification("success", `${doctorName} deleted`);
        onDeleteDoctor(doctorId);
        setSelectedDoctorId(null);
        window.location.reload();
      }
    })
    .catch((err) => {
      showNotification("error", err.message);
      // Optionally reload anyway to sync state
      // window.location.reload();
    });
};

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <section className="admin-portal-upgraded" style={{ animation: "fadeInUp 0.4s ease-out" }}>
      <style>{`
        .admin-portal-upgraded {
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
          padding: 1.5rem;
          transition: all 0.2s;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-portal-upgraded h2 {
          font-size: 1.6rem;
          font-weight: 700;
          background: linear-gradient(135deg, #0f5ea8, #1b76c8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin: 0 0 0.25rem 0;
        }
        .admin-portal-upgraded h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 1.5rem 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-left: 4px solid #0f5ea8;
          padding-left: 0.75rem;
          color: #0f2b3d;
        }
        .doctor-card-upgraded {
          background: white;
          border-radius: 20px;
          border: 1px solid #e9edf2;
          transition: all 0.25s ease;
          cursor: pointer;
          overflow: hidden;
        }
        .doctor-card-upgraded:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .doctor-card-upgraded.active {
          border-color: #0f5ea8;
          box-shadow: 0 6px 14px rgba(15, 94, 168, 0.12);
          background: #fafdff;
        }
        .badge-doctor {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 30px;
        }
        .input-icon-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.4rem 0.8rem;
          transition: all 0.2s;
        }
        .input-icon-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
        .input-icon-group input {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 0.9rem;
          padding: 0.4rem 0;
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
        .modern-button-danger {
          background: #fee2e2;
          color: #b91c1c;
        }
        .modern-button-danger:hover {
          background: #fecaca;
        }
        .request-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }
        .request-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          color: #475569;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .request-table td {
          background: #f9fbfd;
          padding: 0.9rem 1rem;
          border-radius: 16px;
          font-size: 0.9rem;
        }
        .form-grid-upgraded {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-summary {
          background: #f1f6fe;
          border-radius: 18px;
          padding: 0.8rem 1.2rem;
          margin-top: 1.8rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          font-size: 0.9rem;
          color: #0f5ea8;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .admin-portal-upgraded {
            padding: 1rem;
          }
          .request-table th, .request-table td {
            padding: 0.5rem;
          }
          .modern-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.75rem;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <div style={{ background: "#eef2ff", borderRadius: "18px", padding: "0.5rem", display: "inline-flex" }}>
          <Users size={28} color="#0f5ea8" />
        </div>
        <div>
          <h2>Admin Portal</h2>
          <p style={{ color: "#5b6e8c", margin: "0.2rem 0 0" }}>Manage doctors, approvals & system credentials</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`} style={{ margin: "1rem 0", borderRadius: "16px" }}>
          {notification.type === "success" ? "✅ " : "⚠️ "}{notification.message}
        </div>
      )}

      {/* DOCTORS LIST */}
      <h3><UserCheck size={18} /> Registered Doctors</h3>
      <div className="doctor-card-list" style={{ display: "grid", gap: "1rem" }}>
        {doctors.length ? (
          doctors.map((doctor) => {
            const doctorId = getDoctorId(doctor);
            return (
              <article
                key={doctorId}
                className={`doctor-card-upgraded ${selectedDoctorId === doctorId ? "active" : ""}`}
                onClick={() => selectDoctor(doctor)}
                style={{ padding: "1rem 1.2rem" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 0.2rem", fontSize: "1.05rem", fontWeight: 600 }}>{doctor.name}</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginTop: "0.25rem" }}>
                      <span className="badge-doctor">{doctor.specialization}</span>
                      <span style={{ fontSize: "0.75rem", color: "#4b5563", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <DollarSign size={12} /> Fee: PKR {doctor.consultFee || 2000}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#6c86a3" }}>@{doctor.username}</span>
                    </div>
                  </div>
                  {selectedDoctorId !== doctorId && (
                    <Edit2 size={16} style={{ color: "#94a3b8", alignSelf: "center" }} />
                  )}
                </div>

                {selectedDoctorId === doctorId && (
                  <div onClick={stopPropagation} style={{ marginTop: "1rem", borderTop: "1px solid #eef2f6", paddingTop: "1rem" }}>
                    <div style={{ display: "grid", gap: "0.9rem", marginBottom: "1rem" }}>
                      <div className="input-icon-group">
                        <User size={16} color="#5b6e8c" />
                        <input
                          placeholder="Full Name"
                          value={editDoctor.name}
                          onChange={(e) => setEditDoctor({ ...editDoctor, name: e.target.value })}
                          onClick={stopPropagation}
                        />
                      </div>
                      <div className="input-icon-group">
                        <Briefcase size={16} color="#5b6e8c" />
                        <input
                          placeholder="Specialization"
                          value={editDoctor.specialization}
                          onChange={(e) => setEditDoctor({ ...editDoctor, specialization: e.target.value })}
                          onClick={stopPropagation}
                        />
                      </div>
                      <div className="input-icon-group">
                        <User size={16} color="#5b6e8c" />
                        <input
                          placeholder="Username"
                          value={editDoctor.username}
                          onChange={(e) => setEditDoctor({ ...editDoctor, username: e.target.value })}
                          onClick={stopPropagation}
                        />
                      </div>
                      <div className="input-icon-group">
                        <DollarSign size={16} color="#5b6e8c" />
                        <input
                          placeholder="Consultation Fee (PKR)"
                          value={editDoctor.consultFee}
                          onChange={(e) => setEditDoctor({ ...editDoctor, consultFee: e.target.value })}
                          onClick={stopPropagation}
                        />
                      </div>
                      <div className="input-icon-group">
                        <Lock size={16} color="#5b6e8c" />
                        <input
                          type="password"
                          placeholder="New Password (leave blank to keep current)"
                          value={editDoctor.password}
                          onChange={(e) => setEditDoctor({ ...editDoctor, password: e.target.value })}
                          onClick={stopPropagation}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <button
                        className="modern-button modern-button-primary"
                        onClick={(e) => { e.stopPropagation(); handleDoctorUpdate(); }}
                        disabled={!editDoctor.name || !editDoctor.specialization || !editDoctor.username}
                      >
                        <Save size={16} /> Save Changes
                      </button>
                      <button
                        className="modern-button modern-button-danger"
                        onClick={(e) => { e.stopPropagation(); handleDoctorDelete(doctorId, doctor.name); }}
                      >
                        <Trash2 size={16} /> Delete Doctor
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", background: "#fafcff", borderRadius: "24px", color: "#6c86a3" }}>
            <Users size={36} style={{ opacity: 0.4 }} />
            <p>No doctors registered yet.</p>
          </div>
        )}
      </div>

      {/* REQUESTS SECTION */}
      <h3><UserPlus size={18} /> Pending Registration Requests</h3>
      {doctorRequests.length ? (
        <table className="request-table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Specialization</th>
              <th>Username</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctorRequests.map((r) => (
              <tr key={r._id}>
                <td><strong>{r.fullName}</strong></td>
                <td>{r.specialization}</td>
                <td style={{ color: "#4b6584" }}>{r.preferredUsername}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className="modern-button modern-button-primary"
                      style={{ background: "#10b981", boxShadow: "none" }}
                      onClick={() => onApproveRequest(r._id)}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      className="modern-button modern-button-secondary"
                      style={{ color: "#b91c1c", background: "#fee2e2" }}
                      onClick={() => onRejectRequest(r._id)}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ background: "#f9f9fc", borderRadius: "20px", padding: "1.5rem", textAlign: "center", color: "#6c86a3" }}>
          <UserCheck size={28} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
          <p>No pending requests. All doctors are approved.</p>
        </div>
      )}

      {/* ADD DOCTOR FORM */}
      <h3><UserPlus size={18} /> Add New Doctor Manually</h3>
      <div className="form-grid-upgraded">
        <div className="input-icon-group">
          <User size={16} />
          <input
            placeholder="Full name"
            value={newDoctor.fullName}
            onChange={(e) => setNewDoctor({ ...newDoctor, fullName: e.target.value })}
          />
        </div>
        <div className="input-icon-group">
          <Briefcase size={16} />
          <input
            placeholder="Specialization"
            value={newDoctor.specialization}
            onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
          />
        </div>
        <div className="input-icon-group">
          <User size={16} />
          <input
            placeholder="Username"
            value={newDoctor.username}
            onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
          />
        </div>
        <div className="input-icon-group">
          <Lock size={16} />
          <input
            type="password"
            placeholder="Password"
            value={newDoctor.password}
            onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
          />
        </div>
        <div className="input-icon-group">
          <DollarSign size={16} />
          <input
            placeholder="Fee (PKR)"
            value={newDoctor.consultFee}
            onChange={(e) => setNewDoctor({ ...newDoctor, consultFee: e.target.value })}
          />
        </div>
      </div>

      <button
        className="modern-button modern-button-primary"
        style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
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
              showNotification("success", "Doctor added successfully");
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
        <UserPlus size={16} /> Create Doctor Account
      </button>

      <div className="stat-summary">
        <span>👩‍⚕️ Total Doctors: <strong>{doctors.length}</strong></span>
        <span>📋 Pending Approvals: <strong>{doctorRequests.length}</strong></span>
      </div>
    </section>
  );
}

export default AdminPortal;