import { CalendarDays } from 'lucide-react'
import { useState, useMemo } from 'react'

function Dashboard({ stats = [], upcoming = [], session = null, bills = [] }) {
  const [period, setPeriod] = useState('today')

  const getDateRange = () => {
    const now = new Date()
    let start = new Date(now)
    let end = new Date(now)
    end.setHours(23, 59, 59, 999)

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        end.setDate(now.getDate() + (6 - now.getDay()))
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(now.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
      default:
        break
    }
    return { start, end }
  }

  // Deduplicate bills
  const filteredBills = useMemo(() => {
    if (!Array.isArray(bills)) return []
    const { start, end } = getDateRange()
    const periodBills = bills.filter(bill => {
      const billDate = new Date(bill.generatedAt || bill.collectedAt || bill.createdAt)
      return billDate >= start && billDate <= end
    })
    const uniqueMap = new Map()
    periodBills.forEach(bill => {
      const id = bill._id || bill.id
      if (id && !uniqueMap.has(id)) uniqueMap.set(id, bill)
    })
    return Array.from(uniqueMap.values())
  }, [bills, period])

  // Doctor earnings: only positive consultation fees, exclude adjustment bills
  const doctorEarnings = useMemo(() => {
    if (!session || session.role !== 'doctor') return 0
    return filteredBills
      .filter(bill => {
        if (bill.doctorId === session.id || bill.doctorName === session.name) {
          return bill.billType !== 'adjustment'
        }
        return false
      })
      .reduce((sum, bill) => {
        if (bill.doctorFee) return sum + Number(bill.doctorFee || 0)
        if (bill.services && Array.isArray(bill.services)) {
          const consult = bill.services.find(s => s.name?.toLowerCase().includes('consultation'))
          return sum + (consult ? Number(consult.amount || 0) : 0)
        }
        return sum
      }, 0)
  }, [filteredBills, session])

  // Pharmacy earnings: handle credit notes correctly
  const pharmacyEarnings = useMemo(() => {
    if (!session || session.role !== 'pharmacy') return 0
    return filteredBills.reduce((sum, bill) => {
      // Check if this is a medicine-related credit note
      const title = (bill.title || '').toLowerCase()
      const isMedicineCredit = title.includes('credit note') && (title.includes('medicine') || title.includes('prescription'))
      
      if (isMedicineCredit) {
        // Directly add the signed totalAmount (negative for credit)
        return sum + Number(bill.totalAmount || 0)
      }

      let total = 0
      // Regular medicines from prescriptions
      if (bill.medicines && Array.isArray(bill.medicines)) {
        total += bill.medicines.reduce((medSum, m) => medSum + (Number(m.price) * (Number(m.quantity) || 1)), 0)
      }
      // Service items that are not credit notes
      if (bill.services && Array.isArray(bill.services)) {
        bill.services.forEach(service => {
          const name = service.name?.toLowerCase() || ''
          if ((name.includes('medicine') || name.includes('pharmacy') || name.includes('prescription')) && !name.includes('credit note')) {
            total += Number(service.amount || 0)
          }
        })
      }
      if (bill.extraPharmacyCharges) total += Number(bill.extraPharmacyCharges)
      return sum + total
    }, 0)
  }, [filteredBills, session])

  // Lab earnings: handle credit notes correctly
  const labEarnings = useMemo(() => {
    if (!session || session.role !== 'lab') return 0
    return filteredBills.reduce((sum, bill) => {
      const title = (bill.title || '').toLowerCase()
      const isLabCredit = title.includes('credit note') && (title.includes('lab') || title.includes('test'))
      
      if (isLabCredit) {
        return sum + Number(bill.totalAmount || 0)
      }

      let total = 0
      if (bill.labTests && Array.isArray(bill.labTests)) {
        total += bill.labTests.reduce((testSum, t) => testSum + Number(t.price || 0), 0)
      }
      if (bill.services && Array.isArray(bill.services)) {
        bill.services.forEach(service => {
          const name = service.name?.toLowerCase() || ''
          if ((name.includes('test') || name.includes('lab') || name.includes('pathology')) && !name.includes('credit note')) {
            total += Number(service.amount || 0)
          }
        })
      }
      if (bill.extraLabCharges) total += Number(bill.extraLabCharges)
      return sum + total
    }, 0)
  }, [filteredBills, session])

  // Total system earnings: use signed totalAmount if present, else compute
  const totalSystemEarnings = useMemo(() => {
    if (!session) return 0
    if (session.role === 'admin' || session.role === 'receptionist' || session.role === 'counter') {
      return filteredBills.reduce((sum, bill) => {
        // Prefer totalAmount if available (includes sign for credit notes)
        if (bill.totalAmount !== undefined && typeof bill.totalAmount === 'number') {
          return sum + bill.totalAmount
        }
        // Fallback
        let total = 0
        if (bill.doctorFee) total += Number(bill.doctorFee)
        if (bill.medicines) total += bill.medicines.reduce((s, m) => s + (Number(m.price) * (Number(m.quantity) || 1)), 0)
        if (bill.labTests) total += bill.labTests.reduce((s, t) => s + Number(t.price), 0)
        if (bill.services) total += bill.services.reduce((s, svc) => s + Number(svc.amount || 0), 0)
        if (bill.extraLabCharges) total += Number(bill.extraLabCharges)
        if (bill.extraPharmacyCharges) total += Number(bill.extraPharmacyCharges)
        return sum + total
      }, 0)
    }
    return 0
  }, [filteredBills, session])

  const getRoleEarnings = () => {
    if (!session) return null
    switch (session.role) {
      case 'doctor': return { label: 'Consultation Fees', value: doctorEarnings, icon: '👨‍⚕️', color: '#3b82f6' }
      case 'pharmacy': return { label: 'Medicine Sales', value: pharmacyEarnings, icon: '💊', color: '#10b981' }
      case 'lab': return { label: 'Lab Test Revenue', value: labEarnings, icon: '🔬', color: '#8b5cf6' }
      case 'admin':
      case 'receptionist':
      case 'counter':
        return { label: 'Total System Revenue', value: totalSystemEarnings, icon: '💰', color: '#f59e0b' }
      default:
        return null
    }
  }

  const roleEarnings = getRoleEarnings()
  const totalBillsInPeriod = filteredBills.length
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="dashboard-upgraded" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        .dashboard-upgraded {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .greeting-card {
          background: linear-gradient(135deg, #0f5ea8 0%, #1b76c8 100%);
          border-radius: 20px;
          padding: 1.5rem;
          color: white;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .greeting-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          pointer-events: none;
        }
        .greeting-card::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          pointer-events: none;
        }
        .stat-card-upgraded {
          background: white;
          border-radius: 20px;
          padding: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .stat-card-upgraded:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: rgba(15, 94, 168, 0.2);
        }
        .period-selector {
          background: white;
          border-radius: 12px;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .period-selector:hover {
          border-color: #0f5ea8;
          box-shadow: 0 2px 8px rgba(15, 94, 168, 0.1);
        }
        .earnings-card {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s;
        }
        .earnings-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        .upcoming-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s;
        }
        .appointment-item {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s;
          cursor: pointer;
        }
        .appointment-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }
        .appointment-item:last-child {
          border-bottom: none;
        }
        .time-badge {
          background: #e0f2fe;
          color: #0284c7;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .animated-value {
          animation: pulse 0.5s ease-out;
        }
      `}</style>

      <div className="greeting-card">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>
                {getGreeting()}, {session?.name?.split(' ')[0] || 'User'}! 👋
              </h2>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                {session?.role === 'doctor' && 'Review your consultations and patient appointments'}
                {session?.role === 'pharmacy' && 'Track medicine sales and inventory'}
                {session?.role === 'lab' && 'Monitor test requests and lab reports'}
                {(session?.role === 'admin' || session?.role === 'receptionist' || session?.role === 'counter') && 
                  'Manage clinic operations and track performance metrics'}
                {!session?.role && 'Welcome to your clinic management dashboard'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>{currentDate}</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-selector">
          <option value="today">📅 Today</option>
          <option value="week">📆 This Week</option>
          <option value="month">📊 This Month</option>
          <option value="year">📈 This Year</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card-upgraded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>{label}</p>
                <strong style={{ fontSize: '1.75rem', marginTop: '0.5rem', display: 'block', color: '#0f172a' }}>{value}</strong>
              </div>
              <div className="stat-icon-wrapper">
                <Icon size={24} color="#0284c7" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#334155' }}>
            <strong>{totalBillsInPeriod}</strong> unique transactions in this period
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {roleEarnings ? (
        <div className="earnings-card" style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${roleEarnings.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{roleEarnings.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>{roleEarnings.label}</h4>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: roleEarnings.color }}>
                  PKR {roleEarnings.value.toLocaleString()}
                </div>
                <small style={{ color: '#94a3b8' }}>
                  {period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
                </small>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          background: '#fef3c7', 
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ color: '#92400e', fontSize: '0.9rem' }}>
            ⚠️ Earnings data not available. Please ensure you are logged in with a valid role and that bills data is loaded.
          </span>
        </div>
      )}

      <div className="upcoming-card">
        <div style={{ 
          padding: '1rem 1.25rem', 
          background: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CalendarDays size={20} color="#0f5ea8" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Upcoming Appointments</h3>
          </div>
          {upcoming.length > 0 && (
            <span style={{ background: '#0f5ea8', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500 }}>
              {upcoming.length} scheduled
            </span>
          )}
        </div>
        
        <div>
          {upcoming.length ? upcoming.map((c, idx) => (
            <div key={c.id} className="appointment-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="time-badge">{c.appointmentTime}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.appointmentDate}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.patientName}</span>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>with Dr. {c.doctorName}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📅</div>
              <p style={{ margin: 0, color: '#64748b' }}>No scheduled appointments</p>
              <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>New appointments will appear here</small>
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        marginTop: '1.5rem', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fff9e6 100%)', borderRadius: '16px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#92400e' }}>Active Patients</span>
            <strong style={{ fontSize: '1.1rem', color: '#92400e' }}>
              {stats.find(s => s.label === 'Patients')?.value || '—'}
            </strong>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', borderRadius: '16px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#1e3a8a' }}>Today's Checkups</span>
            <strong style={{ fontSize: '1.1rem', color: '#1e3a8a' }}>
              {stats.find(s => s.label === 'Appointments')?.value || '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard