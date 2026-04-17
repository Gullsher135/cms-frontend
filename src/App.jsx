import { ShieldCheck, Stethoscope } from 'lucide-react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { ROLE_ROUTES } from './constants'
import useClinicAppState from './hooks/useClinicAppState'
import LoginScreen from './pages/LoginScreen'
import Dashboard from './pages/Dashboard'
import AdminPortal from './pages/AdminPortal'
import ReceptionDesk from './pages/ReceptionDesk'
import DoctorDesk from './pages/DoctorDesk'
import LabDesk from './pages/LabDesk'
import PharmacyDesk from './pages/PharmacyDesk'
import RecordsScreen from './pages/RecordsScreen'
import Gate from './components/Gate'

function App() {
  const navigate = useNavigate()
  const {
    session,
    authError,
    role,
    doctors,
    labTests,
    medicines,
    doctorRequests,
    cases,
    stats,
    upcoming,
    login,
    logout,
    updateCase,
    setCases,
    onDoctorRequest,
    onApproveRequest,
    onRejectRequest,
    onAddDoctor,
    onUpdateDoctor,
    onDeleteDoctor,
    onAddLabTest,
    onAddMedicine,
    generateBill,
    getBills,
  } = useClinicAppState(navigate)
  const allowed = role ? ROLE_ROUTES[role] : []

  if (!session) {
    return (
      <LoginScreen
        onLogin={login}
        error={authError}
        onDoctorRequest={onDoctorRequest}
      />
    )
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Stethoscope size={18} />
          </div>
          <div>
            <h1>MediCore CMS</h1>
            <p>{session.name} ({session.role})</p>
          </div>
        </div>
        <nav className="menu">
          {allowed.includes('/') && <NavLink to="/">Dashboard</NavLink>}
          {allowed.includes('/admin') && <NavLink to="/admin">Admin Portal</NavLink>}
          {allowed.includes('/reception') && <NavLink to="/reception">Reception Desk</NavLink>}
          {allowed.includes('/doctor') && <NavLink to="/doctor">Doctor Desk</NavLink>}
          {allowed.includes('/lab') && <NavLink to="/lab">LIMS Desk</NavLink>}
          {allowed.includes('/pharmacy') && <NavLink to="/pharmacy">Pharmacy Desk</NavLink>}
          {allowed.includes('/records') && <NavLink to="/records">Patient Records</NavLink>}
        </nav>
        <div className="security-panel">
          <ShieldCheck size={18} />
          <p>Role-based access. Every action is aligned with user responsibilities.</p>
          <button type="button" className="logout-btn" onClick={logout}>
            Logout Securely
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard stats={stats} upcoming={upcoming} />} />
          <Route
            path="/admin"
            element={
              <Gate role={role} route="/admin">
                <AdminPortal
                  doctors={doctors}
                  doctorRequests={doctorRequests}
                  onApproveRequest={onApproveRequest}
                  onRejectRequest={onRejectRequest}
                  onAddDoctor={onAddDoctor}
                  onUpdateDoctor={onUpdateDoctor}
                  onDeleteDoctor={onDeleteDoctor}
                />
              </Gate>
            }
          />
          <Route
            path="/reception"
            element={
              <Gate role={role} route="/reception">
                <ReceptionDesk cases={cases} setCases={setCases} doctors={doctors} onUpdate={updateCase} generateBill={generateBill} getBills={getBills} />
              </Gate>
            }
          />
          <Route
            path="/doctor"
            element={
              <Gate role={role} route="/doctor">
                <DoctorDesk cases={cases} onUpdate={updateCase} session={session} labTests={labTests} medicines={medicines} />
              </Gate>
            }
          />
          <Route
            path="/lab"
            element={
              <Gate role={role} route="/lab">
                <LabDesk cases={cases} onUpdate={updateCase} catalog={labTests} onAddLabTest={onAddLabTest} />
              </Gate>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <Gate role={role} route="/pharmacy">
                <PharmacyDesk cases={cases} onUpdate={updateCase} catalog={medicines} onAddMedicine={onAddMedicine} />
              </Gate>
            }
          />
          <Route path="/records" element={<RecordsScreen cases={cases} generateBill={generateBill} getBills={getBills} doctors={doctors} />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
