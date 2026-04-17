import { useState } from 'react'

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
    <section className="login-wrap">
      <article className="login-card">
        <h2>Hospital Access Portal</h2>
        <p>Secure, role-driven access for your clinical management ecosystem.</p>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <small className="error-text">{error}</small>}
        <button type="button" onClick={() => onLogin(username, password)}>Login</button>
        <button type="button" className="secondary-btn" onClick={() => setRequestMode((v) => !v)}>
          {requestMode ? 'Hide Doctor Registration' : 'New Doctor? Submit Registration Request'}
        </button>
        {requestMode && (
          <div className="request-box">
            <input placeholder="Full name" value={request.fullName} onChange={(e) => setRequest({ ...request, fullName: e.target.value })} />
            <input placeholder="Specialization" value={request.specialization} onChange={(e) => setRequest({ ...request, specialization: e.target.value })} />
            <input placeholder="Preferred username" value={request.preferredUsername} onChange={(e) => setRequest({ ...request, preferredUsername: e.target.value })} />
            <input placeholder="Set password" value={request.password} onChange={(e) => setRequest({ ...request, password: e.target.value })} />
            <input placeholder="Consulting fee (optional)" value={request.consultFee} onChange={(e) => setRequest({ ...request, consultFee: e.target.value })} />
            <button
              type="button"
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
        <small className="muted">Default users: admin/admin123, reception/reception123, counter/counter123, lab/lab123, pharmacy/pharmacy123</small>
      </article>
    </section>
  )
}

export default LoginScreen
