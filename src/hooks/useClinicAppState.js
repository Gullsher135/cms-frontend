import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleDollarSign, FlaskConical, Pill, UserCog, Users } from 'lucide-react'
import { API_BASE } from '../constants'

function useClinicAppState(navigate) {
  const [session, setSession] = useState(null)
  const [authError, setAuthError] = useState('')
  const [token, setToken] = useState('')
  const [users, setUsers] = useState([])
  const [doctorRequests, setDoctorRequests] = useState([])
  const [cases, setCases] = useState([])
  const [labTests, setLabTests] = useState([])
  const [medicines, setMedicines] = useState([])
  const [sessionExpiryAt, setSessionExpiryAt] = useState(0)

  const refreshSession = async () => {
    const storedRefresh = localStorage.getItem('cms_refresh_token')
    if (!storedRefresh) throw new Error('Session expired')
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    })
    if (!response.ok) throw new Error('Session expired')
    const data = await response.json()
    setToken(data.accessToken)
    setSessionExpiryAt(Date.now() + data.expiresInSeconds * 1000)
    localStorage.setItem('cms_token', data.accessToken)
    localStorage.setItem('cms_refresh_token', data.refreshToken)
    return data.accessToken
  }

  const api = async (path, options = {}, retry = true) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    if (response.status === 401 && retry) {
      const newToken = await refreshSession()
      return api(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${newToken}` } }, false)
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || 'Request failed')
    }
    return response.json()
  }

  const loadAll = async (activeRole) => {
    const [doctorsData, casesData, testsData, medsData] = await Promise.all([
      api('/doctors'),
      api('/cases?page=1&limit=200&sortBy=createdAt&order=desc'),
      api('/catalog/lab-tests'),
      api('/catalog/medicines'),
    ])
    setUsers(
      doctorsData.map((d) => ({
        id: d._id,
        role: 'doctor',
        name: d.name,
        specialization: d.specialization,
        username: d.username,
        consultFee: d.consultFee || 0,
      }))
    )
    setCases((casesData.data || []).map((c) => ({ ...c, id: c._id })))
    setLabTests((testsData || []).map((t) => ({ ...t, id: t._id })))
    setMedicines((medsData || []).map((m) => ({ ...m, id: m._id })))
    if (activeRole === 'admin') {
      const requests = await api('/admin/doctor-requests')
      setDoctorRequests(requests.map((r) => ({ ...r, id: r._id })))
    } else {
      setDoctorRequests([])
    }
  }

  useEffect(() => {
    const savedSession = localStorage.getItem('cms_session')
    const savedToken = localStorage.getItem('cms_token')
    const savedExpiry = localStorage.getItem('cms_expiry')
    if (savedSession && savedToken) {
      setSession(JSON.parse(savedSession))
      setToken(savedToken)
      setSessionExpiryAt(Number(savedExpiry || 0))
    }
  }, [])

  useEffect(() => {
    if (!sessionExpiryAt) return
    const interval = setInterval(() => {
      if (Date.now() > sessionExpiryAt - 60 * 1000) {
        refreshSession().catch(() => logout())
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [sessionExpiryAt])

  useEffect(() => {
    if (token && session) loadAll(session.role).catch(() => {})
  }, [token, session?.role])

  const doctors = useMemo(() => users.filter((u) => u.role === 'doctor'), [users])
  const role = session?.role

  const stats = useMemo(
    () => [
      { label: 'Total Patients', value: cases.length, icon: Users },
      { label: 'Registered Doctors', value: doctors.length, icon: UserCog },
      { label: 'Upcoming Appointments', value: cases.filter((c) => c.appointmentDate && c.status !== 'closed').length, icon: CalendarDays },
      { label: 'Pending Lab', value: cases.filter((c) => c.status === 'lab').length, icon: FlaskConical },
      { label: 'Pending Billing', value: cases.filter((c) => c.status === 'reception').length, icon: CircleDollarSign },
      { label: 'Pending Pharmacy', value: cases.filter((c) => c.status === 'pharmacy').length, icon: Pill },
    ],
    [cases, doctors.length]
  )

  const upcoming = useMemo(
    () =>
      [...cases]
        .filter((c) => c.appointmentDate && c.appointmentTime)
        .sort((a, b) => `${a.appointmentDate} ${a.appointmentTime}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime}`))
        .slice(0, 6),
    [cases]
  )

  const login = (username, password) => {
    api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      .then((data) => {
        setAuthError('')
        setSession(data.user)
        setToken(data.accessToken)
        setSessionExpiryAt(Date.now() + data.expiresInSeconds * 1000)
        localStorage.setItem('cms_session', JSON.stringify(data.user))
        localStorage.setItem('cms_token', data.accessToken)
        localStorage.setItem('cms_refresh_token', data.refreshToken)
        localStorage.setItem('cms_expiry', String(Date.now() + data.expiresInSeconds * 1000))
        navigate('/')
      })
      .catch((err) => setAuthError(err.message))
  }

  const logout = () => {
    setSession(null)
    setToken('')
    setSessionExpiryAt(0)
    localStorage.removeItem('cms_session')
    localStorage.removeItem('cms_token')
    localStorage.removeItem('cms_refresh_token')
    localStorage.removeItem('cms_expiry')
  }

  const updateCase = (id, patch) => {
    api(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .then((updated) => {
        setCases((prev) => prev.map((c) => (c.id === id ? { ...updated, id: updated._id } : c)))
      })
      .catch(() => {})
  }

  return {
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
    onDoctorRequest: (req) => api('/auth/doctor-request', { method: 'POST', body: JSON.stringify(req) }),
    onApproveRequest: (requestId) => api(`/admin/doctor-requests/${requestId}/approve`, { method: 'POST' }).then(() => loadAll('admin')),
    onRejectRequest: (requestId) => api(`/admin/doctor-requests/${requestId}`, { method: 'DELETE' }).then(() => loadAll('admin')),
    onAddDoctor: (doctorAccount) => api('/doctors', { method: 'POST', body: JSON.stringify(doctorAccount) }).then(() => loadAll('admin')),
    onUpdateDoctor: (doctorId, patch) => api(`/doctors/${doctorId}`, { method: 'PATCH', body: JSON.stringify(patch) }).then(() => loadAll('admin')),
    onDeleteDoctor: (doctorId) => api(`/doctors/${doctorId}`, { method: 'DELETE' }).then(() => loadAll('admin')),
    onAddLabTest: (payload) => api('/catalog/lab-tests', { method: 'POST', body: JSON.stringify(payload) }).then(() => loadAll(role || '')),
    onAddMedicine: (payload) => api('/catalog/medicines', { method: 'POST', body: JSON.stringify(payload) }).then(() => loadAll(role || '')),
    generateBill: (billData) => api('/bills', { method: 'POST', body: JSON.stringify(billData) }),
    getBills: (caseId) => api(`/bills?caseId=${caseId}`),
  }
}

export default useClinicAppState
