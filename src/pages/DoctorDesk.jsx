import { useMemo, useState } from 'react';
import { API_BASE } from '../constants';
import CaseTable from '../components/CaseTable';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Activity, 
  Pill, 
  FlaskConical, 
  FileText, 
  Edit2, 
  Trash2,
  Plus,
  Search,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

function DoctorDesk({ cases, onUpdate, session, labTests, medicines }) {
  const [filterDay, setFilterDay] = useState('');
  const [calendarMode, setCalendarMode] = useState('week');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [completedFilter, setCompletedFilter] = useState('today');
  const [editingPrescriptions, setEditingPrescriptions] = useState({});
  const [editingTests, setEditingTests] = useState({});
  const [editingDiagnosis, setEditingDiagnosis] = useState({});
  const [editingMedicineIdx, setEditingMedicineIdx] = useState({});
  const [editingTestIdx, setEditingTestIdx] = useState({});
  const [newMedSearch, setNewMedSearch] = useState({});
  const [newTestSearch, setNewTestSearch] = useState({});
  const [updatingPatient, setUpdatingPatient] = useState(null);

  const pending = cases.filter(
    (c) => c.status === 'doctor' && c.doctorName === session.name && (!filterDay || c.appointmentDate === filterDay)
  );
  
  const getDateRange = () => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    if (completedFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (completedFilter === 'week') {
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() + (6 - now.getDay()));
      end.setHours(23, 59, 59, 999);
    } else if (completedFilter === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setMonth(end.getMonth() + 1);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };
  
  const { start: filterStart, end: filterEnd } = getDateRange();
  const completedCases = cases.filter(
    (c) => c.doctorName === session.name && c.status !== 'doctor' && c.createdAt && new Date(c.createdAt) >= filterStart && new Date(c.createdAt) <= filterEnd
  );
  
  const [diagnosis, setDiagnosis] = useState({});
  const [selectedMeds, setSelectedMeds] = useState({});
  const [selectedTests, setSelectedTests] = useState({});
  const [medSearch, setMedSearch] = useState({});
  const [testSearch, setTestSearch] = useState({});
  
  const filteredMeds = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(medSearch).map(([id, q]) => [
          id,
          medicines.filter((m) => m.name.toLowerCase().includes((q || '').toLowerCase())).slice(0, 8),
        ])
      ),
    [medSearch, medicines]
  );
  
  const filteredTests = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(testSearch).map(([id, q]) => [
          id,
          labTests.filter((t) => t.name.toLowerCase().includes((q || '').toLowerCase())).slice(0, 8),
        ])
      ),
    [testSearch, labTests]
  );
  
  const [slots, setSlots] = useState([{ day: 'Monday', from: '09:00', to: '13:00' }]);

  const doctorCases = cases.filter((c) => c.doctorName === session.name && c.appointmentDate);
  const start = new Date(anchorDate);
  const span = calendarMode === 'week' ? 7 : 30;
  const dayBuckets = Array.from({ length: span }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: calendarMode === 'week' ? 'short' : undefined,
      }),
      count: doctorCases.filter((c) => c.appointmentDate === key).length,
    };
  });

  const saveSlots = () => {
    fetch(`${API_BASE}/doctors/${session.id}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({ availability: slots }),
    });
  };

  // ========== FIXED ADJUSTMENT BILL FUNCTION (SPLIT MEDICINE & TEST) ==========
  const generateAdjustmentBill = async (caseId, patientName, oldMeds, newMeds, oldTests, newTests) => {
    const getPrice = (item) => Number(item.price || 0);
    const bills = [];

    // Medicine changes
    const oldMedMap = new Map(oldMeds.map(m => [m.id || m.name, getPrice(m)]));
    const newMedMap = new Map(newMeds.map(m => [m.id || m.name, getPrice(m)]));
    let medDelta = 0;
    for (let [key, price] of newMedMap.entries()) {
      if (!oldMedMap.has(key)) medDelta += price;
    }
    for (let [key, price] of oldMedMap.entries()) {
      if (!newMedMap.has(key)) medDelta -= price;
    }
    for (let [key, newPrice] of newMedMap.entries()) {
      const oldPrice = oldMedMap.get(key);
      if (oldPrice !== undefined && oldPrice !== newPrice) {
        medDelta += (newPrice - oldPrice);
      }
    }

    // Test changes
    const oldTestMap = new Map(oldTests.map(t => [t.id || t.name, getPrice(t)]));
    const newTestMap = new Map(newTests.map(t => [t.id || t.name, getPrice(t)]));
    let testDelta = 0;
    for (let [key, price] of newTestMap.entries()) {
      if (!oldTestMap.has(key)) testDelta += price;
    }
    for (let [key, price] of oldTestMap.entries()) {
      if (!newTestMap.has(key)) testDelta -= price;
    }
    for (let [key, newPrice] of newTestMap.entries()) {
      const oldPrice = oldTestMap.get(key);
      if (oldPrice !== undefined && oldPrice !== newPrice) {
        testDelta += (newPrice - oldPrice);
      }
    }

    // Create separate bill for medicine changes
    if (medDelta !== 0) {
      const medBillAmount = medDelta;
      const medServiceName = medDelta > 0
        ? 'Additional charges (prescription/medicine changes)'
        : 'Credit note (prescription/medicine changes)';
      const medBillData = {
        caseId,
        patientName,
        doctorName: session.name,
        doctorId: session.id,
        billType: 'adjustment',
        title: medDelta > 0 ? 'Additional Charges Bill (Medicines)' : 'Credit Note (Medicines)',
        services: [{ name: medServiceName, amount: Math.abs(medBillAmount) }],
        totalAmount: medBillAmount,
        generatedBy: `Dr. ${session.name}`,
        generatedAt: new Date().toISOString(),
        note: `Medicine adjustment: ${medDelta > 0 ? 'added' : 'removed'} value ${Math.abs(medBillAmount)}`
      };
      const token = localStorage.getItem('cms_token') || '';
      const res = await fetch(`${API_BASE}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(medBillData),
      });
      if (!res.ok) throw new Error('Failed to create medicine adjustment bill');
      const bill = await res.json();
      bills.push(bill);
    }

    // Create separate bill for test changes
    if (testDelta !== 0) {
      const testBillAmount = testDelta;
      const testServiceName = testDelta > 0
        ? 'Additional charges (lab test changes)'
        : 'Credit note (lab test changes)';
      const testBillData = {
        caseId,
        patientName,
        doctorName: session.name,
        doctorId: session.id,
        billType: 'adjustment',
        title: testDelta > 0 ? 'Additional Charges Bill (Lab Tests)' : 'Credit Note (Lab Tests)',
        services: [{ name: testServiceName, amount: Math.abs(testBillAmount) }],
        totalAmount: testBillAmount,
        generatedBy: `Dr. ${session.name}`,
        generatedAt: new Date().toISOString(),
        note: `Lab test adjustment: ${testDelta > 0 ? 'added' : 'removed'} value ${Math.abs(testBillAmount)}`
      };
      const token = localStorage.getItem('cms_token') || '';
      const res = await fetch(`${API_BASE}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(testBillData),
      });
      if (!res.ok) throw new Error('Failed to create test adjustment bill');
      const bill = await res.json();
      bills.push(bill);
    }

    if (bills.length === 0) return null;

    // Show summary alert
    if (bills.length === 1) {
      const bill = bills[0];
      const action = bill.totalAmount > 0 ? 'additional bill' : 'credit note';
      alert(`New ${action} created! Amount: PKR ${Math.abs(bill.totalAmount)}. Patient balance will ${bill.totalAmount > 0 ? 'increase' : 'decrease'} by this amount.`);
    } else {
      alert(`Created ${bills.length} adjustment bills. Check billing records for details.`);
    }
    return bills;
  };
  // ========== END OF FIX ==========

  const updateCaseWithBill = async (caseId, oldCase, newData, oldMeds, oldTests) => {
    if (updatingPatient === caseId) return;
    setUpdatingPatient(caseId);
    try {
      await onUpdate(caseId, newData);
      const newMeds = newData.prescriptions ?? oldCase.prescriptions;
      const newTests = newData.recommendedTests ?? oldCase.recommendedTests;
      await generateAdjustmentBill(caseId, oldCase.patientName, oldMeds, newMeds, oldTests, newTests);
    } catch (err) {
      console.error(err);
      alert('Error updating case: ' + err.message);
    } finally {
      setUpdatingPatient(null);
    }
  };

  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

  return (
    <div className="doctor-desk-upgraded" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .doctor-desk-upgraded .modern-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e9edf2;
          transition: all 0.2s ease;
        }
        .doctor-desk-upgraded .form-icon-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .doctor-desk-upgraded .form-icon-group:focus-within {
          border-color: #0f5ea8;
          box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
        }
        .doctor-desk-upgraded .form-icon-group input,
        .doctor-desk-upgraded .form-icon-group select {
          border: none;
          background: transparent;
          flex: 1;
          outline: none;
          font-size: 0.9rem;
          padding: 0.2rem 0;
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
        .modern-button-success {
          background: #10b981;
          color: white;
        }
        .modern-button-success:hover {
          background: #059669;
        }
        .modern-button-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .calendar-day-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.75rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }
        .calendar-day-btn:hover {
          border-color: #0f5ea8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .chip-modern {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #eef2ff;
          color: #0f5ea8;
          border-radius: 40px;
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip-modern:hover {
          background: #e0f2fe;
          transform: scale(1.02);
        }
        .patient-card-modern {
          background: white;
          border-radius: 24px;
          border: 1px solid #e9edf2;
          padding: 1.25rem;
          margin-bottom: 1rem;
          transition: all 0.2s;
        }
        .patient-card-modern:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }
        .status-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.2rem 0.6rem;
          border-radius: 30px;
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-block;
        }
      `}</style>

      {/* Header */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eef2ff', borderRadius: '18px', padding: '0.5rem' }}>
            <Stethoscope size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Doctor Desk
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#5b6e8c' }}>
              Manage appointments, prescriptions, and lab tests for your patients
            </p>
          </div>
        </div>
      </div>

      {/* Calendar & Availability Section */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="#0f5ea8" /> Schedule & Availability
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-icon-group">
            <Calendar size={16} />
            <input type="date" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} placeholder="Filter by date" />
          </div>
          <div className="form-icon-group">
            <Clock size={16} />
            <select value={calendarMode} onChange={(e) => setCalendarMode(e.target.value)}>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
            </select>
          </div>
          <div className="form-icon-group">
            <Calendar size={16} />
            <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
          </div>
        </div>
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`, gap: '0.5rem', marginBottom: '1rem' }}>
          {dayBuckets.map((d) => (
            <button key={d.key} type="button" className="calendar-day-btn" onClick={() => setFilterDay(d.key)}>
              <strong style={{ fontSize: '0.85rem' }}>{d.label}</strong>
              <span style={{ fontSize: '0.7rem', color: '#5b6e8c', display: 'block', marginTop: '0.25rem' }}>{d.count} appointment(s)</span>
            </button>
          ))}
        </div>
        <button type="button" className="modern-button modern-button-secondary" onClick={saveSlots} style={{ marginBottom: '0.5rem' }}>
          <Save size={16} /> Save Availability Slots
        </button>
        <p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c', marginTop: '0.5rem' }}>
          Slots: {slots.map((s) => `${s.day} ${s.from}-${s.to}`).join(' | ')}
        </p>
      </div>

      {/* Pending Patients */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#0f5ea8" /> Pending Patients <span className="status-badge" style={{ marginLeft: '0.5rem' }}>{pending.length}</span>
        </h3>
        <CaseTable
          cases={pending}
          actions={(c) => (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
              <div className="form-icon-group">
                <FileText size={16} />
                <input placeholder="Diagnosis" value={diagnosis[c.id] || ''} onChange={(e) => setDiagnosis({ ...diagnosis, [c.id]: e.target.value })} />
              </div>
              <div className="form-icon-group">
                <Pill size={16} />
                <input placeholder="Search medicines catalog" value={medSearch[c.id] || ''} onChange={(e) => setMedSearch({ ...medSearch, [c.id]: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(filteredMeds[c.id] || []).map((m) => (
                  <button key={m.id} type="button" className="chip-modern" onClick={() => setSelectedMeds((prev) => ({ ...prev, [c.id]: [...(prev[c.id] || []), { id: m.id, name: m.name, price: m.price }] }))}>
                    <Pill size={12} /> {m.name} ({formatPKR(m.price)})
                  </button>
                ))}
              </div>
              <div className="form-icon-group">
                <FlaskConical size={16} />
                <input placeholder="Search lab tests catalog" value={testSearch[c.id] || ''} onChange={(e) => setTestSearch({ ...testSearch, [c.id]: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(filteredTests[c.id] || []).map((t) => (
                  <button key={t.id} type="button" className="chip-modern" onClick={() => setSelectedTests((prev) => ({ ...prev, [c.id]: [...(prev[c.id] || []), { id: t.id, name: t.name, price: t.price }] }))}>
                    <FlaskConical size={12} /> {t.name} ({formatPKR(t.price)})
                  </button>
                ))}
              </div>
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                <strong>Selected Rx:</strong> {(selectedMeds[c.id] || []).map((m) => `${m.name} (${formatPKR(m.price)})`).join(', ') || 'None'}
              </div>
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                <strong>Selected Tests:</strong> {(selectedTests[c.id] || []).map((t) => `${t.name} (${formatPKR(t.price)})`).join(', ') || 'None'}
              </div>
              <button className="modern-button modern-button-primary" onClick={() => onUpdate(c.id, {
                diagnosis: diagnosis[c.id] || 'General consult',
                prescriptions: selectedMeds[c.id] || [],
                recommendedTests: selectedTests[c.id] || [],
                status: 'reception',
                timelineAction: 'Doctor consultation completed',
                timelineNote: 'Prescription and tests sent to reception',
              })}>
                <CheckCircle size={16} /> Send to Reception
              </button>
            </div>
          )}
        />
      </div>

      {/* Completed Patients */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#0f5ea8" /> Completed Patients (Manage Prescriptions & Tests)
        </h3>
        <div className="form-icon-group" style={{ marginBottom: '1rem' }}>
          <Calendar size={16} />
          <select value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        {completedCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#5b6e8c' }}>
            <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>No completed patients in the selected period.</p>
          </div>
        ) : (
          <div className="patients-list">
            {completedCases.map((c) => (
              <div key={c.id} className="patient-card-modern">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{c.patientName}</h4>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#5b6e8c' }}>
                      Date: {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="status-badge">{c.status}</span>
                </div>
                
                {/* Diagnosis Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Diagnosis</h5>
                  <div className="form-icon-group" style={{ marginBottom: '0.5rem' }}>
                    <FileText size={16} />
                    <input
                      type="text"
                      value={editingDiagnosis[c.id] ?? c.diagnosis ?? ''}
                      onChange={(e) => setEditingDiagnosis({ ...editingDiagnosis, [c.id]: e.target.value })}
                      placeholder="Edit diagnosis"
                    />
                  </div>
                  <button
                    type="button"
                    className="modern-button modern-button-secondary"
                    disabled={updatingPatient === c.id}
                    onClick={async () => {
                      const newDiagnosis = editingDiagnosis[c.id] ?? c.diagnosis;
                      if (newDiagnosis === (c.diagnosis || '')) return;
                      await updateCaseWithBill(c.id, c, { diagnosis: newDiagnosis, timelineAction: 'Diagnosis updated', timelineNote: 'Doctor updated diagnosis' }, c.prescriptions || [], c.recommendedTests || []);
                      setEditingDiagnosis({ ...editingDiagnosis, [c.id]: '' });
                    }}
                  >
                    <Save size={14} /> Update Diagnosis
                  </button>
                </div>
                
                {/* Prescriptions Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Prescriptions</h5>
                  {(c.prescriptions || []).length === 0 ? (
                    <p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c' }}>No prescriptions</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(editingPrescriptions[c.id] || c.prescriptions || []).map((med, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                          {editingMedicineIdx[`${c.id}-${idx}`] ? (
                            <>
                              <input type="text" value={med.name} onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])];
                                updated[idx] = { ...med, name: e.target.value };
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated });
                              }} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <input type="number" value={med.price} onChange={(e) => {
                                const updated = [...(editingPrescriptions[c.id] || c.prescriptions || [])];
                                updated[idx] = { ...med, price: Number(e.target.value) };
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: updated });
                              }} style={{ width: '80px', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <button className="modern-button modern-button-primary" onClick={async () => {
                                const oldMeds = c.prescriptions || [];
                                const newMeds = editingPrescriptions[c.id] || c.prescriptions;
                                await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine updated', timelineNote: `Updated ${med.name}` }, oldMeds, c.recommendedTests || []);
                                setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: false });
                              }}><Save size={12} /> Save</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1 }}>{med.name} - {formatPKR(med.price)}</span>
                              <button className="modern-button modern-button-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditingMedicineIdx({ ...editingMedicineIdx, [`${c.id}-${idx}`]: true })}><Edit2 size={12} /> Edit</button>
                              <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.6rem', color: '#b91c1c' }} onClick={async () => {
                                const oldMeds = c.prescriptions || [];
                                const newMeds = (editingPrescriptions[c.id] || c.prescriptions || []).filter((_, i) => i !== idx);
                                await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine removed', timelineNote: `Removed ${med.name}` }, oldMeds, c.recommendedTests || []);
                                setEditingPrescriptions({ ...editingPrescriptions, [c.id]: newMeds });
                              }}><Trash2 size={12} /> Remove</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-icon-group" style={{ flex: 1 }}>
                      <Search size={14} />
                      <input type="text" placeholder="Search & add medicine" value={newMedSearch[c.id] || ''} onChange={(e) => setNewMedSearch({ ...newMedSearch, [c.id]: e.target.value })} />
                    </div>
                    {medicines
                      .filter((m) => m.name.toLowerCase().includes((newMedSearch[c.id] || '').toLowerCase()))
                      .slice(0, 3)
                      .map((m) => (
                        <button key={m.id} className="chip-modern" onClick={async () => {
                          const oldMeds = c.prescriptions || [];
                          const newMeds = [...(editingPrescriptions[c.id] || c.prescriptions || []), { id: m.id, name: m.name, price: m.price }];
                          await updateCaseWithBill(c.id, c, { prescriptions: newMeds, timelineAction: 'Medicine added', timelineNote: `Added ${m.name}` }, oldMeds, c.recommendedTests || []);
                          setEditingPrescriptions({ ...editingPrescriptions, [c.id]: newMeds });
                          setNewMedSearch({ ...newMedSearch, [c.id]: '' });
                        }}>
                          <Plus size={12} /> {m.name}
                        </button>
                      ))}
                  </div>
                </div>
                
                {/* Lab Tests Section */}
                <div>
                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Lab Tests</h5>
                  {(c.recommendedTests || []).length === 0 ? (
                    <p className="muted" style={{ fontSize: '0.8rem', color: '#5b6e8c' }}>No tests recommended</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(editingTests[c.id] || c.recommendedTests || []).map((test, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                          {editingTestIdx[`${c.id}-${idx}`] ? (
                            <>
                              <input type="text" value={test.name} onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])];
                                updated[idx] = { ...test, name: e.target.value };
                                setEditingTests({ ...editingTests, [c.id]: updated });
                              }} style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <input type="number" value={test.price} onChange={(e) => {
                                const updated = [...(editingTests[c.id] || c.recommendedTests || [])];
                                updated[idx] = { ...test, price: Number(e.target.value) };
                                setEditingTests({ ...editingTests, [c.id]: updated });
                              }} style={{ width: '80px', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <button className="modern-button modern-button-primary" onClick={async () => {
                                const oldTests = c.recommendedTests || [];
                                const newTests = editingTests[c.id] || c.recommendedTests;
                                await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test updated', timelineNote: `Updated ${test.name}` }, c.prescriptions || [], oldTests);
                                setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: false });
                              }}><Save size={12} /> Save</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1 }}>{test.name} - {formatPKR(test.price)}</span>
                              <button className="modern-button modern-button-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditingTestIdx({ ...editingTestIdx, [`${c.id}-${idx}`]: true })}><Edit2 size={12} /> Edit</button>
                              <button className="modern-button modern-button-outline" style={{ padding: '0.3rem 0.6rem', color: '#b91c1c' }} onClick={async () => {
                                const oldTests = c.recommendedTests || [];
                                const newTests = (editingTests[c.id] || c.recommendedTests || []).filter((_, i) => i !== idx);
                                await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test removed', timelineNote: `Removed ${test.name}` }, c.prescriptions || [], oldTests);
                                setEditingTests({ ...editingTests, [c.id]: newTests });
                              }}><Trash2 size={12} /> Remove</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-icon-group" style={{ flex: 1 }}>
                      <Search size={14} />
                      <input type="text" placeholder="Search & add test" value={newTestSearch[c.id] || ''} onChange={(e) => setNewTestSearch({ ...newTestSearch, [c.id]: e.target.value })} />
                    </div>
                    {labTests
                      .filter((t) => t.name.toLowerCase().includes((newTestSearch[c.id] || '').toLowerCase()))
                      .slice(0, 3)
                      .map((t) => (
                        <button key={t.id} className="chip-modern" onClick={async () => {
                          const oldTests = c.recommendedTests || [];
                          const newTests = [...(editingTests[c.id] || c.recommendedTests || []), { id: t.id, name: t.name, price: t.price }];
                          await updateCaseWithBill(c.id, c, { recommendedTests: newTests, timelineAction: 'Test added', timelineNote: `Added ${t.name}` }, c.prescriptions || [], oldTests);
                          setEditingTests({ ...editingTests, [c.id]: newTests });
                          setNewTestSearch({ ...newTestSearch, [c.id]: '' });
                        }}>
                          <Plus size={12} /> {t.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDesk;