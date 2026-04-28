import { useState } from 'react'
import { 
  Stethoscope, 
  User, 
  Lock, 
  ClipboardList, 
  UserPlus, 
  ArrowRight,
  Shield,
  Activity
} from 'lucide-react'

import Logo from '../assets/logo.png'

function LoginScreen({ onLogin, error, onDoctorRequest }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [requestMode, setRequestMode] = useState(false)
  const [request, setRequest] = useState({
    fullName: '',
    specialization: '',
    preferredUsername: '',
    password: '',
    consultFee: '',
  })

  return (
    <div className="login-screen-upgraded" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem', background: 'radial-gradient(circle at 10% 20%, rgba(15, 94, 168, 0.08), rgba(0, 168, 150, 0.05)), linear-gradient(135deg, #f0f9ff 0%, #e6f0fa 100%)' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.3; }
        }
        .login-card-upgraded {
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
          border-radius: 32px;
          padding: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(15, 94, 168, 0.2);
          transition: all 0.3s ease;
          animation: fadeInUp 0.5s ease-out;
        }
        .input-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 0.7rem 1rem;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }
        .input-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.12);
          background: white;
        }
        .input-group input {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 0.95rem;
          color: #1e293b;
        }
        .input-group input::placeholder {
          color: #94a3b8;
        }
        .login-btn-modern {
          width: 100%;
          background: linear-gradient(105deg, #0f5ea8, #1b76c8);
          border: none;
          border-radius: 40px;
          padding: 0.85rem;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
          box-shadow: 0 4px 12px rgba(15, 94, 168, 0.25);
        }
        .login-btn-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 94, 168, 0.3);
        }
        .secondary-btn-modern {
          width: 100%;
          background: transparent;
          border: 1px solid #cbd5e1;
          border-radius: 40px;
          padding: 0.7rem;
          color: #1e293b;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.75rem;
        }
        .secondary-btn-modern:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .request-box-upgraded {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 2px dashed #e2e8f0;
          display: grid;
          gap: 0.75rem;
        }
        .error-text {
          color: #dc2626;
          font-size: 0.8rem;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .badge-demo {
          background: #f1f5f9;
          border-radius: 30px;
          padding: 0.5rem 1rem;
          font-size: 0.7rem;
          color: #475569;
          text-align: center;
          margin-top: 1.5rem;
        }
      `}</style>

      <div className="login-card-upgraded">
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '170px', 
            // height: '70px', 
            margin: '0 auto 1rem', 
            // background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // boxShadow: '0 10px 25px -5px rgba(15, 94, 168, 0.3)'
          }}>
            {/* <Stethoscope size={36} color="white" strokeWidth={1.5} /> */}
            <img src={Logo} alt="" style={{width: "100%"}}/>
          </div>
          {/* <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Nexone Clinic
          </h1> */}
          <p style={{ margin: '0.5rem 0 0', color: '#5b6e8c', fontSize: '0.85rem' }}>
            Secure, role-driven access for your clinical ecosystem
          </p>
        </div>

        {/* Login Form */}
        <div className="input-group">
          <User size={18} color="#5b6e8c" />
          <input 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
        </div>
        <div className="input-group">
          <Lock size={18} color="#5b6e8c" />
          <input 
            placeholder="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        {error && (
          <div className="error-text">
            <Activity size={14} /> {error}
          </div>
        )}
        
        <button 
          type="button" 
          className="login-btn-modern" 
          onClick={() => onLogin(username, password)}
        >
          Login <ArrowRight size={18} />
        </button>
        
        <button 
          type="button" 
          className="secondary-btn-modern" 
          onClick={() => setRequestMode((v) => !v)}
        >
          {requestMode ? (
            <>Hide Doctor Registration</>
          ) : (
            <><UserPlus size={16} /> New Doctor? Submit Registration Request</>
          )}
        </button>

        {/* Doctor Request Form */}
        {requestMode && (
          <div className="request-box-upgraded">
            <div className="input-group">
              <User size={16} color="#5b6e8c" />
              <input 
                placeholder="Full name" 
                value={request.fullName} 
                onChange={(e) => setRequest({ ...request, fullName: e.target.value })} 
              />
            </div>
            <div className="input-group">
              <ClipboardList size={16} color="#5b6e8c" />
              <input 
                placeholder="Specialization" 
                value={request.specialization} 
                onChange={(e) => setRequest({ ...request, specialization: e.target.value })} 
              />
            </div>
            <div className="input-group">
              <User size={16} color="#5b6e8c" />
              <input 
                placeholder="Preferred username" 
                value={request.preferredUsername} 
                onChange={(e) => setRequest({ ...request, preferredUsername: e.target.value })} 
              />
            </div>
            <div className="input-group">
              <Lock size={16} color="#5b6e8c" />
              <input 
                placeholder="Set password" 
                type="password"
                value={request.password} 
                onChange={(e) => setRequest({ ...request, password: e.target.value })} 
              />
            </div>
            <div className="input-group">
              <Shield size={16} color="#5b6e8c" />
              <input 
                placeholder="Consulting fee (optional)" 
                value={request.consultFee} 
                onChange={(e) => setRequest({ ...request, consultFee: e.target.value })} 
              />
            </div>
            <button
              type="button"
              className="login-btn-modern"
              style={{ background: 'linear-gradient(105deg, #10b981, #059669)', marginTop: 0 }}
              disabled={!request.fullName || !request.specialization || !request.preferredUsername || !request.password}
              onClick={() => {
                onDoctorRequest(request)
                setRequest({
                  fullName: '',
                  specialization: '',
                  preferredUsername: '',
                  password: '',
                  consultFee: '',
                })
                setRequestMode(false)
              }}
            >
              Submit Request to Admin
            </button>
          </div>
        )}

        {/* Demo Credentials Hint */}
        <div className="badge-demo">
          <span>🔐 Demo credentials: admin/admin123 • reception/reception123 • counter/counter123 • lab/lab123 • pharmacy/pharmacy123</span>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen