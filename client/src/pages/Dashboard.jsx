import { CalendarDays } from 'lucide-react'

function Dashboard({ stats, upcoming }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h2>Operational Dashboard</h2>
          <p>Reception to Doctor to Cashier to Lab and Pharmacy with persistent multi-doctor records.</p>
        </div>
      </header>
      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label} className="stat-card">
            <div className="stat-head"><span>{label}</span><Icon size={18} /></div>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
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
