import { useMemo, useState, useEffect } from 'react';
import { API_BASE, CLINIC_NAME, SOFTWARE_BRANDING } from '../constants';
import CaseTable from '../components/CaseTable';
import {
  Calendar,
  Clock,
  User,
  Phone,
  IdCard,
  Stethoscope,
  Activity,
  DollarSign,
  FileText,
  Printer,
  X,
  Eye,
  CreditCard,
  PlusCircle,
  AlertCircle,
  Loader2,
  Receipt,
} from 'lucide-react';

function ReceptionDesk({ cases, setCases, doctors, onUpdate, generateBill, getBills }) {
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    phone: '',
    cnic: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });
  const [extraLabFee, setExtraLabFee] = useState({});
  const [extraPharmFee, setExtraPharmFee] = useState({});
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [consultationBill, setConsultationBill] = useState(null);
  const [existingBills, setExistingBills] = useState([]);
  const [viewingBills, setViewingBills] = useState(null);

  const printThermalReceipt = (element) => {
    if (!element) return;
    const html = `
      <html>
        <head>
          <title>Thermal Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            html, body { width: 80mm; margin: 0; padding: 0; background: #fff; color: #000; }
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; }
            * { box-sizing: border-box; }
            .receipt { width: 320px; margin: 0 auto; padding: 10px 12px; color: #000; }
            .receipt .bill-container { border: none; box-shadow: none; margin: 0; }
            .receipt .bill-header { padding: 0; margin: 0 0 10px; background: none; display: block; border-bottom: 1px dashed #000; }
            .receipt .bill-header h3 { margin: 0 0 6px; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; }
            .receipt .bill-header small { display: block; font-size: 10px; color: #333; margin-top: 2px; }
            .receipt .bill-details { padding: 0; }
            .receipt .bill-section { margin-bottom: 10px; }
            .receipt .bill-section h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
            .receipt .bill-section p,
            .receipt .bill-section span {
              margin: 2px 0;
              font-size: 11px;
            }
            .receipt .bill-item,
            .receipt .bill-item-detail {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }
            .receipt .bill-item-divider {
              border-bottom: 1px dashed #999;
              margin: 8px 0;
            }
            .receipt .bill-total {
              display: flex;
              justify-content: space-between;
              padding: 6px 0 2px;
              font-size: 12px;
              font-weight: bold;
              border-top: 1px dashed #000;
            }
            .receipt .bill-footer { text-align: center; margin-top: 10px; font-size: 10px; }
            .receipt .bill-footer p { margin: 3px 0; }
            .receipt .bill-actions,
            .receipt button,
            .receipt .close-btn,
            .receipt .close-bill-btn {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="receipt">${element.innerHTML}</div>
        </body>
      </html>`;
    const printWindow = window.open('', '_blank', 'width=360,height=760');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const billingQueue = useMemo(
    () => cases.filter((c) => c.status === 'reception'),
    [cases],
  );

  const loadExistingAppointments = async () => {
    if (!form.doctorName || !form.appointmentDate) {
      setExistingAppointments([]);
      return;
    }
    const selectedDoctor = doctors.find((d) => d.name === form.doctorName);
    if (!selectedDoctor) {
      setExistingAppointments([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/appointments?doctorId=${selectedDoctor.id}&day=${form.appointmentDate}`,
      );
      if (response.ok) {
        const appointments = await response.json();
        setExistingAppointments(appointments.filter((apt) => apt.status !== 'cancelled'));
      }
    } catch (err) {
      setExistingAppointments([]);
    }
  };

  useEffect(() => {
    loadExistingAppointments();
  }, [form.doctorName, form.appointmentDate, doctors]);

  const checkSlotAvailability = async () => {
    if (!form.doctorName || !form.appointmentDate || !form.appointmentTime) return true;
    const selectedDoctor = doctors.find((d) => d.name === form.doctorName);
    if (!selectedDoctor) return true;

    setCheckingSlot(true);
    try {
      const response = await fetch(
        `${API_BASE}/appointments?doctorId=${selectedDoctor.id}&day=${form.appointmentDate}`,
      );
      if (!response.ok) return true;
      const appointments = await response.json();
      const isBooked = appointments.some(
        (apt) => apt.time === form.appointmentTime && apt.status !== 'cancelled',
      );
      setCheckingSlot(false);
      return !isBooked;
    } catch (err) {
      setCheckingSlot(false);
      return true;
    }
  };

  const addCase = async () => {
    if (!form.patientName || !form.phone || !form.doctorName) return;

    const isAvailable = await checkSlotAvailability();
    if (!isAvailable) {
      setError('This appointment slot is already booked. Please choose a different time.');
      return;
    }

    const selectedDoctor = doctors.find((d) => d.name === form.doctorName);
    fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cms_token') || ''}`,
      },
      body: JSON.stringify({ ...form, doctorId: selectedDoctor?.id || '' }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || 'Failed to create appointment');
        return body;
      })
      .then(async (created) => {
        setError('');
        setCases((prev) => [{ ...created, id: created._id }, ...prev]);

        try {
          const selectedDoctor = doctors.find((d) => d.name === form.doctorName);
          const consultFee = selectedDoctor?.consultFee || 0;

          const appointmentDate = new Date(form.appointmentDate + 'T' + form.appointmentTime);
          const billData = {
            caseId: created._id,
            patientName: created.patientName,
            doctorName: created.doctorName,
            doctorId: created.doctorId,
            billType: 'appointment',
            title: 'Appointment Consultation Fee',
            services: [{ name: 'Consultation Fee', amount: consultFee }],
            totalAmount: consultFee,
            appointmentDetails: {
              date: appointmentDate.toLocaleDateString(),
              time: appointmentDate.toLocaleTimeString(),
              day: appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            },
            generatedBy: 'Reception Desk',
            generatedAt: new Date().toISOString(),
          };

          const bill = await generateBill(billData);
          setConsultationBill(bill);
        } catch (billErr) {
          console.log('Bill generation note:', billErr.message);
        }

        setForm({
          patientName: '',
          age: '',
          phone: '',
          cnic: '',
          doctorName: '',
          appointmentDate: '',
          appointmentTime: '',
          reason: '',
        });
      })
      .catch((err) => setError(err.message));
  };

  const formatPKR = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

  // Helper for spin animation (remove if not used)
  const spinAnimation = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 1s linear infinite;
    }
  `;

  return (
    <div className="reception-desk-upgraded" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          ${spinAnimation}
          .reception-desk-upgraded .modern-card {
            background: white;
            border-radius: 24px;
            border: 1px solid #e9edf2;
            transition: all 0.2s ease;
          }
          .reception-desk-upgraded .modern-card:hover {
            border-color: #cbd5e1;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
          }
          .reception-desk-upgraded .form-icon-group {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 0.5rem 1rem;
            transition: all 0.2s;
          }
          .reception-desk-upgraded .form-icon-group:focus-within {
            border-color: #0f5ea8;
            box-shadow: 0 0 0 3px rgba(15, 94, 168, 0.1);
          }
          .reception-desk-upgraded .form-icon-group input,
          .reception-desk-upgraded .form-icon-group select {
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
          .bill-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bill-modal-content {
            max-width: 600px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            background: white;
            border-radius: 28px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            animation: slideIn 0.3s ease-out;
          }
          .badge-appointment {
            background: #e0f2fe;
            color: #0369a1;
            padding: 0.2rem 0.6rem;
            border-radius: 30px;
            font-size: 0.7rem;
            font-weight: 600;
          }
        `}
      </style>

      {/* Header */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#eef2ff', borderRadius: '18px', padding: '0.5rem' }}>
            <Calendar size={28} color="#0f5ea8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f5ea8, #1b76c8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Reception / Counter Desk
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#5b6e8c' }}>
              One user handles appointment booking, billing, and token issuance in a single shared workflow.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', borderRadius: '16px', padding: '0.75rem 1rem', margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* New Appointment Form */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={18} color="#0f5ea8" /> New Appointment
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-icon-group"><User size={16} /><input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
            <div className="form-icon-group"><Activity size={16} /><input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
            <div className="form-icon-group"><Phone size={16} /><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-icon-group"><IdCard size={16} /><input placeholder="CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} /></div>
            <div className="form-icon-group"><Stethoscope size={16} /><select value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })}>
              <option value="">Select doctor</option>
              {doctors.map((d) => (<option key={d.id} value={d.name}>{d.name} - {d.specialization}</option>))}
            </select></div>
            <div className="form-icon-group"><Calendar size={16} /><input type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} /></div>
            <div className="form-icon-group"><Clock size={16} /><input type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} /></div>
            <div className="form-icon-group"><FileText size={16} /><input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          {checkingSlot && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#0f5ea8' }}>
              <Loader2 size={14} className="spin" /> Checking slot availability...
            </div>
          )}
          <button className="modern-button modern-button-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={addCase} disabled={checkingSlot}>
            {checkingSlot ? 'Checking...' : 'Create Appointment & Send to Doctor'}
          </button>
        </div>

        {existingAppointments.length > 0 && (
          <div className="modern-card" style={{ marginTop: '1.5rem', padding: '1rem', background: '#fefce8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={16} color="#ca8a04" />
              <strong>Existing appointments for {form.appointmentDate}:</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {existingAppointments.map((apt) => (
                <li key={apt._id} style={{ margin: '0.2rem 0' }}>{apt.time} - {apt.patientName} ({apt.reason})</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Billing Queue */}
      <div className="form-panel" style={{ background: 'white', borderRadius: '28px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={18} color="#0f5ea8" /> Billing Queue <span className="badge-appointment" style={{ marginLeft: '0.5rem' }}>{billingQueue.length} pending</span>
        </h3>
        <CaseTable
          cases={billingQueue}
          actions={(c) => {
            const doctorFee = c.billingPaid ? 0 : Number(doctors.find(d => d.id === (c.doctorId || c.doctorId?._id || c.doctorId?.id))?.consultFee || 0);
            const testsTotal = (c.recommendedTests || []).reduce((acc, t) => acc + Number(t.price || 0), 0);
            const medsTotal = (c.prescriptions || []).reduce((acc, m) => acc + Number(m.price || 0), 0);
            const total = doctorFee + testsTotal + medsTotal + Number(extraLabFee[c.id] || 0) + Number(extraPharmFee[c.id] || 0);
            return (
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '12px' }}>
                  <span><strong>👨‍⚕️ Doctor:</strong> PKR {doctorFee}</span>
                  <span><strong>🔬 Tests:</strong> PKR {testsTotal}</span>
                  <span><strong>💊 Medicines:</strong> PKR {medsTotal}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="form-icon-group" style={{ flex: 1, minWidth: '120px' }}><DollarSign size={14} /><input placeholder="Extra lab" value={extraLabFee[c.id] || ''} onChange={(e) => setExtraLabFee({ ...extraLabFee, [c.id]: e.target.value })} /></div>
                  <div className="form-icon-group" style={{ flex: 1, minWidth: '120px' }}><DollarSign size={14} /><input placeholder="Extra pharmacy" value={extraPharmFee[c.id] || ''} onChange={(e) => setExtraPharmFee({ ...extraPharmFee, [c.id]: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button className="modern-button modern-button-success" onClick={async () => {
                    const token = `TKN-${Date.now().toString().slice(-6)}`;
                    try {
                      await onUpdate(c.id, {
                        billingPaid: true, token, invoiceAmount: String(total), status: c.recommendedTests?.length ? 'lab' : c.prescriptions?.length ? 'pharmacy' : 'closed',
                        labStatus: c.recommendedTests?.length ? 'pending' : 'not_required', pharmacyStatus: c.prescriptions?.length ? 'pending' : 'not_required',
                        timelineAction: 'Reception collected payment', timelineNote: `Invoice total PKR ${total}`,
                      });
                      const labTestsForBill = (c.recommendedTests || []).map(t => ({ name: t.name, price: Number(t.price || 0) }));
                      const bill = await generateBill({ caseId: c.id, doctorFee: 0, medicines: c.prescriptions || [], labTests: labTestsForBill, extraLabCharges: Number(extraLabFee[c.id] || 0), extraPharmacyCharges: Number(extraPharmFee[c.id] || 0), token });
                      setGeneratedBill(bill);
                    } catch (err) { setError('Failed to process payment'); }
                  }}><CreditCard size={14} /> Collect Payment & Issue Token</button>
                  <button className="modern-button modern-button-secondary" onClick={async () => {
                    try {
                      const token = c.token || `TKN-${Date.now().toString().slice(-6)}`;
                      const labTestsForBill = (c.recommendedTests || []).map(t => ({ name: t.name, price: Number(t.price || 0) }));
                      const bill = await generateBill({ caseId: c.id, doctorFee: c.billingPaid ? 0 : doctorFee, medicines: c.prescriptions || [], labTests: labTestsForBill, extraLabCharges: Number(extraLabFee[c.id] || 0), extraPharmacyCharges: Number(extraPharmFee[c.id] || 0), token });
                      setGeneratedBill(bill);
                    } catch (err) { setError('Failed to generate bill'); }
                  }}><Receipt size={14} /> Generate Bill</button>
                  <button className="modern-button modern-button-outline" onClick={async () => {
                    try { const bills = await getBills(c.id); setExistingBills(bills); setViewingBills(c.id); } catch (err) { setError('Failed to load bills'); }
                  }}><Eye size={14} /> View Bills</button>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Consultation Bill Modal */}
      {consultationBill && (
        <div className="bill-modal-overlay" onClick={() => setConsultationBill(null)}>
          <div className="bill-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="printable-bill" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #0f5ea8', paddingBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0f5ea8' }}>{CLINIC_NAME}</h3>
                  <small>Consultation Receipt</small>
                </div>
                <button onClick={() => setConsultationBill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div className="bill-details">
                <div className="bill-section"><h4>Patient</h4><p><strong>Name:</strong> {consultationBill.patientName}</p></div>
                <div className="bill-section"><h4>Doctor</h4><p><strong>Doctor:</strong> {consultationBill.doctorName}</p></div>
                {consultationBill.appointmentDetails && (<div className="bill-section"><h4>Appointment</h4><p><strong>Date:</strong> {consultationBill.appointmentDetails.date} at {consultationBill.appointmentDetails.time}</p></div>)}
                <div className="bill-section"><h4>Charges</h4><div className="bill-breakdown">{consultationBill.services?.map((s, i) => (<div key={i} className="bill-item"><span>{s.name}</span><span>{formatPKR(s.amount)}</span></div>))}<div className="bill-total"><strong>Total</strong><strong>{formatPKR(consultationBill.totalAmount)}</strong></div></div></div>
              </div>
              <div className="bill-footer" style={{ marginTop: '1rem', textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>{SOFTWARE_BRANDING}</p>
              </div>
              <div className="bill-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="modern-button modern-button-primary" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))}><Printer size={14} /> Print</button>
                <button className="modern-button modern-button-secondary" onClick={() => setConsultationBill(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Bill Modal */}
      {generatedBill && (
        <div className="bill-modal-overlay" onClick={() => setGeneratedBill(null)}>
          <div className="bill-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="printable-bill" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #0f5ea8', paddingBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0f5ea8' }}>{CLINIC_NAME}</h3>
                  <small>Payment Receipt</small>
                </div>
                <button onClick={() => setGeneratedBill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div className="bill-details">
                <div className="bill-section"><h4>Patient Info</h4><p><strong>Name:</strong> {generatedBill.patientName}<br /><strong>Token:</strong> {generatedBill.token}</p></div>
                <div className="bill-section"><h4>Breakdown</h4><div className="bill-breakdown"><div className="bill-item"><span>Doctor Fee</span><span>{formatPKR(generatedBill.doctorFee)}</span></div>{generatedBill.labTests?.length > 0 && (<div className="bill-item"><span>Lab Tests</span><span>{formatPKR(generatedBill.labTests.reduce((s,t)=>s+t.price,0))}</span></div>)}{generatedBill.medicines?.length > 0 && (<div className="bill-item"><span>Medicines</span><span>{formatPKR(generatedBill.medicines.reduce((s,m)=>s+m.price*(m.quantity||1),0))}</span></div>)}{generatedBill.extraLabCharges > 0 && (<div className="bill-item"><span>Extra Lab</span><span>{formatPKR(generatedBill.extraLabCharges)}</span></div>)}{generatedBill.extraPharmacyCharges > 0 && (<div className="bill-item"><span>Extra Pharmacy</span><span>{formatPKR(generatedBill.extraPharmacyCharges)}</span></div>)}<div className="bill-total"><strong>Total</strong><strong>{formatPKR(generatedBill.total)}</strong></div></div></div>
              </div>
              <div className="bill-footer" style={{ marginTop: '1rem', textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>{SOFTWARE_BRANDING}</p>
              </div>
              <div className="bill-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="modern-button modern-button-primary" onClick={() => printThermalReceipt(document.querySelector('.printable-bill'))}><Printer size={14} /> Print Receipt</button>
                <button className="modern-button modern-button-secondary" onClick={() => setGeneratedBill(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Bills List Modal */}
      {viewingBills && (
        <div className="bill-modal-overlay" onClick={() => setViewingBills(null)}>
          <div className="bill-modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>📄 Previous Bills - {CLINIC_NAME}</h3>
                <button onClick={() => setViewingBills(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              {existingBills.length === 0 ? (<p className="no-bills">No bills found.</p>) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {existingBills.map((bill) => (
                    <div key={bill._id} className="modern-card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong>Bill #{bill._id.slice(-8)}</strong>
                        <span className="badge-appointment">{new Date(bill.collectedAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0' }}>Token: {bill.token} | Total: {formatPKR(bill.total)}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button className="modern-button modern-button-primary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setGeneratedBill(bill); setViewingBills(null); }}><Eye size={14} /> View</button>
                        <button className="modern-button modern-button-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setGeneratedBill(bill); setViewingBills(null); setTimeout(() => printThermalReceipt(document.querySelector('.printable-bill')), 300); }}><Printer size={14} /> Print</button>
                      </div>
                      <div className="bill-footer" style={{ marginTop: '0.5rem', fontSize: '0.7rem', textAlign: 'center', color: '#5b6e8c' }}>{SOFTWARE_BRANDING}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionDesk;