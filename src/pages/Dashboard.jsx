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

  const filteredBills = useMemo(() => {
    if (!Array.isArray(bills)) return []
    const { start, end } = getDateRange()
    return bills.filter(bill => {
      const billDate = new Date(bill.generatedAt || bill.collectedAt || bill.createdAt)
      return billDate >= start && billDate <= end
    })
  }, [bills, period])

  // Role-specific earnings
  const doctorEarnings = useMemo(() => {
    if (!session || session.role !== 'doctor') return 0
    return filteredBills
      .filter(bill => bill.doctorId === session.id || bill.doctorName === session.name)
      .reduce((sum, bill) => {
        if (bill.doctorFee) return sum + (bill.doctorFee || 0)
        if (bill.services && Array.isArray(bill.services)) {
          const consult = bill.services.find(s => s.name?.toLowerCase().includes('consultation'))
          return sum + (consult ? consult.amount : 0)
        }
        return sum
      }, 0)
  }, [filteredBills, session])

  const pharmacyEarnings = useMemo(() => {
    if (!session || session.role !== 'pharmacy') return 0
    return filteredBills.reduce((sum, bill) => {
      if (bill.medicines && Array.isArray(bill.medicines)) {
        return sum + bill.medicines.reduce((medSum, m) => medSum + (m.price * (m.quantity || 1)), 0)
      }
      if (bill.services && Array.isArray(bill.services)) {
        const medServices = bill.services.filter(s => 
          s.name?.toLowerCase().includes('medicine') || 
          s.name?.toLowerCase().includes('pharmacy') ||
          s.name?.toLowerCase().includes('prescription')
        )
        return sum + medServices.reduce((sSum, s) => sSum + (s.amount || 0), 0)
      }
      return sum + (bill.extraPharmacyCharges || 0)
    }, 0)
  }, [filteredBills, session])

  const labEarnings = useMemo(() => {
    if (!session || session.role !== 'lab') return 0
    return filteredBills.reduce((sum, bill) => {
      if (bill.labTests && Array.isArray(bill.labTests)) {
        return sum + bill.labTests.reduce((testSum, t) => testSum + (t.price || 0), 0)
      }
      if (bill.services && Array.isArray(bill.services)) {
        const labServices = bill.services.filter(s => 
          s.name?.toLowerCase().includes('test') || 
          s.name?.toLowerCase().includes('lab') ||
          s.name?.toLowerCase().includes('pathology')
        )
        return sum + labServices.reduce((sSum, s) => sSum + (s.amount || 0), 0)
      }
      return sum + (bill.extraLabCharges || 0)
    }, 0)
  }, [filteredBills, session])

  // Total system earnings (for admin/receptionist)
  const totalSystemEarnings = useMemo(() => {
    if (!session) return 0
    if (session.role === 'admin' || session.role === 'receptionist' || session.role === 'counter') {
      return filteredBills.reduce((sum, bill) => {
        let total = 0
        if (bill.doctorFee) total += bill.doctorFee
        if (bill.medicines) total += bill.medicines.reduce((s, m) => s + (m.price * (m.quantity || 1)), 0)
        if (bill.labTests) total += bill.labTests.reduce((s, t) => s + t.price, 0)
        if (bill.services) total += bill.services.reduce((s, svc) => s + (svc.amount || 0), 0)
        if (bill.extraLabCharges) total += bill.extraLabCharges
        if (bill.extraPharmacyCharges) total += bill.extraPharmacyCharges
        return sum + total
      }, 0)
    }
    return 0
  }, [filteredBills, session])

  const getRoleEarnings = () => {
    if (!session) return null
    switch (session.role) {
      case 'doctor': return { label: 'Consultation Fees', value: doctorEarnings, icon: '👨‍⚕️' }
      case 'pharmacy': return { label: 'Medicine Sales', value: pharmacyEarnings, icon: '💊' }
      case 'lab': return { label: 'Lab Test Revenue', value: labEarnings, icon: '🔬' }
      case 'admin':
      case 'receptionist':
      case 'counter':
        return { label: 'Total System Revenue', value: totalSystemEarnings, icon: '💰' }
      default:
        return null
    }
  }

  const roleEarnings = getRoleEarnings()

  return (
    <>
      <header className="topbar">
        <div>
          <h2>Operational Dashboard</h2>
          <p>Reception to Doctor to Cashier to Lab and Pharmacy with persistent multi-doctor records.</p>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="secondary-btn">
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label} className="stat-card">
            <div className="stat-head"><span>{label}</span><Icon size={18} /></div>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {roleEarnings ? (
        <section className="stats-grid" style={{ marginTop: '1rem' }}>
          <article className="stat-card" style={{ background: '#e8f5e9' }}>
            <div className="stat-head">
              <span>{roleEarnings.label}</span>
              <span style={{ fontSize: '1.5rem' }}>{roleEarnings.icon}</span>
            </div>
            <strong>PKR {roleEarnings.value.toLocaleString()}</strong>
            <small style={{ display: 'block', marginTop: '4px' }}>
              {period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
            </small>
          </article>
        </section>
      ) : (
        <div className="panel" style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', color: '#856404', borderRadius: '8px' }}>
          ⚠️ Earnings data not available. Please ensure you are logged in with a valid role (Doctor, Pharmacy, Lab, Admin, or Receptionist) and that bills data is loaded.
        </div>
      )}

      <section className="panel">
        <div className="panel-title"><CalendarDays size={18} /><h3>Upcoming Appointments</h3></div>
        <ul>
          {upcoming.length ? upcoming.map((c) => (
            <li key={c.id}>
              <span>{c.appointmentDate} {c.appointmentTime}</span>
              <small>{c.patientName} with Dr. {c.doctorName}</small>
            </li>
          )) : <li><span>No scheduled appointments</span></li>}
        </ul>
      </section>
    </>
  )
}

export default Dashboard