import { ShieldCheck, Stethoscope, LayoutDashboard, UserCog, Calendar, FlaskConical, Pill, FileText, LogOut } from 'lucide-react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './App.css'
import { ROLE_ROUTES, API_BASE } from './constants'
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
import Logo from './assets/logo.png'

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

  const [bills, setBills] = useState([])

  const refreshDoctors = async () => {
  const token = localStorage.getItem("cms_token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/doctors`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
    }
  } catch (err) {
    console.error("Failed to refresh doctors:", err);
  }
};

  useEffect(() => {
    const token = localStorage.getItem('cms_token')
    if (session && token) {
      fetch(`${API_BASE}/bills`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setBills(Array.isArray(data) ? data : []))
        .catch((err) => console.error('Failed to fetch bills:', err))
    } else {
      setBills([])
    }
  }, [session])

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

  const getUserInitials = () => {
    if (!session?.name) return 'U'
    return session.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="layout">
      <style>{`
        /* Fix sidebar menu spacing between icon and text */
        .sidebar .menu a {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.8rem;
        }
        .sidebar .menu a svg {
          flex-shrink: 0;
        }
        .sidebar .menu a span {
          line-height: 1;
        }
        /* Make logo prominent with a light background */
        .sidebar .brand-icon {
          background: white;
          border-radius: 14px;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .sidebar .brand-icon img {
          width: 28px;
          height: 28px;
          object-fit: contain;
          display: block;
        }
        /* Optional: improve logout button spacing */
        .logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <img src={Logo} alt="Nexone Clinic"/>
          </div>
          <div>
            <h1>Nexone Clinic</h1>
            <p>{session.name} ({session.role})</p>
          </div>
        </div>
        
        <nav className="menu">
          {allowed.includes('/') && (
            <NavLink to="/">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          )}
          {allowed.includes('/admin') && (
            <NavLink to="/admin">
              <UserCog size={18} />
              <span>Admin Portal</span>
            </NavLink>
          )}
          {allowed.includes('/reception') && (
            <NavLink to="/reception">
              <Calendar size={18} />
              <span>Reception Desk</span>
            </NavLink>
          )}
          {allowed.includes('/doctor') && (
            <NavLink to="/doctor">
              <Stethoscope size={18} />
              <span>Doctor Desk</span>
            </NavLink>
          )}
          {allowed.includes('/lab') && (
            <NavLink to="/lab">
              <FlaskConical size={18} />
              <span>LIMS Desk</span>
            </NavLink>
          )}
          {allowed.includes('/pharmacy') && (
            <NavLink to="/pharmacy">
              <Pill size={18} />
              <span>Pharmacy Desk</span>
            </NavLink>
          )}
          {allowed.includes('/records') && (
            <NavLink to="/records">
              <FileText size={18} />
              <span>Patient Records</span>
            </NavLink>
          )}
        </nav>

        <div className="security-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>
              {getUserInitials()}
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              <strong>{session.name}</strong>
              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8 }}>{session.role} access</p>
            </div>
          </div>
          <ShieldCheck size={18} />
          <p>Role-based access. Every action is aligned with user responsibilities.</p>
          <button type="button" className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout Securely
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route
            path="/"
            element={<Dashboard stats={stats} upcoming={upcoming} session={session} bills={bills} />}
          />
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
                <ReceptionDesk
                  cases={cases}
                  setCases={setCases}
                  doctors={doctors}
                  onUpdate={updateCase}
                  generateBill={generateBill}
                  getBills={getBills}
                />
              </Gate>
            }
          />
          <Route
            path="/doctor"
            element={
              <Gate role={role} route="/doctor">
                <DoctorDesk
                  cases={cases}
                  onUpdate={updateCase}
                  session={session}
                  labTests={labTests}
                  medicines={medicines}
                />
              </Gate>
            }
          />
          <Route
            path="/lab"
            element={
              <Gate role={role} route="/lab">
                <LabDesk
                  cases={cases}
                  onUpdate={updateCase}
                  catalog={labTests}
                  onAddLabTest={onAddLabTest}
                />
              </Gate>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <Gate role={role} route="/pharmacy">
                <PharmacyDesk
                  cases={cases}
                  onUpdate={updateCase}
                  catalog={medicines}
                  onAddMedicine={onAddMedicine}
                />
              </Gate>
            }
          />
          <Route
            path="/records"
            element={
              <RecordsScreen
                cases={cases}
                generateBill={generateBill}
                getBills={getBills}
                doctors={doctors}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App